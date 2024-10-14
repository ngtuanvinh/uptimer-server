import { mergeTypeDefs } from "@graphql-tools/merge";
import { userSchema } from "./user";
import { notificationSchema } from "./notification";
import { monitorSchema } from "./monitor";
import { heartbeatSchema } from "./heartbeat";
import { sslMonitorSchema } from "./ssl";

export const mergeGQLSchema = mergeTypeDefs([
  userSchema,
  notificationSchema,
  monitorSchema,
  heartbeatSchema,
  sslMonitorSchema,
]);
