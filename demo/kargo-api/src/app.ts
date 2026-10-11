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
