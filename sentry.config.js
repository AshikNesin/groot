// Sentry configuration for source maps
export default {
  org: "sentry",
  project: "express-typescript-boilerplate",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  url: "https://sentry.io/",
  include: ["./dist"],
  ignore: ["node_modules"],
  deploy: {
    env: process.env.NODE_ENV || "production"
  },
  // Set this to true if you don't want to upload source maps
  // Useful for development
  skipUpload: process.env.NODE_ENV === "development",
};
