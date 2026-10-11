"""Demo repo üreticisi: kargo-api (kurgusal kargo takip API'si + küçük admin paneli).

Rastgele değil; içine Talk to Repo'nun kendiliğinden bulması gereken sorunlar gömülü:
  1. /admin/export route'unda auth middleware YOK (diğer admin route'ları korumalı)
  2. src/config/legacy.ts içinde sabit yazılmış SAHTE anahtar (kl_live_…)
  3. src/services/order.service.ts ↔ src/services/invoice.service.ts döngüsel bağımlılık
  4. src/utils/oldPricing.ts hiçbir yerden import edilmiyor (ölü dosya)
  5. src/controllers/shipment.controller.ts ~900 satır (god file)
  6. src/services/report.service.ts döngü içinde await db sorgusu (N+1)
  7. Şifre sıfırlama akışı: auth.routes → auth.controller → passwordReset.service → token.service → email.service → user.model

Çalıştır:  python3 demo/generate_kargo_api.py   →  demo/kargo-api/  +  public/demo/kargo-api.zip
"""
import random
import shutil
import zipfile
from pathlib import Path

random.seed(7)
ROOT = Path(__file__).parent / "kargo-api"
F: dict[str, str] = {}


def add(path: str, body: str):
    F[path] = body.strip("\n") + "\n"


# ---------------------------------------------------------------- kök
add("package.json", """
{
  "name": "kargo-api",
  "version": "2.4.1",
  "private": true,
  "scripts": { "dev": "ts-node-dev src/server.ts", "build": "tsc", "test": "jest" },
  "dependencies": { "express": "^4.19.2", "jsonwebtoken": "^9.0.2", "bcryptjs": "^2.4.3", "pg": "^8.11.5", "nodemailer": "^6.9.13", "zod": "^3.23.8" }
}
""")
add("README.md", """
# kargo-api

Kargo takip servisi. Gönderi oluşturma, takip, faturalama ve raporlama uç noktaları + küçük bir admin paneli (`admin-panel/`).

    npm install
    npm run dev
""")
add("tsconfig.json", '{ "compilerOptions": { "target": "ES2022", "module": "commonjs", "strict": true, "outDir": "dist", "esModuleInterop": true } }')
add(".env.example", "DATABASE_URL=postgres://localhost:5432/kargo\nJWT_SECRET=degistir\nSMTP_URL=smtp://localhost:1025\n")

# ---------------------------------------------------------------- server + app
add("src/server.ts", """
import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { startJobs } from "./jobs";

const app = createApp();
app.listen(config.port, () => logger.info(`kargo-api :${config.port}`));
startJobs();
""")
add("src/app.ts", """
import express from "express";
import { authRouter } from "./routes/auth.routes";
import { shipmentRouter } from "./routes/shipment.routes";
import { orderRouter } from "./routes/order.routes";
import { invoiceRouter } from "./routes/invoice.routes";
import { reportRouter } from "./routes/report.routes";
import { adminRouter } from "./routes/admin.routes";
import { trackingRouter } from "./routes/tracking.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { rateLimit } from "./middleware/rateLimit";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
  app.use("/auth", authRouter);
  app.use("/shipments", shipmentRouter);
  app.use("/orders", orderRouter);
  app.use("/invoices", invoiceRouter);
  app.use("/reports", reportRouter);
  app.use("/admin", adminRouter);
  app.use("/track", trackingRouter);
  app.use(errorHandler);
  return app;
}
""")

# ---------------------------------------------------------------- config (+ sahte anahtar)
add("src/config/index.ts", """
export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  smtpUrl: process.env.SMTP_URL ?? "",
  resetTokenTtlMinutes: 30,
};
""")
add("src/config/legacy.ts", """
// Eski kargo ortağı entegrasyonu (v1). Yeni entegrasyon gelince silinecek.
// TODO: anahtarı env'e taşı
export const LEGACY_CARRIER = {
  baseUrl: "https://api.eski-kargo-ortagi.example/v1",
  apiKey: "kl_live_4f9a8c2e7b1d6f30a9e5c8b27d41f6a3",
  timeoutMs: 8000,
};
""")

