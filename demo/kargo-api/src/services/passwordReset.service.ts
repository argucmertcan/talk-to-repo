import bcrypt from "bcryptjs";
import { findUserByEmail, UserModel } from "../db/models/user.model";
import { createResetToken, consumeResetToken } from "./token.service";
import { sendPasswordResetEmail } from "../notifications/email.service";
import { logger } from "../utils/logger";

// 1) Kullanıcı e-postasını gönderir → token üretilir, e-postayla link gider
export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    logger.warn(`şifre sıfırlama: bilinmeyen e-posta`);
    return; // kullanıcı var mı yok mu belli etmiyoruz
  }
  const token = await createResetToken(user.id);
  await sendPasswordResetEmail(user.email, token);
}

// 2) Linkteki token + yeni şifre → token tek kullanımlık doğrulanır, şifre güncellenir
export async function resetPassword(token: string, newPassword: string) {
  const userId = await consumeResetToken(token);
  if (!userId) throw new Error("Geçersiz ya da süresi dolmuş bağlantı");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await UserModel.update(userId, { passwordHash });
  return true;
}
