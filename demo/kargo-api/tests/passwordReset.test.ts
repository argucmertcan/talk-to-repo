import { resetPassword } from "../src/services/passwordReset.service";

test("geçersiz token reddedilir", async () => {
  await expect(resetPassword("x".repeat(64), "yeni-sifre-123")).rejects.toThrow();
});
