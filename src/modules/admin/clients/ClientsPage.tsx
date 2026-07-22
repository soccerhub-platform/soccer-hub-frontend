import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  UsersIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, ErrorState, LoadingState, PageShell, WorkspaceBreadcrumbs } from "../../../shared/ui";
import { useAdminBranch } from "../BranchContext";
import { ClientApi } from "./client.api";
import ClientOnboardingDrawer from "./ClientOnboardingDrawer";
import type { ClientListItem, ClientPaymentStatus, ClientsPageResponse, ClientStatus } from "./client.types";

const statusLabel: Record<ClientStatus, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  NO_RESPONSE: "Нет связи",
  REJECTED: "Отказ",
  TRIAL_SCHEDULED: "Пробное назначено",
  TRIAL_COMPLETED: "Пробное проведено",
  TRIAL_FAILED: "Пробное неудачно",
  CONTRACT_PENDING: "Оформление договора",
  ACTIVE: "Активный",
  PAUSED: "Приостановлен",
  INACTIVE: "Неактивный",
};

const formatMoney = (amount: number, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || "К").toUpperCase();
};

const avatarTone = (id: string) => {
  const tones = [
    "bg-emerald-50 text-emerald-700",
    "bg-violet-50 text-violet-700",
    "bg-blue-50 text-blue-700",
    "bg-amber-50 text-amber-700",
    "bg-rose-50 text-rose-700",
  ];
  const sum = Array.from(id).reduce((value, char) => value + char.charCodeAt(0), 0);
  return tones[sum % tones.length];
};

const statusTone = (status: ClientStatus) => {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "INACTIVE" || status === "REJECTED") return "bg-slate-100 text-slate-600";
  if (status === "PAUSED" || status === "NO_RESPONSE") return "bg-amber-50 text-amber-700";
  return "bg-cyan-50 text-cyan-700";
};

const paymentStatusLabel: Record<ClientPaymentStatus, string> = {
  PAID: "Оплачено",
  PARTIALLY_PAID: "Частично оплачено",
  UNPAID: "Не оплачено",
  NO_CONTRACT: "Нет договора",
  NO_AMOUNT: "Сумма не указана",
  MIXED_CURRENCIES: "Несколько валют",
};

const filterControlClassName = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100";

const SortHeader: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${active ? "font-semibold text-cyan-800" : ""}`}>
    {label}<ArrowsUpDownIcon className="h-3.5 w-3.5" />
  </button>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  noteClassName?: string;
}> = ({ icon, iconClassName, label, value, note, noteClassName = "text-emerald-700" }) => (
  <div className="flex min-h-28 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconClassName} [&>svg]:h-6 [&>svg]:w-6`}>
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-medium text-slate-500">{label}</span>
      <span className="mt-1 block truncate text-xl font-semibold text-slate-950">{value}</span>
      <span className={`mt-2 block truncate text-xs font-medium ${noteClassName}`}>{note}</span>
    </span>
  </div>
);

