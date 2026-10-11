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
