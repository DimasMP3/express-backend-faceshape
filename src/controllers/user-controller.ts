import { Request, Response } from "express";

export async function getUserProfile(req: Request, res: Response) {
  res.json({ message: "User profile endpoint placeholder" });
}
