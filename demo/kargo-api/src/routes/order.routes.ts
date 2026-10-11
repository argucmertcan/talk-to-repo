import { Router } from "express";
import { createOrderHandler } from "../controllers/order.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrderSchema } from "../validators/order.schema";

export const orderRouter = Router();
orderRouter.post("/", requireAuth, validate(createOrderSchema), createOrderHandler);
