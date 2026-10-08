import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';

const dispatcher = process.env.E2E_DISPATCHER_EMAIL && process.env.E2E_DISPATCHER_PASSWORD
  ? {email:process.env.E2E_DISPATCHER_EMAIL,password:process.env.E2E_DISPATCHER_PASSWORD}
  : existsSync('.local-qa/dispatcher.json') ? JSON.parse(readFileSync('.local-qa/dispatcher.json', 'utf8')) : undefined;
async function login(page: Page, account?: {email:string;password:string}) {
  test.skip(!account,'Requires QA dispatcher credentials');
  if(!account) return;
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Пароль', {exact:true}).fill(account.password);
  await page.getByRole('button', {name:'Войти',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test('dispatcher: role boundary preserves session and explains access', async ({page}) => {
  await login(page,dispatcher);
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading',{name:'Нет доступа к разделу'})).toBeVisible();
  await page.getByRole('link',{name:'В своё рабочее пространство'}).click();
  await expect(page).toHaveURL(/\/dispatcher\/dashboard$/);
  await expect(page.getByRole('heading',{name:'Главная',exact:true})).toBeVisible();
});

test('dispatcher: filters, pagination, previews, validation and modal reset',async({page},info)=>{
  await login(page,dispatcher);
  await page.goto('/dispatcher/leads'); await page.waitForLoadState('networkidle');
  await page.getByRole('combobox',{name:'Филиал',exact:true}).click();
  await page.getByRole('option',{name:'QA Центральный',exact:true}).click();
  await expect(page.getByText('Страница 1 из 2')).toBeVisible();
  await page.getByRole('button',{name:'Далее',exact:true}).click();
  await expect(page.getByText('Страница 2 из 2')).toBeVisible();
  await page.getByRole('button',{name:/Открыть заявку/}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox',{name:'Статус',exact:true}).click(); await page.getByRole('option',{name:'Отказ',exact:true}).click();
  await expect(page.getByText('Заявки не найдены')).toBeVisible();
  await page.getByRole('button',{name:'Сбросить фильтры'}).click();
  await expect(page.getByText('Страница 1 из 2')).toBeVisible();
  await page.getByRole('button',{name:'Новый лид',exact:true}).click();
  await page.getByRole('button',{name:'Создать лид',exact:true}).click();
  await expect(page.getByText('Укажите имя контактного лица')).toBeVisible();
  await page.getByRole('button',{name:'Добавить ученика'}).click();
  await expect(page.getByText('Ученик 2',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Удалить ученика 2'}).click();
  await page.getByRole('radio',{name:'Взрослый ученик'}).click();
  await expect(page.getByLabel('Имя ученика / контакта *')).toBeVisible();
  console.info('LEAD MODAL',info.project.name,(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  await page.getByRole('button',{name:'Отмена',exact:true}).click();
  await page.goto('/dispatcher/clubs');
  await page.getByRole('button',{name:'Создать клуб',exact:true}).click();
  await page.getByLabel('Название *', {exact:true}).fill('QA Audit Draft');
  await expect(page.getByLabel('Код клуба *')).toHaveValue('qa-audit-draft');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Создать клуб',exact:true}).click();
  await expect(page.getByLabel('Название *', {exact:true})).toHaveValue('');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Филиалы клуба QA Dispatcher Club'}).click();
  await expect(page.getByText('QA Северный',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Филиал',exact:true}).click();
  await page.getByRole('button',{name:'Создать',exact:true}).click();
  await expect(page.getByText('Укажите название филиала')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/dispatcher/admins');
  await page.getByRole('button',{name:'Открыть',exact:true}).first().click();
  for(const action of ['Редактировать','Назначить','Сбросить пароль','Удалить']) {
    await page.getByRole('button',{name:action,exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    console.info('ADMIN MODAL',info.project.name,action,(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Открыть',exact:true}).first().click();
  }
  await page.keyboard.press('Escape');
});

test('dispatcher: temporary administrator lifecycle through the UI',async({page},info)=>{
  test.skip(info.project.name==='mobile','Run database mutations once');
  test.skip(process.env.E2E_ALLOW_WRITES!=='1','Requires local QA database writes');
  test.setTimeout(120000);
  await login(page,dispatcher);
  const token=await page.evaluate(()=>JSON.parse(localStorage.getItem('football-crm:user')!).accessToken);
  const headers={Authorization:`Bearer ${token}`};
  const email=`audit.admin.${Date.now()}@qa.soccerhub.test`;
  let adminId='';
  try {
    await page.goto('/dispatcher/admins');
    await page.getByRole('button',{name:'Добавить администратора'}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Email*',{exact:true}).fill(email);
    await dialog.getByLabel('Имя*',{exact:true}).fill('QA Audit');
    await dialog.getByLabel('Фамилия*',{exact:true}).fill('Temporary');
    await dialog.getByRole('combobox',{name:'Филиал*'}).click();
    await page.getByRole('option',{name:'QA Центральный',exact:true}).click();
    await dialog.getByRole('button',{name:'Создать',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Администратор создан'})).toBeVisible();
    const password=await page.getByRole('dialog').locator('code').innerText();
    const admins=await (await page.request.get('/api/dispatcher/admin',{headers})).json();
    adminId=admins.admins.find((a:{email:string})=>a.email===email).id;
    await page.getByRole('button',{name:'Готово',exact:true}).click();
    const auth=await page.request.post('/api/auth/login',{data:{email,password}}); expect(auth.ok()).toBeTruthy();
    const open=async()=>{await page.getByLabel('Поиск',{exact:true}).fill(email);await page.getByRole('button',{name:'Открыть',exact:true}).click()};
    await open(); await page.getByRole('button',{name:'Редактировать',exact:true}).click();
    await page.getByLabel('Телефон',{exact:true}).fill('+77771234567');
    await page.getByRole('button',{name:'Сохранить',exact:true}).click();
    await page.reload(); await open(); await expect(page.getByRole('dialog')).toContainText('+77771234567');
    await page.getByRole('button',{name:'Отключить',exact:true}).click();
    await open();
    await expect(page.getByRole('button',{name:'Включить',exact:true})).toBeVisible();
    expect((await page.request.post('/api/auth/login',{data:{email,password}})).ok()).toBeFalsy();
    await page.getByRole('button',{name:'Включить',exact:true}).click();
    await open();
    await page.getByRole('button',{name:'Назначить',exact:true}).click();
    await page.getByRole('combobox',{name:'Филиал',exact:true}).click(); await page.getByRole('option',{name:'QA Северный',exact:true}).click();
    await page.getByRole('button',{name:'Сохранить',exact:true}).click();
    await page.reload(); await open();
    const branch=page.getByRole('dialog').locator('div.rounded-xl').filter({hasText:'QA Северный'}).last();
    await branch.getByRole('button',{name:'Убрать',exact:true}).click();
    await page.getByRole('button',{name:'Открепить',exact:true}).click();
    await page.reload(); await open(); await expect(page.getByRole('dialog')).not.toContainText('QA Северный');
    await page.getByRole('button',{name:'Сбросить пароль',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Сбросить пароль',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Пароль сброшен'})).toBeVisible();
    const reset=await page.getByRole('dialog').locator('code').innerText();
    expect((await page.request.post('/api/auth/login',{data:{email,password:reset}})).ok()).toBeTruthy();
    expect((await page.request.post('/api/auth/login',{data:{email,password}})).ok()).toBeFalsy();
    await page.getByRole('button',{name:'Готово',exact:true}).click();
    await open(); await page.getByRole('button',{name:'Удалить',exact:true}).click();
    await expect(page.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true})).toBeDisabled();
    await page.getByLabel('ID администратора',{exact:true}).fill(adminId);
    await page.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const after=await (await page.request.get('/api/dispatcher/admin',{headers})).json();
    expect(after.admins.some((a:{id:string})=>a.id===adminId)).toBe(false); adminId='';
  } finally {
    if(adminId)expect((await page.request.delete(`/api/dispatcher/admin/${adminId}`,{headers})).ok()).toBeTruthy();
  }
});

test('dispatcher: all sections, browser errors and accessibility inventory', async ({page}, info) => {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if(response.status() >= 400 && response.url().includes('/api/')) failures.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await login(page,dispatcher);
  for(const section of ['dashboard','leads','clubs','admins','profile']) {
    const start = Date.now();
    await page.goto(`/dispatcher/${section}`);
    await page.waitForLoadState('networkidle');
    const a11y = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect.soft(a11y.violations,`dispatcher/${section}`).toEqual([]);
    console.info('INVENTORY', info.project.name, section, JSON.stringify({ms:Date.now()-start, headings:await page.getByRole('heading').allTextContents(),buttons:await page.getByRole('button').allTextContents(),violations:a11y.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
  }
  console.info('ERRORS',JSON.stringify({errors,failures}));
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('admin: all sections and browser error inventory', async ({page},info) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,'Requires authorized admin credentials');
  const errors:string[]=[]; const failures:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400 && r.url().includes('/api/'))failures.push(`${r.status()} ${new URL(r.url()).pathname}`)});
  await login(page,{email:process.env.E2E_EMAIL!,password:process.env.E2E_PASSWORD!});
  if(page.url().includes('branch-select')) {
    await page.waitForLoadState('networkidle');
    console.info('BRANCH SELECT',await page.getByRole('button').allTextContents());
    await page.getByRole('button',{name:/Выбрать|Главный филиал|QA Центральный/}).first().click();
  }
  for(const section of ['dashboard','leads','trials','clients','students','coaches','groups','schedule','contracts','payments','profile']) {
    await page.goto(`/admin/${section}`); await page.waitForLoadState('networkidle');
    const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect.soft(a11y.violations,`admin/${section}`).toEqual([]);
    console.info('ADMIN INVENTORY',info.project.name,section,JSON.stringify({url:page.url(),headings:await page.getByRole('heading').allTextContents(),buttons:await page.getByRole('button').allTextContents(),violations:a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
  }
  console.info('ADMIN ERRORS',JSON.stringify({errors,failures}));
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});

test('admin: real record details and create forms',async({page},info)=>{
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,'Requires authorized admin credentials');
  test.setTimeout(120000);
  await login(page,{email:process.env.E2E_EMAIL!,password:process.env.E2E_PASSWORD!});
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const section of ['clients','students','coaches','groups','contracts']) {
    await page.goto(`/admin/${section}`); await page.waitForLoadState('networkidle');
    const row=page.locator('tbody tr').first(); await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByRole('navigation',{name:'Разделы рабочего пространства'})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect.soft((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations,`${section} details`).toEqual([]);
    console.info('DETAIL',info.project.name,section,JSON.stringify({url:page.url(),headings:await page.getByRole('heading').allTextContents(),buttons:await page.getByRole('button').allTextContents(),links:await page.getByRole('link').allTextContents(),violations:(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}));
  }
  for(const [section,name] of [['clients','Оформить клиента'],['coaches','Добавить тренера'],['groups','Создать группу'],['contracts','Создать договор']]) {
    await page.goto(`/admin/${section}`); await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect.soft((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations,`${section} form`).toEqual([]);
    console.info('CREATE FORM',info.project.name,section,JSON.stringify({headings:await page.getByRole('heading').allTextContents(),buttons:await page.getByRole('dialog').getByRole('button').allTextContents(),violations:(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}));
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
