import {BranchCharts} from "./ui/DispatcherCharts";
import PeriodFilter from "./ui/PeriodFilter";
import { isValidPeriod, issuePath, receivedPaymentsPath } from "./company/company.filters";
import { RefreshCw } from "lucide-react";
import { filtersClass, PageShell, SectionCard, MetricCard } from "./ui/DispatcherPresentation";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../shared/ui";
import { businessDate } from "../../shared/business-time";
import { getApiErrorMessage } from "../../shared/api";
import { CompanyApi, money } from "./company/company.api";
import { useDispatcherScope } from "./company/DispatcherScope";
export default function Dashboard() {
 const {branchId,setBranchId,ready}=useDispatcherScope();const navigate=useNavigate();
 const today=businessDate();const [from,setFrom]=useState(`${today.slice(0,7)}-01`);const [to,setTo]=useState(today);
 const valid=isValidPeriod(from,to,true);
 const query=useQuery(["dispatcher","company-summary",branchId,from,to],()=>CompanyApi.summary({branchId,dateFrom:from,dateTo:to}),{enabled:ready && valid});
 const metrics=query.data?.metrics || [];const branches=query.data?.branches || [];
 const count=(key:string,id?:string)=>metrics.filter(m=>m.key===key && (!id || m.branchId===id)).reduce((sum,m)=>sum+m.count,0);
 const amounts=(key:string,id?:string)=>{const amounts=new Map<string,number>();metrics.filter(m=>m.key===key && (!id || m.branchId===id)).forEach(m=>amounts.set(m.currency || "",(amounts.get(m.currency || "") || 0)+Number(m.amount || 0)));return amounts.size ? Array.from(amounts,([currency,amount])=>money(amount,currency)).join(" · ") : "0";};
 const receipts=(id?:string)=>amounts("receipts",id);
 const conversion=(id?:string)=>count("newLeads",id)?`${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(count("convertedLeads",id)/count("newLeads",id)*100)}%`:"—";
 const open=(id:string,path:string)=>{setBranchId(id);navigate(`/dispatcher/${path}`);};
 const issues=branches.flatMap(b=>[
  ...(!b.managerAdminId && b.active ? [{id:b.id,key:"manager",text:"Не назначен руководитель филиала",path:"clubs"}] : []),
  ...([ ["unassignedLeads","Лиды без администратора","leads"],["overdueTasks","Просроченные задачи по лидам","leads"],["endingContracts","Договоры заканчиваются в ближайшие 14 дней","contracts"],["debt","Договоры с задолженностью","debts"] ] as const).filter(([key])=>count(key,b.id)>0).map(([key,text,path])=>({id:b.id,key,text:`${text}: ${count(key,b.id)}`,path})),
 ]);
 return <PageShell><PageHeader title={branchId?"Обзор филиала":"Обзор компании"} description="Показатели, сравнение филиалов и вопросы, требующие внимания." />
  <SectionCard flush><div className={filtersClass}><PeriodFilter from={from} to={to} onChange={(a,b)=>{setFrom(a);setTo(b);}}/><Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs" disabled={!ready || !valid || query.isFetching} onClick={()=>void query.refetch()}><RefreshCw className="h-3.5 w-3.5" />Обновить</Button></div>{!valid && <p role="alert" className="px-4 py-3 text-xs text-destructive">Выберите корректный период не более 367 дней.</p>}</SectionCard>
  {!ready ? <LoadingState label="Ожидание филиалов…" /> : !valid ? null : query.isError ? <ErrorState message={getApiErrorMessage(query.error,"Не удалось загрузить показатели")} onRetry={()=>void query.refetch()} /> : query.isLoading ? <LoadingState label="Загрузка показателей…" /> : !branches.length ? <SectionCard><EmptyState title="Добавьте первый филиал" description="После создания филиала здесь появятся показатели компании." action={<Button onClick={()=>navigate('/dispatcher/clubs')}>Клубы и филиалы</Button>} /></SectionCard> : <>
   <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-background [&>*]:border-b [&>*]:border-r [&>*]:border-border xl:grid-cols-4"><MetricCard title="Ученики" value={count("students")} note="Все ученики в выбранной области" onClick={()=>navigate('/dispatcher/students')} /><MetricCard title="Действующие договоры" value={count("activeContracts")} note="На сегодня" onClick={()=>navigate('/dispatcher/contracts?status=ACTIVE')} /><MetricCard title="Выручка" value={<span className="block whitespace-normal text-lg">{receipts()}</span>} note="По полученным оплатам за период" onClick={()=>navigate(`/dispatcher/${receivedPaymentsPath(from,to)}`)} /><MetricCard title="Оплаты" value={count("receipts")} note={`Получены за период · отменены: ${count("cancelledPayments")}`} onClick={()=>navigate(`/dispatcher/${receivedPaymentsPath(from,to)}`)} /><MetricCard title="Задолженность" value={<span className="block whitespace-normal text-lg">{amounts("debt")}</span>} note={`Договоров с долгом: ${count("debt")}`} tone={count("debt")?"warning":"neutral"} onClick={()=>navigate('/dispatcher/debts')} /><MetricCard title="Заявки" value={count("newLeads")} note="Созданы за выбранный период" onClick={()=>navigate(`/dispatcher/leads?dateFrom=${from}&dateTo=${to}`)} /><MetricCard title="Конверсия" value={conversion()} note={`${count("convertedLeads")} из ${count("newLeads")} заявок стали клиентами`} /><MetricCard title="Филиалы" value={branches.length} note={`Активных: ${branches.filter(b=>b.active).length} · Новых лидов: ${count("newLeads")}`} onClick={()=>navigate('/dispatcher/clubs')} /></div>
   {query.data && <BranchCharts summary={query.data}/>}
   <SectionCard flush title="Сравнение филиалов">
    <Table aria-label="Сравнение филиалов" className="min-w-[1100px]">
     <TableHeader><TableRow><TableHead>Филиал</TableHead><TableHead className="text-right">Ученики</TableHead><TableHead className="text-right">Действующие<br />договоры</TableHead><TableHead className="text-right">Новые лиды<br />за период</TableHead><TableHead className="text-right">Конверсия</TableHead><TableHead className="text-right">Выручка<br />за период</TableHead><TableHead className="text-right">Оплаты</TableHead><TableHead className="text-right">Задолженность<br />сейчас</TableHead><TableHead className="text-right">Требуют<br />внимания</TableHead></TableRow></TableHeader>
     <TableBody>{branches.map(b => <TableRow key={b.id}>
      <TableCell><Button variant="ghost" size="sm" aria-label={`Обзор филиала: ${b.name}`} className="h-auto justify-start whitespace-normal px-0 text-left" onClick={() => setBranchId(b.id)}>{b.name}</Button>{!b.active && <div className="mt-1"><StatusBadge tone="neutral">Архив</StatusBadge></div>}</TableCell>
      <TableCell className="text-right tabular-nums">{count("students",b.id)}</TableCell>
      <TableCell className="text-right tabular-nums">{count("activeContracts",b.id)}</TableCell>
      <TableCell className="text-right tabular-nums">{count("newLeads",b.id)}</TableCell>
      <TableCell className="text-right tabular-nums">{conversion(b.id)}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{receipts(b.id)}</TableCell>
      <TableCell className="text-right tabular-nums">{count("receipts",b.id)}</TableCell>
      <TableCell className="text-right tabular-nums">{amounts("debt",b.id)}</TableCell>
      <TableCell className="text-right tabular-nums">{issues.filter(i => i.id===b.id).length}</TableCell>
     </TableRow>)}</TableBody>
    </Table>
   </SectionCard>
   <SectionCard title="Требуют внимания">{!issues.length ? <EmptyState title="Нет выявленных проблем" description="Проверены назначения руководителей, распределение лидов, сроки задач и договоров." /> : <div className="flex flex-col divide-y divide-border">{issues.map(issue=><div key={`${issue.id}-${issue.key}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{issue.text}</p><p className="mt-1 text-xs text-muted-foreground">{branches.find(b=>b.id===issue.id)?.name}</p></div><Button variant="secondary" size="sm" onClick={()=>open(issue.id,issuePath(issue.path,issue.key))}>Открыть раздел</Button></div>)}</div>}</SectionCard>
  </>}
  <details className="px-1 text-[11px] leading-5 text-muted-foreground"><summary className="w-fit cursor-pointer hover:text-foreground">Как считаются показатели</summary><p className="mt-2 max-w-3xl">Выручка и оплаты — за период, по времени Алматы. Выручка считается по полученным оплатам без отмен. Задолженность — неоплаченный остаток начавшихся договоров на сегодня. Конверсия — доля заявок, созданных за период и уже ставших клиентами. Архивные филиалы включены.</p></details>
 </PageShell>;
}
