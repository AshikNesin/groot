import { Request, Response } from "express";
import { getUser, User } from "@/models/user.model";

export const displayUser = (req: Request, res: Response): void => {
  const user: User = getUser();
  res.json(user); // Send user as JSON
};