const ClientPaymentCell: React.FC<{ client: ClientListItem }> = ({ client }) => {
  const outstanding = Number(client.outstandingAmount ?? 0);
  const paid = Number(client.paidAmount ?? 0);
  const currency = client.currency ?? "KZT";
  const paymentStatus = client.paymentStatus ?? (client.activeContractsCount === 0 ? "NO_CONTRACT" : outstanding > 0 ? (paid > 0 ? "PARTIALLY_PAID" : "UNPAID") : "PAID");
  const value = paymentStatus === "PAID"
    ? formatMoney(paid, currency)
    : paymentStatus === "PARTIALLY_PAID" || paymentStatus === "UNPAID"
      ? formatMoney(outstanding, currency)
      : paymentStatus === "MIXED_CURRENCIES"
        ? "Несколько валют"
        : "—";
  const tone = paymentStatus === "PAID"
    ? "text-emerald-700"
    : paymentStatus === "PARTIALLY_PAID" || paymentStatus === "UNPAID"
      ? "text-rose-700"
      : paymentStatus === "NO_AMOUNT"
        ? "text-amber-700"
        : "text-slate-500";

  return <span><span className="mb-1 block text-[11px] font-medium uppercase text-slate-400 lg:hidden">Оплата</span><span className={`block text-sm font-semibold ${tone}`}>{value}</span><span className={`mt-1 block text-xs ${tone}`}>{paymentStatusLabel[paymentStatus]}</span></span>;
};

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { branchId } = useAdminBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ClientsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(Number(searchParams.get("page") ?? 0), 0);
  const size = [10, 20, 50].includes(Number(searchParams.get("size"))) ? Number(searchParams.get("size")) : 20;
  const status = (searchParams.get("status") ?? "ALL") as ClientStatus | "ALL";
  const students = (searchParams.get("students") ?? "ALL") as "ALL" | "WITH_STUDENTS" | "WITHOUT_STUDENTS";
  const contracts = (searchParams.get("contracts") ?? "ALL") as "ALL" | "ACTIVE" | "NO_ACTIVE";
  const payment = (searchParams.get("payment") ?? "ALL") as "ALL" | ClientPaymentStatus | "DEBT";
  const sort = searchParams.get("sort") ?? "fullName,asc";
  const createOpen = searchParams.get("drawer") === "create-client";
  const activeFilters = [status, students, contracts, payment].filter((value) => value !== "ALL").length;

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await ClientApi.list({ branchId, search, status, students, contracts, payment, sort, page, size }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось загрузить клиентов"));
    } finally {
      setLoading(false);
    }
  }, [branchId, contracts, page, payment, search, size, sort, status, students]);

  useEffect(() => { void load(); }, [load]);

  const updateQuery = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "ALL") next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ["status", "students", "contracts", "payment", "page"].forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  const toggleSort = (property: string) => {
    const [currentProperty, currentDirection] = sort.split(",");
    updateQuery("sort", `${property},${currentProperty === property && currentDirection === "asc" ? "desc" : "asc"}`);
  };

  const summary = useMemo(() => {
    const clients = data?.content ?? [];
    const currencies = new Set(clients.map((item) => item.currency).filter(Boolean));
    return data?.summary ? {
      clients: data.summary.clientsCount,
      activeClients: data.summary.activeClientsCount,
      students: data.summary.studentsCount,
      contracts: data.summary.activeContractsCount,
      paid: Number(data.summary.paidAmount ?? 0),
      debt: Number(data.summary.outstandingAmount ?? 0),
      currency: data.summary.currency ?? "KZT",
      mixedCurrencies: data.summary.mixedCurrencies,
    } : {
      clients: data?.totalElements ?? 0,
      activeClients: clients.filter((item) => item.status === "ACTIVE").length,
      students: clients.reduce((sum, item) => sum + item.studentsCount, 0),
      contracts: clients.reduce((sum, item) => sum + item.activeContractsCount, 0),
      paid: clients.reduce((sum, item) => sum + Number(item.paidAmount ?? 0), 0),
      debt: clients.reduce((sum, item) => sum + Number(item.outstandingAmount ?? 0), 0),
      currency: currencies.size === 1 ? Array.from(currencies)[0] ?? "KZT" : "KZT",
      mixedCurrencies: currencies.size > 1 || clients.some((item) => item.mixedCurrencies),
    };
  }, [data]);

  return (
    <PageShell className="space-y-4">
      <WorkspaceBreadcrumbs items={[{ label: "Клиенты" }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-font text-3xl font-semibold text-slate-950">Клиенты</h1>
          <p className="mt-1 text-sm text-slate-500">Плательщики, представители и взрослые ученики</p>
        </div>
        <Button onClick={() => updateQuery("drawer", "create-client")} rounded="rounded-lg" className="self-start sm:self-auto">
          <PlusIcon className="h-4 w-4" /> Оформить клиента
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<UsersIcon />}
          iconClassName="bg-emerald-50 text-emerald-700"
          label="Клиентов в выдаче"
          value={summary.clients}
          note={`Активных: ${summary.activeClients}`}
        />
        <MetricCard
          icon={<UserGroupIcon />}
          iconClassName="bg-cyan-50 text-cyan-700"
          label="Связанных учеников"
          value={summary.students}
          note="В текущей выдаче"
          noteClassName="text-cyan-700"
        />
        <MetricCard
          icon={<DocumentTextIcon />}
          iconClassName="bg-violet-50 text-violet-700"
          label="Активные договоры"
          value={summary.contracts}
          note="В текущей выдаче"
          noteClassName="text-violet-700"
        />
        <MetricCard
          icon={<WalletIcon />}
          iconClassName={summary.debt > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}
          label="Задолженность в выдаче"
          value={summary.mixedCurrencies ? "Несколько валют" : formatMoney(summary.debt, summary.currency)}
          note={summary.debt > 0 ? "Требует внимания" : "Задолженности нет"}
          noteClassName={summary.debt > 0 ? "text-rose-700" : "text-emerald-700"}
        />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 shadow-sm focus-within:border-cyan-300 focus-within:ring-2 focus-within:ring-cyan-100">
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(event) => updateQuery("search", event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Поиск по имени, телефону, email или ID клиента"
            aria-label="Поиск клиентов"
          />
          {search ? <button type="button" onClick={() => updateQuery("search")} className="text-xs font-medium text-slate-500 transition hover:text-slate-900">Очистить</button> : null}
        </div>
        <Button variant="secondary" rounded="rounded-lg" onClick={() => setFiltersOpen((value) => !value)}>
          <FunnelIcon className="h-4 w-4" /> Фильтры
          {activeFilters ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-700 px-1 text-[11px] font-semibold text-white">{activeFilters}</span> : null}
        </Button>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
          <ArrowsUpDownIcon className="h-4 w-4 text-slate-400" />
          <span className="sr-only">Сортировка</span>
          <select value={sort} onChange={(event) => updateQuery("sort", event.target.value)} className="h-11 min-w-44 border-0 bg-transparent text-sm text-slate-700 outline-none">
            <option value="fullName,asc">Имя: А–Я</option>
            <option value="fullName,desc">Имя: Я–А</option>
            <option value="outstandingAmount,desc">Сначала должники</option>
            <option value="lastPaidAt,desc">Последняя оплата</option>
            <option value="studentsCount,desc">Больше учеников</option>
            <option value="activeContractsCount,desc">Больше договоров</option>
          </select>
        </label>
      </div>

      {filtersOpen || activeFilters ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
          <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Статус клиента</span><select value={status} onChange={(event) => updateQuery("status", event.target.value)} className={`${filterControlClassName} w-full`}><option value="ALL">Все статусы</option><option value="ACTIVE">Активные</option><option value="NEW">Новые</option><option value="IN_PROGRESS">В работе</option><option value="CONTRACT_PENDING">Оформление договора</option><option value="PAUSED">Приостановленные</option><option value="INACTIVE">Неактивные</option></select></label>
          <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Ученики</span><select value={students} onChange={(event) => updateQuery("students", event.target.value)} className={`${filterControlClassName} w-full`}><option value="ALL">Все клиенты</option><option value="WITH_STUDENTS">Есть ученики</option><option value="WITHOUT_STUDENTS">Без учеников</option></select></label>
          <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Договоры</span><select value={contracts} onChange={(event) => updateQuery("contracts", event.target.value)} className={`${filterControlClassName} w-full`}><option value="ALL">Все</option><option value="ACTIVE">Есть активный договор</option><option value="NO_ACTIVE">Без активного договора</option></select></label>
          <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Оплата</span><select value={payment} onChange={(event) => updateQuery("payment", event.target.value)} className={`${filterControlClassName} w-full`}><option value="ALL">Любое состояние</option><option value="PAID">Оплачено</option><option value="DEBT">Есть задолженность</option><option value="PARTIALLY_PAID">Частично оплачено</option><option value="UNPAID">Не оплачено</option><option value="NO_AMOUNT">Сумма не указана</option><option value="NO_CONTRACT">Нет договора</option></select></label>
          <Button variant="ghost" rounded="rounded-lg" onClick={clearFilters} disabled={!activeFilters}>Сбросить</Button>
        </div>
      ) : null}

      {loading ? <LoadingState label="Загружаем клиентов" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : !data?.content.length ? (
        <EmptyState title="Клиенты не найдены" description="Создайте клиента или измените поисковый запрос." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(250px,1.45fr)_minmax(180px,1fr)_110px_120px_150px_170px_28px] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-medium text-slate-500 lg:grid">
            <SortHeader label="Клиент" active={sort.startsWith("fullName,")} onClick={() => toggleSort("fullName")} />
            <span>Контакты</span>
            <SortHeader label="Ученики" active={sort.startsWith("studentsCount,")} onClick={() => toggleSort("studentsCount")} />
            <SortHeader label="Договоры" active={sort.startsWith("activeContractsCount,")} onClick={() => toggleSort("activeContractsCount")} />
            <SortHeader label="Оплата" active={sort.startsWith("outstandingAmount,")} onClick={() => toggleSort("outstandingAmount")} />
            <SortHeader label="Последняя активность" active={sort.startsWith("lastPaidAt,")} onClick={() => toggleSort("lastPaidAt")} />
            <span />
          </div>
          <div className="divide-y divide-slate-100">
            {data.content.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => navigate(`/admin/clients/${client.id}/overview`)}
                className="grid w-full gap-4 px-4 py-4 text-left transition hover:bg-slate-50/80 sm:grid-cols-2 lg:grid-cols-[minmax(250px,1.45fr)_minmax(180px,1fr)_110px_120px_150px_170px_28px] lg:items-center lg:px-5"
              >
                <span className="flex min-w-0 items-center gap-3 sm:col-span-2 lg:col-span-1">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(client.id)}`}>{initials(client.fullName)}</span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-950">{client.fullName}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusTone(client.status)}`}>{statusLabel[client.status] ?? client.status}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-400">ID: {client.id.slice(0, 8)}</span>
                  </span>
                </span>

                <span className="min-w-0 text-xs text-slate-500">
                  <span className="mb-1 block text-[11px] font-medium uppercase text-slate-400 lg:hidden">Контакты</span>
                  <span className="block truncate">{client.phone || "Телефон не указан"}</span>
                  <span className="mt-1 block truncate">{client.email || "Email не указан"}</span>
                </span>

                <span>
                  <span className="mb-1 block text-[11px] font-medium uppercase text-slate-400 lg:hidden">Ученики</span>
                  <span className="block text-sm font-semibold text-slate-900">{client.studentsCount}</span>
                  <span className="mt-1 block text-xs font-medium text-emerald-700">Связано: {client.studentsCount}</span>
                </span>

                <span>
                  <span className="mb-1 block text-[11px] font-medium uppercase text-slate-400 lg:hidden">Договоры</span>
                  <span className="block text-sm font-semibold text-slate-900">{client.activeContractsCount}</span>
                  <span className="mt-1 block text-xs font-medium text-emerald-700">Активных: {client.activeContractsCount}</span>
                </span>

                <ClientPaymentCell client={client} />

                <span>
                  <span className="mb-1 block text-[11px] font-medium uppercase text-slate-400 lg:hidden">Последняя активность</span>
                  <span className="block text-xs text-slate-500">{formatDate(client.lastPaidAt)}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><CreditCardIcon className="h-3.5 w-3.5" />{client.lastPaidAt ? "Последняя оплата" : "Оплат пока нет"}</span>
                </span>

                <ChevronRightIcon className="hidden h-4 w-4 text-slate-400 lg:block" />
              </button>
            ))}
          </div>
        </div>
      )}

      {data ? (
        <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Показано {data.content.length} из {data.totalElements} клиентов</span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2"><span>На странице:</span><select value={size} onChange={(event) => updateQuery("size", event.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 outline-none"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
            <Button variant="secondary" size="sm" rounded="rounded-lg" disabled={data.number === 0} onClick={() => updateQuery("page", String(data.number - 1))} aria-label="Предыдущая страница"><ChevronLeftIcon className="h-4 w-4" /></Button>
            <span className="min-w-16 text-center">{data.totalPages ? data.number + 1 : 0} из {data.totalPages}</span>
            <Button variant="secondary" size="sm" rounded="rounded-lg" disabled={data.number + 1 >= data.totalPages} onClick={() => updateQuery("page", String(data.number + 1))} aria-label="Следующая страница"><ChevronRightIcon className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : null}

      {createOpen && branchId ? <ClientOnboardingDrawer branchId={branchId} onClose={() => updateQuery("drawer")} onCreated={(clientId) => navigate(`/admin/clients/${clientId}/overview`)} /> : null}
    </PageShell>
  );
};

export default ClientsPage;
