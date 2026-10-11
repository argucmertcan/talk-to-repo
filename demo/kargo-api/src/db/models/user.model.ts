import { query } from "../client";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

export const UserModel = {
  async findById(id: number) {
    const rows = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ?? null;
  },
  async findMany(where: Partial<User> = {}) {
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM users WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : "SELECT * FROM users";
    return query<User>(sql, Object.values(where));
  },
  async insert(data: Omit<User, "id">) {
    const keys = Object.keys(data);
    const rows = await query<User>(
      `INSERT INTO users (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  },
  async update(id: number, data: Partial<User>) {
    const keys = Object.keys(data);
    const rows = await query<User>(
      `UPDATE users SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(",")} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  },
};

export async function findUserByEmail(email: string) {
  const rows = await query<User>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] ?? null;
}
