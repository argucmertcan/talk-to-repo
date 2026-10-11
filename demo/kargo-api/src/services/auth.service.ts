import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "../db/models/user.model";
import { config } from "../config";

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: "8h" });
}
