import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("can login with test user", async ({ page }) => {
    await page.goto("/login");

    // The form uses "Username" label but accepts email
    await page.getByLabel(/username/i).fill("test@test.com");
    await page.getByLabel(/password/i).fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect after successful login
    await expect(page).not.toHaveURL(/.*login.*/);
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/username/i).fill("wrong@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should stay on login page
    await expect(page).toHaveURL(/.*login.*/);
  });
});
