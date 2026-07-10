import cors from "cors";
import { config } from "../config";

const corsMiddleware = cors({
  origin: config.cors.origins.length ? config.cors.origins : true,
});

export default corsMiddleware;
