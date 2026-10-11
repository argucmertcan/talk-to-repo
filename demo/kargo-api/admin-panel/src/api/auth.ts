import { api } from "./client";
export const resetPassword = (token: string, password: string) =>
  api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
