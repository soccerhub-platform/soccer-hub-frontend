import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL || "");
  await page.getByLabel("Пароль", { exact: true }).fill(process.env.E2E_PASSWORD || "");
  const response = page.waitForResponse(r => r.url().endsWith("/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const auth = await (await response).json();
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
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath(name + ".png"), fullPage: true });
}
const gid = "00000000-0000-0000-0000-000000000041";
async function fixture(page: Page) {
  let trial: any = { id: "trial-one", status: "SCHEDULED", attendanceStatus: "UNMARKED", result: "PENDING", student: { id: "student", fullName: "Арсен Гизатов", age: 10, birthDate: "2016-05-10" }, lead: { id: "lead", fullName: "Алия Гизатова", phone: "+77001112233", email: "parent@example.test" }, session: { id: "session-current", date: "2026-09-12", startsAt: "2026-09-12T10:00:00", endsAt: "2026-09-12T11:00:00", status: "PLANNED" }, group: { id: gid, name: "Tangy Football" }, coach: { id: "coach", fullName: "Арсен Рахметулы" }, location: null, attendance: null, outcome: null, nextAction: null, capabilities: { canCancel: true, canReschedule: true, canMarkAttendance: true, canRecordResult: false } };
  const listItem = (t: any) => ({ id: t.id, status: t.status, attendanceStatus: t.attendanceStatus, result: t.result, studentName: t.student.fullName, leadName: t.lead.fullName, leadPhone: t.lead.phone, sessionDate: t.session.date, sessionStartsAt: t.session.startsAt, sessionEndsAt: t.session.endsAt, groupName: t.group.name, coachName: t.coach.fullName, nextActionType: t.nextAction?.type, nextActionAt: t.nextAction?.dueAt });
  const second = () => ({ ...trial, id: "trial-two", student: { ...trial.student, fullName: "Дамир Алиев" }, status: "COMPLETED", attendanceStatus: "ATTENDED", result: "FOLLOW_UP", nextAction: { type: "CALL", dueAt: "2026-09-12T07:00:00Z" }, outcome: { result: "FOLLOW_UP", coachFeedback: "Хорошая подготовка", recommendedGroupId: gid }, capabilities: { canCancel: false, canReschedule: false, canMarkAttendance: false, canRecordResult: true } });
  await page.route("**/api/admin/trials?*", route => {
    const status = new URL(route.request().url()).searchParams.get("status");
    const items = [listItem(trial), listItem(second())].filter(t => !status || t.status === status);
    return route.fulfill({ json: { content: items, totalElements: items.length, totalPages: 1, number: 0, size: 20 } });
  });
  await page.route("**/api/admin/trials/trial-one", route => route.fulfill({ json: trial }));
  await page.route("**/api/admin/trials/trial-two", route => route.fulfill({ json: second() }));
  await page.route("**/api/organization/groups/branches/*", route => route.fulfill({ json: [{ groupId: gid, name: "Tangy Football", status: "ACTIVE" }] }));
  return { get: () => trial, update: (patch: any) => { trial = { ...trial, ...patch }; } };
}

