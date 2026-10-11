import { query } from "../client";

export interface Customer {
  id: number;
  name: string;
  email: string;
  city: string;
}

export const CustomerModel = {
  async findById(id: number) {
    const rows = await query<Customer>("SELECT * FROM customers WHERE id = $1", [id]);
    return rows[0] ?? null;
  },
  async findMany(where: Partial<Customer> = {}) {
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM customers WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : "SELECT * FROM customers";
    return query<Customer>(sql, Object.values(where));
  },
  async insert(data: Omit<Customer, "id">) {
    const keys = Object.keys(data);
    const rows = await query<Customer>(
      `INSERT INTO customers (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  },
  async update(id: number, data: Partial<Customer>) {
    const keys = Object.keys(data);
    const rows = await query<Customer>(
      `UPDATE customers SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(",")} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  },
};
