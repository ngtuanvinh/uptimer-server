import { AppContext } from "@app/interfaces/monitor.interface";
import { getSingleNotificationGroup } from "@app/services/notification.service";
import { stopSingleBackgroundJob } from "@app/utils/job";
import { authenticateGraphQLRoute, resumeSSLMonitors } from "@app/utils/utils";
import { toLower } from "lodash";
import { PubSub } from "graphql-subscriptions";
import {
  createSSLMonitor,
  deleteSingleSSLMonitor,
  getSSLMonitorById,
  getUserSSLMonitors,
  SSLStatusMonitor,
  toggleSSLMonitor,
  updateSingleSSLMonitor,
} from "@app/services/ssl.service";
import {
  ISSLMonitorArgs,
  ISSLMonitorDocument,
} from "@app/interfaces/ssl.interface";

export const pubSub: PubSub = new PubSub();

export const SSLMonitorResolver = {
  Query: {
    async getSingleSSLMonitor(
      _: undefined,
      { monitorId }: { monitorId: string },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticateGraphQLRoute(req);
      const monitor: ISSLMonitorDocument = await getSSLMonitorById(
        parseInt(monitorId)
      );
      return {
        sslMonitors: [monitor],
      };
    },
    async getUserSSLMonitors(
      _: undefined,
      { userId }: { userId: string },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticateGraphQLRoute(req);
      const monitors: ISSLMonitorDocument[] = await getUserSSLMonitors(
        parseInt(userId)
      );
      return {
        sslMonitors: monitors,
      };
    },
  },
  Mutation: {
    async createSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticateGraphQLRoute(req);
      const body: ISSLMonitorDocument = args.monitor!;
      const monitor: ISSLMonitorDocument = await createSSLMonitor(body);
      if (body.active && monitor?.active) {
        SSLStatusMonitor(monitor, toLower(body.name));
      }

      return {
        sslMonitors: [monitor],
      };
    },
    async toggleSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticateGraphQLRoute(req);
      const { monitorId, userId, name, active } = args.monitor!;
      const results: ISSLMonitorDocument[] = await toggleSSLMonitor(
        monitorId!,
        userId,
        active as boolean
      );
      if (!active) {
        stopSingleBackgroundJob(name, monitorId);
      } else {
        resumeSSLMonitors(monitorId!);
      }
      return {
        sslMonitors: results,
      };
    },
    async updateSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticateGraphQLRoute(req);
      const { monitorId, userId, monitor } = args!;
      const monitors: ISSLMonitorDocument[] = await updateSingleSSLMonitor(
        parseInt(`${monitorId}`),
        parseInt(`${userId}`),
        monitor!
      );
      return {
        sslMonitors: monitors,
      };
    },
    async deleteSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticateGraphQLRoute(req);
      const { monitorId, userId } = args!;
      await deleteSingleSSLMonitor(
        parseInt(`${monitorId}`),
        parseInt(`${userId}`)
      );
      return {
        id: parseInt(monitorId!),
      };
    },
  },
  MonitorResult: {
    notifications: (monitor: ISSLMonitorDocument) => {
      return getSingleNotificationGroup(monitor.notificationId!);
    },
  },
};
