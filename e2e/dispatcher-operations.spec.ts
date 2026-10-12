import {test,expect,type Page} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id="00000000-0000-0000-0000-000000000001";
const branchId="00000000-0000-0000-0000-000000000002";
const adminId="00000000-0000-0000-0000-000000000003";
async function fixture(page:Page) {
 const requests:string[]=[];
 const writes:Array<{path:string;body:Record<string,unknown>}>=[];
 let conflict=false;
 const lead={id,leadType:"CHILDREN",primaryContact:{fullName:"Анна Иванова",phone:"+77001234567"},participants:[{id:"p1",fullName:"Иван Иванов"}],status:"IN_PROGRESS",assignedAdmin:{id:adminId,name:"Анна Иванова"},work:{priority:"HIGH",nextAction:"Позвонить",nextActionAt:"2099-10-12T06:30:00Z",version:2},createdAt:"2026-10-01T10:00:00"};
 const follow={contractId:id,ownerId:adminId,nextAction:"Продлить договор",dueAt:"2099-10-12T06:30:00Z",version:2,history:[]};
 const trial={id:"t1",status:"SCHEDULED",attendanceStatus:"UNMARKED",result:"PENDING",student:{id,fullName:"Иван Иванов"},session:{id:"s1",date:"2026-10-01",startsAt:"2026-10-01T10:00:00",endsAt:"2026-10-01T11:00:00",status:"PLANNED"},group:{id:"g1",name:"Младшая группа"},capabilities:{canMarkAttendance:true,canRecordResult:false,canCancel:false,canReschedule:false}};
 let trialVersion=1;
 await page.addInitScript(()=>localStorage.setItem("football-crm:user",JSON.stringify({email:"dispatcher@example.test",roles:["DISPATCHER"],accessToken:"fixture"})));
 await page.route("**/*",async route=>{
  if(!["fetch","xhr"].includes(route.request().resourceType()))return route.continue();
  const url=new URL(route.request().url());const path=url.pathname.replace(/^\/api/,"");requests.push(path+url.search);
  if(route.request().method()==="POST") {
   const body=route.request().postDataJSON();writes.push({path,body});
   if(conflict)return route.fulfill({status:409,json:{message:"Запись уже изменена. Обновите карточку."}});
   if(path.endsWith("/routing"))lead.work.version++;
   if(path.endsWith("/work")){lead.work.version++;lead.work.nextAction=body.nextAction;lead.work.nextActionAt=body.nextActionAt;}
   if(path.endsWith("/follow-up")){Object.assign(follow,body);follow.version++;}
   if(path.endsWith("/trials/t1")){trialVersion++;if(body.operation==="ATTENDANCE"){trial.status="COMPLETED";trial.attendanceStatus=body.attendance;trial.capabilities.canRecordResult=body.attendance==="ATTENDED";}else trial.result=body.result;}
   return route.fulfill({json:{}});
  }
  const entry={id,branchId,name:"Иван Иванов",contact:"Анна Иванова",phone:"+77001234567",status:"ACTIVE",reference:"42",amount:25000,currency:"KZT",startDate:"2026-10-01",endDate:"2026-11-01"};
  let data:unknown={};
  if(path==="/dispatcher/branch")data={branches:[{branchId,name:"Центральный",active:true,clubId:"c1"}]};
  else if(path==="/dispatcher/company/summary")data={branches:[{id:branchId,name:"Центральный"}],metrics:[{branchId,key:"newLeads",count:12},{branchId,key:"receipts",count:3,amount:90000,currency:"KZT"}]};
  else if(path===`/dispatcher/leads/${id}`)data={lead,branchId};
  else if(path.endsWith("/activities"))data=[];
  else if(path==="/dispatcher/operations/assignees")data=[{id:adminId,firstName:"Анна",lastName:"Иванова"}];
  else if(path===`/dispatcher/operations/contracts/${id}/follow-up`)data=follow;
  else if(path===`/dispatcher/operations/contracts/${id}`)data=entry;
  else if(path==="/dispatcher/operations/trials/t1")data={details:trial,version:trialVersion,history:[]};
  else if(path==="/dispatcher/operations/tasks")data={content:[{id,branchId,kind:"LEAD",name:"Анна Иванова",status:"IN_PROGRESS",nextAction:"Позвонить",dueAt:lead.work.nextActionAt,priority:"HIGH",ownerName:"Анна Иванова"}],totalElements:1,totalPages:1,summary:{LEAD:1,CONTRACT:0,TRIAL:0}};
  else if(path==="/dispatcher/operations/trials")data={content:[],totalElements:0,totalPages:0,summary:{}};
  else if(path==="/dispatcher/operations/capacity")data={content:[],totalElements:0,totalPages:0,summary:{groups:0,active:0,full:0,available:0}};
  else if(path==="/dispatcher/operations/reports"){const summary={branches:[{id:branchId,name:"Центральный"}],metrics:[{branchId,key:"newLeads",count:12},{branchId,key:"convertedLeads",count:4},{branchId,key:"receipts",count:3,amount:90000,currency:"KZT"}],dateFrom:"2026-10-01",dateTo:"2026-10-11"};data={current:summary,previous:url.searchParams.has("dateFrom")?summary:null,pipeline:[{branchId,key:"stage:NEW",count:8},{branchId,key:"stage:CONVERTED",count:4},{branchId,key:"loss:PRICE",count:2}],lossReasonNames:{PRICE:"Стоимость"},debtTrend:[{branchId,date:"2026-10-01",currency:"KZT",count:3,amount:70000},{branchId,date:"2026-10-02",currency:"KZT",count:2,amount:50000}]};}
  else if(path.startsWith("/dispatcher/company/"))data={content:[entry],totalElements:1,totalPages:1,number:0,size:25};
  return route.fulfill({json:data});
 });
 return {requests,writes,setConflict:(value:boolean)=>{conflict=value;}};
}
async function audit(page:Page) {
 const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
 expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
}
test("dispatcher processes: scoped tables and accessible empty states",async({page})=>{
 await fixture(page);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 for(const path of ["tasks","trial-trainings","capacity","reports"]){await page.goto(`/dispatcher/${path}`);await expect(page.getByRole("heading",{level:1})).toBeVisible();await expect(page.getByText(/^(Загрузка.*…|Подготовка отчёта…)$/)).toHaveCount(0);await audit(page);}
 expect(errors).toEqual([]);
});
test("dispatcher lead: transfer reason, business deadline and conflict preserves inputs",async({page})=>{
 const f=await fixture(page);await page.goto(`/dispatcher/leads?open=${id}`);const modal=page.getByRole("dialog");
 await modal.getByLabel("Причина передачи").fill("Назначение ответственного");await modal.getByRole("button",{name:"Передать лид",exact:true}).click();
 await expect.poll(()=>f.writes.length).toBe(1);expect(f.writes[0].body).toEqual({branchId,adminId,version:2,reason:"Назначение ответственного"});
 // Routing increments the workspace version and remounts both forms after refetch.
 await expect(modal.getByLabel("Причина передачи")).toHaveValue("");
 await modal.getByRole("combobox",{name:"Действие",exact:true}).click();await page.getByRole("option",{name:"Зафиксировать контакт",exact:true}).click();await modal.getByLabel("Следующий шаг",{exact:true}).fill("Уточнить решение");await modal.getByLabel("Срок · время Алматы").fill("2099-10-12T11:30");
 f.setConflict(true);await modal.getByRole("button",{name:"Сохранить",exact:true}).click();await expect(modal.getByRole("alert")).toContainText("уже изменена");await expect(modal.getByLabel("Следующий шаг",{exact:true})).toHaveValue("Уточнить решение");
 expect(f.writes[1].body).toMatchObject({operation:"CONTACT",version:3,nextAction:"Уточнить решение",nextActionAt:"2099-10-12T06:30:00.000Z",channel:"PHONE",outcome:"REACHED"});await audit(page);
 f.setConflict(false);await modal.getByRole("button",{name:"Сохранить",exact:true}).click();await expect(modal.getByRole("alert")).toHaveCount(0);await page.keyboard.press("Escape");await expect(modal).toHaveCount(0);
});
test("dispatcher contracts: contact with promised payment persists owner and dates",async({page})=>{
 const f=await fixture(page);await page.goto(`/dispatcher/contracts?open=${id}`);const modal=page.getByRole("dialog");
 await modal.getByRole("combobox",{name:"Действие",exact:true}).click();await page.getByRole("option",{name:"Зафиксировать контакт",exact:true}).click();await modal.getByRole("combobox",{name:"Результат контакта",exact:true}).click();await page.getByRole("option",{name:"Обещана оплата",exact:true}).click();await modal.getByLabel("Обещанная дата оплаты").fill("2099-10-13");await modal.getByLabel("Срок · время Алматы").fill("2099-10-14T14:00");await modal.getByRole("button",{name:"Сохранить",exact:true}).click();
 await expect.poll(()=>f.writes.length).toBe(1);expect(f.writes[0].body).toMatchObject({operation:"CONTACT",version:2,ownerId:adminId,outcome:"PAYMENT_PROMISED",promisedPaymentDate:"2099-10-13",dueAt:"2099-10-14T09:00:00.000Z"});await audit(page);
});
test("dispatcher trials: attendance enables outcome, follow-up saves local business time",async({page})=>{
 const f=await fixture(page);await page.goto("/dispatcher/trial-trainings?open=t1");const modal=page.getByRole("dialog");await modal.getByRole("button",{name:"Посетил",exact:true}).click();await modal.getByRole("combobox",{name:"Результат",exact:true}).click();await page.getByRole("option",{name:"Повторный контакт",exact:true}).click();await modal.getByLabel("Срок · время Алматы").fill("2099-10-12T16:30");await modal.getByRole("button",{name:"Сохранить результат",exact:true}).click();
 await expect.poll(()=>f.writes.length).toBe(2);expect(f.writes[0].body).toMatchObject({operation:"ATTENDANCE",version:1,attendance:"ATTENDED"});expect(f.writes[1].body).toMatchObject({operation:"RESULT",version:2,result:"FOLLOW_UP",nextActionType:"CALL",nextActionAt:"2099-10-12T16:30"});await audit(page);
});

