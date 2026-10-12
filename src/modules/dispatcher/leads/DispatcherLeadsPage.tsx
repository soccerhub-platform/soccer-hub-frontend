import PeriodFilter from "../ui/PeriodFilter";
import {dateTime,isOverdue} from "../operations/operations.format";
import LeadWorkspace from "../operations/LeadWorkspace";
import CompanyPageSummary from "../company/CompanyPageSummary";
import { LEAD_STATUS_LABELS, leadStatusLabel, leadStatusTone } from "./lead.status";
import { ATTENTION_LABELS, creationBranch, isValidPeriod, lastValidPage } from "../company/company.filters";
import { SearchInput, toolbarClass, filtersClass, paginationClass, PageShell, SectionCard } from "../ui/DispatcherPresentation";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, ErrorState, FormField, LoadingState, NativeSelect, PageHeader, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui";
import { sessionTimestamp } from "../../../shared/business-time";
import { useDispatcherBranches } from "../useDispatcherBranches";
import CreateLeadModal from "./CreateLeadModal";
import { DispatcherLeadsApi } from "./leads.api";

import { useDispatcherScope } from "../company/DispatcherScope";

const formatDate = (value: string) => {
  const date = new Date(sessionTimestamp(value));
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("ru-RU",{timeZone:"Asia/Almaty",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date) : "—";
};

const DispatcherLeadsPage: React.FC = () => {
  const [filtersOpen,setFiltersOpen]=useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branches, loading: branchesLoading, error: branchesError, reload: reloadBranches } = useDispatcherBranches();
  const [params]=useSearchParams();
  const [sort,setSort]=useState("");
  const [dateFrom,setDateFrom]=useState(params.get("dateFrom") || "");
  const [dateTo,setDateTo]=useState(params.get("dateTo") || "");
  const validDates=isValidPeriod(dateFrom,dateTo,true);
  const [attention,setAttention]=useState(["UNASSIGNED","OVERDUE","NO_CONTACT","NO_ACTION"].includes(params.get("attention") || "")?params.get("attention") || "":"");
  const scope = useDispatcherScope();
  const createBranchId = creationBranch(scope.branchId,branches);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preview, setPreview] = useState<string | null>(params.get("open"));
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); },300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { setPage(0); }, [scope.branchId,dateFrom,dateTo,attention,sort]);
  useEffect(() => { setPreview(params.get("open")); }, [params]);
  const leads = useQuery(["dispatcher", "leads", scope.branchId, page, debouncedSearch, status,attention,dateFrom,dateTo,sort], () => DispatcherLeadsApi.listCompanyPage(scope.branchId,{page,search:debouncedSearch,status,attention,dateFrom,dateTo,sort}), { enabled: validDates && scope.ready && !branchesLoading && !branchesError });
  const items = leads.data?.items || [];
  const total = leads.data?.totalElements || 0;
  const totalPages = leads.data?.totalPages || 0;
  useEffect(()=>{if(leads.isSuccess && page!==lastValidPage(page,totalPages))setPage(lastValidPage(page,totalPages));},[leads.isSuccess,page,totalPages]);
  const resetFilters=()=>{setSearch("");setDebouncedSearch("");setStatus("");setAttention("");setSort("");setDateFrom("");setDateTo("");setPage(0);};
  const changeBranch = (id: string) => { scope.setBranchId(id); setPage(0); setPreview(null); };
  const created = async (id: string) => {
    changeBranch(id); resetFilters();
    await Promise.all([queryClient.invalidateQueries(["dispatcher", "leads"]), queryClient.invalidateQueries(["dispatcher", "company-summary"])]);
  };
  return <PageShell>
    <PageHeader title="Лиды" description="Принимайте заявки и передавайте их администраторам филиалов." actions={<Button disabled={!scope.ready || !createBranchId || branchesLoading || Boolean(branchesError)} onClick={() => setShowCreateModal(true)}><Plus data-icon="inline-start" />Новый лид</Button>} />
    <CompanyPageSummary kind="leads" dateFrom={dateFrom} dateTo={dateTo} />
    {scope.branchId && !createBranchId && !branchesLoading && !branchesError && <p className="text-xs text-muted-foreground">Выбранный филиал в архиве. Для новой заявки выберите активный филиал в области просмотра.</p>}
    {branchesError ? <ErrorState message="Не удалось загрузить филиалы" onRetry={() => void reloadBranches()} /> : branchesLoading ? <LoadingState label="Загрузка филиалов…" /> : !scope.branches.length ? <SectionCard><EmptyState title="Добавьте первый филиал" description="Для создания заявки нужен филиал. Создайте его в разделе клубов." action={<Button onClick={() => navigate('/dispatcher/clubs')}>Клубы и филиалы</Button>} /></SectionCard> : <>
      <SectionCard flush>
        <div className={toolbarClass}>
          <SearchInput aria-label="Поиск по лидам" placeholder="Имя, телефон, email…" value={search} maxLength={200} onChange={e=>setSearch(e.target.value)} />
          <Button variant="secondary" size="sm" className="h-9 gap-1.5 text-xs" aria-expanded={filtersOpen} aria-controls="dispatcher-lead-filters" onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal className="h-3.5 w-3.5" />Фильтры{(status || attention || dateFrom || dateTo) && ` · ${Number(Boolean(status))+Number(Boolean(attention))+Number(Boolean(dateFrom || dateTo))}`}</Button>
          <span role="status" className="ml-auto text-xs tabular-nums text-muted-foreground">{leads.isError?"Данные недоступны":leads.isLoading?"Загрузка…":`Найдено: ${total}`}</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Обновить лиды" disabled={leads.isFetching || !validDates} onClick={()=>{void leads.refetch();void queryClient.invalidateQueries(["dispatcher","company-summary"]);}}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
        {filtersOpen && <div id="dispatcher-lead-filters" className={filtersClass}>
          <FormField label="Статус"><NativeSelect value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">Все статусы</option>{Object.entries(LEAD_STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</NativeSelect></FormField>
          <FormField label="Требуют внимания"><NativeSelect value={attention} onChange={e=>setAttention(e.target.value)}><option value="">Все лиды</option><option value="UNASSIGNED">Без администратора</option><option value="OVERDUE">Просроченные задачи</option><option value="NO_CONTACT">Без контакта</option><option value="NO_ACTION">Без следующего шага</option></NativeSelect></FormField>
          <PeriodFilter label="Созданы за период" from={dateFrom} to={dateTo} onChange={(a,b)=>{setDateFrom(a);setDateTo(b);}}/>
          <FormField label="Сортировка"><NativeSelect aria-label="Сортировка лидов" value={sort} onChange={e=>setSort(e.target.value)}><option value="">Сначала новые</option><option value="OLDEST">Сначала старые</option><option value="NAME">По имени контакта</option><option value="DUE">Ближайший срок задачи</option></NativeSelect></FormField>
          <Button variant="ghost" size="sm" className="text-xs" onClick={resetFilters}>Сбросить фильтры</Button>
        </div>}
        {!filtersOpen && (status || attention || dateFrom || dateTo) && <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">{status && <span>{leadStatusLabel(status)}</span>}{attention && <span>{ATTENTION_LABELS[attention]}</span>}{(dateFrom || dateTo) && <span>{dateFrom || "…"} — {dateTo || "…"}</span>}<button type="button" className="text-primary hover:underline" onClick={()=>setFiltersOpen(true)}>Изменить</button></div>}
        {!validDates ? <EmptyState title="Выберите период" description="Укажите корректные даты или сбросьте фильтры." action={<Button variant="secondary" onClick={resetFilters}>Сбросить фильтры</Button>} /> : leads.isError ? <ErrorState message="Не удалось загрузить лиды" onRetry={() => void leads.refetch()} /> : leads.isLoading ? <LoadingState label="Загрузка лидов…" /> : !items.length ? <EmptyState title={search || status || attention || dateFrom || dateTo ? "Заявки не найдены" : "Лидов пока нет"} description={search || status || attention || dateFrom || dateTo ? "Измените поисковый запрос или статус." : "Создайте первую заявку для выбранного филиала."} action={search || status || attention || dateFrom || dateTo ? <Button variant="secondary" onClick={resetFilters}>Сбросить фильтры</Button> : <Button disabled={!createBranchId} onClick={() => setShowCreateModal(true)}>Новый лид</Button>} /> : <>
          <Table aria-label="Лиды" className="min-w-[1100px]">
            <TableHeader><TableRow><TableHead>Контакт</TableHead><TableHead>Телефон</TableHead><TableHead>Ученики</TableHead><TableHead>Филиал</TableHead><TableHead>Статус</TableHead><TableHead>Ответственный</TableHead><TableHead>Следующий шаг / срок</TableHead><TableHead>Создан</TableHead><TableHead><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
            <TableBody>{items.map(lead => <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.parentName}</TableCell>
              <TableCell className="whitespace-nowrap">{lead.phone || "—"}</TableCell>
              <TableCell><div className="min-w-32 max-w-60 break-words">{lead.children.map(child => child.childName).join(", ") || "—"}</div></TableCell>
              <TableCell>{scope.branches.find(branch => branch.branchId === lead.branchId)?.name || "—"}</TableCell>
              <TableCell><StatusBadge tone={leadStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge></TableCell>
              <TableCell>{lead.ownerName || "Не назначен"}</TableCell>
              <TableCell><p>{lead.nextAction || "Не назначен"}</p><p className={`mt-1 ${isOverdue(lead.dueAt)?"text-destructive":"text-muted-foreground"}`}>{dateTime(lead.dueAt)}</p>{!lead.lastContactAt&&<p className="mt-1 text-muted-foreground">Контакт не зарегистрирован</p>}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(lead.createdAt)}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="sm" aria-label={`Открыть заявку ${lead.parentName}`} onClick={() => setPreview(lead.id)}>Открыть</Button></TableCell>
            </TableRow>)}</TableBody>
          </Table>
          <div className={paginationClass}><span>{page * 25 + 1}–{Math.min((page + 1) * 25,total)} из {total}</span><div className="flex items-center gap-3"><Button variant="secondary" size="sm" disabled={page === 0 || leads.isFetching} onClick={() => setPage(value => value - 1)}>Назад</Button><span>Страница {page + 1} из {totalPages}</span><Button variant="secondary" size="sm" disabled={page + 1 >= totalPages || leads.isFetching} onClick={() => setPage(value => value + 1)}>Далее</Button></div></div>
        </>}
      </SectionCard>
    </>}
    {showCreateModal && <CreateLeadModal branches={branches} initialBranchId={createBranchId} onClose={() => setShowCreateModal(false)} onSuccess={created} />}
    {preview && <LeadWorkspace id={preview} onClose={() => setPreview(null)} />}
  </PageShell>;
};
export default DispatcherLeadsPage;
