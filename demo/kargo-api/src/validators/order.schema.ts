import { z } from "zod";
export const createOrderSchema = z.object({ items: z.array(z.object({ weightKg: z.number().positive(), city: z.string() })).min(1) });