# ---------------------------------------------------------------- db
add("src/db/client.ts", """
import { Pool } from "pg";
import { config } from "../config";

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}
""")
MODELS = {
    "user": ("users", ["id", "email", "passwordHash", "role", "createdAt"]),
    "shipment": ("shipments", ["id", "trackingNo", "status", "senderId", "receiverCity", "weightKg", "createdAt"]),
    "order": ("orders", ["id", "customerId", "total", "status", "createdAt"]),
    "invoice": ("invoices", ["id", "orderId", "amount", "vat", "paidAt"]),
    "customer": ("customers", ["id", "name", "email", "city"]),
    "resetToken": ("reset_tokens", ["id", "userId", "tokenHash", "expiresAt", "usedAt"]),
}
for name, (table, cols) in MODELS.items():
    T = name[0].upper() + name[1:]
    fields = "\n".join(f"  {c}: {'Date' if c.endswith('At') else 'number' if c in ('id','total','amount','vat','weightKg','senderId','customerId','orderId','userId') else 'string'};" for c in cols)
    add(f"src/db/models/{name}.model.ts", f"""
import {{ query }} from "../client";

export interface {T} {{
{fields}
}}

export const {T}Model = {{
  async findById(id: number) {{
    const rows = await query<{T}>("SELECT * FROM {table} WHERE id = $1", [id]);
    return rows[0] ?? null;
  }},
  async findMany(where: Partial<{T}> = {{}}) {{
    const keys = Object.keys(where);
    const sql = keys.length ? `SELECT * FROM {table} WHERE ${{keys.map((k, i) => `${{k}} = $${{i + 1}}`).join(" AND ")}}` : "SELECT * FROM {table}";
    return query<{T}>(sql, Object.values(where));
  }},
  async insert(data: Omit<{T}, "id">) {{
    const keys = Object.keys(data);
    const rows = await query<{T}>(
      `INSERT INTO {table} (${{keys.join(",")}}) VALUES (${{keys.map((_, i) => `$${{i + 1}}`).join(",")}}) RETURNING *`,
      Object.values(data),
    );
    return rows[0];
  }},
  async update(id: number, data: Partial<{T}>) {{
    const keys = Object.keys(data);
    const rows = await query<{T}>(
      `UPDATE {table} SET ${{keys.map((k, i) => `${{k}} = $${{i + 2}}`).join(",")}} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)],
    );
    return rows[0];
  }},
}};
""")
add("src/db/models/user.model.ts", F["src/db/models/user.model.ts"].rstrip() + """

export async function findUserByEmail(email: string) {
  const rows = await query<User>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] ?? null;
}
""")
add("src/db/migrations/001_init.sql", "\n".join(f"CREATE TABLE {t} (id SERIAL PRIMARY KEY);" for t, _ in MODELS.values()))

# ---------------------------------------------------------------- middleware
add("src/middleware/auth.ts", """
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthedRequest extends Request {
  user?: { id: number; role: "admin" | "staff" | "customer" };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Giriş gerekli" });
  try {
    req.user = jwt.verify(token, config.jwtSecret) as AuthedRequest["user"];
    next();
  } catch {
    res.status(401).json({ error: "Geçersiz oturum" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Yetkisiz" });
  next();
}
""")
add("src/middleware/errorHandler.ts", """
import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err.message);
  res.status(500).json({ error: "Beklenmeyen hata" });
}
""")
add("src/middleware/requestLogger.ts", """
import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  logger.info(`${req.method} ${req.path}`);
  next();
}
""")
add("src/middleware/rateLimit.ts", """
import type { Request, Response, NextFunction } from "express";

export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { n: number; at: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "anon";
    const now = Date.now();
    const h = hits.get(key);
    if (!h || now - h.at > opts.windowMs) hits.set(key, { n: 1, at: now });
    else if (++h.n > opts.max) return res.status(429).json({ error: "Çok fazla istek" });
    next();
  };
}
""")
add("src/middleware/validate.ts", """
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  req.body = parsed.data;
  next();
};
""")

