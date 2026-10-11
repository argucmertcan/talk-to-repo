import { query } from "../client";

export interface Shipment {
  id: number;
  trackingNo: string;
  status: string;
  senderId: number;
  receiverCity: string;
  weightKg: number;
  createdAt: Date;
}

export const ShipmentModel = {
  async findById(id: number) {
    const rows = await query<Shipment>("SELECT * FROM shipments WHERE id = $1", [id]);
    return rows[0] ?? null;
  },
  async findMany(where: Partial<Shipment> = {}) {
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM shipments WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : "SELECT * FROM shipments";
    return query<Shipment>(sql, Object.values(where));
  },
  async insert(data: Omit<Shipment, "id">) {
    const keys = Object.keys(data);
    const rows = await query<Shipment>(
      `INSERT INTO shipments (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  },
  async update(id: number, data: Partial<Shipment>) {
    const keys = Object.keys(data);
    const rows = await query<Shipment>(
      `UPDATE shipments SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(",")} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  },
};
