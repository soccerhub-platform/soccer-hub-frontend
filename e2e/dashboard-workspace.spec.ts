import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { businessDate } from "../src/shared/business-time";

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
    const branches = data.branches ?? data;
    if (branches.length > 1) await page.getByRole("button").filter({ hasText: branches[0].name }).click();
  }
  await page.waitForURL(/\/admin\/dashboard/);
}
async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath(name + ".png"), fullPage: true });
}
function fixture(branchId: string, date: string) {
  const codes = ["NEW", "IN_PROGRESS", "TRIAL_SCHEDULED", "DECISION_PENDING", "CONTRACT_PENDING", "PAYMENT_PENDING", "CONVERTED", "LOST"];
  const labels = ["Новые", "В работе", "Пробное назначено", "Ожидают решения", "Ожидают договор", "Ожидают оплату", "Клиенты", "Отказы"];
  return {
    meta: { branchId, branchName: "Главный филиал", date, timezone: "Asia/Almaty", generatedAt: `${date}T12:00:00+05:00` },
    kpis: { items: [
      { code: "newLeads", value: 6, delta: { value: -2 } },
      { code: "activeGroups", value: 12 },
      { code: "paymentsToday", value: 2, count: 2, amount: 45000 },
    ] },
    branchSummary: { studentsTotal: 128, newStudents: 3, trainingsTotal: 5, trainersOnDuty: 4, attendancePercent: 80 },
    alerts: { topCards: [], attention: [
      { id: "waiting-leads", title: "3 лида ждут ответа", description: "Новые заявки без первого контакта", tone: "danger", action: { label: "Открыть новые лиды", target: "/admin/leads?filter=waiting-response" } },
      { id: "overdue-reports", title: "Отчёты не закрыты", description: "Проверьте отчёты", tone: "warning", action: { label: "Проверить отчёты", target: "/admin/coaches" } },
    ] },
    risks: { items: [
      { code: "overdue-reports", label: "Незакрытые отчёты", description: "Два отчёта без итогов", tone: "warning", target: "/admin/coaches" },
      { code: "contracts-ending-soon", label: "4 договора скоро истекают", description: "Продление в течение 7 дней", tone: "warning", target: "/admin/contracts?filter=ending-soon" },
      { code: "groups-without-coach", label: "Группа без тренера", description: "Назначьте тренера", tone: "danger", target: "/admin/groups" },
      { code: "groups-without-schedule", label: "Группа без расписания", description: "Добавьте расписание", tone: "warning", target: "/admin/groups" },
      { code: "today-cancellations", label: "Отмена занятия сегодня", description: "Проверьте перенос", tone: "warning", target: "/admin/schedule?status=CANCELLED" },
    ] },
    funnel: { rows: codes.map((status, i) => ({ status, label: labels[i], count: i + 1, percent: 10 })), conversionToClientPercent: 19 },
    todaySchedule: { summary: { total: 6, active: 5, cancelled: 1 }, nextSession: null, items: [
      ...["Tangy Football", "Adal", "U10 Reds", "Mamyr", "Юниоры", "Вечерняя группа"].map((groupName, i) => ({ sessionId: "session-" + i, groupId: "group-" + i, groupName, coachName: "Арсен Гизатов", coachId: "coach", startAt: `${date}T${String(10 + i * 2).padStart(2, "0")}:00:00+05:00`, endAt: `${date}T${String(11 + i * 2).padStart(2, "0")}:00:00+05:00`, status: i === 0 ? "OVERDUE" : i === 1 ? "COMPLETED" : i === 2 ? "CANCELLED" : "PLANNED", scheduleType: "REGULAR" })),
    ] },
    todayTrials: [{ id: "trial-fixture", trainingSessionId: "session-0", studentName: "Дамир Алиев", leadName: "Алия Алиева", groupName: "Tangy Football", sessionDate: date, sessionStartsAt: `${date}T10:00:00`, sessionEndsAt: `${date}T11:00:00`, status: "COMPLETED", attendanceStatus: "ATTENDED", result: "PENDING" }],
    weeklyDynamics: { period: { from: date, to: date }, series: ["leads", "trainings", "payments"].map(code => ({ code, unit: code === "payments" ? "amount" : "count", points: [{ date, value: code === "payments" ? 45000 : 6 }] })), isEmpty: false },
  };
}
async function mockDashboard(page: Page) {
  await page.route("**/api/admin/dashboard/summary?*", route => {
    const p = new URL(route.request().url()).searchParams;
    expect(p.get("timezone")).toBe("Asia/Almaty");
    return route.fulfill({ json: fixture(p.get("branchId")!, p.get("date")!) });
  });
}