# ---------------------------------------------------------------- utils
add("src/utils/logger.ts", """
export const logger = {
  info: (m: string) => console.log(`[info] ${new Date().toISOString()} ${m}`),
  warn: (m: string) => console.warn(`[warn] ${m}`),
  error: (m: string) => console.error(`[error] ${m}`),
};
""")
add("src/utils/money.ts", """
export const toKurus = (tl: number) => Math.round(tl * 100);
export const fromKurus = (k: number) => k / 100;
export const formatTL = (tl: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tl);
export const withVat = (net: number, rate = 0.2) => Math.round(net * (1 + rate) * 100) / 100;
""")
add("src/utils/dates.ts", """
export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
export const isExpired = (d: Date) => d.getTime() < Date.now();
export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
""")
add("src/utils/crypto.ts", """
import { createHash, randomBytes } from "crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("hex");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
""")
add("src/utils/trackingNo.ts", """
export function generateTrackingNo(city: string) {
  const code = city.slice(0, 3).toUpperCase();
  return `KR${code}${Date.now().toString(36).toUpperCase()}`;
}
""")
add("src/utils/oldPricing.ts", """
// v1 fiyatlandırma. pricing.service.ts'e taşındı; artık kullanılmıyor olmalı.
export function oldPrice(weightKg: number, city: string) {
  const base = city === "İstanbul" ? 45 : 60;
  return base + Math.max(0, weightKg - 1) * 12.5;
}

export function oldExpressSurcharge(price: number) {
  return price * 0.35;
}
""")
add("src/utils/pagination.ts", """
export function paginate(page = 1, size = 20) {
  const p = Math.max(1, page), s = Math.min(100, Math.max(1, size));
  return { limit: s, offset: (p - 1) * s };
}
""")

# ---------------------------------------------------------------- services
add("src/services/token.service.ts", """
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
""")
add("src/services/passwordReset.service.ts", """
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
""")
add("src/services/auth.service.ts", """
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "../db/models/user.model";
import { config } from "../config";

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: "8h" });
}
""")
add("src/services/pricing.service.ts", """
import { withVat } from "../utils/money";

const ZONES: Record<string, number> = { "İstanbul": 49, "Ankara": 55, "İzmir": 55 };

export function quote(weightKg: number, city: string, express = false) {
  const base = ZONES[city] ?? 65;
  const net = base + Math.max(0, weightKg - 1) * 14 + (express ? 40 : 0);
  return { net, gross: withVat(net) };
}
""")
add("src/services/order.service.ts", """
import { OrderModel } from "../db/models/order.model";
import { createInvoiceForOrder } from "./invoice.service";
import { quote } from "./pricing.service";

export async function createOrder(customerId: number, items: { weightKg: number; city: string }[]) {
  const total = items.reduce((s, i) => s + quote(i.weightKg, i.city).gross, 0);
  const order = await OrderModel.insert({ customerId, total, status: "new", createdAt: new Date() });
  await createInvoiceForOrder(order.id);
  return order;
}

export async function getOrderTotal(orderId: number) {
  const order = await OrderModel.findById(orderId);
  return order?.total ?? 0;
}
""")
add("src/services/invoice.service.ts", """
import { InvoiceModel } from "../db/models/invoice.model";
import { getOrderTotal } from "./order.service";

export async function createInvoiceForOrder(orderId: number) {
  const amount = await getOrderTotal(orderId);
  const vat = Math.round((amount - amount / 1.2) * 100) / 100;
  return InvoiceModel.insert({ orderId, amount, vat, paidAt: null as unknown as Date });
}

export async function markPaid(invoiceId: number) {
  return InvoiceModel.update(invoiceId, { paidAt: new Date() });
}
""")
add("src/services/shipment.service.ts", """
import { ShipmentModel } from "../db/models/shipment.model";
import { generateTrackingNo } from "../utils/trackingNo";
import { notifyStatusChange } from "../notifications/sms.service";

export async function createShipment(senderId: number, receiverCity: string, weightKg: number) {
  return ShipmentModel.insert({
    trackingNo: generateTrackingNo(receiverCity), status: "created", senderId, receiverCity, weightKg, createdAt: new Date(),
  });
}

export async function updateStatus(id: number, status: string) {
  const s = await ShipmentModel.update(id, { status });
  await notifyStatusChange(s.trackingNo, status);
  return s;
}
""")
add("src/services/tracking.service.ts", """
import { ShipmentModel } from "../db/models/shipment.model";

export async function track(trackingNo: string) {
  const [s] = await ShipmentModel.findMany({ trackingNo });
  return s ? { trackingNo, status: s.status, city: s.receiverCity } : null;
}
""")
add("src/services/report.service.ts", """
import { CustomerModel } from "../db/models/customer.model";
import { OrderModel } from "../db/models/order.model";
import { startOfMonth } from "../utils/dates";

// Aylık müşteri raporu (admin paneli "Raporlar" sayfası)
export async function monthlyCustomerReport() {
  const customers = await CustomerModel.findMany();
  const report = [];
  for (const c of customers) {
    // her müşteri için ayrı sorgu
    const orders = await OrderModel.findMany({ customerId: c.id });
    const thisMonth = orders.filter((o) => o.createdAt >= startOfMonth());
    report.push({ customer: c.name, city: c.city, orders: thisMonth.length, total: thisMonth.reduce((s, o) => s + o.total, 0) });
  }
  return report.sort((a, b) => b.total - a.total);
}
""")
add("src/services/export.service.ts", """
import { UserModel } from "../db/models/user.model";
import { CustomerModel } from "../db/models/customer.model";
import { OrderModel } from "../db/models/order.model";

// Tüm müşteri + kullanıcı + sipariş verisini CSV olarak döker
export async function exportAll() {
  const [users, customers, orders] = await Promise.all([UserModel.findMany(), CustomerModel.findMany(), OrderModel.findMany()]);
  const rows = [
    "type,id,email,name,city,total",
    ...users.map((u) => `user,${u.id},${u.email},,,`),
    ...customers.map((c) => `customer,${c.id},${c.email},${c.name},${c.city},`),
    ...orders.map((o) => `order,${o.id},,,,${o.total}`),
  ];
  return rows.join("\\n");
}
""")
add("src/services/carrier.service.ts", """
import { LEGACY_CARRIER } from "../config/legacy";

export async function handOverToLegacyCarrier(trackingNo: string) {
  const res = await fetch(`${LEGACY_CARRIER.baseUrl}/handover`, {
    method: "POST",
    headers: { "x-api-key": LEGACY_CARRIER.apiKey, "content-type": "application/json" },
    body: JSON.stringify({ trackingNo }),
  });
  return res.ok;
}
""")

