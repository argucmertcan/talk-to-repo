import { InvoiceModel } from "../db/models/invoice.model";
import { getOrderTotal } from "./order.service";

export async function createInvoiceForOrder(orderId: number) {
  const amount = await getOrderTotal(orderId);
  const vat = Math.round((amount - amount / 1.2) * 100) / 100;
  return InvoiceModel.insert({ orderId, amount, vat, paidAt: null as unknown as Date });
}

export async function markPaid(invoiceId: number) {
  return InvoiceModel.update(invoiceId, { paidAt: new Date() });
}
