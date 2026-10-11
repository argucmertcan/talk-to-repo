import { randomToken, sha256 } from "../utils/crypto";
import { addMinutes, isExpired } from "../utils/dates";
import { ResetTokenModel } from "../db/models/resetToken.model";
import { config } from "../config";

export async function createResetToken(userId: number) {
  const token = randomToken();
  await ResetTokenModel.insert({
    userId,
    tokenHash: sha256(token),
    expiresAt: addMinutes(new Date(), config.resetTokenTtlMinutes),
    usedAt: null as unknown as Date,
  });
  return token;
}

export async function consumeResetToken(token: string) {
  const [row] = await ResetTokenModel.findMany({ tokenHash: sha256(token) });
  if (!row || row.usedAt || isExpired(row.expiresAt)) return null;
  await ResetTokenModel.update(row.id, { usedAt: new Date() });
  return row.userId;
}
