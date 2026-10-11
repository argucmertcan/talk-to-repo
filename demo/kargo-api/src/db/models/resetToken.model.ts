import { query } from "../client";

export interface ResetToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date;
}

export const ResetTokenModel = {
  async findById(id: number) {
    const rows = await query<ResetToken>("SELECT * FROM reset_tokens WHERE id = $1", [id]);
    return rows[0] ?? null;
  },
  async findMany(where: Partial<ResetToken> = {}) {
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM reset_tokens WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : "SELECT * FROM reset_tokens";
    return query<ResetToken>(sql, Object.values(where));
  },
  async insert(data: Omit<ResetToken, "id">) {
    const keys = Object.keys(data);
    const rows = await query<ResetToken>(
      `INSERT INTO reset_tokens (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  },
  async update(id: number, data: Partial<ResetToken>) {
    const keys = Object.keys(data);
    const rows = await query<ResetToken>(
      `UPDATE reset_tokens SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(",")} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  },
};