# ---------------------------------------------------------------- notifications
add("src/notifications/email.service.ts", """
import nodemailer from "nodemailer";
import { config } from "../config";
import { renderTemplate } from "./templates";

const transport = nodemailer.createTransport(config.smtpUrl);

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `https://panel.kargo.example/sifre-sifirla?token=${token}`;
  await transport.sendMail({ to, subject: "Şifre sıfırlama", html: renderTemplate("reset", { link }) });
}

export async function sendInvoiceEmail(to: string, invoiceId: number) {
  await transport.sendMail({ to, subject: `Faturanız #${invoiceId}`, html: renderTemplate("invoice", { invoiceId }) });
}
""")
add("src/notifications/sms.service.ts", """
import { logger } from "../utils/logger";

export async function notifyStatusChange(trackingNo: string, status: string) {
  logger.info(`SMS → ${trackingNo}: ${status}`);
}
""")
add("src/notifications/templates.ts", """
const T: Record<string, (v: Record<string, unknown>) => string> = {
  reset: (v) => `<p>Şifreni sıfırlamak için <a href="${v.link}">buraya tıkla</a>. Bağlantı 30 dakika geçerli.</p>`,
  invoice: (v) => `<p>#${v.invoiceId} numaralı faturanız hazır.</p>`,
};
export const renderTemplate = (name: string, vars: Record<string, unknown>) => T[name](vars);
""")

# ---------------------------------------------------------------- validators
add("src/validators/auth.schema.ts", """
import { z } from "zod";
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({ token: z.string().length(64), password: z.string().min(10) });
""")
add("src/validators/shipment.schema.ts", """
import { z } from "zod";
export const createShipmentSchema = z.object({ receiverCity: z.string().min(2), weightKg: z.number().positive().max(70) });
export const statusSchema = z.object({ status: z.enum(["created", "in_transit", "delivered", "returned"]) });
""")
add("src/validators/order.schema.ts", """
import { z } from "zod";
export const createOrderSchema = z.object({ items: z.array(z.object({ weightKg: z.number().positive(), city: z.string() })).min(1) });
""")

