import { test, expect, type Page, type Locator } from "@playwright/test";

test.describe("Jobs page selection", () => {
  // null = job created but id not yet captured; undefined = nothing to clean.
  let createdJobId: string | null | undefined = undefined;

  /**
   * The table only renders `formatJobId(id)` as visible text — UUIDs are
   * truncated to their first 6 chars, short numeric ids are shown in full.
   * `hasText` matches against text content (not attributes like the link
   * href), so we must filter on the *displayed* id, not the raw one.
   */
  function displayJobId(id: string): string {
    return id.length > 8 ? id.substring(0, 6) : id;
  }

  /** Desktop job-row locator matching a specific raw job id. */
  function jobRowLocator(page: Page, rawJobId: string) {
    return page
      .locator(".hidden.md\\:block .divide-y > div")
      .filter({ hasText: "todo-summary" })
      .filter({ hasText: displayJobId(rawJobId) })
      .first();
  }

  /** Delete a job row via its row overflow dropdown. */
  async function deleteJobRow(page: Page, jobRow: Locator) {
    await jobRow.hover();
    const dropdownTrigger = jobRow.getByRole("button").last();
    await dropdownTrigger.click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await expect(jobRow).not.toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo@example.com");
    await page.getByLabel(/password/i).fill("demo@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(todos|dashboard)/);
  });

  test.afterEach(async ({ page }) => {
    if (createdJobId === undefined) return; // no submit happened

    const idToDelete = createdJobId!;
    createdJobId = undefined;

    try {
      await page.goto("/jobs");
      await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();

      // Fail loudly if the created job can't be found — silent no-ops leave
      // orphans that accumulate across CI runs and make the suite flaky.
      const jobRow = jobRowLocator(page, idToDelete);
      await expect(jobRow).toBeVisible();
      await deleteJobRow(page, jobRow);
    } catch (error) {
      console.error(`Teardown cleanup failed for job ${idToDelete}:`, error);
    }
  });

  test("can select a job without navigating to job details page", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();

    // Snapshot existing todo-summary job ids (read from row link hrefs) so we
    // can identify the newly created row by diffing — even if the success
    // toast never appears or vanishes before we can read it.
    async function existingJobIds(): Promise<Set<string>> {
      const links = page.locator('.hidden.md\\:block a[href*="/jobs/todo-summary/"]');
      const hrefs = await links.evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
      return new Set(hrefs.map((h) => h.split("/").pop()!));
    }

    const beforeIds = await existingJobIds();

    // Trigger a new job so we have at least one job in the table
    await page.getByRole("button", { name: /add job/i }).click();
    await page.locator("#job-name").click();
    await page.getByRole("menuitem", { name: "todo-summary" }).click();

    // Submit — the job is created server-side at this point.
    createdJobId = null;
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^add job$/i })
      .click();

    // Try to capture the id from the success toast first (fastest path).
    try {
      const viewJobLink = page.getByRole("link", { name: /view job/i });
      await expect(viewJobLink).toBeVisible({ timeout: 3000 });
      const href = await viewJobLink.getAttribute("href");
      if (href) {
        createdJobId = href.split("/").pop()!;
      }
    } catch {
      // Toast didn't appear or vanished — fall through to table diffing.
    }

    // If the toast didn't give us the id, diff the table's link hrefs against
    // the pre-submit snapshot to find the new job deterministically.
    if (createdJobId === null) {
      await expect(async () => {
        const afterIds = await existingJobIds();
        const newIds = [...afterIds].filter((id) => !beforeIds.has(id));
        expect(newIds, "expected exactly one new todo-summary job").toHaveLength(1);
        createdJobId = newIds[0];
      }).toPass({ timeout: 10000 });
    }

    // Wait for the exact desktop job row to appear.
    const jobRow = jobRowLocator(page, createdJobId!);
    await expect(jobRow).toBeVisible();

    // Click the checkbox inside our specific job row
    const checkbox = jobRow.getByRole("checkbox");
    await checkbox.click();

    // Verify we are STILL on the /jobs page and haven't navigated
    await expect(page).toHaveURL(/\/jobs$/);

    // Verify that the checkbox is actually checked
    await expect(checkbox).toBeChecked();
  });
});
