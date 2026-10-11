export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  smtpUrl: process.env.SMTP_URL ?? "",
  resetTokenTtlMinutes: 30,
};