# ---------------------------------------------------------------- controllers
add("src/controllers/auth.controller.ts", """
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
""")
add("src/controllers/order.controller.ts", """
import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { createOrder } from "../services/order.service";

export async function createOrderHandler(req: AuthedRequest, res: Response) {
  const order = await createOrder(req.user!.id, req.body.items);
  res.status(201).json(order);
}
""")
add("src/controllers/invoice.controller.ts", """
import type { Request, Response } from "express";
import { markPaid } from "../services/invoice.service";

export async function markPaidHandler(req: Request, res: Response) {
  res.json(await markPaid(Number(req.params.id)));
}
""")
add("src/controllers/report.controller.ts", """
import type { Request, Response } from "express";
import { monthlyCustomerReport } from "../services/report.service";

export async function monthlyReportHandler(_req: Request, res: Response) {
  res.json(await monthlyCustomerReport());
}
""")
add("src/controllers/admin.controller.ts", """
import type { Request, Response } from "express";
import { exportAll } from "../services/export.service";
import { UserModel } from "../db/models/user.model";

export async function listUsersHandler(_req: Request, res: Response) {
  res.json(await UserModel.findMany());
}

export async function exportHandler(_req: Request, res: Response) {
  res.setHeader("content-type", "text/csv");
  res.send(await exportAll());
}
""")
add("src/controllers/tracking.controller.ts", """
import type { Request, Response } from "express";
import { track } from "../services/tracking.service";

export async function trackHandler(req: Request, res: Response) {
  const t = await track(req.params.no);
  t ? res.json(t) : res.status(404).json({ error: "Bulunamadı" });
}
""")

# God file: shipment.controller.ts ~900 satır, 14 sorumluluk
parts = ["""import type { Request, Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { createShipment, updateStatus } from "../services/shipment.service";
import { ShipmentModel } from "../db/models/shipment.model";
import { quote } from "../services/pricing.service";
import { handOverToLegacyCarrier } from "../services/carrier.service";
import { paginate } from "../utils/pagination";
import { logger } from "../utils/logger";
"""]
HANDLERS = ["create", "list", "detail", "updateStatus", "cancel", "returnShipment", "quotePrice", "handOver", "bulkImport",
            "label", "proofOfDelivery", "reschedule", "addressChange", "damageReport"]
for h in HANDLERS:
    steps = []
    for k in range(random.randint(24, 30)):
        steps.append(f"  // adım {k + 1}: {random.choice(['doğrulama', 'iş kuralı', 'loglama', 'eski uyumluluk', 'durum kontrolü', 'hesaplama'])}")
        steps.append(f"  const v{k} = {random.choice(['req.body', 'req.params', 'req.query'])}?.{random.choice(['id', 'status', 'city', 'weightKg', 'note', 'page'])};")
        if k % 9 == 0:
            steps.append(f"  if (v{k} === undefined) logger.warn(\"{h}: eksik alan v{k}\");")
    body = "\n".join(steps)
    parts.append(f"""
export async function {h}Handler(req: AuthedRequest, res: Response) {{
{body}
  try {{
    const result = await ShipmentModel.findMany({{}});
    res.json({{ ok: true, handler: "{h}", count: result.length }});
  }} catch (e) {{
    logger.error((e as Error).message);
    res.status(500).json({{ error: "{h} başarısız" }});
  }}
}}
""")
parts.append("""
export const _unused = { createShipment, updateStatus, quote, handOverToLegacyCarrier, paginate };
export type _R = Request;
""")
add("src/controllers/shipment.controller.ts", "\n".join(parts))

