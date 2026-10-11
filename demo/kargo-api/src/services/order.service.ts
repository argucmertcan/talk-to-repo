import { OrderModel } from "../db/models/order.model";
import { createInvoiceForOrder } from "./invoice.service";
import { quote } from "./pricing.service";

export async function createOrder(customerId: number, items: { weightKg: number; city: string }[]) {
  const total = items.reduce((s, i) => s + quote(i.weightKg, i.city).gross, 0);
  const order = await OrderModel.insert({ customerId, total, status: "new", createdAt: new Date() });
  await createInvoiceForOrder(order.id);
  return order;
}

export async function getOrderTotal(orderId: number) {
  const order = await OrderModel.findById(orderId);
  return order?.total ?? 0;
}
