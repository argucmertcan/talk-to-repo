import { z } from "zod";
export const createShipmentSchema = z.object({ receiverCity: z.string().min(2), weightKg: z.number().positive().max(70) });
export const statusSchema = z.object({ status: z.enum(["created", "in_transit", "delivered", "returned"]) });
