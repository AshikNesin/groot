# KV (Key-Value) Storage System

Simple key-value storage for caching, sessions, and other temporary data, backed by [Keyv](https://github.com/jaredwray/keyv).

The backend is selected by `DATABASE_ENGINE` to match the Prisma adapter:

| Engine           | Adapter                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| SQLite (default) | [`@keyv/sqlite`](https://github.com/jaredwray/keyv/tree/main/packages/sqlite)     |
| PostgreSQL       | [`@keyv/postgres`](https://github.com/jaredwray/keyv/tree/main/packages/postgres) |

Both adapters implement the same Keyv interface, so the rest of the code is engine-agnostic, and both packages are always installed (dual-engine support). See [Database Engines](./database-engines.md) for the engine matrix.

## Usage

### Basic Usage

```typescript
import kv from "@groot/core/kv";

// Set a value
await kv.set("user:123", { name: "John", age: 30 });

// Get a value
const user = await kv.get("user:123");
console.log(user); // { name: "John", age: 30 }

// Delete a value
await kv.delete("user:123");

// Check if a key exists
const hasKey = await kv.has("user:123");
```

### Using Namespaces

Namespaces help organize your data by prefixing keys with a namespace:

```typescript
import { createNamespaceKv } from "@groot/core/kv";

// Create a namespaced KV instance for sessions
const sessionKv = createNamespaceKv("sessions");

// Set a session value (stored as "sessions:123")
await sessionKv.set("123", { userId: "user:123", loggedIn: true });

// Get the session value
const session = await sessionKv.get("123");

// Clear all sessions
await sessionKv.clear();
```

### Using the Underlying Keyv Store

For more advanced use cases, you can access the underlying KeyvPostgres store directly and build a custom Keyv instance with its own namespace:

```typescript
import { store } from "@groot/core/kv";
import Keyv from "keyv";

// Create a custom Keyv instance backed by the same PostgreSQL store,
// scoped to a "cache" namespace
const cacheKv = new Keyv({ store, namespace: "cache" });

// Use it like a regular Keyv instance
await cacheKv.set("api-data", { data: "example" });
const data = await cacheKv.get("api-data");
```

## Common Use Cases

### 1. API Response Caching

```typescript
import { createNamespaceKv } from "@groot/core/kv";

const cacheKv = createNamespaceKv("api-cache");

// Cache API responses for 5 minutes (300000ms)
async function getCachedData(key: string, fetchFn: () => Promise<any>) {
  let data = await cacheKv.get(key);

  if (!data) {
    data = await fetchFn();
    await cacheKv.set(key, data, 300000); // 5 minutes TTL
  }

  return data;
}
```

### 2. Session Storage

```typescript
import { createNamespaceKv } from "@groot/core/kv";

const sessionKv = createNamespaceKv("sessions");

async function createSession(userId: string, sessionData: any) {
  const sessionId = generateSessionId();
  await sessionKv.set(sessionId, {
    userId,
    ...sessionData,
  });
  return sessionId;
}

async function getSession(sessionId: string) {
  return await sessionKv.get(sessionId);
}

async function destroySession(sessionId: string) {
  await sessionKv.delete(sessionId);
}
```

### 3. Rate Limiting

```typescript
import { createNamespaceKv } from "@groot/core/kv";

const rateLimitKv = createNamespaceKv("rate-limit");

async function checkRateLimit(ip: string, limit: number, window: number) {
  const key = `ip:${ip}`;
  const count = (await rateLimitKv.get(key)) || 0;

  if (count >= limit) {
    return false; // Limit exceeded
  }

  // Increment the counter
  await rateLimitKv.set(key, count + 1, window);
  return true;
}
```

## Error Handling

The KV system logs errors automatically. If you need custom error handling:

```typescript
import kv from "@groot/core/kv";

// Listen for errors
kv.on("error", (error) => {
  console.error("KV Error:", error);
  // Handle the error appropriately
});
```

## TTL (Time To Live)

While the Keyv interface supports TTL, our PostgreSQL implementation doesn't automatically expire keys. When you set a value with TTL, the value is stored but won't be automatically deleted when it expires. You'll need to implement TTL cleanup yourself if needed:

```typescript
import kv from "@groot/core/kv";

// Set a value with TTL (won't auto-expire in our implementation)
await kv.set("temp-data", value, 3600000); // 1 hour

// You'll need to manually check and delete expired keys
const value = await kv.get("temp-data");
if (value && isExpired(value.timestamp)) {
  await kv.delete("temp-data");
}
```

## Notes

| Detail              | Behavior                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| Value serialization | Values are stored as strings; complex objects are serialized/deserialized via JSON |
| Namespacing         | Implemented by prefixing keys, e.g. `namespace:key`                                |
| Postgres table      | Managed by `@keyv/postgres`, not Prisma (marked `@@ignore` in the schema)          |
| Production          | Consider connection pooling and other tuning for your workload                     |
