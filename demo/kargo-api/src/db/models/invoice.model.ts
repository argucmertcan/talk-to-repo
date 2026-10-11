import { query } from "../client";

export interface Invoice {
  id: number;
  orderId: number;
  amount: number;
  vat: number;
  paidAt: Date;
}

export const InvoiceModel = {
  async findById(id: number) {
    const rows = await query<Invoice>("SELECT * FROM invoices WHERE id = $1", [id]);
    return rows[0] ?? null;
  },
  async findMany(where: Partial<Invoice> = {}) {
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM invoices WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : "SELECT * FROM invoices";
    return query<Invoice>(sql, Object.values(where));
  },
  async insert(data: Omit<Invoice, "id">) {
    const keys = Object.keys(data);
    const rows = await query<Invoice>(
      `INSERT INTO invoices (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  },
  async update(id: number, data: Partial<Invoice>) {
    const keys = Object.keys(data);
    const rows = await query<Invoice>(
      `UPDATE invoices SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(",")} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  },
};
