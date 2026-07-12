import express from "express";
import request from "supertest";
import { describe, it, expect } from "vite-plus/test";

/**
 * Server body-parser regression tests.
 *
 * Mirrors the body-parser block in packages/core/src/server.ts. The express.text()
 * middleware is load-bearing for AWS SNS webhooks (SES inbound email, S3 event
 * notifications, CloudWatch alarms): SNS posts notifications as
 * Content-Type: text/plain even when the body is JSON, and express.json()
 * skips text/plain — so without express.text(), req.body arrives as {} and the
 * webhook silently 400s. If you change the parsers in server.ts, update both.
 */
const buildApp = () => {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(express.text({ type: "text/plain", limit: "1mb" }));
  app.post("/echo", (req, res) => res.json({ body: req.body, type: typeof req.body }));
  return app;
};

describe("server body parsers", () => {
  it("parses application/json into an object", async () => {
    const res = await request(buildApp()).post("/echo").send({ hello: "world" });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ hello: "world" });
    expect(res.body.type).toBe("object");
  });

  it("parses text/plain into a string (AWS SNS webhooks)", async () => {
    // SNS posts JSON bodies as text/plain.
    const snsBody = JSON.stringify({ Type: "Notification", Message: { foo: "bar" } });
    const res = await request(buildApp())
      .post("/echo")
      .set("Content-Type", "text/plain")
      .send(snsBody);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("string");
    expect(res.body.body).toBe(snsBody);
  });

  it("parses application/x-www-form-urlencoded into an object", async () => {
    const res = await request(buildApp())
      .post("/echo")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("name=ash&role=admin");
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ name: "ash", role: "admin" });
  });

  it("accepts a large (multi-mb) JSON body within the 50mb limit", async () => {
    const big = { blob: "x".repeat(2 * 1024 * 1024) }; // 2mb
    const res = await request(buildApp()).post("/echo").send(big);
    expect(res.status).toBe(200);
    expect((res.body.body.blob as string).length).toBe(2 * 1024 * 1024);
  });
});
