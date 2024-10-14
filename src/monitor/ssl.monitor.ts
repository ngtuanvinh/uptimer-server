import { IEmailLocals } from "@app/interfaces/notification.interface";
import { emailSender, locals } from "@app/utils/utils";
import { ISSLInfo, ISSLMonitorDocument } from "@app/interfaces/ssl.interface";
import {
  getSSLMonitorById,
  updateSSLMotitorInfo,
} from "@app/services/ssl.service";
import { getCertificateInfo } from "./monitors";
import logger from "@app/server/logger";

class SSLMonitor {
  errorCount: number;

  constructor() {
    this.errorCount = 0;
  }

  async start(data: ISSLMonitorDocument): Promise<void> {
    const { monitorId, url } = data;
    const emailsLocals: IEmailLocals = locals();
    try {
      const monitorData: ISSLMonitorDocument = await getSSLMonitorById(
        monitorId!
      );
      emailsLocals.appName = monitorData.name;
      const response: ISSLInfo = await getCertificateInfo(url);
      await updateSSLMotitorInfo(
        parseInt(`${monitorId}`!),
        JSON.stringify(response)
      );
      logger.info(`SSL certificate for "${url}" is valid`);
    } catch (error) {
      logger.error(`SSL certificate for "${url}" has issues`);
      const monitorData: ISSLMonitorDocument = await getSSLMonitorById(
        monitorId!
      );
      this.errorCount += 1;
      await updateSSLMotitorInfo(
        parseInt(`${monitorId}`!),
        JSON.stringify(error)
      );
      if (
        monitorData.alertThreshold > 0 &&
        this.errorCount > monitorData.alertThreshold
      ) {
        this.errorCount = 0;
        emailSender(
          monitorData.notifications!.emails,
          "errorStatus",
          emailsLocals
        );
      }
    }
  }
}

export const sslMonitor: SSLMonitor = new SSLMonitor();
