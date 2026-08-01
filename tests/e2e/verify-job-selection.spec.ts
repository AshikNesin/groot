import { test, expect, type Page } from "@playwright/test";

test.describe("Jobs page selection", () => {
  let createdJobId: string | null = null;

  /**
   * The table only renders `formatJobId(id)` as visible text — UUIDs are
   * truncated to their first 6 chars, short numeric ids are shown in full.
   * `hasText` matches against text content (not attributes like the link
   * href), so we must filter on the *displayed* id, not the raw one.
   */
  function displayJobId(id: string): string {
    return id.length > 8 ? id.substring(0, 6) : id;
  }

  /**
   * Locate the desktop job row for a specific created job.
   *
   * Filtering on the truncated id alone is fragile (UUID prefix collisions,
   * numeric sub-string matches). We additionally filter on the job name so
   * the locator only matches the row we created, not an unrelated orphan.
   */
  function jobRowLocator(page: Page, rawJobId: string) {
    return page
      .locator(".hidden.md\\:block .divide-y > div")
      .filter({ hasText: "todo-summary" })
      .filter({ hasText: displayJobId(rawJobId) })
      .first();
  }

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
      const idToDelete = createdJobId;
      createdJobId = null;
      try {
        await page.goto("/jobs");
        await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();

        const jobRow = jobRowLocator(page, idToDelete);
        // Fail loudly if the created job can't be found — silent no-ops leave
        // orphans that accumulate across CI runs and make the suite flaky.
        await expect(jobRow).toBeVisible();
        await jobRow.hover();
        // The dropdown trigger is the last button in the row
        const dropdownTrigger = jobRow.getByRole("button").last();
        await dropdownTrigger.click();
        // Click 'Delete' in the dropdown menu
        await page.getByRole("menuitem", { name: /delete/i }).click();
        // Wait for the job row to be removed
        await expect(jobRow).not.toBeVisible();
      } catch (error) {
        console.error(`Teardown cleanup failed for job ${idToDelete}:`, error);
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
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^add job$/i })
      .click();

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

    // Wait for the exact desktop job row to appear in the table.
    // Filter on both the job name and the displayed (truncated) id so we
    // match only the row we created, even if orphaned jobs exist.
    const jobRow = jobRowLocator(page, createdJobId);
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
