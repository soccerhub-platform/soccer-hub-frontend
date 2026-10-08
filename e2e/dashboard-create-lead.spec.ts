import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL || "");
  await page.getByLabel("Пароль", { exact: true }).fill(process.env.E2E_PASSWORD || "");
  const login = page.waitForResponse(r => r.url().endsWith("/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const auth = await (await login).json();
  await page.waitForURL(/\/admin\//);
  if (page.url().includes("branch-select")) {
    const data = await (await page.request.get("/api/admin/branches", { headers: { Authorization: `Bearer ${auth.accessToken}` } })).json();
    if (data.branches.length > 1) await page.getByRole("button").filter({ hasText: data.branches[0].name }).click();
  }
  await page.waitForURL(/\/admin\/dashboard/);
}

test("new lead from dashboard: opens the existing form, cancel and reopen", async ({ page }) => {
  await signIn(page);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.getByRole("link", { name: "Новый лид", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/leads\?action=create$/);
  const dialog = page.getByRole("dialog", { name: "Новый лид", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Родитель \/ представитель/)).toBeVisible();
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations.map(v => v.id)).toEqual([]);
  await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/leads$/);
  await page.reload(); await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Новый лид", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("new lead deep link: reload, close preserves filters, browser history", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/leads?scope=ALL&status=NEW&view=list&action=create");
  const dialog = page.getByRole("dialog", { name: "Новый лид", exact: true });
  await expect(dialog).toBeVisible();
  await page.reload(); await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/admin\/leads\?scope=ALL&status=NEW&view=list$/);
  await expect(dialog).toHaveCount(0);
  await page.goto("/admin/dashboard");
  await page.getByRole("link", { name: "Новый лид", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.goBack(); await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.goForward(); await expect(dialog).toBeVisible();
});

test("new lead from dashboard: validates and submits once with the selected branch (mock write)", async ({ page }) => {
  await signIn(page);
  const branchId = await page.evaluate(() => JSON.parse(localStorage.getItem("admin.branch") || "{}").branchId);
  let creates = 0, created: Record<string, unknown> | null = null;
  await page.route("**/api/admin/leads/workspace?*", route => route.fulfill({ json: { columns: { NEW: created ? [created] : [] } } }));
  await page.route("**/api/admin/leads/create", route => {
    creates++;
    const payload = route.request().postDataJSON();
    expect(payload.branchId).toBe(branchId);
    expect(payload.primaryContact.fullName).toBe("Тестовый контакт");
    expect(payload.participants[0].fullName).toBe("Тестовый ученик");
    created = { id: "dashboard-test-lead", status: "NEW", leadType: payload.leadType, source: "ADMIN", primaryContact: payload.primaryContact, participants: payload.participants, createdAt: new Date().toISOString(), actions: [] };
    return route.fulfill({ status: 201, json: { leadIds: ["dashboard-test-lead"] } });
  });
  await page.getByRole("link", { name: "Новый лид", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Новый лид", exact: true });
  await dialog.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Укажите имя контактного лица");
  expect(creates).toBe(0);
  await dialog.getByLabel(/Родитель \/ представитель/).fill("Тестовый контакт");
  await dialog.getByLabel(/Телефон/).fill("+77771234567");
  await dialog.getByRole("button", { name: "Далее", exact: true }).click();
  await dialog.getByLabel("Имя участника 1", { exact: true }).fill("Тестовый ученик");
  await dialog.getByLabel("Дата рождения участника 1", { exact: true }).fill("2015-01-01");
  await dialog.getByRole("button", { name: "Далее", exact: true }).click();
  await dialog.getByRole("button", { name: "Создать лид", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(creates).toBe(1);
  await expect(page).toHaveURL(/\/admin\/leads$/);
  await expect(page.getByRole("button", { name: "Тестовый контакт", exact: true })).toBeVisible();
  await page.reload(); await expect(dialog).toHaveCount(0); expect(creates).toBe(1);
});
