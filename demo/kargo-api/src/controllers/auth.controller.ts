import type { Request, Response } from "express";
import { login } from "../services/auth.service";
import { requestPasswordReset, resetPassword } from "../services/passwordReset.service";

export async function loginHandler(req: Request, res: Response) {
  const token = await login(req.body.email, req.body.password);
  if (!token) return res.status(401).json({ error: "E-posta ya da şifre hatalı" });
  res.json({ token });
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  await requestPasswordReset(req.body.email);
  res.json({ ok: true, message: "Kayıtlıysa e-posta gönderildi" });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    await resetPassword(req.body.token, req.body.password);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}
