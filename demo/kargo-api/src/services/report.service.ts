import { CustomerModel } from "../db/models/customer.model";
import { OrderModel } from "../db/models/order.model";
import { startOfMonth } from "../utils/dates";

// Aylık müşteri raporu (admin paneli "Raporlar" sayfası)
export async function monthlyCustomerReport() {
  const customers = await CustomerModel.findMany();
  const report = [];
  for (const c of customers) {
    // her müşteri için ayrı sorgu
    const orders = await OrderModel.findMany({ customerId: c.id });
    const thisMonth = orders.filter((o) => o.createdAt >= startOfMonth());
    report.push({ customer: c.name, city: c.city, orders: thisMonth.length, total: thisMonth.reduce((s, o) => s + o.total, 0) });
  }
  return report.sort((a, b) => b.total - a.total);
}
