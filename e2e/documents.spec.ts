import { expect, test, type Page } from "@playwright/test";
import { MEMBER_STATE } from "./support/auth";
import { HAS_WORKER, WORKER_DIR } from "./support/worker";

/*
 * Documents (TASKS.md T1.3): upload → inspection and credit estimate →
 * extraction → the items, through the real worker. The e2e worker reads
 * spreadsheets by their column names, without AI (EXTRACTION_FAKE), so no
 * API key is needed and the results are deterministic.
 */
test.skip(!HAS_WORKER, `The worker repo is not at ${WORKER_DIR}`);
test.use({ storageState: MEMBER_STATE });

async function newProject(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Project sections" })
    .getByRole("link", { name: "Documents" })
    .click();
  await expect(page.getByText("Drop the customer's specification files here")).toBeVisible();
}

const csv = (name: string, text: string) => ({
  name,
  mimeType: "text/csv",
  buffer: Buffer.from(text),
});

test("a member uploads a BOQ, sees the estimate, has its items read and checks them", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const project = `Extraction ${Date.now()}`;
  await newProject(page, project);

  await page
    .getByLabel("Upload specification files")
    .setInputFiles(
      csv(
        "boq-tower.csv",
        "No,Description,Brand,Qty,Unit\n" +
          "1,IP dome camera 4MP,Hikvision,24,unit\n" +
          "2,NVR 32 channel,Hikvision,1,set\n" +
          "3,Cat6 cable,,305,Mtr\n" +
          "4,Patch panel 24 port,,,pcs\n",
      ),
    );
  await expect(page.getByText("boq-tower.csv")).toBeVisible();

  // The worker counts the rows; the estimate appears (1 credit per 25 rows).
  const read = page.getByRole("button", { name: "Read items · 1 credit" });
  await expect(read).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/4 rows · 1 KB/)).toBeVisible();
  await read.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("This uses 1 credit");
  await dialog.getByRole("button", { name: "Use 1 credit" }).click();

  await expect(page.getByText("4 items extracted.")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "See the items" }).click();
  await expect(page).toHaveURL(/\/items$/);

  const list = page.getByRole("region", { name: "boq-tower" });
  await expect(list).toContainText("4 items · 1 to check · from boq-tower.csv");
  await expect(list.getByRole("row", { name: /IP dome camera 4MP/ })).toContainText("Hikvision");
  await expect(list.getByRole("row", { name: /Cat6 cable/ })).toContainText("“Mtr”");
  await expect(list.getByRole("row", { name: /Patch panel/ })).toContainText("No quantity.");
  await expect(list.getByRole("row", { name: /NVR 32 channel/ })).toContainText("Sheet1 · row 3");

  await page.goto("/dashboard");
  await expect(
    page
      .getByRole("region", { name: "Team activity" })
      .getByText(`Ratna Sari uploaded boq-tower.csv to ${project}`),
  ).toBeVisible();
});

test("a file without rows fails with the reason, and can be deleted", async ({ page }) => {
  test.setTimeout(60_000);
  await newProject(page, `Empty file ${Date.now()}`);

  await page
    .getByLabel("Upload specification files")
    .setInputFiles(csv("empty.csv", "No,Description,Qty,Unit\n"));
  await expect(page.getByText("This spreadsheet has no rows to read.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  await page.getByRole("button", { name: "Actions for empty.csv" }).click();
  await page.getByRole("menuitem", { name: "Delete document" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete document" }).click();
  await expect(page.getByText("No documents yet.")).toBeVisible();
});

test("files the app can't read are refused before upload", async ({ page }) => {
  await newProject(page, `Wrong file ${Date.now()}`);
  await page.getByLabel("Upload specification files").setInputFiles({
    name: "notes.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from("not a spreadsheet"),
  });
  await expect(
    page.getByText("notes.docx: upload an Excel (.xlsx, .xls), CSV or PDF file."),
  ).toBeVisible();
  await expect(page.getByText("No documents yet.")).toBeVisible();
});
