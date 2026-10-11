import { query } from "../client";

export interface Order {
  id: number;
  customerId: number;
  total: number;
  status: string;
  createdAt: Date;
}

export const OrderModel = {
  async findById(id: number) {
    const rows = await query<Order>("SELECT * FROM orders WHERE id = $1", [id]);
    return rows[0] ?? null;
  },
  async findMany(where: Partial<Order> = {}) {
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM orders WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : "SELECT * FROM orders";
    return query<Order>(sql, Object.values(where));
  },
  async insert(data: Omit<Order, "id">) {
    const keys = Object.keys(data);
    const rows = await query<Order>(
      `INSERT INTO orders (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  },
  async update(id: number, data: Partial<Order>) {
    const keys = Object.keys(data);
    const rows = await query<Order>(
      `UPDATE orders SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(",")} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  },
};
