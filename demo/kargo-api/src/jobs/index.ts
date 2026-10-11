import { startInvoiceReminderJob } from "./invoiceReminder.job";
import { startCleanupJob } from "./cleanup.job";

export function startJobs() {
  startInvoiceReminderJob();
  startCleanupJob();
}
