import { expect, test, type Page } from "@playwright/test";
import { MEMBER_STATE, signUpWithOrganization } from "./support/auth";

const PROJECT_URL = /\/projects\/[0-9a-f-]{36}$/;

async function chooseCountry(page: Page, label: string, country: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByPlaceholder("Search countries…").fill(country);
  await page.getByRole("option", { name: country, exact: true }).click();
}

async function createProject(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(PROJECT_URL);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test.describe("as a member of Kigen", () => {
  test.use({ storageState: MEMBER_STATE });

  test("creates a project with a new customer, finds, edits, copies and archives it", async ({
    page,
  }) => {
    const id = Date.now();
    const name = `Fire alarm ${id}`;
    const customer = `Harbour Mall ${id}`;

    // Create (W1), adding the customer from the form (Q1).
    await page.goto("/projects/new");
    await page.getByLabel("Project name").fill(name);
    await page.getByRole("button", { name: "New customer" }).click();
    const dialog = page.getByRole("dialog", { name: "New customer" });
    await dialog.getByLabel("Company name").fill(customer);
    await dialog.getByLabel("Contact person").fill("Mei Lin");
    await dialog.getByRole("button", { name: "Add customer" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Customer" })).toContainText(customer);
    await page.getByLabel("Reference or tender number").fill(`HM-${id}`);
    await page.getByLabel("Deadline").fill("2030-12-01");
    await chooseCountry(page, "Delivery country", "Indonesia");
    await page.getByLabel("Delivery city").fill("Jakarta");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page).toHaveURL(PROJECT_URL);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Online prices are searched in Indonesia.")).toBeVisible();
    await expect(page.getByRole("link", { name: customer }).first()).toBeVisible();

    // The tabs for the later stages (W2).
    await page
      .getByRole("navigation", { name: "Project sections" })
      .getByRole("link", { name: "Prices" })
      .click();
    await expect(page.getByRole("heading", { level: 2, name: "Prices" })).toBeVisible();
    await expect(page.getByText("Not built yet")).toBeVisible();

    // Found in the list by its customer's name (W3).
    await page.goto("/projects");
    await page.getByRole("searchbox", { name: "Search projects" }).fill(customer);
    await expect(page).toHaveURL(/q=Harbour/);
    const list = page.getByRole("region", { name: "Project list" });
    await expect(list.getByRole("link", { name })).toBeVisible();
    await expect(list.getByRole("row")).toHaveCount(2);

    // Edit.
    await list.getByRole("link", { name }).click();
    await page.getByRole("link", { name: "Edit", exact: true }).click();
    await page.getByLabel("Project name").fill(`${name} – Phase 2`);
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page).toHaveURL(PROJECT_URL);
    await expect(page.getByRole("heading", { level: 1, name: `${name} – Phase 2` })).toBeVisible();

    // Duplicate, rename the copy, then archive it.
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Duplicate project" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByLabel("Project name")).toHaveValue(`${name} – Phase 2 (copy)`);
    await expect(page.getByLabel("Reference or tender number")).toHaveValue("");
    await page.getByLabel("Project name").fill(`Lift ${id}`);
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page.getByRole("heading", { level: 1, name: `Lift ${id}` })).toBeVisible();

    await page.getByRole("button", { name: "Status: Active" }).click();
    await page.getByRole("menuitemradio", { name: "Archived" }).click();
    await expect(page.getByText("This project is archived.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Status: Archived" })).toBeVisible();

    // Archived projects leave the open list, and show when asked for.
    await page.goto(`/projects?q=Lift+${id}`);
    await expect(page.getByText("No projects match these filters.")).toBeVisible();
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Archived", exact: true }).click();
    await expect(page).toHaveURL(/status=archived/);
    await expect(list.getByRole("link", { name: `Lift ${id}` })).toBeVisible();

    // The team sees what happened (O6).
    await page.goto("/dashboard");
    const activity = page.getByRole("region", { name: "Team activity" });
    await expect(activity.getByText(`Ratna Sari archived Lift ${id}`)).toBeVisible();
    await expect(
      activity.getByText(`Ratna Sari created the project ${name}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Open projects" }).getByRole("link", {
        name: `${name} – Phase 2`,
      }),
    ).toBeVisible();
  });

  test("adds and edits a customer, but cannot delete it", async ({ page }) => {
    const id = Date.now();
    const customer = `Raffles Annex ${id}`;

    await page.goto("/customers/new");
    await page.getByLabel("Company name").fill(customer);
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await page.getByLabel("Email").fill(`Procurement-${id}@Raffles.example`);
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: customer })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(`procurement-${id}@raffles.example`);

    await page.getByLabel("Phone").fill("+65 6123 4567");
    await page.getByRole("button", { name: "Save customer" }).click();
    await expect(page.getByText("Customer saved.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delete customer" })).toHaveCount(0);

    // A second customer with the same name is refused.
    await page.goto("/customers/new");
    await page.getByLabel("Company name").fill(customer.toUpperCase());
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("A customer with this name already exists.").first()).toBeVisible();

    await page.goto("/customers");
    await page.getByRole("searchbox", { name: "Search customers" }).fill(`Annex ${id}`);
    await expect(
      page.getByRole("region", { name: "Customer list" }).getByRole("link", { name: customer }),
    ).toBeVisible();
  });
});

test("an Owner on Starter fills the open projects, closes one to free a place, and deletes one", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const id = Date.now();
  await signUpWithOrganization(page, `e2e-projects-${id}@example.test`, `E2E Projects Co ${id}`);

  for (const name of ["Alpha", "Beta", "Gamma"]) await createProject(page, `${name} ${id}`);

  await page.goto("/projects");
  await expect(page.getByText("3 of 3 open projects used on the Starter plan")).toBeVisible();
  await expect(page.getByRole("button", { name: "New project" })).toBeDisabled();

  // Won projects don't count against the limit.
  const list = page.getByRole("region", { name: "Project list" });
  await list.getByRole("link", { name: `Alpha ${id}` }).click();
  await page.getByRole("button", { name: "Status: Active" }).click();
  await page.getByRole("menuitemradio", { name: "Won" }).click();
  await expect(page.getByRole("button", { name: "Status: Won" })).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText("2 of 3 open projects used on the Starter plan")).toBeVisible();
  await expect(page.getByRole("link", { name: "New project" })).toBeVisible();

  // Re-opening it now needs a free place.
  await createProject(page, `Delta ${id}`);
  await page.goto("/projects?status=won");
  await list.getByRole("link", { name: `Alpha ${id}` }).click();
  await page.getByRole("button", { name: "Status: Won" }).click();
  await page.getByRole("menuitemradio", { name: "Active" }).click();
  await expect(page.getByText(/limit on open projects is reached/)).toBeVisible();

  // The Owner deletes a project.
  await page.goto("/projects");
  await list.getByRole("link", { name: `Beta ${id}` }).click();
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete project" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(list.getByRole("link", { name: `Beta ${id}` })).toHaveCount(0);
  await expect(page.getByText("2 of 3 open projects used on the Starter plan")).toBeVisible();
});
