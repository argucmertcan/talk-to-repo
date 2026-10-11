import { Router } from "express";
import { loginHandler, forgotPasswordHandler, resetPasswordHandler } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { loginSchema, forgotSchema, resetSchema } from "../validators/auth.schema";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), loginHandler);
authRouter.post("/forgot-password", validate(forgotSchema), forgotPasswordHandler);
authRouter.post("/reset-password", validate(resetSchema), resetPasswordHandler);
