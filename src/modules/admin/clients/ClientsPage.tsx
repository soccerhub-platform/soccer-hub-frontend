import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronRight,
  CreditCard,
  FileText,
  ListFilter,
  Plus,
  Search,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingState,
  MetricCard,
  PageHeader,
  PageShell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  type StatusTone,
} from "../../../shared/ui";
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

const statusTone: Record<ClientStatus, StatusTone> = {
  NEW: "info",
  IN_PROGRESS: "info",
  NO_RESPONSE: "warning",
  REJECTED: "danger",
  TRIAL_SCHEDULED: "info",
  TRIAL_COMPLETED: "success",
  TRIAL_FAILED: "danger",
  CONTRACT_PENDING: "warning",
  ACTIVE: "success",
  PAUSED: "warning",
  INACTIVE: "neutral",
};

const paymentStatusLabel: Record<ClientPaymentStatus, string> = {
  PAID: "Оплачено",
  PARTIALLY_PAID: "Частично оплачено",
  UNPAID: "Не оплачено",
  NO_CONTRACT: "Нет договора",
  NO_AMOUNT: "Сумма не указана",
  MIXED_CURRENCIES: "Несколько валют",
};

const formatMoney = (amount: number, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed);
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || "К").toUpperCase();
};

const SortHeader: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={`inline-flex items-center gap-1 transition hover:text-slate-950 ${active ? "font-semibold text-[#0066cc]" : ""}`}
  >
    {label}<ArrowUpDown className="h-3.5 w-3.5" />
  </button>
);

