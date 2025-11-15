# KV (Key-Value) Storage System

This project uses Keyv for key-value storage with PostgreSQL as the backend. The KV system provides a simple way to store and retrieve data, perfect for caching, session storage, or any temporary data needs.

## Installation

The KV system uses these packages:
- `keyv` - The core Keyv library
- `@keyv/postgres` - PostgreSQL adapter for Keyv

## Usage

### Basic Usage

```typescript
import kv from "@/core/kv";

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
import { createNamespaceKv } from "@/core/kv";

// Create a namespaced KV instance for sessions
const sessionKv = createNamespaceKv("sessions");

// Set a session value (stored as "sessions:123")
await sessionKv.set("123", { userId: "user:123", loggedIn: true });

// Get the session value
const session = await sessionKv.get("123");

// Clear all sessions
await sessionKv.clear();
```

### Using the Custom Prisma Adapter

For more advanced use cases, you can use the custom Prisma adapter directly:

```typescript
import { KeyvPrismaAdapter } from "@/core/kv/keyv-prisma-adapter";
import Keyv from "keyv";

// Create a custom adapter with a namespace
const adapter = new KeyvPrismaAdapter({
  namespace: "cache"
});

// Create a Keyv instance with the custom adapter
const cacheKv = new Keyv({ adapter });

// Use it like a regular Keyv instance
await cacheKv.set("api-data", { data: "example" });
const data = await cacheKv.get("api-data");
```

## Common Use Cases

### 1. API Response Caching

```typescript
import { createNamespaceKv } from "@/core/kv";

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
import { createNamespaceKv } from "@/core/kv";

const sessionKv = createNamespaceKv("sessions");

async function createSession(userId: string, sessionData: any) {
  const sessionId = generateSessionId();
  await sessionKv.set(sessionId, {
    userId,
    ...sessionData
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
import { createNamespaceKv } from "@/core/kv";

const rateLimitKv = createNamespaceKv("rate-limit");

async function checkRateLimit(ip: string, limit: number, window: number) {
  const key = `ip:${ip}`;
  const count = await rateLimitKv.get(key) || 0;
  
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
import kv from "@/core/kv";

// Listen for errors
kv.on("error", (error) => {
  console.error("KV Error:", error);
  // Handle the error appropriately
});
```

## TTL (Time To Live)

While the Keyv interface supports TTL, our PostgreSQL implementation doesn't automatically expire keys. When you set a value with TTL, the value is stored but won't be automatically deleted when it expires. You'll need to implement TTL cleanup yourself if needed:

```typescript
import kv from "@/core/kv";

// Set a value with TTL (won't auto-expire in our implementation)
await kv.set("temp-data", value, 3600000); // 1 hour

// You'll need to manually check and delete expired keys
const value = await kv.get("temp-data");
if (value && isExpired(value.timestamp)) {
  await kv.delete("temp-data");
}
```

## Notes

1. All values are stored as strings in the database. Complex objects are automatically serialized/deserialized using JSON.stringify/JSON.parse.
2. Namespaces are implemented by prefixing keys with "namespace:key".
3. The Keyv table is managed by the @keyv/postgres package, not by Prisma directly (marked with @@ignore in the schema).
4. For production use, consider implementing connection pooling and other optimizations for your specific needs.
