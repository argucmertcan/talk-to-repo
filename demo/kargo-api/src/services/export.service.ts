import { UserModel } from "../db/models/user.model";
import { CustomerModel } from "../db/models/customer.model";
import { OrderModel } from "../db/models/order.model";

// Tüm müşteri + kullanıcı + sipariş verisini CSV olarak döker
export async function exportAll() {
  const [users, customers, orders] = await Promise.all([UserModel.findMany(), CustomerModel.findMany(), OrderModel.findMany()]);
  const rows = [
    "type,id,email,name,city,total",
    ...users.map((u) => `user,${u.id},${u.email},,,`),
    ...customers.map((c) => `customer,${c.id},${c.email},${c.name},${c.city},`),
    ...orders.map((o) => `order,${o.id},,,,${o.total}`),
  ];
  return rows.join("\n");
}
