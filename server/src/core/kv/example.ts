/**
 * Example usage of the KV system
 * This file demonstrates how to use the KV system in your application
 */

import kv, { createNamespaceKv } from "@/core/kv";

// Basic usage examples
export async function basicKvExamples() {
  // Set a simple string value
  await kv.set("user:123:session", "active-session-token");

  // Get the value
  const session = await kv.get("user:123:session");
  console.log("Session:", session);

  // Set a complex object
  const userProfile = {
    id: "user:123",
    name: "John Doe",
    email: "john@example.com",
    preferences: {
      theme: "dark",
      notifications: true,
    },
  };
  await kv.set("user:123:profile", userProfile);

  // Get the object
  const profile = await kv.get("user:123:profile");
  console.log("Profile:", profile);

  // Check if a key exists
  const hasProfile = await kv.has("user:123:profile");
  console.log("Has profile:", hasProfile);

  // Delete a key
  await kv.delete("user:123:session");

  // Clean up all keys
  // await kv.clear();
}

// Namespaced KV examples
export async function namespacedKvExamples() {
  // Create a namespaced KV instance for caching
  const cacheKv = createNamespaceKv("cache");

  // Create a namespaced KV instance for sessions
  const sessionKv = createNamespaceKv("sessions");

  // Use them independently
  await cacheKv.set("api:user:123", {
    data: "user data",
    timestamp: Date.now(),
  });
  await sessionKv.set("sid:abc123", {
    userId: "user:123",
    loginTime: Date.now(),
  });

  // These won't conflict with each other
  const cachedData = await cacheKv.get("api:user:123");
  const sessionData = await sessionKv.get("sid:abc123");

  console.log("Cached data:", cachedData);
  console.log("Session data:", sessionData);

  // Clear only cache data
  await cacheKv.clear();

  // Session data is still available
  const sessionDataAfterCacheClear = await sessionKv.get("sid:abc123");
  console.log("Session after cache clear:", sessionDataAfterCacheClear);
}

// Rate limiting example
export async function rateLimitingExample() {
  const rateLimitKv = createNamespaceKv("rate-limit");

  const ip = "192.168.1.1";
  const limit = 10; // 10 requests
  const window = 60000; // 1 minute window

  // Get current count
  const currentCount = (await rateLimitKv.get(ip)) || 0;

  if (currentCount >= limit) {
    console.log("Rate limit exceeded");
    return false;
  }

  // Increment counter
  await rateLimitKv.set(ip, currentCount + 1);
  console.log(`Requests made: ${currentCount + 1}/${limit}`);
  return true;
}

// Simple cache function example
export async function cachedApiCall<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const cacheKv = createNamespaceKv("api-cache");

  // Try to get from cache
  let data = await cacheKv.get(key);

  if (!data) {
    // Not in cache, fetch and store
    data = await fetchFn();
    await cacheKv.set(key, data, ttlMs);
    console.log(`Cache miss for ${key}`);
  } else {
    console.log(`Cache hit for ${key}`);
  }

  return data as T;
}

// Usage example
export async function runExamples() {
  console.log("Running KV examples...");

  await basicKvExamples();
  await namespacedKvExamples();

  console.log("Rate limiting examples:");
  for (let i = 0; i < 12; i++) {
    const allowed = await rateLimitingExample();
    if (!allowed) break;
  }

  console.log("Cached API call example:");
  const cachedData = await cachedApiCall(
    "user:123",
    async () => {
      console.log("Fetching fresh data...");
      return { id: "user:123", name: "John Doe" };
    },
    5000, // 5 seconds TTL
  );
  console.log("Data:", cachedData);

  // Try again to see cache hit
  const cachedData2 = await cachedApiCall(
    "user:123",
    async () => {
      console.log("This should not be called...");
      return { id: "user:123", name: "John Doe" };
    },
    5000,
  );
  console.log("Data from cache:", cachedData2);
}
