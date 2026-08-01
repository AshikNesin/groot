import { test, expect } from "@playwright/test";

test.describe("Jobs page selection", () => {
  let createdJobId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo@example.com");
    await page.getByLabel(/password/i).fill("demo@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for redirect to a specific page after login
    await page.waitForURL(/\/(todos|dashboard)/);
  });

  test.afterEach(async ({ page }) => {
    // Robust cleanup: if a job was created, delete it even if the test fails in the middle
    if (createdJobId) {
      try {
        await page.goto("/jobs");
        await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();

        const jobRow = page.locator(".hidden.md\\:block .divide-y > div").filter({ hasText: createdJobId }).first();
        if (await jobRow.isVisible()) {
          await jobRow.hover();
          // The dropdown trigger is the last button in the row
          const dropdownTrigger = jobRow.getByRole("button").last();
          await dropdownTrigger.click();
          // Click 'Delete' in the dropdown menu
          await page.getByRole("menuitem", { name: /delete/i }).click();
          // Wait for the job row to be removed
          await expect(jobRow).not.toBeVisible();
        }
      } catch (error) {
        console.error("Teardown cleanup failed:", error);
      } finally {
        createdJobId = null;
      }
    }
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
    await page.getByRole("dialog").getByRole("button", { name: /^add job$/i }).click();

    // Wait for the success toast and retrieve the unique job ID from the 'View job' link's href.
    const viewJobLink = page.getByRole("link", { name: /view job/i });
    await expect(viewJobLink).toBeVisible();
    const href = await viewJobLink.getAttribute("href");
    if (!href) {
      throw new Error("Could not find href attribute on View Job toast link");
    }
    // href format: /jobs/todo-summary/123-abc-...
    const parts = href.split("/");
    createdJobId = parts[parts.length - 1];

    // Wait for the exact desktop job row to appear in the table using the unique job ID
    const jobRow = page.locator(".hidden.md\\:block .divide-y > div").filter({ hasText: createdJobId }).first();
    await expect(jobRow).toBeVisible();

    // Click the checkbox inside our specific job row
    const checkbox = jobRow.getByRole("checkbox");
    await checkbox.click();

    // Verify we are STILL on the /jobs page and haven't navigated (using assertion-based poll on the URL)
    await expect(page).toHaveURL(/\/jobs$/);

    // Verify that the checkbox is actually checked
    await expect(checkbox).toBeChecked();
  });
});
