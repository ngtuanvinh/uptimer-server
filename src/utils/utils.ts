import { IAuthPayload } from "@app/interfaces/user.interface";
import { CLIENT_URL, JWT_TOKEN } from "@app/server/config";
import { verify } from "jsonwebtoken";
import { Request } from "express";
import { GraphQLError } from "graphql";
import { IMonitorDocument } from "@app/interfaces/monitor.interface";
import {
  getAllUsersActiveMonitors,
  getMonitorById,
  getUserActiveMonitors,
  startCreatedMonitors,
} from "@app/services/monitor.service";
import { toLower } from "lodash";
import { startSingleJob } from "./job";
import { pubSub } from "@app/graphql/resolvers/monitor";
import { IHeartbeat } from "@app/interfaces/heartbeat.interface";
import { IEmailLocals } from "@app/interfaces/notification.interface";
import { sendEmail } from "./email";
import {
  getAllUsersActiveSSLMonitors,
  getSSLMonitorById,
  SSLStatusMonitor,
} from "@app/services/ssl.service";
import { ISSLMonitorDocument } from "@app/interfaces/ssl.interface";

export const appTimeZone: string =
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const isEmail = (email: string): boolean => {
  const regexExp =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;
  return regexExp.test(email);
};

/**
 * Authenticate user access to protected route
 * @param req
 * @returns {void}
 */

export const authenticateGraphQLRoute = (req: Request): void => {
  if (!req.session?.jwt) {
    throw new GraphQLError("Please log in again.");
  }
  try {
    const payload: IAuthPayload = verify(
      req.session.jwt,
      JWT_TOKEN
    ) as IAuthPayload;
    req.currentUser = payload;
  } catch (error) {
    throw new GraphQLError("Please log in again.");
  }
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const startMonitors = async (): Promise<void> => {
  const list: IMonitorDocument[] = await getAllUsersActiveMonitors();
  for (const monitor of list) {
    startCreatedMonitors(monitor, toLower(monitor.name), monitor.type);
    await sleep(getRandomInt(300, 1000));
  }
};

export const startSSLMonitors = async (): Promise<void> => {
  const list: ISSLMonitorDocument[] = await getAllUsersActiveSSLMonitors();
  for (const monitor of list) {
    SSLStatusMonitor(monitor, toLower(monitor.name));
    await sleep(getRandomInt(300, 1000));
  }
};

export const resumeMonitors = async (monitorId: number): Promise<void> => {
  const monitor: IMonitorDocument = await getMonitorById(monitorId);
  startCreatedMonitors(monitor, toLower(monitor.name), monitor.type);
  await sleep(getRandomInt(300, 1000));
};

export const resumeSSLMonitors = async (monitorId: number): Promise<void> => {
  const monitor: ISSLMonitorDocument = await getSSLMonitorById(monitorId);
  SSLStatusMonitor(monitor, toLower(monitor.name));
  await sleep(getRandomInt(300, 1000));
};

export const enablAutoRefreshJob = (cookies: string): void => {
  const result: Record<string, string> = getCookies(cookies);
  const session: string = Buffer.from(result.session, "base64").toString();
  const payload: IAuthPayload = verify(
    JSON.parse(session).jwt,
    JWT_TOKEN
  ) as IAuthPayload;
  const enableAutoRefresh: boolean = JSON.parse(session).enableAutomaticRefresh;
  if (enableAutoRefresh) {
    startSingleJob(
      `${toLower(payload.username)}`,
      appTimeZone,
      10,
      async () => {
        const monitors: IMonitorDocument[] = await getUserActiveMonitors(
          payload.id
        );
        pubSub.publish("MONITORS_UPDATED", {
          monitorsUpdated: {
            userId: payload.id,
            monitors,
          },
        });
      }
    );
  }
};

const getCookies = (cookie: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  cookie.split(";").forEach((cookieData) => {
    const parts: RegExpMatchArray | null = cookieData.match(/(.*?)=(.*)$/);
    cookies[parts![1].trim()] = (parts![2] || "").trim();
  });

  return cookies;
};

export const encodeBase64 = (user: string, pass: string): string => {
  return Buffer.from(`${user || ""}:${pass || ""}`).toString("base64");
};

export const uptimePercentage = (heartbeats: IHeartbeat[]): number => {
  if (!heartbeats) {
    return 0;
  }
  const totalHeartbeats: number = heartbeats.length;
  const downtimeHeartbeats: number = heartbeats.filter(
    (heartbeat: IHeartbeat) => heartbeat.status === 1
  ).length;
  return (
    Math.round(
      ((totalHeartbeats - downtimeHeartbeats) / totalHeartbeats) * 100
    ) || 0
  );
};

export const emailSender = async (
  notificationEmails: string,
  template: string,
  locals: IEmailLocals
): Promise<void> => {
  const emails = JSON.parse(notificationEmails);
  for (const email of emails) {
    await sendEmail(template, email, locals);
  }
};

export const locals = (): IEmailLocals => {
  return {
    appLink: `${CLIENT_URL}`,
    appIcon: "https://ibb.com/jD45fqX",
    appName: "",
  };
};

export const getDaysBetween = (start: Date, end: Date): number => {
  return Math.round(Math.abs(+start - +end) / (1000 * 60 * 60 * 24));
};

export const getDaysRemaining = (from: Date, end: Date): number => {
  const daysRemaining = getDaysBetween(from, end);
  if (new Date(end).getTime() < new Date().getTime()) {
    return -daysRemaining;
  }
  return daysRemaining;
};
