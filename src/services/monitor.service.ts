import { IMonitorDocument } from "@app/interfaces/monitor.interface";
import { MonitorModel } from "@app/models/monitor.model";
import { Model, Op } from "sequelize";
import { getSingleNotificationGroup } from "./notification.service";
import dayjs from "dayjs";
import { getHttpHeartBeatByDuration, httpStatusMonitor } from "./http.service";
import { toLower } from "lodash";
import { IHeartbeat } from "@app/interfaces/heartbeat.interface";
import { uptimePercentage } from "@app/utils/utils";
import { HttpModel } from "@app/models/http.model";
import {
  getMongoHeartBeatByDuration,
  mongoStatusMonitor,
} from "./mongo.service";
import { MongoModel } from "@app/models/mongo.model";
import {
  getRedisHeartBeatByDuration,
  redisStatusMonitor,
} from "./redis.service";
import { RedisModel } from "@app/models/redis.model";
import { getTcpHeartBeatByDuration, tcpStatusMonitor } from "./tcp.service";
import { TcpModel } from "@app/models/tcp.model";

const HTTP_TYPE = "http";
const TCP_TYPE = "tcp";
const MONGO_TYPE = "mongodb";
const REDIS_TYPE = "redis";

export const createMonitor = async (
  data: IMonitorDocument
): Promise<IMonitorDocument> => {
  try {
    const result: Model = await MonitorModel.create(data);
    return result.dataValues;
  } catch (error) {
    throw new Error(error);
  }
};

export const getUserMonitors = async (
  userId: number,
  active?: boolean
): Promise<IMonitorDocument[]> => {
  try {
    const monitors: IMonitorDocument[] = (await MonitorModel.findAll({
      raw: true,
      where: {
        [Op.and]: [
          {
            userId,
            ...(active && {
              active: true,
            }),
          },
        ],
      },
      order: [["createdAt", "DESC"]],
    })) as unknown as IMonitorDocument[];
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

export const getUserActiveMonitors = async (
  userId: number
): Promise<IMonitorDocument[]> => {
  try {
    let heartbeats: IHeartbeat[] = [];
    const updatedMonitor: IMonitorDocument[] = [];
    const monitors: IMonitorDocument[] = await getUserMonitors(userId, true);
    for (let monitor of monitors) {
      const group = await getSingleNotificationGroup(monitor.notificationId!);
      heartbeats = await getHeartbeats(monitor.type, monitor.id!, 24);
      const uptime = uptimePercentage(heartbeats);
      monitor = {
        ...monitor,
        uptime,
        heartbeats: heartbeats.slice(0, 16),
        notifications: group,
      };
      updatedMonitor.push(monitor);
    }
    return updatedMonitor;
  } catch (error) {
    throw new Error(error);
  }
};

export const getAllUsersActiveMonitors = async (): Promise<
  IMonitorDocument[]
> => {
  try {
    const monitors: IMonitorDocument[] = (await MonitorModel.findAll({
      raw: true,
      where: {
        active: true,
      },
      order: [["createdAt", "DESC"]],
    })) as unknown as IMonitorDocument[];
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

export const getMonitorById = async (
  monitorId: number
): Promise<IMonitorDocument> => {
  try {
    const monitor: IMonitorDocument = (await MonitorModel.findOne({
      raw: true,
      where: {
        id: monitorId,
      },
    })) as unknown as IMonitorDocument;

    let updatedMonitor: IMonitorDocument = { ...monitor };
    const notifications = await getSingleNotificationGroup(
      updatedMonitor.notificationId!
    );
    updatedMonitor = { ...updatedMonitor, notifications };
    return updatedMonitor;
  } catch (error) {
    throw new Error(error);
  }
};

export const toggleMonitor = async (
  monitorId: number,
  userId: number,
  active: boolean
): Promise<IMonitorDocument[]> => {
  try {
    await MonitorModel.update(
      { active },
      {
        where: {
          [Op.and]: [{ id: monitorId }, { userId: userId }],
        },
      }
    );
    const result: IMonitorDocument[] = await getUserMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const updateSingleMonitor = async (
  monitorId: number,
  userId: number,
  data: IMonitorDocument
): Promise<IMonitorDocument[]> => {
  try {
    await MonitorModel.update(data, {
      where: {
        id: monitorId,
      },
    });
    const result: IMonitorDocument[] = await getUserMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const updateMonitorStatus = async (
  monitor: IMonitorDocument,
  timestamp: number,
  type: string
): Promise<IMonitorDocument> => {
  try {
    const now = timestamp ? dayjs(timestamp).toDate() : dayjs().toDate();
    const { id, status } = monitor;
    const updatedMonitor: IMonitorDocument = { ...monitor };
    updatedMonitor.status = type === "success" ? 0 : 1;
    const isStatus = type === "success" ? true : false;
    if (isStatus && status === 1) {
      updatedMonitor.lastChanged = now;
    } else if (!isStatus && status === 0) {
      updatedMonitor.lastChanged = now;
    }
    await MonitorModel.update(updatedMonitor, {
      where: { id },
    });
    return updatedMonitor;
  } catch (error) {
    throw new Error(error);
  }
};

export const deleteSingleMonitor = async (
  monitorId: number,
  userId: number,
  type: string
): Promise<IMonitorDocument[]> => {
  try {
    await deleteMonitorTypeHeartbeats(monitorId, type);
    await MonitorModel.destroy({
      where: { id: monitorId },
    });
    const result: IMonitorDocument[] = await getUserMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

const deleteMonitorTypeHeartbeats = async (
  monitorId: number,
  type: string
): Promise<void> => {
  let model = null;
  if (type === HTTP_TYPE) {
    model = HttpModel;
  }
  if (type === MONGO_TYPE) {
    model = MongoModel;
  }
  if (type === REDIS_TYPE) {
    model = RedisModel;
  }
  if (type === TCP_TYPE) {
    model = TcpModel;
  }
  if (model !== null) {
    await model.destroy({
      where: {
        monitorId,
      },
    });
  }
};

export const startCreatedMonitors = (
  monitor: IMonitorDocument,
  name: string,
  type: string
): void => {
  if (type === HTTP_TYPE) {
    httpStatusMonitor(monitor!, toLower(name));
  }
  if (type === TCP_TYPE) {
    tcpStatusMonitor(monitor!, toLower(name));
  }
  if (type === MONGO_TYPE) {
    mongoStatusMonitor(monitor!, toLower(name));
  }
  if (type === REDIS_TYPE) {
    redisStatusMonitor(monitor!, toLower(name));
  }
};

export const getHeartbeats = async (
  type: string,
  monitorId: number,
  duration: number
): Promise<IHeartbeat[]> => {
  let heartbeats: IHeartbeat[] = [];
  if (type === HTTP_TYPE) {
    heartbeats = await getHttpHeartBeatByDuration(monitorId, duration);
  }
  if (type === TCP_TYPE) {
    heartbeats = await getTcpHeartBeatByDuration(monitorId, duration);
  }
  if (type === MONGO_TYPE) {
    heartbeats = await getMongoHeartBeatByDuration(monitorId, duration);
  }
  if (type === REDIS_TYPE) {
    heartbeats = await getRedisHeartBeatByDuration(monitorId, duration);
  }
  return heartbeats;
};
