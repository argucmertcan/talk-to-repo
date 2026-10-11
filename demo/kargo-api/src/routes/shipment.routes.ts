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
