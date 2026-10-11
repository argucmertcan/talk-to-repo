import { InvoiceModel } from "../db/models/invoice.model";
import { logger } from "../utils/logger";

export function startInvoiceReminderJob() {
  setInterval(async () => {
    const unpaid = (await InvoiceModel.findMany()).filter((i) => !i.paidAt);
    logger.info(`ödenmemiş fatura: ${unpaid.length}`);
  }, 6 * 60 * 60 * 1000);
}
