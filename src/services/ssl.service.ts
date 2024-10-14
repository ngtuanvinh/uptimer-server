import { Model, Op } from "sequelize";
import { getSingleNotificationGroup } from "./notification.service";
import { ISSLMonitorDocument } from "@app/interfaces/ssl.interface";
import { SSLModel } from "@app/models/ssl.model";
import { startSingleJob } from "@app/utils/job";
import { appTimeZone } from "@app/utils/utils";
import { sslMonitor } from "@app/monitor/ssl.monitor";

export const createSSLMonitor = async (
  data: ISSLMonitorDocument
): Promise<ISSLMonitorDocument> => {
  try {
    const result: Model = await SSLModel.create(data);
    return result.dataValues;
  } catch (error) {
    throw new Error(error);
  }
};

export const getUserSSLMonitors = async (
  userId: number,
  active?: boolean
): Promise<ISSLMonitorDocument[]> => {
  try {
    const monitors: ISSLMonitorDocument[] = (await SSLModel.findAll({
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
    })) as unknown as ISSLMonitorDocument[];
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

export const updateSSLMotitorInfo = async (
  monitorId: number,
  infoData: string
): Promise<void> => {
  try {
    await SSLModel.update(
      {
        info: infoData,
      },
      {
        where: {
          id: monitorId,
        },
      }
    );
  } catch (error) {
    throw new Error(error);
  }
};

export const getUserActiveSSLMonitors = async (
  userId: number
): Promise<ISSLMonitorDocument[]> => {
  try {
    const monitors: ISSLMonitorDocument[] = await getUserSSLMonitors(
      userId,
      true
    );
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

export const getAllUsersActiveSSLMonitors = async (): Promise<
  ISSLMonitorDocument[]
> => {
  try {
    const monitors: ISSLMonitorDocument[] = (await SSLModel.findAll({
      raw: true,
      where: {
        active: true,
      },
      order: [["createdAt", "DESC"]],
    })) as unknown as ISSLMonitorDocument[];
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

export const getSSLMonitorById = async (
  monitorId: number
): Promise<ISSLMonitorDocument> => {
  try {
    const monitor: ISSLMonitorDocument = (await SSLModel.findOne({
      raw: true,
      where: {
        id: monitorId,
      },
    })) as unknown as ISSLMonitorDocument;

    let updatedMonitor: ISSLMonitorDocument = { ...monitor };
    const notifications = await getSingleNotificationGroup(
      updatedMonitor.notificationId!
    );
    updatedMonitor = { notifications, ...updatedMonitor };
    return updatedMonitor;
  } catch (error) {
    throw new Error(error);
  }
};

export const toggleSSLMonitor = async (
  monitorId: number,
  userId: number,
  active: boolean
): Promise<ISSLMonitorDocument[]> => {
  try {
    await SSLModel.update(
      { active },
      {
        where: {
          [Op.and]: [{ id: monitorId }, { userId: userId }],
        },
      }
    );
    const result: ISSLMonitorDocument[] = await getUserSSLMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const updateSingleSSLMonitor = async (
  monitorId: number,
  userId: number,
  data: ISSLMonitorDocument
): Promise<ISSLMonitorDocument[]> => {
  try {
    await SSLModel.update(data, {
      where: {
        id: monitorId,
      },
    });
    const result: ISSLMonitorDocument[] = await getUserSSLMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const deleteSingleSSLMonitor = async (
  monitorId: number,
  userId: number
): Promise<ISSLMonitorDocument[]> => {
  try {
    await SSLModel.destroy({
      where: { id: monitorId },
    });
    const result: ISSLMonitorDocument[] = await getUserSSLMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const SSLStatusMonitor = (
  monitor: ISSLMonitorDocument,
  name: string
): void => {
  const sslData: ISSLMonitorDocument = {
    monitorId: monitor.id,
    url: monitor.url,
  } as ISSLMonitorDocument;
  startSingleJob(name, appTimeZone, monitor.frequency, async () => {
    sslMonitor.start(sslData);
  });
};
