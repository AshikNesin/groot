import basicAuth from "express-basic-auth";
import { env } from "@/env";

const basicAuthMiddleware = basicAuth({
  users: {
    [env.BASIC_AUTH_USERNAME]: env.BASIC_AUTH_PASSWORD,
  },
  challenge: true,
  realm: "Restricted Area. Please login.",
  unauthorizedResponse: "Unauthorized",
});

export default basicAuthMiddleware;