# ---------------------------------------------------------------- routes
add("src/routes/auth.routes.ts", """
import { Router } from "express";
import { loginHandler, forgotPasswordHandler, resetPasswordHandler } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { loginSchema, forgotSchema, resetSchema } from "../validators/auth.schema";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), loginHandler);
authRouter.post("/forgot-password", validate(forgotSchema), forgotPasswordHandler);
authRouter.post("/reset-password", validate(resetSchema), resetPasswordHandler);
""")
add("src/routes/shipment.routes.ts", """
import { Router } from "express";
import * as c from "../controllers/shipment.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createShipmentSchema, statusSchema } from "../validators/shipment.schema";

export const shipmentRouter = Router();
shipmentRouter.post("/", requireAuth, validate(createShipmentSchema), c.createHandler);
shipmentRouter.get("/", requireAuth, c.listHandler);
shipmentRouter.get("/:id", requireAuth, c.detailHandler);
shipmentRouter.patch("/:id/status", requireAuth, validate(statusSchema), c.updateStatusHandler);
shipmentRouter.post("/:id/cancel", requireAuth, c.cancelHandler);
shipmentRouter.post("/:id/return", requireAuth, c.returnShipmentHandler);
shipmentRouter.post("/quote", requireAuth, c.quotePriceHandler);
""")
add("src/routes/order.routes.ts", """
import { Router } from "express";
import { createOrderHandler } from "../controllers/order.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrderSchema } from "../validators/order.schema";

export const orderRouter = Router();
orderRouter.post("/", requireAuth, validate(createOrderSchema), createOrderHandler);
""")
add("src/routes/invoice.routes.ts", """
import { Router } from "express";
import { markPaidHandler } from "../controllers/invoice.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const invoiceRouter = Router();
invoiceRouter.post("/:id/paid", requireAuth, requireAdmin, markPaidHandler);
""")
add("src/routes/report.routes.ts", """
import { Router } from "express";
import { monthlyReportHandler } from "../controllers/report.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const reportRouter = Router();
reportRouter.get("/monthly", requireAuth, requireAdmin, monthlyReportHandler);
""")
add("src/routes/admin.routes.ts", """
import { Router } from "express";
import { listUsersHandler, exportHandler } from "../controllers/admin.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const adminRouter = Router();
adminRouter.get("/users", requireAuth, requireAdmin, listUsersHandler);
adminRouter.get("/export", exportHandler);
""")
add("src/routes/tracking.routes.ts", """
import { Router } from "express";
import { trackHandler } from "../controllers/tracking.controller";

export const trackingRouter = Router();
trackingRouter.get("/:no", trackHandler);
""")

# ---------------------------------------------------------------- jobs
add("src/jobs/index.ts", """
import { startInvoiceReminderJob } from "./invoiceReminder.job";
import { startCleanupJob } from "./cleanup.job";

export function startJobs() {
  startInvoiceReminderJob();
  startCleanupJob();
}
""")
add("src/jobs/invoiceReminder.job.ts", """
import { InvoiceModel } from "../db/models/invoice.model";
import { logger } from "../utils/logger";

export function startInvoiceReminderJob() {
  setInterval(async () => {
    const unpaid = (await InvoiceModel.findMany()).filter((i) => !i.paidAt);
    logger.info(`ödenmemiş fatura: ${unpaid.length}`);
  }, 6 * 60 * 60 * 1000);
}
""")
add("src/jobs/cleanup.job.ts", """
import { query } from "../db/client";

export function startCleanupJob() {
  setInterval(() => query("DELETE FROM reset_tokens WHERE expires_at < now()"), 60 * 60 * 1000);
}
""")

# ---------------------------------------------------------------- tests
add("tests/pricing.test.ts", """
import { quote } from "../src/services/pricing.service";

test("İstanbul 1 kg", () => {
  expect(quote(1, "İstanbul").net).toBe(49);
});
""")
add("tests/passwordReset.test.ts", """
import { resetPassword } from "../src/services/passwordReset.service";

test("geçersiz token reddedilir", async () => {
  await expect(resetPassword("x".repeat(64), "yeni-sifre-123")).rejects.toThrow();
});
""")
add("tests/trackingNo.test.ts", """
import { generateTrackingNo } from "../src/utils/trackingNo";

test("şehir kodu", () => {
  expect(generateTrackingNo("Ankara").startsWith("KRANK")).toBe(true);
});
""")

