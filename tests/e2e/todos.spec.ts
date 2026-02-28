import { test, expect } from "@playwright/test";

test.describe("Todos page (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("test@test.com");
    await page.getByLabel(/password/i).fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for redirect after login
    await page.waitForURL(/.*\/.*/);
  });

  test("can view todos page", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByRole("heading", { name: /todo/i })).toBeVisible();
  });

  test("can create a new todo", async ({ page }) => {
    await page.goto("/todos");

    // Find and fill the new todo input
    const todoInput = page
      .getByPlaceholder(/add.*todo|new.*todo/i)
      .or(page.getByLabel(/add.*todo|new.*todo/i));

    if (await todoInput.isVisible()) {
      const uniqueTodo = `Test Todo ${Date.now()}`;
      await todoInput.fill(uniqueTodo);
      await page.getByRole("button", { name: /add|create/i }).click();
      await expect(page.getByText(uniqueTodo)).toBeVisible();
    }
  });
});
