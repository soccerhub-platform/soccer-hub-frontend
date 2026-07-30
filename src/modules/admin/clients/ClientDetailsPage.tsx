import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Banknote,
  BellRing,
  CalendarDays,
  MessagesSquare,
  CheckCircle,
  ChevronRight,
  FileText,
  Mail,
  MapPin,
  Pencil,
  PauseCircle,
  Phone,
  Plus,
  Users,
  CircleX,
} from "lucide-react";
import { getApiErrorMessage } from "../../../shared/api";
import {
  Button,
  ActionMenu,
  Checkbox,
  DatePicker,
  EmptyState,
  EntitySheet,
  ErrorState,
  LoadingState,
  PageShell,
  SectionCard,
  StatusBadge,
  type StatusTone,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  WorkspaceBreadcrumbs,
  WorkspaceHeader,
  WorkspaceMetric,
  WorkspaceTabs,
} from "../../../shared/ui";
import { ContractsApi } from "../contracts/contracts.api";
import type { ContractListItem, ContractPaymentItem, ContractStatus } from "../contracts/contracts.types";
import { ClientApi } from "./client.api";
import ClientContractsTab from "./ClientContractsTab";
import ClientFormDrawer from "./ClientFormDrawer";
import ClientPaymentsTab from "./ClientPaymentsTab";
import ClientStudentDrawer from "./ClientStudentDrawer";
import { clientSourceLabels, type ClientActivityItem, type ClientDetails, type ClientFormInput, type ClientStatus, type ClientStudentRelation, type ClientStudentRelationshipType } from "./client.types";

const sections = [
  { key: "overview", label: "Обзор" },
  { key: "students", label: "Ученики" },
  { key: "contracts", label: "Договоры" },
  { key: "payments", label: "Платежи" },
  { key: "activity", label: "Активность" },
] as const;
type ClientSection = (typeof sections)[number]["key"];
const isSection = (value?: string): value is ClientSection => sections.some((item) => item.key === value);

const statusLabels: Record<string, string> = {
  NEW: "Новый", IN_PROGRESS: "В работе", ACTIVE: "Активный", PAUSED: "Приостановлен", INACTIVE: "Неактивный",
  NO_RESPONSE: "Нет связи", REJECTED: "Отказ", TRIAL_SCHEDULED: "Пробное назначено", TRIAL_COMPLETED: "Пробное проведено",
  TRIAL_FAILED: "Пробное неудачно", CONTRACT_PENDING: "Оформление договора",
};
const relationshipLabels: Record<ClientStudentRelationshipType, string> = {
  SELF: "Сам клиент", MOTHER: "Мать", FATHER: "Отец", GUARDIAN: "Представитель", OTHER: "Другое", LEGACY_PARENT: "Родитель",
};
const statusTones: Record<ClientStatus, StatusTone> = {
  NEW: "info",
  IN_PROGRESS: "warning",
  NO_RESPONSE: "neutral",
  REJECTED: "danger",
  TRIAL_SCHEDULED: "info",
  TRIAL_COMPLETED: "info",
  TRIAL_FAILED: "danger",
  CONTRACT_PENDING: "warning",
  ACTIVE: "success",
  PAUSED: "warning",
  INACTIVE: "neutral",
};
const lifecycleStatuses: ClientStatus[] = ["ACTIVE", "PAUSED", "INACTIVE"];
const contractStatusLabels: Record<ContractStatus, string> = { DRAFT: "Черновик", UPCOMING: "Предстоящий", ACTIVE: "Активный", EXPIRED: "Завершён", CANCELLED: "Отменён" };
const formatAmount = (value?: number | null, currency = "KZT") => `${new Intl.NumberFormat("ru-RU").format(Number(value ?? 0))} ${currency}`;
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) : "Не указано";
const formatDateTime = (value: string) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const today = () => new Date().toISOString().slice(0, 10);
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "К";
const activityLabel = (activity: ClientActivityItem) => {
  const studentName = String(activity.payload.playerName ?? "ученика");
  const contractNumber = String(activity.payload.contractNumber ?? "");
  const paymentAmount = Number(activity.payload.amount ?? 0);
  const paymentCurrency = String(activity.payload.currency ?? "KZT");
  const labels: Record<string, string> = {
    CLIENT_CREATED: "Клиент создан",
    CLIENT_UPDATED: "Данные клиента обновлены",
    CLIENT_STATUS_CHANGED: `Статус изменён: ${statusLabels[String(activity.payload.status ?? "")] ?? String(activity.payload.status ?? "")}`,
    STUDENT_LINKED: `Привязан ученик ${studentName}`,
    STUDENT_RELATION_UPDATED: `Связь с ${studentName} обновлена`,
    STUDENT_RELATION_ENDED: `Связь с ${studentName} завершена`,
    CONTRACT_CREATED: `Договор ${contractNumber} создан`,
    CONTRACT_UPDATED: `Договор ${contractNumber} обновлён`,
    CONTRACT_EXTENDED: `Договор ${contractNumber} продлён`,
    CONTRACT_CANCELLED: `Договор ${contractNumber} отменён`,
    PAYMENT_CREATED: `Добавлен платёж ${formatAmount(paymentAmount, paymentCurrency)} по договору ${contractNumber}`,
    PAYMENT_CANCELLED: `Платёж ${formatAmount(paymentAmount, paymentCurrency)} по договору ${contractNumber} отменён`,
  };
  return labels[activity.type] ?? activity.type;
};

