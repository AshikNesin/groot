import { Router } from "express";
import todoRoutes from "@/routes/todo.routes";

const router = Router();

router.use("/todos", todoRoutes);

export const apiRouter = router;