# ---------------------------------------------------------------- admin panel (React)
add("admin-panel/package.json", '{ "name": "kargo-admin", "private": true, "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" } }')
add("admin-panel/src/main.tsx", """
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
""")
add("admin-panel/src/App.tsx", """
import { useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Shipments } from "./pages/Shipments";
import { Reports } from "./pages/Reports";
import { Users } from "./pages/Users";
import { ResetPassword } from "./pages/ResetPassword";

const PAGES = { Dashboard, Shipments, Reports, Users, ResetPassword };

export function App() {
  const [page, setPage] = useState<keyof typeof PAGES>("Dashboard");
  const Page = PAGES[page];
  return <Layout onNavigate={(p) => setPage(p as keyof typeof PAGES)}><Page /></Layout>;
}
""")
add("admin-panel/src/api/client.ts", """
const BASE = "/api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(BASE + path, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
""")
add("admin-panel/src/api/shipments.ts", """
import { api } from "./client";
export const listShipments = () => api<{ trackingNo: string; status: string }[]>("/shipments");
""")
add("admin-panel/src/api/reports.ts", """
import { api } from "./client";
export const monthlyReport = () => api<{ customer: string; total: number }[]>("/reports/monthly");
""")
add("admin-panel/src/api/auth.ts", """
import { api } from "./client";
export const resetPassword = (token: string, password: string) =>
  api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
""")
add("admin-panel/src/components/Layout.tsx", """
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children, onNavigate }: { children: ReactNode; onNavigate: (p: string) => void }) {
  return <div className="layout"><Sidebar onNavigate={onNavigate} /><main>{children}</main></div>;
}
""")
add("admin-panel/src/components/Sidebar.tsx", """
const ITEMS = ["Dashboard", "Shipments", "Reports", "Users"];

export function Sidebar({ onNavigate }: { onNavigate: (p: string) => void }) {
  return <nav>{ITEMS.map((i) => <button key={i} onClick={() => onNavigate(i)}>{i}</button>)}</nav>;
}
""")
add("admin-panel/src/components/StatCard.tsx", """
export function StatCard({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><b>{value}</b></div>;
}
""")
add("admin-panel/src/components/Table.tsx", """
export function Table<T extends Record<string, unknown>>({ rows }: { rows: T[] }) {
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return <table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>)}</tbody></table>;
}
""")
add("admin-panel/src/pages/Dashboard.tsx", """
import { StatCard } from "../components/StatCard";

export function Dashboard() {
  return <div><StatCard label="Bugünkü gönderi" value={128} /><StatCard label="Yoldaki" value={342} /></div>;
}
""")
add("admin-panel/src/pages/Shipments.tsx", """
import { useEffect, useState } from "react";
import { listShipments } from "../api/shipments";
import { Table } from "../components/Table";

export function Shipments() {
  const [rows, setRows] = useState<{ trackingNo: string; status: string }[]>([]);
  useEffect(() => { listShipments().then(setRows); }, []);
  return <Table rows={rows} />;
}
""")
add("admin-panel/src/pages/Reports.tsx", """
import { useEffect, useState } from "react";
import { monthlyReport } from "../api/reports";
import { Table } from "../components/Table";

export function Reports() {
  const [rows, setRows] = useState<{ customer: string; total: number }[]>([]);
  useEffect(() => { monthlyReport().then(setRows); }, []);
  return <Table rows={rows} />;
}
""")
add("admin-panel/src/pages/Users.tsx", """
export function Users() {
  return <p>Kullanıcı listesi /admin/users üzerinden gelir.</p>;
}
""")
add("admin-panel/src/pages/ResetPassword.tsx", """
import { useState } from "react";
import { resetPassword } from "../api/auth";

export function ResetPassword() {
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  return done ? <p>Şifren güncellendi.</p> : (
    <form onSubmit={async (e) => { e.preventDefault(); await resetPassword(token, pw); setDone(true); }}>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={10} />
      <button>Şifremi güncelle</button>
    </form>
  );
}
""")

# ---------------------------------------------------------------- yaz + zip
if ROOT.exists():
    shutil.rmtree(ROOT)
for p, body in F.items():
    path = ROOT / p
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body)
out = Path(__file__).parent.parent / "public" / "demo"
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out / "kargo-api.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(F):
        z.write(ROOT / p, f"kargo-api/{p}")

loc = {p: b.count("\n") for p, b in F.items()}
print(f"{len(F)} dosya, {sum(loc.values())} satır")
print("en büyük:", sorted(loc.items(), key=lambda x: -x[1])[:3])
