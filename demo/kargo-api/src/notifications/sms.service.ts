import { logger } from "../utils/logger";

export async function notifyStatusChange(trackingNo: string, status: string) {
  logger.info(`SMS → ${trackingNo}: ${status}`);
}