const OverviewPanel: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, action, children, className = "" }) => (
  <section className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
    <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
      <h2 className="ui-section-title">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const panelLinkClassName = "text-xs font-semibold text-[#0066cc] transition hover:text-[#004b99]";

const ClientDetailsPage: React.FC = () => {
  const { clientId, section } = useParams<{ clientId: string; section: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [relationForm, setRelationForm] = useState({
    relationshipType: "MOTHER" as ClientStudentRelationshipType,
    primaryContact: false,
    primaryPayer: false,
    legalRepresentative: false,
    receivesNotifications: false,
  });
  const [endedAt, setEndedAt] = useState(today());
  const [activities, setActivities] = useState<ClientActivityItem[]>([]);
  const [overviewContracts, setOverviewContracts] = useState<ContractListItem[]>([]);
  const [overviewPayments, setOverviewPayments] = useState<ContractPaymentItem[]>([]);
  const activeSection = isSection(section) ? section : null;
  const drawer = searchParams.get("drawer");
  const relationId = searchParams.get("relationId");
  const statusParam = searchParams.get("status") as ClientStatus | null;
  const statusTarget = statusParam && lifecycleStatuses.includes(statusParam) ? statusParam : null;
  const selectedRelation = client?.students.find((item) => item.id === relationId) ?? null;

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const details = await ClientApi.get(clientId);
      const [activityPage, contractsPage, paymentsPage] = await Promise.all([
        ClientApi.getActivity(clientId).catch(() => null),
        ContractsApi.list({ branchId: details.client.branchId, clientId, page: 0, size: 20 }, "").catch(() => null),
        ContractsApi.listAdminPayments({ branchId: details.client.branchId, clientId, page: 0, size: 20, sort: "paidAt,desc" }, "").catch(() => null),
      ]);
      setClient(details);
      setActivities(activityPage?.content ?? []);
      setOverviewContracts(contractsPage?.content ?? []);
      setOverviewPayments(paymentsPage?.content ?? []);
    }
    catch (requestError) { setError(getApiErrorMessage(requestError, "Не удалось загрузить клиента")); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  const sectionPath = (key: ClientSection) => `/admin/clients/${clientId}/${key}`;
  const setDrawer = (value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("drawer", value); else {
      next.delete("drawer");
      next.delete("relationId");
      next.delete("status");
    }
    setSearchParams(next);
    setFormError(null);
  };

  const openLinkStudentDrawer = () => {
    setDrawer("add-student");
  };

  const openStatusDrawer = (status: ClientStatus) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "change-status");
    next.set("status", status);
    setSearchParams(next);
    setFormError(null);
  };

  const openRelationDrawer = (value: "edit-relation" | "end-relation", relation: ClientStudentRelation) => {
    setRelationForm({
      relationshipType: relation.relationshipType,
      primaryContact: relation.primaryContact,
      primaryPayer: relation.primaryPayer,
      legalRepresentative: relation.legalRepresentative,
      receivesNotifications: relation.receivesNotifications,
    });
    setEndedAt(today());
    const next = new URLSearchParams(searchParams);
    next.set("drawer", value);
    next.set("relationId", relation.id);
    setSearchParams(next);
    setFormError(null);
  };

  const update = async (input: ClientFormInput) => {
    if (!clientId || !input.firstName.trim()) { setFormError("Укажите имя клиента"); return; }
    setSaving(true);
    try {
      setClient(await ClientApi.update(clientId, input));
      toast.success("Данные клиента обновлены");
      setDrawer();
    } catch (requestError) { setFormError(getApiErrorMessage(requestError, "Не удалось обновить клиента")); }
    finally { setSaving(false); }
  };

  const updateRelation = async () => {
    if (!selectedRelation) return;
    setSaving(true);
    setFormError(null);
    try {
      await ClientApi.updateRelation(selectedRelation.id, relationForm);
      toast.success("Связь обновлена");
      setDrawer();
      await load();
    } catch (requestError) { setFormError(getApiErrorMessage(requestError, "Не удалось обновить связь")); }
    finally { setSaving(false); }
  };

  const endRelation = async () => {
    if (!selectedRelation || !endedAt) { setFormError("Укажите дату завершения"); return; }
    setSaving(true);
    setFormError(null);
    try {
      await ClientApi.endRelation(selectedRelation.id, endedAt);
      toast.success("Связь завершена");
      setDrawer();
      await load();
    } catch (requestError) { setFormError(getApiErrorMessage(requestError, "Не удалось завершить связь")); }
    finally { setSaving(false); }
  };

  const changeStatus = async () => {
    if (!clientId || !statusTarget) return;
    setSaving(true);
    setFormError(null);
    try {
      await ClientApi.changeStatus(clientId, statusTarget);
      toast.success(`Статус изменён: ${statusLabels[statusTarget]}`);
      setDrawer();
      await load();
    } catch (requestError) { setFormError(getApiErrorMessage(requestError, "Не удалось изменить статус клиента")); }
    finally { setSaving(false); }
  };

  const activeStudents = useMemo(() => client?.students.filter((item) => item.active) ?? [], [client]);
  const historicalStudents = useMemo(() => client?.students.filter((item) => !item.active) ?? [], [client]);

  if (!activeSection) return <Navigate to={sectionPath("overview")} replace />;
  if (loading) return <PageShell><LoadingState label="Загружаем клиента" /></PageShell>;
  if (error || !client) return <PageShell><ErrorState message={error ?? "Клиент не найден"} onRetry={() => void load()} /></PageShell>;

  const currency = client.summary.money.currency ?? "KZT";
  const primaryRelation = activeStudents.find((item) => item.primaryContact) ?? activeStudents[0] ?? null;
  const activeContracts = overviewContracts.filter((item) => item.status === "ACTIVE");
  const recentPayments = overviewPayments.filter((item) => item.status !== "CANCELLED").slice(0, 4);
  const outstandingAmount = Number(client.summary.money.outstandingAmount ?? 0);
  const overpaidAmount = Number(client.summary.money.overpaidAmount ?? 0);
  const balanceAmount = overpaidAmount - outstandingAmount;
  const receivesNotifications = activeStudents.some((item) => item.receivesNotifications);
  const relationshipCaption = primaryRelation ? relationshipLabels[primaryRelation.relationshipType] : "Клиент";
  const whatsappPhone = (client.client.phone ?? "").replace(/\D/g, "");

  return (
    <PageShell>
      <WorkspaceBreadcrumbs items={[{ label: "Клиенты", to: "/admin/clients" }, { label: client.client.fullName }]} />
      <WorkspaceHeader actionsClassName="w-full lg:w-auto" actions={<div className="flex w-full flex-col gap-3 lg:w-[360px]">
        <div className="flex flex-wrap justify-end gap-2">
          {client.capabilities.canEdit ? <Button variant="secondary" rounded="rounded-lg" onClick={() => setDrawer("edit-client")}><Pencil className="h-4 w-4" /> Редактировать</Button> : null}
          <ActionMenu items={[
            ...(client.capabilities.canActivate ? [{ key: "activate", label: "Активировать", icon: <CheckCircle />, onSelect: () => openStatusDrawer("ACTIVE") }] : []),
            ...(client.capabilities.canPause ? [{ key: "pause", label: "Приостановить", icon: <PauseCircle />, onSelect: () => openStatusDrawer("PAUSED") }] : []),
            ...(client.capabilities.canDeactivate ? [{ key: "deactivate", label: "Деактивировать", icon: <CircleX />, danger: true, separatorBefore: true, onSelect: () => openStatusDrawer("INACTIVE") }] : []),
          ]} />
          {client.capabilities.canLinkStudent ? <Button rounded="rounded-lg" onClick={openLinkStudentDrawer}><Plus className="h-4 w-4" /> Добавить ученика</Button> : null}
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="col-span-2"><div className="text-xs text-slate-500">Баланс</div><div className={`mt-1 text-xl font-semibold ${balanceAmount < 0 ? "text-rose-700" : "text-slate-950"}`}>{formatAmount(balanceAmount, currency)}</div></div>
          <div><div className="text-xs text-slate-500">Активные договоры</div><div className="mt-1 ui-section-title">{client.summary.activeContractsCount}</div></div>
          <div><div className="text-xs text-slate-500">Ученики</div><div className="mt-1 ui-section-title">{client.summary.studentsCount}</div></div>
        </div>
      </div>}>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-800">{initials(client.client.fullName)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="ui-detail-title truncate">{client.client.fullName}</h1><StatusBadge tone={statusTones[client.client.status]}>{statusLabels[client.client.status] ?? client.client.status}</StatusBadge></div>
            <div className="mt-1 text-sm font-medium text-slate-600">{relationshipCaption} · Клиент</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" />{client.client.phone || "Телефон не указан"}</span>
              <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{client.client.email || "Email не указан"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Создан: {formatDate(client.client.createdAt)}</span>
              <span>Профиль изменён: {formatDate(client.client.updatedAt)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
              {activeStudents.some((item) => item.primaryPayer) ? <span className="inline-flex items-center gap-1.5">Основной плательщик <CheckCircle className="h-4 w-4 text-emerald-600" /></span> : null}
              {receivesNotifications ? <span className="inline-flex items-center gap-1.5">Получает уведомления <CheckCircle className="h-4 w-4 text-emerald-600" /></span> : null}
            </div>
          </div>
        </div>
      </WorkspaceHeader>

      <WorkspaceTabs items={sections.map((item) => ({ ...item, to: sectionPath(item.key) }))} className="bg-transparent" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceMetric icon={<Users />} iconClassName="bg-emerald-50 text-emerald-700" label="Ученики" value={client.summary.studentsCount} note={`Активных ${activeStudents.length}`} onClick={() => navigate(sectionPath("students"))} />
        <WorkspaceMetric icon={<FileText />} iconClassName="bg-violet-50 text-violet-700" label="Активные договоры" value={client.summary.activeContractsCount} note={activeContracts.length ? `На сумму ${formatAmount(activeContracts.reduce((sum, item) => sum + Number(item.amount ?? 0), 0), currency)}` : "Договоров нет"} onClick={() => navigate(sectionPath("contracts"))} />
        <WorkspaceMetric icon={<Banknote />} iconClassName="bg-orange-50 text-orange-700" label="Баланс" value={client.summary.money.mixedCurrencies ? "Разные валюты" : formatAmount(balanceAmount, currency)} note={outstandingAmount > 0 ? `К оплате ${formatAmount(outstandingAmount, currency)}` : "К оплате нет"} onClick={() => navigate(sectionPath("payments"))} />
        <WorkspaceMetric icon={<CalendarDays />} iconClassName="bg-blue-50 text-blue-700" label="Следующий платёж" value={outstandingAmount > 0 ? formatAmount(outstandingAmount, currency) : "Не требуется"} note={outstandingAmount > 0 ? "Есть задолженность" : "Всё оплачено"} onClick={() => navigate(sectionPath("payments"))} />
      </div>

      {activeSection === "overview" ? <div className="grid gap-3 lg:grid-cols-3">
        <OverviewPanel title="Ученики" action={<button type="button" onClick={() => navigate(sectionPath("students"))} className={panelLinkClassName}>Все</button>}>
          {activeStudents.length ? <div className="space-y-2">{activeStudents.slice(0, 3).map((relation) => <button key={relation.id} type="button" onClick={() => navigate(`/admin/students/${relation.playerId}/overview`)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">{initials(relation.playerName)}</span><span className="min-w-0 flex-1"><span className="block truncate ui-section-title">{relation.playerName}</span><span className="mt-1 block truncate text-xs text-slate-500">{relationshipLabels[relation.relationshipType]}{relation.primaryPayer ? " · плательщик" : ""}</span></span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Активен</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div> : <EmptyState title="Учеников пока нет" description="Добавьте ученика или укажите, что клиент занимается сам." />}
          {client.capabilities.canLinkStudent ? <button type="button" onClick={openLinkStudentDrawer} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><Plus className="h-4 w-4" /> Добавить ученика</button> : null}
        </OverviewPanel>

        <OverviewPanel title="Договоры" action={<button type="button" onClick={() => navigate(sectionPath("contracts"))} className={panelLinkClassName}>Все</button>}>
          {overviewContracts.length ? <div className="space-y-2">{overviewContracts.slice(0, 2).map((contract) => <button key={contract.id} type="button" onClick={() => navigate(`/admin/contracts/${contract.id}/overview`)} className="block w-full rounded-lg border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-violet-200"><span className="flex items-center justify-between gap-2"><span className="truncate ui-section-title">№ {contract.contractNumber}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">{contractStatusLabels[contract.status]}</span></span><span className="mt-2 block truncate text-xs font-medium text-slate-700">{contract.group?.name || "Без группы"} · {contract.participant.fullName}</span><span className="mt-1 block text-xs text-slate-500">с {formatDate(contract.startDate)} · {formatAmount(contract.amount, contract.currency)}</span></button>)}</div> : <EmptyState title="Договоров пока нет" description="Создайте договор для связанного ученика." />}
        </OverviewPanel>

        <OverviewPanel title="Последние платежи" action={<button type="button" onClick={() => navigate(sectionPath("payments"))} className={panelLinkClassName}>Все</button>}>
          {recentPayments.length ? <div className="divide-y divide-slate-100">{recentPayments.map((payment) => <button key={payment.id} type="button" onClick={() => navigate(`/admin/contracts/${payment.contractId}/payments`)} className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"><span className="min-w-0 flex-1"><span className="block text-xs text-slate-400">{formatDate(payment.paidAt)}</span><span className="mt-1 block truncate text-sm text-slate-700">Договор {payment.contractNumber || payment.contractId}</span></span><span className="shrink-0 text-sm font-semibold text-emerald-700">{formatAmount(payment.amount, payment.currency)}</span></button>)}</div> : <EmptyState title="Платежей пока нет" description="Последние зафиксированные платежи появятся здесь." />}
        </OverviewPanel>

        <OverviewPanel title="Контакты" action={client.capabilities.canEdit ? <button type="button" onClick={() => setDrawer("edit-client")} className={panelLinkClassName}>Редактировать</button> : null}>
          <div className="space-y-4 text-sm"><div className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 text-slate-500" /><div><div className="font-medium text-slate-900">{client.client.phone || "Не указан"}</div><div className="mt-0.5 text-xs text-slate-500">Мобильный</div></div></div><div className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 text-slate-500" /><div className="min-w-0"><div className="truncate font-medium text-slate-900">{client.client.email || "Не указан"}</div><div className="mt-0.5 text-xs text-slate-500">Email</div></div></div><div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 text-slate-500" /><div><div className="font-medium text-slate-900">{clientSourceLabels[client.client.source ?? "UNKNOWN"]}{client.client.source === "OTHER" && client.client.sourceDetails ? ` · ${client.client.sourceDetails}` : ""}</div><div className="mt-0.5 text-xs text-slate-500">Источник клиента</div></div></div></div>
        </OverviewPanel>

        <OverviewPanel title="Связь">
          <div className="space-y-4 text-sm">{whatsappPhone ? <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-slate-800"><MessagesSquare className="h-5 w-5 text-emerald-600" /><span><span className="block font-medium">WhatsApp</span><span className="text-xs text-emerald-700">Написать</span></span></a> : null}{client.client.email ? <a href={`mailto:${client.client.email}`} className="flex items-center gap-3 text-slate-800"><Mail className="h-5 w-5 text-slate-500" /><span><span className="block font-medium">Email</span><span className="text-xs text-emerald-700">Написать</span></span></a> : null}{client.client.phone ? <a href={`tel:${client.client.phone}`} className="flex items-center gap-3 text-slate-800"><Phone className="h-5 w-5 text-slate-500" /><span><span className="block font-medium">Позвонить</span><span className="text-xs text-slate-500">{client.client.phone}</span></span></a> : null}{!client.client.phone && !client.client.email ? <EmptyState title="Контакты не указаны" /> : null}</div>
        </OverviewPanel>

        <OverviewPanel title="Заметки" action={client.capabilities.canEdit ? <button type="button" onClick={() => setDrawer("edit-client")} className={panelLinkClassName}>Изменить</button> : null}>
          <div className="grid min-h-40 place-items-center rounded-lg bg-slate-50 p-4 text-center"><div><BellRing className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm text-slate-600">{client.client.comments || "Нет заметок"}</p>{!client.client.comments ? <p className="mt-1 text-xs text-slate-400">Добавьте заметку для себя или команды</p> : null}</div></div>
        </OverviewPanel>

        <OverviewPanel title="Активность" action={<button type="button" onClick={() => navigate(sectionPath("activity"))} className={panelLinkClassName}>Все</button>} className="lg:col-span-3">
          {activities.length ? <div className="space-y-0">{activities.slice(0, 5).map((activity, index) => <div key={activity.id} className="grid grid-cols-[12px_minmax(90px,130px)_1fr] gap-3 text-xs sm:grid-cols-[12px_150px_1fr_150px]"><span className="relative flex justify-center"><span className={`mt-1.5 h-2 w-2 rounded-full ${index ? "bg-emerald-500" : "bg-slate-400"}`} />{index < Math.min(activities.length, 5) - 1 ? <span className="absolute bottom-0 top-3 w-px bg-slate-200" /> : null}</span><span className="pb-4 text-slate-400">{formatDateTime(activity.occurredAt)}</span><span className="pb-4 text-slate-700">{activityLabel(activity)}</span><span className="hidden pb-4 text-slate-400 sm:block">{activity.actor?.fullName || "Система"}</span></div>)}</div> : <EmptyState title="Активность пока пуста" />}
        </OverviewPanel>
      </div> : null}

      {activeSection === "students" ? <div className="space-y-3"><SectionCard title="Ученики клиента" description={`${client.client.fullName} оплачивает услуги, а ученики ниже посещают занятия`}>
        <div className="mb-4 flex justify-end">{client.capabilities.canLinkStudent ? <Button rounded="rounded-lg" onClick={openLinkStudentDrawer}><Plus className="h-4 w-4" /> Добавить ученика</Button> : null}</div>
        {activeStudents.length ? (
          <div className="divide-y divide-slate-100">
            {activeStudents.map((relation) => (
              <div key={relation.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
                <button type="button" onClick={() => navigate(`/admin/students/${relation.playerId}/overview`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-[#0066cc]">{initials(relation.playerName)}</span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase text-[#0066cc]">Ученик · посещает занятия</span><span className="mt-1 block truncate ui-section-title">{relation.playerName}</span><span className="mt-1 block text-xs text-slate-500">Добавлен {relation.startedAt}</span></span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{relationshipLabels[relation.relationshipType]}</span>
                  {relation.primaryContact ? <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066cc]">Основной контакт</span> : null}
                  {relation.primaryPayer ? <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Плательщик</span> : null}
                  <Button size="sm" variant="ghost" rounded="rounded-lg" onClick={() => openRelationDrawer("edit-relation", relation)} aria-label={`Изменить связь с ${relation.playerName}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" rounded="rounded-lg" className="text-rose-700 hover:bg-rose-50" onClick={() => openRelationDrawer("end-relation", relation)} aria-label={`Завершить связь с ${relation.playerName}`}><CircleX className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="У клиента пока нет учеников" description="Добавьте существующего ученика или укажите, что клиент занимается сам." />}
      </SectionCard>
        <SectionCard title="История связей">
          {historicalStudents.length ? <div className="divide-y divide-slate-100">{historicalStudents.map((relation) => <div key={relation.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{relation.playerName}</span><span className="mt-1 block text-xs text-slate-500">{relationshipLabels[relation.relationshipType]} · {relation.startedAt} — {relation.endedAt || "не указано"}</span></span><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">Завершена</span></div>)}</div> : <EmptyState title="История пока пуста" />}
        </SectionCard>
      </div> : null}

      {activeSection === "contracts" ? (
        <ClientContractsTab key={client.summary.allContractsCount} clientId={client.client.id} clientName={client.client.fullName} branchId={client.client.branchId} studentsCount={activeStudents.length} onAddStudent={openLinkStudentDrawer} onCreateContract={() => navigate(`/admin/contracts?drawer=create-contract&clientId=${client.client.id}`)} />
      ) : null}

      {activeSection === "payments" ? (
        <ClientPaymentsTab clientId={client.client.id} clientName={client.client.fullName} branchId={client.client.branchId} />
      ) : null}

      {activeSection === "activity" ? <SectionCard title="Активность клиента" description="Изменения профиля и связей с учениками">
        {activities.length ? <div className="divide-y divide-slate-100">{activities.map((activity) => {
          const playerId = typeof activity.payload.playerId === "string" ? activity.payload.playerId : null;
          const contractId = typeof activity.payload.contractId === "string" ? activity.payload.contractId : null;
          const target = contractId ? `/admin/contracts/${contractId}/overview` : playerId ? `/admin/students/${playerId}/overview` : null;
          const content = <><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" /><span className="min-w-0 flex-1"><span className="block ui-section-title">{activityLabel(activity)}</span><span className="mt-1 block text-xs text-slate-500">{activity.actor?.fullName || "Система"}</span></span><span className="shrink-0 text-xs text-slate-400">{new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.occurredAt))}</span>{target ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /> : null}</>;
          return target ? <button key={activity.id} type="button" onClick={() => navigate(target)} className="flex w-full gap-3 py-3 text-left transition hover:bg-slate-50 first:pt-0 last:pb-0">{content}</button> : <div key={activity.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">{content}</div>;
        })}</div> : <EmptyState title="Активность пока пуста" description="Новые изменения клиента появятся здесь." />}
      </SectionCard> : null}

      {drawer === "edit-client" ? <ClientFormDrawer client={client} saving={saving} error={formError} onClose={() => setDrawer()} onSubmit={(input) => void update(input)} /> : null}
      {drawer === "change-status" && statusTarget ? <EntitySheet title={statusTarget === "ACTIVE" ? "Активировать клиента" : statusTarget === "PAUSED" ? "Приостановить клиента" : "Деактивировать клиента"} description={client.client.fullName} onClose={() => setDrawer()} closeDisabled={saving} footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={() => setDrawer()} disabled={saving}>Отмена</Button><Button variant={statusTarget === "INACTIVE" ? "danger" : "primary"} onClick={() => void changeStatus()} isLoading={saving}>{statusTarget === "ACTIVE" ? "Активировать" : statusTarget === "PAUSED" ? "Приостановить" : "Деактивировать"}</Button></div>}><div className={`rounded-lg border p-4 text-sm leading-6 ${statusTarget === "INACTIVE" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-black/[0.08] bg-[#f5f5f7] text-slate-700"}`}>{statusTarget === "ACTIVE" ? "Клиент снова станет активным. Доступные операции будут рассчитаны backend после изменения." : statusTarget === "PAUSED" ? "Клиент останется в системе, но его текущее состояние будет отмечено как приостановленное." : "Новые связи и договоры для клиента станут недоступны. Существующие данные, договоры и платежи сохранятся."}</div>{formError ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div> : null}</EntitySheet> : null}
      {drawer === "add-student" ? <ClientStudentDrawer clientId={client.client.id} clientName={client.client.fullName} branchId={client.client.branchId} linkedPlayerIds={activeStudents.map((item) => item.playerId)} onClose={() => setDrawer()} onCreated={() => { toast.success("Ученик добавлен"); setDrawer(); void load(); }} /> : null}
      {drawer === "edit-relation" && selectedRelation ? (
        <EntitySheet title="Изменить связь" description={`Настройте роль ${client.client.fullName} для ученика ${selectedRelation.playerName}.`} onClose={() => setDrawer()} closeDisabled={saving} footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={() => setDrawer()} disabled={saving}>Отмена</Button><Button onClick={() => void updateRelation()} isLoading={saving}>Сохранить</Button></div>}>
          <div className="space-y-5">
            <label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Роль клиента для ученика</span><Select value={relationForm.relationshipType} onValueChange={(value) => setRelationForm((current) => ({ ...current, relationshipType: value as ClientStudentRelationshipType }))}><SelectTrigger><SelectValue placeholder="Выберите тип связи" /></SelectTrigger><SelectContent><SelectItem value="SELF">Занимается сам</SelectItem><SelectItem value="MOTHER">Мать</SelectItem><SelectItem value="FATHER">Отец</SelectItem><SelectItem value="GUARDIAN">Опекун или представитель</SelectItem><SelectItem value="OTHER">Другое</SelectItem><SelectItem value="LEGACY_PARENT">Родитель (не уточнено)</SelectItem></SelectContent></Select><span className="block text-xs leading-5 text-slate-500">Тип связи отображается в карточках клиента и ученика.</span></label>
            <div className="space-y-3">
              {([
                ["primaryContact", "Основной контакт"],
                ["primaryPayer", "Основной плательщик"],
                ["legalRepresentative", "Юридический представитель"],
                ["receivesNotifications", "Получает уведомления"],
              ] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-black/[0.08] p-3 text-sm font-medium text-slate-700"><span>{label}</span><Checkbox checked={relationForm[key]} onCheckedChange={(checked) => setRelationForm((current) => ({ ...current, [key]: checked === true }))} /></label>)}
            </div>
            {formError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div> : null}
          </div>
        </EntitySheet>
      ) : null}
      {drawer === "end-relation" && selectedRelation ? (
        <EntitySheet title="Завершить связь" description={`${client.client.fullName} · ${selectedRelation.playerName}. Данные останутся в истории.`} onClose={() => setDrawer()} closeDisabled={saving} footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={() => setDrawer()} disabled={saving}>Отмена</Button><Button variant="danger" onClick={() => void endRelation()} isLoading={saving}>Завершить связь</Button></div>}>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">Ученик и клиент не удаляются. Связь перейдёт в историю и перестанет использоваться как активная.</div>
            <label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Дата завершения</span><DatePicker value={endedAt} onValueChange={setEndedAt} /><span className="block text-xs leading-5 text-slate-500">С этой даты связь перестанет считаться активной.</span></label>
            {formError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div> : null}
          </div>
        </EntitySheet>
      ) : null}
    </PageShell>
  );
};

export default ClientDetailsPage;