test("dispatcher charts, all-time periods and server sorting",async({page},testInfo)=>{
 const f=await fixture(page);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/dispatcher/reports");await expect(page.getByRole("img",{name:/Этапы заявок:/})).toBeVisible();
 await expect(page.getByRole("img",{name:/Динамика задолженности/})).toBeVisible();
 await expect.poll(()=>page.locator(".MuiLineChart-area").first().evaluate(el=>getComputedStyle(el).fill)).toContain("url(");
 await expect.poll(()=>page.locator(".MuiBarChart-element").first().evaluate(el=>getComputedStyle(el).fill)).toContain("url(");
 await page.getByRole("combobox",{name:"Период",exact:true}).click();await page.getByRole("option",{name:"За всё время",exact:true}).click();
 await expect(page.getByLabel("С даты",{exact:true})).toHaveValue("");
 await expect.poll(()=>f.requests.some(r=>r.startsWith("/dispatcher/operations/reports")&&!r.includes("dateFrom="))).toBe(true);
 await expect(page.getByText("Сравнение:",{exact:false})).toHaveCount(0);await audit(page);
 await page.screenshot({path:`/tmp/dispatcher-charts-${testInfo.project.name}.png`,fullPage:true});
 await page.getByRole("img",{name:/Почему теряем заявки:/}).locator("xpath=ancestor::section[1]").screenshot({path:`/tmp/dispatcher-mui-donut-${testInfo.project.name}.png`});
 await page.getByRole("img",{name:/Динамика задолженности/}).locator("xpath=ancestor::section[1]").screenshot({path:`/tmp/dispatcher-mui-line-${testInfo.project.name}.png`});
 await page.goto("/dispatcher/payments?period=ALL");await page.getByRole("button",{name:/Фильтры/}).click();
 await expect(page.getByRole("combobox",{name:"Период",exact:true})).toContainText("За всё время");
 await page.getByRole("combobox",{name:"Сортировка",exact:true}).click();await page.getByRole("option",{name:"По сумме ↓ (внутри валюты)",exact:true}).click();
 await expect.poll(()=>f.requests.some(r=>r.startsWith("/dispatcher/company/payments?")&&r.includes("sort=AMOUNT")&&!r.includes("dateFrom="))).toBe(true);
 await page.goto("/dispatcher/capacity");await page.getByRole("combobox",{name:"Сортировка групп",exact:true}).click();await page.getByRole("option",{name:"Больше свободных мест",exact:true}).click();
 await expect.poll(()=>f.requests.some(r=>r.startsWith("/dispatcher/operations/capacity?")&&r.includes("sort=AVAILABLE"))).toBe(true);
 expect(errors).toEqual([]);
});
