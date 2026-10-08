import { test, expect, Page, TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signIn(page:Page) {
  if(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) throw new Error("Local test credentials required");
  await page.goto("/login");
  await page.getByLabel("Email",{exact:true}).fill(process.env.E2E_EMAIL);
  await page.getByLabel("Пароль",{exact:true}).fill(process.env.E2E_PASSWORD);
  const authResponse=page.waitForResponse(r=>r.url().endsWith("/auth/login") && r.request().method()==="POST");
  await page.getByRole("button",{name:"Войти",exact:true}).click();
  const auth=await (await authResponse).json();
  await page.waitForURL(/\/admin\//);
  if(page.url().includes("branch-select")) {
    const response=await page.request.get("/api/admin/branches",{headers:{Authorization:`Bearer ${auth.accessToken}`}});
    const data=await response.json();
    const branches = data.branches ?? data;
    if (branches.length > 1) await page.getByRole("button").filter({hasText:branches[0].name}).click();
  }
  await page.waitForURL(/\/admin\/dashboard/);
}
async function audit(page:Page,info:TestInfo,name:string) {
  const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:true});
}
const gid="00000000-0000-0000-0000-000000000041";
async function fixture(page:Page) {
  let item:any={id:"qa-session",groupId:gid,groupName:"Tangy Football",group:{id:gid,name:"Tangy Football"},scheduleId:"rule",sessionDate:"2026-09-12",startsAt:"2026-09-12T20:00:00",endsAt:"2026-09-12T21:00:00",status:"PLANNED",effectiveStatus:"PLANNED",cancelReason:null,location:null,coaches:[{id:"coach",fullName:"Арсен Гизатов",role:"MAIN"}],participantsCount:3,attendance:{total:3,marked:0,presentLike:0},capabilities:{canCancel:true,canReschedule:true,canSubstituteCoach:true,canOpenAttendance:true},actualStartAt:null,actualEndAt:null};
  await page.route("**/api/organization/groups/branches/*",route=>route.fulfill({json:[{groupId:gid,name:"Tangy Football",status:"ACTIVE"}]}));
  await page.route("**/api/admin/groups/*/sessions?*",route=>route.fulfill({json:{groupId:gid,items:[item]}}));
  await page.route(`**/api/admin/sessions/${item.id}`,route=>route.fulfill({json:item}));
  await page.route(`**/api/admin/groups/${gid}/coaches`,route=>route.fulfill({json:{groupId:gid,coaches:[{groupCoachId:"gc",coachId:"coach",coachFirstName:"Арсен",coachLastName:"Гизатов",active:true,coachRole:"MAIN"}]}}));
  return {get:()=>item,set:(change:any)=>{item={...item,...change};}};
}

