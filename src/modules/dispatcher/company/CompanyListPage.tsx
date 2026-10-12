import PeriodFilter from "../ui/PeriodFilter";
import FollowUpPanel from "../operations/FollowUpPanel";
import StudentHistoryPanel from "../operations/StudentHistoryPanel";
import {OperationsApi} from "../operations/operations.api";
import CompanyPageSummary from "./CompanyPageSummary";
import { LEAD_STATUSES } from "../leads/lead.status";
import { ATTENTION_LABELS, isValidPeriod } from "./company.filters";
import { SlidersHorizontal, RefreshCw } from "lucide-react";
import { SearchInput, toolbarClass, filtersClass, paginationClass, PageShell, SectionCard } from "../ui/DispatcherPresentation";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, ModalShell, NativeSelect, PageHeader, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui";
import { Field, FieldLabel } from "../../../shared/ui/shadcn/field";
import { businessDate } from "../../../shared/business-time";
import { getApiErrorMessage } from "../../../shared/api";
import { useDispatcherScope } from "./DispatcherScope";
import { CompanyApi, CompanyEntry, CompanyKind, dateLabel, money, STATUS_LABELS } from "./company.api";
const config = {
 debts: {title:"Задолженность",description:"Неоплаченный остаток начавшихся договоров. Черновики, отменённые и будущие договоры исключены.",statuses:["ACTIVE","EXPIRED"]},
 students: { title:"Ученики",description:"Ученики компании и контакты родителей.",statuses:[] },
 contracts: { title:"Договоры",description:"Договоры всех филиалов компании.",statuses:["DRAFT","UPCOMING","ACTIVE","EXPIRED","CANCELLED"] },
 payments: { title:"Оплаты",description:"История поступлений и отменённых оплат за выбранный период.",statuses:["PAID","CANCELLED"] },
 leads: { title:"Лиды",description:"Заявки компании.",statuses:[...LEAD_STATUSES] },
};
export default function CompanyListPage({kind}: {kind:CompanyKind}) {
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [sort,setSort]=useState("");
 const queryClient = useQueryClient();
 const isContract = kind === "contracts" || kind === "debts";
 const {branchId,branches,ready}=useDispatcherScope();
 const [params]=useSearchParams();
 const [search,setSearch]=useState(params.get("search") || "");const [debounced,setDebounced]=useState(params.get("search") || "");const [status,setStatus]=useState(params.get("status") || "");
 const [attention,setAttention]=useState(kind==="contracts" && params.get("attention")==="ENDING"?"ENDING":"");
 const today=businessDate();const [from,setFrom]=useState(params.get("period")==="ALL"?"":params.get("dateFrom") || `${today.slice(0,7)}-01`);const [to,setTo]=useState(params.get("period")==="ALL"?"":params.get("dateTo") || today);
 const [pagination,setPagination]=useState({key:"",page:0});const [preview,setPreview]=useState<CompanyEntry|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>setDebounced(search.trim()),300);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>setPreview(null),[branchId,kind]);
 const filterKey=JSON.stringify([kind,branchId,debounced,status,attention,from,to,sort]);
 const page=pagination.key===filterKey ? pagination.page : 0;
 const validDates=isValidPeriod(from,to,true);
 const query=useQuery(["dispatcher","company",filterKey,page],()=>CompanyApi.page(kind,{branchId,search:debounced,status,attention,page,sort,...(kind==="payments"?{dateFrom:from,dateTo:to}:{})}),{enabled:ready && (kind!=="payments" || validDates)});
 const deepId=params.get("open");
 const deep=useQuery(["dispatcher","contract-record",deepId],()=>OperationsApi.contract(deepId!),{enabled:Boolean(deepId)&&isContract&&ready});
 useEffect(()=>{if(deep.data)setPreview(deep.data);},[deep.data]);
 const items=query.data?.content || [];const total=query.data?.totalElements || 0;
 useEffect(() => {
  if(query.isSuccess && page>0 && page>=(query.data?.totalPages || 0)) setPagination({key:filterKey,page:Math.max(0,(query.data?.totalPages || 1)-1)});
 },[query.isSuccess,query.data?.totalPages,page,filterKey]);
 const branchName=(id:string)=>branches.find(branch=>branch.branchId===id)?.name || "Филиал";
 const reset=()=>{setSearch("");setDebounced("");setStatus("");setAttention("");setSort("");setFrom(`${today.slice(0,7)}-01`);setTo(today);};
 const changePage=(next:number)=>setPagination({key:filterKey,page:next});
 return <PageShell><PageHeader title={config[kind].title} description={config[kind].description} />
  <CompanyPageSummary kind={kind} dateFrom={kind === "payments" ? from : `${today.slice(0,7)}-01`} dateTo={kind === "payments" ? to : today} />
  {deepId&&deep.isError&&<ErrorState message={getApiErrorMessage(deep.error)} onRetry={()=>void deep.refetch()}/>}
  <SectionCard flush>
   <div className={toolbarClass}>
    <SearchInput aria-label="Поиск записей" placeholder={kind==="students"?"Ученик, родитель, телефон…":"Имя, номер договора, телефон…"} value={search} maxLength={200} onChange={e=>setSearch(e.target.value)} />
    { <Button variant="secondary" size="sm" className="h-9 gap-1.5 text-xs" aria-expanded={filtersOpen} aria-controls="company-filters" onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal className="h-3.5 w-3.5" />Фильтры{(status || attention) && ` · ${Number(Boolean(status))+Number(Boolean(attention))}`}</Button>}
    <span role="status" className="ml-auto text-xs tabular-nums text-muted-foreground">{query.isError?"Данные недоступны":query.isLoading || !ready?"Загрузка…":`Найдено: ${total}`}</span>
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Обновить список" disabled={!ready || query.isFetching || (kind==="payments" && !validDates)} onClick={()=>{void query.refetch();void queryClient.invalidateQueries(["dispatcher","company-summary"]);}}><RefreshCw className="h-3.5 w-3.5" /></Button>
   </div>
   {filtersOpen && <div id="company-filters" className={filtersClass}>
    {config[kind].statuses.length>0 && <Field><FieldLabel htmlFor="company-status">Статус</FieldLabel><NativeSelect id="company-status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Все статусы</option>{config[kind].statuses.map(value=><option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</NativeSelect></Field>}
    {kind==="contracts" && <Field><FieldLabel htmlFor="contract-attention">Требуют внимания</FieldLabel><NativeSelect id="contract-attention" value={attention} onChange={e=>setAttention(e.target.value)}><option value="">Все договоры</option><option value="ENDING">Заканчиваются за 14 дней</option></NativeSelect></Field>}
    {kind==="payments" && <PeriodFilter from={from} to={to} onChange={(a,b)=>{setFrom(a);setTo(b);}}/>}
    <Field><FieldLabel>Сортировка</FieldLabel><NativeSelect aria-label="Сортировка" value={sort} onChange={e=>setSort(e.target.value)}><option value="">По умолчанию</option><option value="NAME">По имени</option><option value="NEWEST">Сначала новые</option>{kind!=="debts"&&<option value="OLDEST">Сначала старые</option>}{kind==="students"&&<option value="BIRTH">По дате рождения</option>}{isContract&&<option value="ENDING">По окончанию договора</option>}{(kind==="payments"||kind==="debts")&&<option value="AMOUNT">По сумме ↓ (внутри валюты)</option>}</NativeSelect></Field>
    <Button variant="ghost" size="sm" className="text-xs" onClick={reset}>Сбросить фильтры</Button>
   </div>}
   {!filtersOpen && (status || attention || kind==="payments") && <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">{status && <span>{STATUS_LABELS[status] || status}</span>}{attention && <span>{ATTENTION_LABELS[attention]}</span>}{kind==="payments" && <span>{!from&&!to?"За всё время":`${dateLabel(from)} — ${dateLabel(to)}`}</span>}<button type="button" className="text-primary hover:underline" onClick={()=>setFiltersOpen(true)}>Изменить</button></div>}
   {kind==="payments" && !validDates && <p role="alert" className="px-4 py-3 text-xs text-destructive">Выберите корректный период не более 367 дней.</p>}
   {!ready ? <LoadingState label="Ожидание филиалов…" /> : kind==="payments" && !validDates ? null : query.isError ? <ErrorState message={getApiErrorMessage(query.error,"Не удалось загрузить список")} onRetry={()=>void query.refetch()} /> : query.isLoading ? <LoadingState label="Загрузка списка…" /> : !items.length ? <EmptyState title="Записей не найдено" description="В выбранной области просмотра нет записей или они не соответствуют фильтрам." action={<Button variant="secondary" onClick={reset}>Сбросить фильтры</Button>} /> : <>
    <Table aria-label={config[kind].title} className="min-w-[720px]">
     <TableHeader><TableRow>
      {kind!=="students" && <TableHead>Договор</TableHead>}
      <TableHead>{kind==="students" ? "Ученик" : "Ученик / контакт"}</TableHead>
      {kind==="students" && <TableHead>Родитель / контакт</TableHead>}
      <TableHead>Телефон</TableHead><TableHead>Филиал</TableHead>
      {kind==="students" ? <TableHead>Дата рождения</TableHead> : <>
       <TableHead>Статус</TableHead><TableHead>{isContract ? "Срок действия" : "Дата оплаты"}</TableHead>
       <TableHead className="text-right">{kind==="debts" ? "К оплате" : "Сумма"}</TableHead>
      </>}
      <TableHead><span className="sr-only">Действия</span></TableHead>
     </TableRow></TableHeader>
     <TableBody>{items.map(row => <TableRow key={row.id}>
      {kind!=="students" && <TableCell className="whitespace-nowrap font-medium">{row.reference || "—"}</TableCell>}
      <TableCell><span className="font-medium">{row.name || "Без имени"}</span>{kind!=="students" && row.contact && <div className="mt-1 text-muted-foreground">{row.contact}</div>}</TableCell>
      {kind==="students" && <TableCell>{row.contact || "—"}</TableCell>}
      <TableCell className="whitespace-nowrap">{row.phone || "—"}</TableCell>
      <TableCell>{branchName(row.branchId)}</TableCell>
      {kind==="students" ? <TableCell className="whitespace-nowrap">{dateLabel(row.birthDate)}</TableCell> : <>
       <TableCell><StatusBadge tone={row.status==="CANCELLED" ? "danger" : row.status==="PAID" || row.status==="ACTIVE" ? "success" : "neutral"}>{STATUS_LABELS[row.status] || row.status}</StatusBadge></TableCell>
       <TableCell className="whitespace-nowrap">{isContract ? `${dateLabel(row.startDate)} — ${row.endDate ? dateLabel(row.endDate) : "бессрочно"}` : dateLabel(row.eventDate)}</TableCell>
       <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{money(row.amount,row.currency)}</TableCell>
      </>}
      <TableCell className="text-right"><Button variant="ghost" size="sm" aria-label={`Подробнее: ${row.name || row.reference}`} onClick={() => setPreview(row)}>Подробнее</Button></TableCell>
     </TableRow>)}</TableBody>
    </Table>
    <div className={paginationClass}><span>{page*25+1}–{Math.min((page+1)*25,total)} из {total}</span><div className="flex items-center gap-3"><Button variant="secondary" size="sm" disabled={page===0 || query.isFetching} onClick={()=>changePage(page-1)}>Назад</Button><span>Страница {page+1} из {query.data?.totalPages}</span><Button variant="secondary" size="sm" disabled={page+1>=(query.data?.totalPages || 0) || query.isFetching} onClick={()=>changePage(page+1)}>Далее</Button></div></div>
   </>}
  </SectionCard>
  {preview && <ModalShell title={preview.reference || preview.name || "Карточка"} description={`${config[kind].title} · ${branchName(preview.branchId)}`} placement="right" maxWidthClassName="max-w-2xl" onClose={()=>setPreview(null)}>
   <div className="flex flex-col gap-5"><SectionCard title="Ученик и контакт"><p>{preview.name || "—"}</p><p className="mt-2 text-sm">{preview.contact}</p><p className="mt-2 text-sm text-muted-foreground">{preview.phone || "Телефон не указан"}</p>{preview.email && <p className="mt-2 break-all text-sm">{preview.email}</p>}{preview.birthDate && <p className="mt-2 text-sm">Дата рождения: {dateLabel(preview.birthDate)}</p>}</SectionCard>
   {kind!=="students" && <SectionCard title="Данные записи"><p>{STATUS_LABELS[preview.status] || preview.status}</p><p className="mt-2 font-semibold">{money(preview.amount,preview.currency)}</p>{preview.startDate && <p className="mt-2 text-sm">{dateLabel(preview.startDate)} — {preview.endDate?dateLabel(preview.endDate):"бессрочно"}</p>}{preview.eventDate && <p className="mt-2 text-sm">{kind==="payments"?"Дата оплаты":"Создан"}: {dateLabel(preview.eventDate)}</p>}</SectionCard>}
   {preview.notes && <SectionCard title="Примечание"><p className="whitespace-pre-wrap wrap-break-word text-sm">{preview.notes}</p></SectionCard>}
   {kind==="students" && <StudentHistoryPanel id={preview.id}/>}
   {isContract && <FollowUpPanel id={preview.id} branchId={preview.branchId} status={preview.status}/>}
   </div>
  </ModalShell>}
 </PageShell>;
}