const ClientPaymentCell: React.FC<{ client: ClientListItem }> = ({ client }) => {
  const outstanding = Number(client.outstandingAmount ?? 0);
  const paid = Number(client.paidAmount ?? 0);
  const currency = client.currency ?? "KZT";
  const paymentStatus = client.paymentStatus
    ?? (client.activeContractsCount === 0 ? "NO_CONTRACT" : outstanding > 0 ? (paid > 0 ? "PARTIALLY_PAID" : "UNPAID") : "PAID");
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

  return (
    <div>
      <span className={`block text-sm font-semibold tabular-nums ${tone}`}>{value}</span>
      <span className={`mt-1 block text-xs ${tone}`}>{paymentStatusLabel[paymentStatus]}</span>
    </div>
  );
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

  const updateQuery = useCallback((key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "ALL") next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ["status", "students", "contracts", "payment", "page"].forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  const toggleSort = useCallback((property: string) => {
    const [currentProperty, currentDirection] = sort.split(",");
    updateQuery("sort", `${property},${currentProperty === property && currentDirection === "asc" ? "desc" : "asc"}`);
  }, [sort, updateQuery]);

  const columns = useMemo<ColumnDef<ClientListItem>[]>(() => [
    {
      id: "client",
      header: () => <SortHeader label="Клиент" active={sort.startsWith("fullName,")} onClick={() => toggleSort("fullName")} />,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#0066cc]">
            {initials(row.original.fullName)}
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-slate-950">{row.original.fullName}</span>
              <StatusBadge tone={statusTone[row.original.status]}>{statusLabel[row.original.status]}</StatusBadge>
            </span>
            <span className="mt-1 block truncate text-xs text-slate-400">ID: {row.original.id.slice(0, 8)}</span>
          </span>
        </div>
      ),
    },
    {
      id: "contacts",
      header: "Контакты",
      cell: ({ row }) => (
        <div className="text-xs text-slate-500">
          <span className="block truncate">{row.original.phone || "Телефон не указан"}</span>
          <span className="mt-1 block truncate">{row.original.email || "Email не указан"}</span>
        </div>
      ),
    },
    {
      accessorKey: "studentsCount",
      header: () => <SortHeader label="Ученики" active={sort.startsWith("studentsCount,")} onClick={() => toggleSort("studentsCount")} />,
      cell: ({ row }) => <span className="font-semibold tabular-nums text-slate-950">{row.original.studentsCount}</span>,
    },
    {
      accessorKey: "activeContractsCount",
      header: () => <SortHeader label="Договоры" active={sort.startsWith("activeContractsCount,")} onClick={() => toggleSort("activeContractsCount")} />,
      cell: ({ row }) => <span className="font-semibold tabular-nums text-slate-950">{row.original.activeContractsCount}</span>,
    },
    {
      id: "payment",
      header: () => <SortHeader label="Оплата" active={sort.startsWith("outstandingAmount,")} onClick={() => toggleSort("outstandingAmount")} />,
      cell: ({ row }) => <ClientPaymentCell client={row.original} />,
    },
    {
      id: "activity",
      header: "Активность",
      cell: ({ row }) => (
        <div>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            {row.original.lastPaidAt ? `Оплата: ${formatDate(row.original.lastPaidAt)}` : "Оплат пока нет"}
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            {row.original.updatedAt ? `Изменён: ${formatDate(row.original.updatedAt)}` : `Создан: ${formatDate(row.original.createdAt)}`}
          </span>
        </div>
      ),
    },
    {
      id: "open",
      header: "",
      size: 40,
      cell: () => <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />,
    },
  ], [sort, toggleSort]);

  const summary = useMemo(() => {
    const clients = data?.content ?? [];
    const currencies = new Set(clients.map((item) => item.currency).filter(Boolean));
    return data?.summary ? {
      clients: data.summary.clientsCount,
      activeClients: data.summary.activeClientsCount,
      students: data.summary.studentsCount,
      contracts: data.summary.activeContractsCount,
      debt: Number(data.summary.outstandingAmount ?? 0),
      currency: data.summary.currency ?? "KZT",
      mixedCurrencies: data.summary.mixedCurrencies,
    } : {
      clients: data?.totalElements ?? 0,
      activeClients: clients.filter((item) => item.status === "ACTIVE").length,
      students: clients.reduce((sum, item) => sum + item.studentsCount, 0),
      contracts: clients.reduce((sum, item) => sum + item.activeContractsCount, 0),
      debt: clients.reduce((sum, item) => sum + Number(item.outstandingAmount ?? 0), 0),
      currency: currencies.size === 1 ? Array.from(currencies)[0] ?? "KZT" : "KZT",
      mixedCurrencies: currencies.size > 1 || clients.some((item) => item.mixedCurrencies),
    };
  }, [data]);

  return (
    <PageShell>
      <PageHeader
        title="Клиенты"
        description="Плательщики, представители и взрослые ученики"
        actions={<Button onClick={() => updateQuery("drawer", "create-client")}><Plus className="h-4 w-4" /> Оформить клиента</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<UsersRound />} title="Клиентов в выдаче" value={summary.clients} note={`Активных: ${summary.activeClients}`} />
        <MetricCard icon={<Users />} title="Связанных учеников" value={summary.students} note="В текущей выдаче" />
        <MetricCard icon={<FileText />} title="Активные договоры" value={summary.contracts} note="В текущей выдаче" tone="violet" />
        <MetricCard
          icon={<Wallet />}
          title="Задолженность в выдаче"
          value={summary.mixedCurrencies ? "Несколько валют" : formatMoney(summary.debt, summary.currency)}
          note={summary.debt > 0 ? "Требует внимания" : "Задолженности нет"}
          tone={summary.debt > 0 ? "danger" : "success"}
        />
      </div>

      <FilterBar
        trailing={(
          <Select value={sort} onValueChange={(value) => updateQuery("sort", value)}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue aria-label="Сортировка" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt,desc">Недавние клиенты</SelectItem>
              <SelectItem value="createdAt,asc">Старые клиенты</SelectItem>
              <SelectItem value="fullName,asc">Имя: А–Я</SelectItem>
              <SelectItem value="fullName,desc">Имя: Я–А</SelectItem>
              <SelectItem value="outstandingAmount,desc">Сначала должники</SelectItem>
              <SelectItem value="lastPaidAt,desc">Последняя оплата</SelectItem>
              <SelectItem value="studentsCount,desc">Больше учеников</SelectItem>
              <SelectItem value="activeContractsCount,desc">Больше договоров</SelectItem>
            </SelectContent>
          </Select>
        )}
      >
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => updateQuery("search", event.target.value)}
            className="pl-9"
            placeholder="Имя, телефон, email или ID клиента"
            aria-label="Поиск клиентов"
          />
        </div>
        <Button variant="secondary" onClick={() => setFiltersOpen((value) => !value)}>
          <ListFilter className="h-4 w-4" /> Фильтры
          {activeFilters ? <span className="rounded-full bg-[#0066cc] px-1.5 py-0.5 text-[10px] font-semibold text-white">{activeFilters}</span> : null}
        </Button>
      </FilterBar>

      {filtersOpen || activeFilters ? (
        <section className="grid gap-3 rounded-2xl border border-black/[0.08] bg-white p-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
          <FilterSelect label="Статус клиента" value={status} onChange={(value) => updateQuery("status", value)} options={[
            ["ALL", "Все статусы"], ["ACTIVE", "Активные"], ["NEW", "Новые"], ["IN_PROGRESS", "В работе"],
            ["CONTRACT_PENDING", "Оформление договора"], ["PAUSED", "Приостановленные"], ["INACTIVE", "Неактивные"],
          ]} />
          <FilterSelect label="Ученики" value={students} onChange={(value) => updateQuery("students", value)} options={[
            ["ALL", "Все клиенты"], ["WITH_STUDENTS", "Есть ученики"], ["WITHOUT_STUDENTS", "Без учеников"],
          ]} />
          <FilterSelect label="Договоры" value={contracts} onChange={(value) => updateQuery("contracts", value)} options={[
            ["ALL", "Все"], ["ACTIVE", "Есть активный договор"], ["NO_ACTIVE", "Без активного договора"],
          ]} />
          <FilterSelect label="Оплата" value={payment} onChange={(value) => updateQuery("payment", value)} options={[
            ["ALL", "Любое состояние"], ["PAID", "Оплачено"], ["DEBT", "Есть задолженность"],
            ["PARTIALLY_PAID", "Частично оплачено"], ["UNPAID", "Не оплачено"], ["NO_AMOUNT", "Сумма не указана"],
            ["NO_CONTRACT", "Нет договора"],
          ]} />
          <Button variant="ghost" onClick={clearFilters} disabled={!activeFilters}>Сбросить</Button>
        </section>
      ) : null}

      {loading ? <LoadingState label="Загружаем клиентов" /> : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.content ?? []}
          getRowId={(client) => client.id}
          onRowOpen={(client) => navigate(`/admin/clients/${client.id}/overview`)}
          tableClassName="min-w-[1080px]"
          emptyState={<EmptyState title="Клиенты не найдены" description="Создайте клиента или измените поисковый запрос." />}
          pagination={data ? {
            pageIndex: data.number,
            totalPages: data.totalPages,
            totalElements: data.totalElements,
            onPageChange: (nextPage) => updateQuery("page", String(nextPage)),
          } : undefined}
        />
      )}

      {data ? (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>На странице:</span>
          <Select value={String(size)} onValueChange={(value) => updateQuery("size", value)}>
            <SelectTrigger className="h-9 w-20"><SelectValue placeholder="20" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {createOpen && branchId ? (
        <ClientOnboardingDrawer
          branchId={branchId}
          onClose={() => updateQuery("drawer")}
          onCreated={(clientId) => navigate(`/admin/clients/${clientId}/overview`)}
        />
      ) : null}
    </PageShell>
  );
};

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<readonly [string, string]>;
}> = ({ label, value, onChange, options }) => (
  <label className="space-y-1.5">
    <span className="block text-xs font-medium text-slate-500">{label}</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
      </SelectContent>
    </Select>
  </label>
);

export default ClientsPage;