test("trials: compact list, local filters, preview navigation, full record and return", async ({ page }, info) => {
  await signIn(page); await fixture(page);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/admin/trials");
  await page.getByRole("button", { name: "Просмотр пробного: Арсен Гизатов", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/trials$/);
  await expect(page.getByRole("dialog")).toContainText("Tangy Football");
  await audit(page, info, "trial-preview");
  await page.getByRole("button", { name: "Следующее пробное", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Дамир Алиев", exact: true })).toBeVisible();
  await expect(page.getByText("Срок контакта прошёл", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Поиск на текущей странице" }).fill("Арсен");
  await page.getByRole("radio", { name: "Завершены", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Поиск на текущей странице" })).toHaveValue("");
  await page.getByRole("button", { name: "Просмотр пробного: Дамир Алиев", exact: true }).click();
  await page.getByRole("link", { name: "Полная карточка", exact: true }).click();
  await expect(page).toHaveURL(/trial-two/);
  await audit(page, info, "trial-detail");
  await page.getByRole("button", { name: "Действия", exact: true }).click();
  await page.getByRole("menuitem", { name: "Записать результат", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Комментарий тренера/ })).toHaveValue("Хорошая подготовка");
  await expect(page.getByLabel("Срок контакта — время", { exact: true })).toHaveValue("12:00");
  await audit(page, info, "result-prefilled");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Пробные занятия", exact: true }).click();
  await expect(page).toHaveURL(/status=COMPLETED/);
  await audit(page, info, "trial-list");
  expect(errors).toEqual([]);
});

test("trials: attendance retry, result validation, follow-up and stale capabilities", async ({ page }, info) => {
  await signIn(page); const f = await fixture(page);
  let fail = true, attendanceWrites = 0, resultWrites = 0;
  await page.route("**/api/admin/trials/trial-one/attendance", async route => {
    attendanceWrites++;
    if (fail) return route.fulfill({ status: 503, json: { message: "Сервис временно недоступен" } });
    expect(route.request().postDataJSON()).toEqual({ status: "ATTENDED", comment: "Активно участвовал" });
    f.update({ status: "COMPLETED", attendanceStatus: "ATTENDED", attendance: { status: "ATTENDED", comment: "Активно участвовал" }, capabilities: { canCancel: false, canReschedule: false, canMarkAttendance: false, canRecordResult: true } });
    return route.fulfill({ json: f.get() });
  });
  await page.route("**/api/admin/trials/trial-one/result", async route => {
    resultWrites++;
    const payload = route.request().postDataJSON();
    expect(payload.result).toBe("FOLLOW_UP"); expect(payload.nextActionAt).toBe("2099-09-12T16:30");
    f.update({ result: "FOLLOW_UP", nextAction: { type: payload.nextActionType, dueAt: payload.nextActionAt }, outcome: { result: payload.result, coachFeedback: payload.coachFeedback } });
    return route.fulfill({ json: f.get() });
  });
  await page.goto("/admin/trials/trial-one");
  await page.getByRole("button", { name: "Отметить посещение", exact: true }).click();
  await page.getByRole("textbox", { name: /Комментарий/ }).fill("Активно участвовал");
  await audit(page, info, "attendance-modal");
  await page.getByRole("button", { name: "Сохранить посещение", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Сервис временно недоступен");
  await expect(page.getByRole("textbox", { name: /Комментарий/ })).toHaveValue("Активно участвовал");
  fail = false;
  await page.getByRole("button", { name: "Сохранить посещение", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(attendanceWrites).toBe(2);
  await page.getByRole("button", { name: "Записать результат", exact: true }).click();
  await page.getByRole("radio", { name: /Повторный контакт/ }).click();
  await page.getByRole("button", { name: "Сохранить результат", exact: true }).click();
  await expect(page.getByText("Укажите дату следующего действия", { exact: true })).toBeVisible(); expect(resultWrites).toBe(0);
  await page.getByRole("dialog").locator('input[type="date"]').fill("2099-09-12");
  await page.getByLabel("Срок контакта — время", { exact: true }).fill("16:30");
  await expect(page.getByText("Укажите дату следующего действия", { exact: true })).toHaveCount(0);
  await audit(page, info, "follow-up-modal");
  await page.getByRole("button", { name: "Сохранить результат", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(resultWrites).toBe(1);
  await page.getByRole("button", { name: "Действия", exact: true }).click(); await page.getByRole("menuitem", { name: "Записать результат", exact: true }).click();
  f.update({ capabilities: { ...f.get().capabilities, canRecordResult: false } });
  await page.getByRole("button", { name: "Сохранить результат", exact: true }).click();
  await expect(page.getByText("Состояние пробного изменилось. Это действие больше недоступно.", { exact: true })).toBeVisible(); expect(resultWrites).toBe(1);
});

test("trials: preview actions, reschedule alternatives, retry and cancellation validation", async ({ page }, info) => {
  await signIn(page); const f = await fixture(page);
  let loadFail = true, moveFail = true, cancels = 0;
  const session = (id: string, startsAt: string, status = "PLANNED") => ({ id, sessionDate: "2099-09-12", startsAt, endsAt: "2099-09-12T19:00:00", status, coaches: [{ fullName: "Арсен Рахметулы" }], participantsCount: 4 });
  await page.route("**/api/admin/groups/*/sessions?*", route => loadFail ? route.fulfill({ status: 503 }) : route.fulfill({ json: { items: [session("session-current", "2099-09-12T17:00:00"), session("old", "2020-01-01T12:00:00"), session("canceled", "2099-09-12T16:00:00", "CANCELLED"), session("new", "2099-09-12T18:00:00")] } }));
  await page.route("**/api/admin/trials/trial-one/reschedule", route => {
    if (moveFail) return route.fulfill({ status: 409, json: { message: "Место уже занято" } });
    expect(route.request().postDataJSON().trainingSessionId).toBe("new");
    f.update({ session: { ...f.get().session, id: "new", date: "2099-09-12", startsAt: "2099-09-12T18:00:00", endsAt: "2099-09-12T19:00:00" } });
    return route.fulfill({ json: f.get() });
  });
  await page.route("**/api/admin/trials/trial-one/cancel", route => {
    cancels++; expect(route.request().postDataJSON().reason).toBe("Ученик заболел");
    f.update({ status: "CANCELED", capabilities: { canCancel: false, canReschedule: false, canMarkAttendance: false, canRecordResult: false } }); return route.fulfill({ json: f.get() });
  });
  await page.goto("/admin/trials"); await page.getByRole("button", { name: "Просмотр пробного: Арсен Гизатов", exact: true }).click();
  await page.getByRole("button", { name: "Действия с пробным", exact: true }).click(); await page.getByRole("menuitem", { name: "Перенести пробное", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toContainText("Не удалось загрузить занятия");
  loadFail = false; await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("radio")).toHaveCount(1);
  await page.getByRole("radio").click(); await audit(page, info, "reschedule-modal");
  await page.getByRole("button", { name: "Перенести пробное", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Место уже занято");
  moveFail = false; await page.getByRole("button", { name: "Перенести пробное", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.getByRole("button", { name: "Действия с пробным", exact: true }).click(); await page.getByRole("menuitem", { name: "Отменить пробное", exact: true }).click();
  await page.getByRole("button", { name: "Отменить пробное", exact: true }).click();
  await expect(page.getByText("Укажите причину отмены", { exact: true })).toBeVisible(); expect(cancels).toBe(0);
  await page.getByRole("textbox", { name: /Причина отмены/ }).fill("  Ученик заболел  "); await audit(page, info, "cancel-modal");
  await page.getByRole("button", { name: "Отменить пробное", exact: true }).click();
  await expect.poll(() => cancels).toBe(1);
  await expect(page.getByRole("heading", { name: "Отменить пробное", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText("Запись отменена");
});

test("trials: real API read, responsive list and details without mutations", async ({ page }, info) => {
  await signIn(page);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/admin/trials");
  await expect(page.getByText("Обновляем реестр…", { exact: true })).toHaveCount(0);
  await audit(page, info, "real-trials");
  const preview = page.getByRole("button", { name: /^Просмотр пробного:/ }).first();
  if (await preview.count()) {
    await preview.click(); await expect(page.getByRole("dialog").getByText("Загрузка пробного…", { exact: true })).toHaveCount(0);
    await audit(page, info, "real-preview");
    await page.getByRole("link", { name: "Полная карточка", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await audit(page, info, "real-detail");
  }
  expect(errors).toEqual([]);
});

test("trials: list retry, page correction and no-show completion", async ({ page }, info) => {
  await signIn(page); const f = await fixture(page);
  let fail = true;
  await page.route("**/api/admin/trials?*", route => fail ? route.fulfill({ status: 503, json: { message: "Реестр временно недоступен" } }) : route.fallback());
  await page.goto("/admin/trials?page=99");
  await expect(page.getByText("Реестр временно недоступен", { exact: true })).toBeVisible();
  fail = false; await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page).not.toHaveURL(/page=99/);
  await page.getByRole("button", { name: "Просмотр пробного: Арсен Гизатов", exact: true }).click();
  await page.getByRole("button", { name: "Отметить посещение", exact: true }).click();
  await page.getByRole("radio", { name: "Не пришёл", exact: true }).click();
  await page.route("**/api/admin/trials/trial-one/attendance", route => {
    expect(route.request().postDataJSON().status).toBe("NO_SHOW");
    f.update({ status: "COMPLETED", attendanceStatus: "NO_SHOW", capabilities: { canCancel: false, canReschedule: false, canMarkAttendance: false, canRecordResult: false } });
    return route.fulfill({ json: f.get() });
  });
  await page.getByRole("button", { name: "Сохранить посещение", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Отметить посещение", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Уточнить причину неявки");
  await expect(page.getByRole("button", { name: "Действия с пробным", exact: true })).toHaveCount(0);
  await audit(page, info, "no-show-preview");
});