test("dashboard: complete day, distinct metrics, signals and accessible quick preview", async ({ page }, info) => {
  await signIn(page); await page.clock.setFixedTime(new Date(`${businessDate()}T23:30:00+05:00`)); await mockDashboard(page); await page.goto("/admin/dashboard");
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await expect(page.getByRole("button", { name: /^Просмотр занятия:/ })).toHaveCount(6);
  await expect(page.getByRole("complementary", { name: "Контроль филиала" }).getByRole("button")).toHaveCount(6);
  await expect(page.getByRole("region", { name: "Сводка за сегодня" })).toContainText("45 000 ₸");
  await audit(page, info, "dashboard-fixture");
  await page.locator(".dashboard-analysis-grid").scrollIntoViewIfNeeded();
  await expect(page.getByRole("columnheader", { name: "Оплаты, ₸", exact: true })).toBeVisible();
  await audit(page, info, "dashboard-analysis");
  const row = page.getByRole("button", { name: "Просмотр занятия: Tangy Football, 10:00", exact: true });
  await row.click(); await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole("dialog")).toContainText("Закрыть занятие и проверить журнал");
  await expect(page.getByRole("link", { name: "Открыть занятие", exact: true })).toHaveAttribute("href", "/admin/sessions/session-0");
  await audit(page, info, "dashboard-session-preview");
  await page.keyboard.press("Escape"); await expect(row).toBeFocused();
  await page.getByRole("radio", { name: /^Не закрыты/ }).click();
  await expect(page.getByRole("button", { name: /^Просмотр занятия:/ })).toHaveCount(4);
  await page.getByRole("radio", { name: /^Все/ }).click();
  await page.getByRole("button", { name: /4 договора скоро истекают/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Ближайшие 7 дней");
  await expect(page.getByRole("dialog").getByRole("link")).toHaveAttribute("href", "/admin/contracts?status=ACTIVE");
  await audit(page, info, "dashboard-signal-preview");
  expect(errors).toEqual([]);
});

test("dashboard: error is not zero, retry and stale snapshot warning", async ({ page }, info) => {
  await signIn(page); await mockDashboard(page);
  let fail = true;
  await page.route("**/api/admin/dashboard/summary?*", route => fail ? route.fulfill({ status: 503 }) : route.fallback());
  await page.goto("/admin/dashboard");
  await expect(page.getByText("Не удалось загрузить главную. Показатели не получены.", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Сводка за сегодня" })).toHaveCount(0);
  fail = false; await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("region", { name: "Сводка за сегодня" })).toBeVisible();
  fail = true; await page.getByRole("button", { name: "Обновить главную", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("последний успешный снимок");
  await expect(page.getByRole("button", { name: /^Просмотр занятия:/ })).toHaveCount(6);
  await audit(page, info, "dashboard-stale");
});

test("dashboard: trials preview and empty day", async ({ page }, info) => {
  await signIn(page); await mockDashboard(page);
  await page.route("**/api/admin/trials/trial-fixture", route => route.fulfill({ json: { id: "trial-fixture", status: "COMPLETED", attendanceStatus: "ATTENDED", result: "PENDING", student: { fullName: "Дамир Алиев" }, group: { name: "Tangy Football" }, capabilities: { canRecordResult: true, canCancel: false, canReschedule: false, canMarkAttendance: false } } }));
  await page.goto("/admin/dashboard"); await page.getByRole("button", { name: "Просмотр пробного: Дамир Алиев", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Записать результат", exact: true })).toBeVisible();
  await audit(page, info, "dashboard-trial-preview");
  await page.keyboard.press("Escape");
  await page.route("**/api/admin/dashboard/summary?*", route => {
    const p = new URL(route.request().url()).searchParams; const data = fixture(p.get("branchId")!, p.get("date")!);
    data.todaySchedule.items = []; data.todaySchedule.summary = { active: 0, cancelled: 0, total: 0 }; data.todayTrials = [];
    data.alerts.attention = []; data.risks.items = [];
    return route.fulfill({ json: data });
  });
  await page.getByRole("button", { name: "Обновить главную", exact: true }).click();
  await expect(page.getByText("Сегодня занятий нет", { exact: true })).toBeVisible();
  await expect(page.getByText("На сегодня пробных нет", { exact: true })).toBeVisible();
  await audit(page, info, "dashboard-empty");
});

test("dashboard: real API read, branch scope, response time and no JavaScript errors", async ({ page }, info) => {
  await signIn(page);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const response = page.waitForResponse(r => r.url().includes("/admin/dashboard/summary?"));
  const started = Date.now(); await page.goto("/admin/dashboard");
  const api = await response; expect(api.status()).toBe(200);
  const data = await api.json();
  expect(data.meta.date).toBe(businessDate()); expect(data.meta.timezone).toBe("Asia/Almaty");
  expect(Array.isArray(data.todayTrials)).toBe(true);
  await expect(page.getByRole("button", { name: /^Просмотр занятия:/ })).toHaveCount(data.todaySchedule.items.length);
  await expect(page.getByRole("button", { name: /^Просмотр пробного:/ })).toHaveCount(data.todayTrials.length);
  await info.attach("dashboard-read-metrics", { body: JSON.stringify({ timeToDataMs: Date.now() - started, sessions: data.todaySchedule.items.length, trials: data.todayTrials.length, signalCount: data.alerts.attention.length, paymentCount: data.kpis.items.find((k: any) => k.code === "paymentsToday").count }), contentType: "application/json" });
  await audit(page, info, "dashboard-real");
  expect(errors).toEqual([]);
});

test("dashboard: wrong branch response is rejected and day rolls over in Almaty", async ({ page }) => {
  await signIn(page);
  await page.clock.install({ time: new Date("2026-09-14T18:59:55Z") });
  let wrong = true;
  const requestedDates: string[] = [];
  await page.route("**/api/admin/dashboard/summary?*", route => {
    const p = new URL(route.request().url()).searchParams;
    requestedDates.push(p.get("date")!);
    return route.fulfill({ json: fixture(wrong ? "wrong-branch" : p.get("branchId")!, p.get("date")!) });
  });
  await page.goto("/admin/dashboard");
  await expect(page.getByText("Не удалось загрузить главную. Показатели не получены.", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Сводка за сегодня" })).toHaveCount(0);
  wrong = false; await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("region", { name: "Сводка за сегодня" })).toBeVisible();
  await page.clock.runFor(31_000);
  await expect.poll(() => requestedDates.at(-1)).toBe("2026-09-15");
  await expect(page.getByRole("link", { name: "Календарь", exact: true })).toHaveAttribute("href", "/admin/schedule?date=2026-09-15&day=2026-09-15");
});
