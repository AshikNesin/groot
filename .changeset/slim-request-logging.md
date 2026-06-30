---
"groot": patch
---

fix(core): reduce request logger noise and emit a single line per request

- Suppress logs for Vite dev-server requests (/@fs/, /@vite/, /node_modules/,
  /src/ and asset extensions like .js, .css, .svg). These flooded dev logs.
- Merge the "Incoming" and "Request completed" entries into a single log on
  `res.finish`, which halves log volume and keeps method, url, status, and
  duration in one line (`METHOD URL → STATUS in DURATION`).
