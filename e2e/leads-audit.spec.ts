import { test, expect, Page, TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { businessDate, sessionTimestamp, sessionSearchRanges } from "../src/modules/admin/leads/lead.workspace";
import type { GroupApiModel } from "../src/modules/admin/groups/group.api";
import type { AdminSessionListItem } from "../src/modules/admin/groups/session.api";

async function auditDialog(page: Page, name: string, info: TestInfo) {
  const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect.soft(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),name).toEqual([]);
  await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:true});
  await info.attach(name,{path:info.outputPath(`${name}.png`),contentType:"image/png"});
}

test.afterEach(async ({request}, info) => {
  const trialId = info.annotations.find(a=>a.type==="qa-trial")?.description;
  if (!trialId) return;
  const auth = await request.post("/api/auth/login",{data:{email:process.env.E2E_EMAIL,password:process.env.E2E_PASSWORD}});
  expect(auth.ok()).toBeTruthy();
  const headers = {Authorization:`Bearer ${(await auth.json()).accessToken}`};
  const trial = await request.get(`/api/admin/trials/${trialId}`,{headers});
  expect(trial.ok()).toBeTruthy();
  if ((await trial.json()).status === "SCHEDULED") {
    const canceled = await request.post(`/api/admin/trials/${trialId}/cancel`,{headers,data:{reason:"QA cleanup после браузерного прогона"}});
    expect(canceled.ok()).toBeTruthy();
  }
});

