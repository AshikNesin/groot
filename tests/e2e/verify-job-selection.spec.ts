import { test, expect } from "@playwright/test";

test.describe("Jobs page selection", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo@example.com");
    await page.getByLabel(/password/i).fill("demo@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for redirect to a specific page after login
    await page.waitForURL(/\/(todos|dashboard)/);
  });

  test("can select a job without navigating to job details page", async ({ page }) => {
    // Navigate to jobs page
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();

    // Trigger a new job so we have at least one job in the table
    await page.getByRole("button", { name: /add job/i }).click();

    // Click on the job type selection trigger button
    await page.locator("#job-name").click();

    // Click on the 'todo-summary' option in the dropdown
    await page.getByRole("menuitem", { name: "todo-summary" }).click();

    // Submit the new job (Click the "Add Job" button in the dialog)
    await page.getByRole("button", { name: /^add job$/i }).click();

    // Wait for the job row to appear in the table
    const jobRow = page.locator(".divide-y > .group").first();
    await expect(jobRow).toBeVisible();

    // Verify current URL is /jobs
    expect(page.url()).toContain("/jobs");

    // Click the checkbox inside the first job row
    const checkbox = jobRow.getByRole("checkbox");
    await checkbox.click();

    // Let's wait a small amount of time to make sure no navigation happens
    await page.waitForTimeout(1000);

    // Verify we are STILL on the /jobs page and haven't navigated
    expect(page.url()).toContain("/jobs");
    expect(page.url()).not.toContain("/jobs/todo-summary");

    // Verify that the checkbox is actually checked
    await expect(checkbox).toBeChecked();
  });
});
