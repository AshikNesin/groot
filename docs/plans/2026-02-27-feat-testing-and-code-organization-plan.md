---
title: Testing Infrastructure & Code Organization Improvements
type: feat
status: active
date: 2026-02-27
---

# Testing Infrastructure & Code Organization Improvements

Add minimal testing infrastructure and incrementally improve code organization for better maintainability.

## Overview

This plan addresses two practical improvements:

1. **Testing Infrastructure** - Basic React Testing Library setup + simple E2E examples
2. **Code Organization** - Incremental extraction from large files as needed

**Principle:** Start minimal, add complexity only when it solves a real problem.

## Current State

| File           | Lines   | Status                               |
| -------------- | ------- | ------------------------------------ |
| Jobs.tsx       | ~1,350  | Large, could benefit from extraction |
| Storage.tsx    | ~940    | Moderately large                     |
| Server tests   | 5 files | Minimal coverage                     |
| Frontend tests | 0 files | None                                 |
| E2E tests      | 0 files | None                                 |

## Phase 1: Testing Infrastructure (4 files)

### 1.1 Frontend Test Setup

**client/src/test/setup.ts:**

```typescript
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
afterEach(() => cleanup());
```

**Update vitest.config.ts** to support client tests:

```typescript
environmentMatch: {
  jsdom: ["client/src/**/*.test.{ts,tsx}"],
  node: ["server/src/**/*.test.ts"],
},
setupFiles: [
  path.resolve(__dirname, "server/src/test/setup.ts"),
  path.resolve(__dirname, "client/src/test/setup.ts"),
],
```

### 1.2 Simple Test Helpers

**server/src/test-helpers.ts:**

```typescript
import { prisma } from "@/generated/prisma";
import type { User, Todo } from "@prisma/client";

let counter = 0;

export async function createUser(overrides: Partial<User> = {}): Promise<User> {
  counter++;
  const uniqueId = `${Date.now()}-${counter}`;
  return prisma.user.create({
    data: {
      email: `user-${uniqueId}@test.com`,
      name: `Test User ${counter}`,
      ...overrides,
    },
  });
}

export async function createTodo(overrides: Partial<Todo> = {}): Promise<Todo> {
  const user = overrides.userId ? { id: overrides.userId } : await createUser();

  counter++;
  return prisma.todo.create({
    data: {
      title: `Test Todo ${counter}`,
      userId: user.id,
      ...overrides,
    },
  });
}

export async function cleanupTestData() {
  await prisma.todo.deleteMany({
    where: { title: { startsWith: "Test Todo" } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@test.com" } },
  });
}
```

### 1.3 E2E Tests (Playwright)

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  reporter: "html",
  use: {
    baseURL: "https://groot.localhost",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "https://groot.localhost",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**tests/e2e/login.spec.ts:**

```typescript
import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();
});

test("can login with test user", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel(/email/i).fill("test@test.com");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Should redirect to dashboard after successful login
  await expect(page).toHaveURL(/.*\/.*/);
});
```

**tests/e2e/todos.spec.ts:**

```typescript
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Login before each test
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@test.com");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/.*\/.*/);
});

test("can view todos page", async ({ page }) => {
  await page.goto("/todos");
  await expect(page.getByRole("heading", { name: /todo/i })).toBeVisible();
});
```

### 1.4 Example Component Test

**client/src/components/ui/Button.test.tsx:**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### 1.5 Install Dependencies

```bash
# Frontend testing
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# E2E testing
pnpm add -D @playwright/test
npx playwright install
```

### 1.6 Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Phase 2: Code Organization (Incremental)

### Approach

Don't pre-plan extraction. Instead:

1. **Identify pain point** - What's hard to understand or modify?
2. **Extract one piece** - Single hook or component
3. **Verify it helps** - Is the code easier to work with?
4. **Repeat if needed** - Only extract more if there's clear benefit

### Possible Extractions (do only if needed)

**For Jobs.tsx (1,350 lines):**

If the file is hard to navigate, consider extracting:

```typescript
// Option 1: Extract data fetching hook
// client/src/pages/Jobs/useJobs.ts
export function useJobs() {
  const [filters, setFilters] = useState({});
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => apiClient.get("/jobs", { params: filters }),
  });
  return { jobs: data, isLoading, filters, setFilters };
}
```

```typescript
// Option 2: Extract a clear UI section
// client/src/pages/Jobs/JobFilters.tsx
export function JobFilters({ filters, onChange }: JobFiltersProps) {
  // Just the filter UI, nothing else
}
```

**For Storage.tsx (940 lines):**

Same approach - extract only what's clearly separate and causing confusion.

### When NOT to Extract

- Don't extract just to hit an arbitrary line count
- Don't create a hook that's only used once
- Don't split if the code is already understandable
- Don't create abstraction layers without clear benefit

## Acceptance Criteria

### Testing Infrastructure

- [x] React Testing Library configured with Vitest
- [x] One test helper file with createUser() and createTodo()
- [x] Playwright configured
- [x] 2 E2E test files (login, todos)
- [x] 1 example component test (Button)
- [x] Scripts: test, test:watch, test:e2e

### Code Organization

- [ ] Evaluate Jobs.tsx for extraction opportunities
- [ ] Evaluate Storage.tsx for extraction opportunities
- [ ] Extract only if it improves maintainability
- [ ] All existing functionality preserved

## Files Summary

| Category        | New Files                        | Modified             |
| --------------- | -------------------------------- | -------------------- |
| Test Setup      | 2 (setup.ts, test-helpers.ts)    | 1 (vitest.config.ts) |
| E2E Tests       | 2 (login.spec.ts, todos.spec.ts) | -                    |
| Component Tests | 1 (Button.test.tsx)              | -                    |
| Playwright      | 1 (playwright.config.ts)         | -                    |
| Package         | -                                | 1 (package.json)     |
| **Total**       | **6**                            | **3**                |

## Success Metrics

- Developers can run `pnpm test` and see passing tests
- Developers can run `pnpm test:e2e` and see browser tests pass
- Test helpers reduce boilerplate in test files
- Large files are easier to navigate (if extraction was needed)

## Sources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