async function login(page: Page) {
  if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) throw new Error("Set E2E_EMAIL and E2E_PASSWORD for a local test account.");
  await page.goto("/login");
  await page.getByLabel("Email", {exact:true}).fill(process.env.E2E_EMAIL);
  await page.getByLabel("Пароль", {exact:true}).fill(process.env.E2E_PASSWORD);
  const responsePromise = page.waitForResponse(r => r.url().endsWith("/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", {name:"Войти", exact:true}).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const auth = await response.json();
  const branchesResponse = await page.request.get("/api/admin/branches", {headers:{Authorization:`Bearer ${auth.accessToken}`}});
  expect(branchesResponse.ok()).toBeTruthy();
  const body = await branchesResponse.json();
  const branches = body.branches ?? body;
  await page.waitForURL(/\/admin\//);
  if (page.url().includes("branch-select") && branches.length > 1) await page.getByRole("button").filter({hasText:branches[0].name}).click();
  await page.waitForURL(/\/admin\/dashboard/);
  await page.goto("/admin/leads");
  await expect(page.getByText(/^Найдено:/)).toBeVisible();
  return {auth, branches};
}

test("workspace: search, views, preview, accessibility and layout", async ({page}, info) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => {if(r.status() >= 400 && r.url().includes("/api/")) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);});
  await login(page);
  await page.screenshot({path:info.outputPath("leads-list.png"),fullPage:true});
  await info.attach("leads-list", {path:info.outputPath("leads-list.png"),contentType:"image/png"});
  const widths = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth, viewport:innerWidth}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);
  if (info.project.name === "mobile") {
    await expect(page.locator("[data-lead-id]:visible").first()).toBeInViewport();
    await page.getByRole("button", {name:/Обзор · в работе/}).click();
    await expect(page.getByRole("button", {name:/Пробные сегодня/})).toBeVisible();
    await page.getByRole("button", {name:/Обзор · в работе/}).click();
  }
  const metrics = await page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation").map(e=>e.toJSON()),
    paint: performance.getEntriesByType("paint").map(e=>e.toJSON()),
  }));
  await info.attach("navigation-timing", {body:JSON.stringify(metrics,null,2),contentType:"application/json"});
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {ttfbMs:Math.round(nav.responseStart-nav.requestStart),domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd),loadMs:Math.round(nav.loadEventEnd),firstContentfulPaintMs:Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0)};
  });
  console.info("Local navigation after login",info.project.name,JSON.stringify(timing));
  const axe = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  await info.attach("axe-list", {body:JSON.stringify(axe.violations,null,2),contentType:"application/json"});
  expect.soft(axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  const first = page.locator("[data-lead-id]:visible").first();
  if (await first.count()) {
    await first.getByRole("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", {name:"Полная карточка",exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath("lead-preview.png"),fullPage:true});
    const axePreview = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect.soft(axePreview.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.getByRole("button",{name:"Новый лид",exact:true}).click();
  await auditDialog(page,"create-contact",info);
  await page.getByRole("dialog").getByRole("button",{name:"Далее",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Укажите имя");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("[data-lead-id]:visible").first().getByRole("button").first().click();
  await page.getByRole("button",{name:"Полная карточка",exact:true}).click();
  await expect(page.getByText(/Участники заявки ·/)).toBeVisible();
  await auditDialog(page,"lead-detail-responsive",info);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const label of ["План работы", "Записать контакт", "Уточнить заявку"]) {
    const button = page.getByRole("button",{name:label,exact:true});
    if (await button.count()) {
      await button.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await auditDialog(page,`responsive-${label}`,info);
      for (let index=0;index<5;index++) {
        await page.keyboard.press("Tab");
        expect(await page.evaluate(()=>Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  }
  await page.getByRole("button",{name:"Назад к лидам",exact:true}).click();
  await expect(page.getByText(/^Найдено:/)).toBeVisible();
  await page.getByLabel("Поиск по лидам", {exact:true}).fill("неттакоголида-audit-unmatched");
  await expect(page.getByText("В этой очереди пока пусто")).toBeVisible();
  await page.getByLabel("Поиск по лидам", {exact:true}).fill("");
  await page.getByRole("button",{name:/^Фильтры/}).click();
  await page.getByRole("combobox", {name:"Показывать",exact:true}).selectOption("ALL");
  await expect(page).toHaveURL(/scope=ALL/);
  await page.getByRole("button",{name:"Сбросить всё",exact:true}).click();
  await page.getByRole("radio",{name:"Воронка",exact:true}).click();
  await expect(page.getByLabel("Воронка лидов", {exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath("leads-board.png"),fullPage:true});
  await page.getByRole("button",{name:"Свернуть: Новые",exact:true}).click();
  await expect(page.getByRole("button",{name:"Развернуть: Новые",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Развернуть: Новые",exact:true}).click();
  await page.getByRole("radio",{name:"Список",exact:true}).click();
  if (info.project.name === "mobile") {
    await page.getByRole("button",{name:"Открыть разделы",exact:true}).click();
    await expect(page.getByRole("navigation",{name:"Мобильное меню"})).toBeVisible();
    await page.getByRole("navigation",{name:"Мобильное меню"}).getByRole("link",{name:"Лиды",exact:true}).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("new workflow: validation, contact, persistence, conflict and completion", async ({page}, info) => {
  test.skip(info.project.name === "mobile", "Business mutations run once; mobile is covered by the UI audit.");
  test.skip(process.env.E2E_ALLOW_WRITES !== "1", "Requires explicit test-database write opt-in.");
  test.setTimeout(120000);
  const {auth, branches} = await login(page);
  const headers = {Authorization:`Bearer ${auth.accessToken}`};
  const suffix = Date.now().toString();
  const name = `QA Workspace ${suffix}`;
  await page.getByRole("button",{name:"Новый лид",exact:true}).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Родитель \/ представитель/).fill(name);
  await dialog.getByLabel(/Телефон/).fill("+7777"+suffix.slice(-7));
  await dialog.getByLabel("Email",{exact:true}).fill(`qa-${suffix}@example.com`);
  await dialog.getByLabel("Комментарий",{exact:true}).fill("Автоматический локальный UX-аудит");
  await dialog.getByRole("button",{name:"Далее",exact:true}).click();
  await dialog.getByLabel("Имя участника 1",{exact:true}).fill("QA Участник "+suffix);
  await dialog.getByLabel("Дата рождения участника 1",{exact:true}).fill("2099-01-01");
  await dialog.getByRole("button",{name:"Далее",exact:true}).click();
  await expect(dialog.getByText("Дата рождения должна быть в прошлом",{exact:true})).toBeVisible();
  await dialog.getByLabel("Дата рождения участника 1",{exact:true}).fill("2015-01-01");
  await dialog.getByRole("button",{name:"Добавить ученика",exact:true}).click();
  await expect(dialog.getByLabel("Имя участника 2",{exact:true})).toBeVisible();
  await dialog.getByRole("button",{name:"Удалить ученика",exact:true}).last().click();
  await auditDialog(page,"create-participants",info);
  await dialog.getByRole("button",{name:"Далее",exact:true}).click();
  await auditDialog(page,"create-review",info);
  const createResponse = page.waitForResponse(r=>r.url().endsWith("/admin/leads/create") && r.request().method()==="POST");
  await dialog.getByRole("button",{name:"Создать лид",exact:true}).click();
  const create = await createResponse;
  expect(create.status(), await create.text()).toBe(201);
  const created = await create.json();
  const id = created.primaryLeadId || created.leadIds?.[0];
  expect(id).toBeTruthy();
  await info.attach("test-lead", {body:JSON.stringify({id,name}),contentType:"application/json"});
  await page.goto(`/admin/leads/${id}`);
  await expect(page.getByRole("button",{name:"План работы",exact:true})).toBeVisible();
  const detailAxe = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect.soft(detailAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.getByRole("button",{name:"План работы",exact:true}).click();
  dialog = page.getByRole("dialog");
  const planAxe = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect.soft(planAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await dialog.getByLabel("Следующее действие", {exact:true}).fill("Согласовать пробное");
  await dialog.getByRole("button",{name:"Сохранить",exact:true}).click();
  await expect(dialog.getByRole("alert")).toHaveText("Укажите действие и срок вместе.");
  const tomorrow = new Date(Date.now()+86400000);
  const localDue = new Date(tomorrow.getTime()+5*3600000).toISOString().slice(0,16);
  await dialog.getByLabel("Срок", {exact:true}).fill(localDue);
  await dialog.getByRole("combobox", {name:"Приоритет",exact:true}).click();
  await page.getByRole("option", {name:"Высокий",exact:true}).click();
  await dialog.getByRole("button",{name:"Сохранить",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Согласовать пробное",{exact:true})).toBeVisible();
  const stale = await page.request.patch(`/api/admin/leads/${id}/work`,{headers,data:{operation:"PLAN",version:0,priority:"NORMAL"}});
  expect(stale.status()).toBe(409);
  await page.getByRole("button",{name:"Записать контакт",exact:true}).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox",{name:"Результат контакта",exact:true}).click();
  await page.getByRole("option",{name:"Нет ответа",exact:true}).click();
  await dialog.getByRole("button",{name:"Сохранить",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let detail = await (await page.request.get(`/api/admin/leads/${id}/workspace`,{headers})).json();
  expect(detail.status).toBe("NEW");
  await page.getByRole("button",{name:"Записать контакт",exact:true}).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox",{name:"Результат контакта",exact:true}).click();
  await page.getByRole("option",{name:"Связались",exact:true}).click();
  await dialog.getByRole("button",{name:"Сохранить",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  detail = await (await page.request.get(`/api/admin/leads/${id}/workspace`,{headers})).json();
  expect(detail.status).toBe("IN_PROGRESS");
  await page.getByRole("button",{name:"Уточнить заявку",exact:true}).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button",{name:"Сохранить изменения",exact:true}).click();
  await expect(dialog.getByText("Выберите хотя бы один день.",{exact:true})).toBeVisible();
  await dialog.getByRole("button",{name:"Пн",exact:true}).click();
  await dialog.getByRole("radio",{name:"Вечер",exact:true}).click();
  await dialog.getByLabel("Заметки",{exact:true}).fill("QA: предпочтительно вечер понедельника");
  await auditDialog(page,"qualify",info);
  await dialog.getByRole("button",{name:"Сохранить изменения",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("QA: предпочтительно вечер понедельника",{exact:true})).toBeVisible();
  await auditDialog(page,"lead-detail",info);
  await page.getByRole("button",{name:"Оформить без пробного",exact:true}).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("radio",{name:"Существующий клиент",exact:true}).click();
  await dialog.getByRole("button",{name:"Оформить участника",exact:true}).click();
  await expect(dialog.getByText("Выберите существующего клиента",{exact:true})).toBeVisible();
  await auditDialog(page,"convert",info);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button",{name:"Отказ / Закрыть",exact:true}).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button",{name:"Закрыть с отказом",exact:true}).click();
  await expect(dialog.locator("p").filter({hasText:/^Выберите причину$/})).toBeVisible();
  await dialog.getByRole("combobox",{name:"Причина",exact:true}).click();
  await page.getByRole("option",{name:"Другое",exact:true}).click();
  await dialog.getByRole("button",{name:"Закрыть с отказом",exact:true}).click();
  await expect(dialog.getByText("Для причины «Другое» комментарий обязателен",{exact:true})).toBeVisible();
  await auditDialog(page,"loss",info);
  await dialog.getByRole("button",{name:"Отмена",exact:true}).click();
  await page.getByRole("button",{name:"Выполнено",exact:true}).click();
  await expect(page.getByRole("button",{name:"Выполнено",exact:true})).toHaveCount(0);
  await page.getByRole("radio",{name:"Активность",exact:true}).click();
  await expect(page.getByText("Выполнено: Согласовать пробное",{exact:true})).toBeVisible();
  const inaccessible = await page.request.get("/api/admin/leads/workspace?branchId=00000000-0000-0000-0000-000000000001",{headers});
  expect(inaccessible.status()).toBe(403);

  // Use real future sessions; no hard-coded group or expired calendar date.
  const groups = await (await page.request.get(`/api/organization/groups/branches/${branches[0].branchId}`,{headers})).json() as GroupApiModel[];
  const from = businessDate();
  let chosen: {group:GroupApiModel;session:AdminSessionListItem;alternative?:AdminSessionListItem} | undefined;
  for (const group of groups.filter(g=>g.status === "ACTIVE" && (!g.audienceType || g.audienceType === "CHILDREN"))) {
    const responses = await Promise.all(sessionSearchRanges(from).map(range => page.request.get(`/api/admin/groups/${group.groupId}/sessions?from=${range.from}&to=${range.to}`,{headers})));
    for (const response of responses) expect(response.ok(),await response.text()).toBeTruthy();
    const sessions = (await Promise.all(responses.map(r=>r.json()))).flatMap(r=>r.items) as AdminSessionListItem[];
    const session = sessions.filter(s=>s.status === "PLANNED" && sessionTimestamp(s.startsAt)>Date.now()).sort((a,b)=>sessionTimestamp(a.startsAt)-sessionTimestamp(b.startsAt))[0];
    if (session) { chosen = {group,session,alternative:sessions.find(s=>s.status==="PLANNED" && s.id!==session.id && sessionTimestamp(s.startsAt)>Date.now())}; break; }
  }
  expect(chosen, "Seed at least one active children's group with a future planned session within 60 days.").toBeTruthy();
  await page.getByRole("button",{name:"Назначить пробное",exact:true}).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button",{name:"Далее",exact:true})).toBeDisabled();
  await dialog.getByRole("combobox",{name:"Группа",exact:true}).click();
  await page.getByRole("option",{name:chosen!.group.name,exact:true}).click();
  const trialAxe = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect.soft(trialAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await dialog.getByRole("button",{name:"Далее",exact:true}).click();
  await expect(dialog.locator('input[type="date"]')).toHaveValue(chosen!.session.sessionDate);
  await expect(dialog.getByRole("button",{name:"Далее",exact:true})).toBeDisabled();
  await dialog.locator('button[aria-pressed="false"]').first().click();
  await page.screenshot({path:info.outputPath("trial-session-picker.png"),fullPage:true});
  await dialog.getByRole("button",{name:"Далее",exact:true}).click();
  await expect(dialog.getByText("Договор, оплата и постоянное зачисление в группу не создаются автоматически.")).toBeVisible();
  const bookingResponse = page.waitForResponse(r=>r.url().endsWith("/admin/trials") && r.request().method()==="POST");
  await dialog.getByRole("button",{name:"Назначить пробное",exact:true}).click();
  const booking = await bookingResponse;
  expect(booking.ok(),await booking.text()).toBeTruthy();
  const trialId = (await booking.json()).id;
  info.annotations.push({type:"qa-trial",description:trialId});
  await expect(page).toHaveURL(new RegExp(`/admin/trials/${trialId}`));
  const updated = await (await page.request.get(`/api/admin/leads/${id}/workspace`,{headers})).json();
  expect(updated.currentTrials.some((t:{id:string})=>t.id===trialId)).toBe(true);
  expect(updated.status).toBe("TRIAL_SCHEDULED");
  // Preferences are independent of qualification and must preserve booked participant identities.
  await page.goto(`/admin/leads/${id}`);
  await page.getByRole("button",{name:"Редактировать пожелания",exact:true}).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Пожелания и ограничения",{exact:true}).fill("QA: только вечер, рядом с домом");
  await auditDialog(page,"lead-preferences",info);
  const preferencesResponse = page.waitForResponse(r=>r.url().endsWith(`/leads/${id}/preferences`) && r.request().method()==="PATCH");
  await dialog.getByRole("button",{name:"Сохранить пожелания",exact:true}).click();
  expect((await preferencesResponse).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("QA: только вечер, рядом с домом",{exact:true})).toBeVisible();
  const afterPreferences = await (await page.request.get(`/api/admin/leads/${id}/workspace`,{headers})).json();
  expect(afterPreferences.status).toBe(updated.status);
  expect(afterPreferences.participants).toEqual(updated.participants);
  expect(afterPreferences.currentTrials).toEqual(updated.currentTrials);
  const stalePreferences = await page.request.patch(`/api/admin/leads/${id}/preferences`,{headers,data:{version:updated.work.version,preferredDays:[],timePreference:null,experience:"",notes:""}});
  expect(stalePreferences.status()).toBe(409);
  await page.goto(`/admin/trials/${trialId}`);
  {
    await auditDialog(page,"trial-detail",info);
    await page.getByRole("button",{name:"Действия",exact:true}).click();
    await page.getByRole("menuitem",{name:"Перенести пробное",exact:true}).click();
    dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button",{name:"Перенести пробное",exact:true})).toBeDisabled();
    await auditDialog(page,"trial-reschedule",info);
    if (chosen!.alternative) {
      await dialog.getByLabel("Начальная дата поиска",{exact:true}).fill(chosen!.alternative.sessionDate);
      await dialog.getByRole('radio').first().click();
      const movedResponse = page.waitForResponse(r=>r.url().endsWith(`/trials/${trialId}/reschedule`) && r.request().method()==="POST");
      await dialog.getByRole("button",{name:"Перенести пробное",exact:true}).click();
      const moved = await movedResponse;
      expect(moved.ok(),await moved.text()).toBeTruthy();
      expect((await moved.json()).session.id).not.toBe(chosen!.session.id);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else { await page.keyboard.press("Escape"); }
    await page.getByRole("button",{name:"Действия",exact:true}).click();
    await page.getByRole("menuitem",{name:"Отменить пробное",exact:true}).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button",{name:"Отменить пробное",exact:true}).click();
    await expect(dialog.getByText("Укажите причину отмены",{exact:true})).toBeVisible();
    await dialog.getByRole("textbox",{name:/^Причина отмены/}).fill("Завершён автоматический локальный QA-прогон");
    await auditDialog(page,"trial-cancel",info);
    const canceledResponse = page.waitForResponse(r=>r.url().endsWith(`/trials/${trialId}/cancel`) && r.request().method()==="POST");
    await dialog.getByRole("button",{name:"Отменить пробное",exact:true}).click();
    const result = await canceledResponse;
    expect(result.ok(),await result.text()).toBeTruthy();
    expect((await result.json()).status).toBe("CANCELED");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // A stale deep link must explain the state change without exposing a submit action.
    await page.goto(`/admin/trials/${trialId}?drawer=reschedule`);
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Это действие недоступно в текущем состоянии пробного.");
    await expect(page.getByRole("dialog").getByRole("button",{name:"Перенести пробное",exact:true})).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button",{name:"Закрыть",exact:true}).first().click();
    await expect(page.getByRole("heading",{level:1})).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await info.attach("test-trial",{body:JSON.stringify({leadId:id,trialId,status:"CANCELED"}),contentType:"application/json"});
  await page.goto(`/admin/leads/${id}`);
  await page.getByRole("button",{name:"Оформить без пробного",exact:true}).click();
  dialog = page.getByRole("dialog");
  const conversionResponse = page.waitForResponse(r=>r.url().endsWith(`/leads/${id}/convert`) && r.request().method()==="POST");
  await dialog.getByRole("button",{name:"Оформить участника",exact:true}).click();
  const converted = await conversionResponse;
  expect(converted.ok(),await converted.text()).toBeTruthy();
  const conversion = await converted.json();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Карточка ученика",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:/Карточка клиента/})).toBeVisible();
  await info.attach("test-conversion",{body:JSON.stringify({leadId:id,clientId:conversion.clientId,playerId:conversion.playerId}),contentType:"application/json"});
  await page.getByRole("button",{name:"Создать договор",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/contracts\?drawer=create-contract/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await auditDialog(page,"contract-from-lead",info);
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox",{name:"Выберите клиента",exact:true})).toHaveValue(name);
  await expect(dialog.getByRole("combobox",{name:"Выберите ученика",exact:true})).toHaveValue("QA Участник "+suffix);
  // Fault injection only: no real contract or payment is created by this check.
  let creates = 0;
  let activations = 0;
  const fakeContractId = "00000000-0000-4000-8000-000000000099";
  await page.route("**/api/admin/contracts",async route => {
    if (route.request().method() !== "POST") return route.continue();
    creates++;
    await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:fakeContractId})});
  });
  await page.route(`**/api/admin/contracts/${fakeContractId}/activate`,async route => {
    activations++;
    await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({message:"QA: временно недоступна активация"})});
  });
  await dialog.getByRole("button",{name:"Создать и активировать",exact:true}).click();
  await expect(dialog.getByRole("button",{name:"Повторить активацию",exact:true})).toBeVisible();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button",{name:"Повторить активацию",exact:true}).click();
  await expect.poll(()=>activations).toBe(2);
  expect(creates).toBe(1);
  await expect(dialog.getByRole("button",{name:"Повторить активацию",exact:true})).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("preferences form: retry, clear, reload and closed state", async ({page}, info) => {
  const {auth,branches} = await login(page);
  const headers = {Authorization:`Bearer ${auth.accessToken}`};
  const workspaceResponse = await page.request.get(`/api/admin/leads/workspace?branchId=${branches[0].branchId}`,{headers});
  expect(workspaceResponse.ok()).toBeTruthy();
  const workspace = await workspaceResponse.json();
  const record = Object.values(workspace.columns).flat()[0] as {id:string};
  expect(record?.id).toBeTruthy();
  let lead = await (await page.request.get(`/api/admin/leads/${record.id}/workspace`,{headers})).json();
  lead = {...lead,status:"TRIAL_SCHEDULED",preferredDays:"MON",timePreference:"EVENING",experience:"BEGINNER",notes:"QA пожелания"};
  await page.route(`**/api/admin/leads/${record.id}/workspace`, route=>route.fulfill({json:lead}));
  let fail = true, saves = 0;
  await page.route(`**/api/admin/leads/${record.id}/preferences`, async route=>{
    saves++;
    if(fail) {await route.fulfill({status:503,json:{message:"QA: повторите сохранение"}}); return;}
    const payload = route.request().postDataJSON();
    lead = {...lead,...payload,preferredDays:payload.preferredDays.join(","),work:{...lead.work,version:lead.work.version+1},qualificationData:{...lead.qualificationData,...payload,preferredDays:payload.preferredDays.join(",")}};
    await route.fulfill({json:lead});
  });
  await page.goto(`/admin/leads/${record.id}`);
  await page.getByRole("button",{name:"Редактировать пожелания",exact:true}).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Пожелания и ограничения",{exact:true}).fill("QA новые пожелания");
  await auditDialog(page,"preferences-responsive",info);
  await dialog.getByRole("button",{name:"Сохранить пожелания",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("QA: повторите сохранение");
  await expect(dialog.getByLabel("Пожелания и ограничения",{exact:true})).toHaveValue("QA новые пожелания");
  fail = false;
  await dialog.getByRole("button",{name:"Сохранить пожелания",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(saves).toBe(2);
  await page.reload();
  await expect(page.getByText("QA новые пожелания",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Редактировать пожелания",exact:true}).click();
  await dialog.getByRole("button",{name:"Пн",exact:true}).click();
  for (const name of ["Удобное время","Общий уровень подготовки"]) {
    await dialog.getByRole("combobox",{name,exact:true}).click();
    await page.getByRole("option",{name:"Не уточнено",exact:true}).click();
  }
  await dialog.getByLabel("Пожелания и ограничения",{exact:true}).fill("");
  await dialog.getByRole("button",{name:"Сохранить пожелания",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("QA новые пожелания",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Редактировать пожелания",exact:true}).click();
  await expect(dialog.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(dialog.getByRole("combobox",{name:"Удобное время",exact:true})).toContainText("Не уточнено");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  lead.status = "CONVERTED";
  await page.reload();
  await expect(page.getByText("Лид закрыт. Пожелания сохранены для истории.")).toBeVisible();
  await expect(page.getByRole("button",{name:"Редактировать пожелания",exact:true})).toHaveCount(0);
});

test("sessions calendar: dates, filters, views, errors and responsive accessibility", async ({page}, info) => {
  await login(page);
  const errors: string[] = [];
  page.on("pageerror", e=>errors.push(e.message));
  // Deterministic calendar fixtures; production API loading is checked separately by navigation smoke.
  const groupId = "00000000-0000-0000-0000-000000000041";
  await page.route("**/api/organization/groups/branches/*", route=>route.fulfill({json:[{groupId,name:"QA Юниоры",status:"ACTIVE"}]}));
  let fail = false;
  await page.route("**/api/admin/groups/*/sessions?*", async route=>{
    if (fail) { await route.fulfill({status:503,json:{message:"QA: занятия временно недоступны"}}); return; }
    const qs = new URL(route.request().url()).searchParams;
    const inside = qs.get("from")! <= "2026-09-12" && qs.get("to")! >= "2026-09-12";
    const base = {scheduleId:"schedule",sessionDate:"2026-09-12",startsAt:"2026-09-12T15:00:00",endsAt:"2026-09-12T16:00:00",location:{id:"place",name:"QA Арена"},coaches:[{id:"coach",fullName:"QA Тренер",role:"MAIN"}],participantsCount:8,attendance:{total:8,marked:0,presentLike:0},capabilities:{canOpenAttendance:true}};
    await route.fulfill({json:{groupId,from:qs.get("from"),to:qs.get("to"),items:inside ? [{...base,id:"planned",status:"PLANNED",effectiveStatus:"PLANNED"},{...base,id:"cancelled",startsAt:"2026-09-12T16:00:00",endsAt:"2026-09-12T17:00:00",status:"CANCELLED",effectiveStatus:"CANCELLED",cancelReason:"QA Погода"}] : []}});
  });
  await page.goto("/admin/schedule?date=2026-09-12");
  await expect(page.getByRole("heading",{name:"Занятия",exact:true})).toBeVisible();
  await expect(page.locator("[data-session-id]")).toHaveCount(1);
  await page.getByRole("button",{name:"Показать отменённые",exact:true}).click();
  await expect(page.locator("[data-session-id]")).toHaveCount(2);
  await auditDialog(page,"sessions-agenda",info);
  await page.getByRole("radio",{name:"Неделя",exact:true}).click();
  await auditDialog(page,"sessions-week",info);
  const size = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(size.scroll).toBeLessThanOrEqual(size.viewport);
  if(info.project.name === "mobile") await page.getByRole("button",{name:"Фильтры",exact:true}).click();
  await page.getByRole("combobox",{name:"Статус занятия",exact:true}).click();
  await page.getByRole("option",{name:"Отменено",exact:true}).click();
  await expect(page.locator("[data-session-id]")).toHaveCount(1);
  await page.locator('[data-session-id="cancelled"] button').click();
  await expect(page.getByText("Причина отмены: QA Погода")).toBeVisible();
  if(info.project.name === "mobile") await page.keyboard.press("Escape");
  else await page.getByRole("button",{name:"Закрыть просмотр",exact:true}).click();
  await page.getByLabel("Поиск занятий",{exact:true}).fill("не существует");
  await expect(page.getByText("Занятий по этим фильтрам нет",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Сбросить фильтры",exact:true}).click();
  await expect(page.locator("[data-session-id]")).toHaveCount(2);
  await page.getByRole("button",{name:"Следующая неделя",exact:true}).click();
  await expect(page.getByText("На эту неделю занятий нет",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Предыдущая неделя",exact:true}).click();
  await expect(page.locator("[data-session-id]")).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("radio",{name:"Неделя",exact:true})).toHaveAttribute("aria-checked","true");
  await expect(page.locator("[data-session-id]")).toHaveCount(2);
  fail = true;
  await page.getByRole("button",{name:"Обновить",exact:true}).click();
  await expect(page.getByText("QA: занятия временно недоступны",{exact:true})).toBeVisible();
  await expect(page.locator("[data-session-id]")).toHaveCount(0);
  fail = false;
  await page.getByRole("button",{name:"Повторить",exact:true}).click();
  await expect(page.locator("[data-session-id]")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("admin navigation: primary sections load without JavaScript errors or page overflow", async ({page}, info) => {
  test.setTimeout(120000);
  await login(page);
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => {if(r.status() >= 400 && r.url().includes("/api/")) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);});
  for (const section of ["dashboard", "trials", "clients", "students", "groups", "schedule", "coaches", "contracts", "payments", "profile"]) {
    await test.step(section, async () => {
      await page.goto(`/admin/${section}`);
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`/admin/${section}`));
      const size = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth, viewport:innerWidth}));
      expect.soft(size.scroll, `Page overflow: ${section}`).toBeLessThanOrEqual(size.viewport);
      await page.screenshot({path:info.outputPath(`${section}.png`),fullPage:true});
    });
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
