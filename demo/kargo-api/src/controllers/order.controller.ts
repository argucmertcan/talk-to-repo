import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { createOrder } from "../services/order.service";

export async function createOrderHandler(req: AuthedRequest, res: Response) {
  const order = await createOrder(req.user!.id, req.body.items);
  res.status(201).json(order);
}
