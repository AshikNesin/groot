import { test, expect } from "@playwright/test";

test.describe("Todos page (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("demo@example.com");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for redirect to a specific page after login
    await page.waitForURL(/\/(todos|dashboard|)/);
  });

  test("can view todos page", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByRole("heading", { name: /todo/i })).toBeVisible();
  });

  test("can create a new todo", async ({ page }) => {
    await page.goto("/todos");

    // Open the create dialog
    await page.getByRole("button", { name: /create todo/i }).click();

    const uniqueTodo = `Test Todo ${Date.now()}`;
    await page.getByLabel(/title/i).fill(uniqueTodo);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(uniqueTodo)).toBeVisible();
  });
});
