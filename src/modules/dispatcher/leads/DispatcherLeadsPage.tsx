import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { Button, EmptyState, ErrorState, FormField, Input, LoadingState, ModalShell, NativeSelect, PageHeader, PageShell, SectionCard, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui";
import { sessionTimestamp } from "../../../shared/business-time";
import { useDispatcherBranches } from "../useDispatcherBranches";
import CreateLeadModal from "./CreateLeadModal";
import { DispatcherLeadsApi } from "./leads.api";
import { DispatcherLead } from "./types";

const STATUSES: Record<string,string> = { NEW: "Новый", IN_PROGRESS: "В работе", TRIAL_SCHEDULED: "Пробное назначено", DECISION_PENDING: "Ожидает решения", CONVERTED: "Клиент", LOST: "Отказ" };
const formatDate = (value: string) => {
  const date = new Date(sessionTimestamp(value));
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("ru-RU",{timeZone:"Asia/Almaty",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date) : "—";
};

const DispatcherLeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branches, selectedBranchId, selectBranch, loading: branchesLoading, error: branchesError, reload: reloadBranches } = useDispatcherBranches();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preview, setPreview] = useState<DispatcherLead | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); },300); return () => clearTimeout(timer); }, [search]);
  const leads = useQuery(["dispatcher", "leads", selectedBranchId, page, debouncedSearch, status], () => DispatcherLeadsApi.listPage(selectedBranchId,{page,search:debouncedSearch,status}), { enabled: Boolean(selectedBranchId) && !branchesLoading && !branchesError });
  const items = leads.data?.items || [];
  const total = leads.data?.totalElements || 0;
  const totalPages = leads.data?.totalPages || 0;
  const changeBranch = (id: string) => { selectBranch(id); setPage(0); setPreview(null); };
  const created = async (id: string) => {
    changeBranch(id); setSearch(""); setDebouncedSearch(""); setStatus("");
    await queryClient.invalidateQueries(["dispatcher", "leads"]);
  };
  return <PageShell>
    <PageHeader title="Лиды" description="Принимайте заявки и передавайте их администраторам филиалов." actions={<Button disabled={!selectedBranchId || branchesLoading || Boolean(branchesError)} onClick={() => setShowCreateModal(true)}><Plus data-icon="inline-start" />Новый лид</Button>} />
    {branchesError ? <ErrorState message="Не удалось загрузить филиалы" onRetry={() => void reloadBranches()} /> : branchesLoading ? <LoadingState label="Загрузка филиалов…" /> : !branches.length ? <SectionCard><EmptyState title="Добавьте первый филиал" description="Для создания заявки нужен филиал. Создайте его в разделе клубов." action={<Button onClick={() => navigate('/dispatcher/clubs')}>Клубы и филиалы</Button>} /></SectionCard> : <>
      <SectionCard><div className="grid gap-4 md:grid-cols-3">
        <FormField label="Филиал"><NativeSelect value={selectedBranchId} onChange={e => changeBranch(e.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</NativeSelect></FormField>
        <FormField label="Поиск"><Input placeholder="Имя, телефон или email" value={search} onChange={e => setSearch(e.target.value)} /></FormField>
        <FormField label="Статус"><NativeSelect value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Все статусы</option>{Object.entries(STATUSES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></FormField>
      </div></SectionCard>
      <SectionCard>
        <div className="mb-4 flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">Заявок: {leads.isLoading ? "…" : total}</span><Button variant="ghost" size="sm" disabled={leads.isFetching} onClick={() => void leads.refetch()}><RefreshCw data-icon="inline-start" />Обновить</Button></div>
        {leads.isError ? <ErrorState message="Не удалось загрузить лиды" onRetry={() => void leads.refetch()} /> : leads.isLoading ? <LoadingState label="Загрузка лидов…" /> : !items.length ? <EmptyState title={search || status ? "Заявки не найдены" : "Лидов пока нет"} description={search || status ? "Измените поисковый запрос или статус." : "Создайте первую заявку для выбранного филиала."} action={search || status ? <Button variant="secondary" onClick={() => { setSearch(""); setStatus(""); setPage(0); }}>Сбросить фильтры</Button> : <Button onClick={() => setShowCreateModal(true)}>Новый лид</Button>} /> : <>
          <Table><TableHeader><TableRow><TableHead>Контакт</TableHead><TableHead>Ученики</TableHead><TableHead>Статус</TableHead><TableHead>Создан</TableHead><TableHead><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader><TableBody>{items.map(lead => <TableRow key={lead.id}>
            <TableCell><div className="font-medium">{lead.parentName}</div><div className="mt-1 text-xs text-muted-foreground">{lead.phone || "Телефон не указан"}</div></TableCell>
            <TableCell><div className="max-w-[220px] truncate">{lead.children.map(child => child.childName).join(", ") || "—"}</div></TableCell>
            <TableCell><StatusBadge tone={lead.status === "LOST" ? "danger" : lead.status === "CONVERTED" ? "success" : "info"}>{STATUSES[lead.status] || lead.status}</StatusBadge></TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(lead.createdAt)}</TableCell>
            <TableCell><Button variant="secondary" size="sm" aria-label={`Открыть заявку ${lead.parentName}`} onClick={() => setPreview(lead)}>Открыть</Button></TableCell>
          </TableRow>)}</TableBody></Table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{page * 20 + 1}–{Math.min((page + 1) * 20,total)} из {total}</span><div className="flex items-center gap-3"><Button variant="secondary" size="sm" disabled={page === 0 || leads.isFetching} onClick={() => setPage(value => value - 1)}>Назад</Button><span>Страница {page + 1} из {totalPages}</span><Button variant="secondary" size="sm" disabled={page + 1 >= totalPages || leads.isFetching} onClick={() => setPage(value => value + 1)}>Далее</Button></div></div>
        </>}
      </SectionCard>
    </>}
    {showCreateModal && <CreateLeadModal branches={branches} initialBranchId={selectedBranchId} onClose={() => setShowCreateModal(false)} onSuccess={created} />}
    {preview && <ModalShell title={preview.parentName} description="Входящая заявка · обработку выполняет администратор филиала" placement="right" maxWidthClassName="max-w-[520px]" onClose={() => setPreview(null)}>
      <div className="flex flex-col gap-5"><StatusBadge tone="info">{STATUSES[preview.status] || preview.status}</StatusBadge><SectionCard title="Контакт"><p>{preview.phone || "Телефон не указан"}</p>{preview.email && <p className="mt-2 break-all text-sm text-muted-foreground">{preview.email}</p>}</SectionCard><SectionCard title="Ученики">{preview.children.map((child,i) => <p key={i} className="py-1 text-sm">{child.childName}{child.childAge ? ` · ${child.childAge} лет` : ""}</p>)}</SectionCard><SectionCard title="Комментарий"><p className="whitespace-pre-wrap break-words text-sm">{preview.comment || "Комментарий не добавлен"}</p></SectionCard><p className="text-xs text-muted-foreground">Создан: {formatDate(preview.createdAt)}</p></div>
    </ModalShell>}
  </PageShell>;
};
export default DispatcherLeadsPage;