test("calendar actions: inspector, reschedule validation, retry, cancel and fresh capabilities",async({page},info)=>{
  await signIn(page);
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const f=await fixture(page);
  let saves=0,fail=true;
  await page.route("**/api/admin/sessions/qa-session/reschedule",async route=>{
    saves++;
    if(fail){await route.fulfill({status:409,json:{message:"Тренер занят в это время"}});return;}
    const payload=route.request().postDataJSON();
    expect(payload.reason).toBe("Перенос по запросу группы");
    expect(payload.startsAt).toBe("2026-09-12T21:00:00");
    f.set({...payload});await route.fulfill({json:f.get()});
  });
  await page.route("**/api/admin/sessions/qa-session/cancel",async route=>{
    expect(route.request().postDataJSON().reasonCode).toBe("COACH_UNAVAILABLE");
    f.set({status:"CANCELLED",effectiveStatus:"CANCELLED",cancelReason:"Тренер недоступен",capabilities:{canCancel:false,canReschedule:false,canSubstituteCoach:false,canOpenAttendance:false}});
    await route.fulfill({json:f.get()});
  });
  await page.goto("/admin/schedule?view=agenda&date=2026-09-12");
  await page.getByRole("button",{name:/^Без площадки /}).click();
  await expect(page).toHaveURL(/place=none/);
  await page.getByRole("button",{name:/^Требуют закрытия /}).click();
  await expect(page).toHaveURL(/status=OVERDUE/);
  expect(new URL(page.url()).searchParams.has("place")).toBe(false);
  await page.getByRole("button",{name:"Сбросить фильтры",exact:true}).click();
  await page.getByRole("button",{name:/Посмотреть Tangy/}).click();
  await expect(page.getByRole("link",{name:"Открыть занятие",exact:true})).toBeVisible();
  await audit(page,info,"reference-list-inspector");
  if(info.project.name==="desktop") {
    await page.getByRole("radio",{name:"Неделя",exact:true}).click();
    await audit(page,info,"reference-week-inspector");
  }
  await page.getByRole("button",{name:"Перенести занятие",exact:true}).click();
  const dialog=page.getByRole("dialog").last();
  await expect(dialog.getByRole("heading",{name:"Перенести занятие",exact:true})).toBeVisible();
  await dialog.getByLabel("Начало — время",{exact:true}).fill("22:00");
  await dialog.getByRole("button",{name:"Перенести",exact:true}).click();
  await expect(page.getByText("Окончание должно быть позже начала",{exact:true})).toBeVisible();expect(saves).toBe(0);
  await dialog.getByLabel("Начало — время",{exact:true}).fill("21:00");
  await dialog.getByLabel("Окончание — время",{exact:true}).fill("22:00");
  await dialog.getByRole("button",{name:"Перенести",exact:true}).click();
  await expect(page.getByText("Укажите причину переноса",{exact:true})).toBeVisible();expect(saves).toBe(0);
  await dialog.getByRole("textbox",{name:"Причина *",exact:true}).fill("Перенос по запросу группы");
  await audit(page,info,"reschedule-form");
  await dialog.getByRole("button",{name:"Перенести",exact:true}).click();
  await expect(page.getByText("Тренер занят в это время",{exact:true})).toBeVisible();
  await expect(dialog.getByRole("textbox",{name:"Причина *",exact:true})).toHaveValue("Перенос по запросу группы");
  fail=false;
  await dialog.getByRole("button",{name:"Перенести",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Перенести занятие",exact:true})).toHaveCount(0);expect(saves).toBe(2);
  await expect(page.locator('[data-session-id="qa-session"]')).toContainText("21:00");
  // Fresh server state wins over the capabilities of a previously loaded row.
  f.set({capabilities:{...f.get().capabilities,canCancel:false}});
  await page.getByRole("button",{name:"Отменить занятие",exact:true}).click();
  await expect(page.getByText("Статус занятия изменился. Это действие больше недоступно.",{exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  f.set({capabilities:{...f.get().capabilities,canCancel:true}});
  await page.getByRole("button",{name:"Отменить занятие",exact:true}).click();
  await page.getByRole("dialog").last().getByRole("button",{name:"Отменить занятие",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Отменить занятие",exact:true})).toHaveCount(0);
  await page.goto("/admin/schedule?date=2026-09-12&status=CANCELLED");
  await page.getByRole("button",{name:/Посмотреть Tangy/}).click();
  await expect(page.getByText("Причина отмены: Тренер недоступен")).toBeVisible();
  await expect(page.getByRole("button",{name:"Перенести занятие",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Отменить занятие",exact:true})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("calendar creation: one date, required fields, conflicts, retry and payload",async({page},info)=>{
  await signIn(page);await fixture(page);
  let valid=false,fail=true,creates=0,validations=0;
  await page.route(`**/api/admin/groups/${gid}/schedule/validate`,async route=>{
    validations++;
    expect(route.request().postDataJSON()).toEqual({coachId:"coach",startDate:"2099-09-12",endDate:"2099-09-12",type:"TEMPORARY",slots:[{dayOfWeek:"SATURDAY",startTime:"18:00",endTime:"19:00"}]});
    await route.fulfill({json:{valid,conflicts:valid?[]:[{code:"COACH_SCHEDULE_CONFLICT",message:"Тренер занят. Выберите другое время."}]}});
  });
  await page.route(`**/api/admin/groups/${gid}/schedule`,async route=>{
    expect(route.request().method()).toBe("POST");creates++;
    if(fail) await route.fulfill({status:503,json:{message:"Не удалось сохранить. Повторите попытку."}});
    else await route.fulfill({status:204});
  });
  await page.goto("/admin/schedule?date=2026-09-12");
  await page.getByRole("button",{name:"Добавить занятие",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByRole("button",{name:"Добавить занятие",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("Выберите активную группу");
  await dialog.getByRole("combobox",{name:"Группа",exact:true}).click();await page.getByRole("option",{name:"Tangy Football",exact:true}).click();
  await dialog.getByRole("combobox",{name:"Тренер",exact:true}).click();await page.getByRole("option",{name:"Арсен Гизатов",exact:true}).click();
  await dialog.locator('input[type="date"]').fill("2099-09-12");
  await dialog.getByLabel("Окончание",{exact:true}).fill("17:00");
  await dialog.getByRole("button",{name:"Добавить занятие",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("окончание должно быть позже начала");expect(validations).toBe(0);
  await dialog.getByLabel("Окончание",{exact:true}).fill("19:00");
  await dialog.getByRole("button",{name:"Добавить занятие",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("Тренер занят");expect(creates).toBe(0);
  valid=true;
  await dialog.getByRole("button",{name:"Добавить занятие",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("Не удалось сохранить");
  await audit(page,info,"create-session-retry");
  fail=false;
  await dialog.getByRole("button",{name:"Добавить занятие",exact:true}).click();
  await expect(dialog).toHaveCount(0);expect(creates).toBe(2);expect(validations).toBe(3);
  await expect(page).toHaveURL(/date=2099-09-12/);
});

test("group schedule: real periods, month navigation and responsive modal without writes",async({page},info)=>{
  await signIn(page);
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/admin/schedule?view=week&date=2026-09-12");
  await expect(page.locator("[data-session-id]").first()).toBeVisible();
  if(info.project.name==="desktop") {
    const planned=page.locator('[data-session-id] button[data-status="PLANNED"]');
    await (await planned.count() ? planned.first() : page.locator('[data-session-id] button:not([data-status="CANCELLED"])').last()).click();
    await audit(page,info,"real-week-inspector");
    await page.getByRole("radio",{name:"Список",exact:true}).click();
    await audit(page,info,"real-list-inspector");
    await page.getByRole("button",{name:"Закрыть просмотр",exact:true}).click();
  }
  await page.getByRole("button",{name:"Расписание групп",exact:true}).click();
  await page.getByRole("dialog").getByRole("link").first().click();
  await expect(page.getByRole("tab",{name:/Периоды расписания/})).toHaveAttribute("aria-selected","true");
  await audit(page,info,"group-periods");
  const edit=page.getByRole("button",{name:"Редактировать период",exact:true}).first();
  if(await edit.count()) {
    await edit.click();await expect(page.getByRole("dialog")).toBeVisible();
    await audit(page,info,"edit-group-period");
    let validations=0;
    await page.route("**/api/admin/groups/*/schedule/validate",route=>{validations++;return route.fulfill({json:{valid:false,conflicts:[{code:"COACH_SCHEDULE_CONFLICT",message:"QA конфликт периода"}]}});});
    const time=page.getByRole("dialog").locator('input[type="time"]').first();
    const initial=await time.inputValue();
    await time.fill("");
    await page.getByRole("button",{name:"Сохранить изменения",exact:true}).click();
    await expect(page.getByText("Проверьте параметры периода",{exact:true})).toBeVisible();expect(validations).toBe(0);
    await time.fill(initial);
    await page.getByRole("button",{name:"Сохранить изменения",exact:true}).click();
    await expect(page.getByText("QA конфликт периода",{exact:true})).toBeVisible();expect(validations).toBe(1);
    await page.keyboard.press("Escape");
  }
  await page.getByRole("tab",{name:"Календарь",exact:true}).click();
  await page.getByRole("radio",{name:"Месяц",exact:true}).click();
  await expect(page.getByRole("radio",{name:"Месяц",exact:true})).toHaveAttribute("aria-checked","true");
  await audit(page,info,"group-month");
  await page.getByRole("button",{name:"Следующий месяц",exact:true}).click();
  await page.getByRole("button",{name:"Предыдущий месяц",exact:true}).click();
  expect(errors).toEqual([]);
});

test("week overlap chooser keeps all sessions reachable without stretching the week",async({page},info)=>{
  await signIn(page);const f=await fixture(page);
  await page.route("**/api/admin/groups/*/sessions?*",route=>route.fulfill({json:{groupId:gid,items:[f.get(),{...f.get(),id:"overlap",startsAt:"2026-09-12T20:30:00",endsAt:"2026-09-12T21:30:00",coaches:[{id:"coach2",fullName:"QA Второй тренер",role:"MAIN"}]}]}}));
  await page.goto("/admin/schedule?view=week&date=2026-09-12");
  await page.getByRole("button",{name:"20:00 · Одновременные занятия: 2",exact:true}).click();
  await expect(page.locator('[data-session-id="overlap"]')).toBeVisible();
  await expect(page.locator('[data-session-id="qa-session"]')).toBeVisible();
  await audit(page,info,"overlapping-sessions");
  await page.locator('[data-session-id="overlap"]').click();
  await expect(page.getByText("QA Второй тренер",{exact:true})).toBeVisible();
  if(info.project.name==="desktop") expect(await page.locator(".calendar-timeline-scroll").evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});
