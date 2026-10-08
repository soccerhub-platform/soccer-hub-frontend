import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, FileText, Plus, Search, Wallet } from "lucide-react";
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
import ContractCreateDrawer from "./ContractCreateDrawer";
import { ContractsApi } from "./contracts.api";
import type { ContractListItem, ContractStatus, ContractsPageResponse } from "./contracts.types";

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: "Черновик",
  UPCOMING: "Ожидает начала",
  ACTIVE: "Активный",
  EXPIRED: "Завершён",
  CANCELLED: "Отменён",
};

const statusTones: Record<ContractStatus, StatusTone> = {
  DRAFT: "neutral",
  UPCOMING: "info",
  ACTIVE: "success",
  EXPIRED: "warning",
  CANCELLED: "danger",
};

const money = (value: number, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value || 0))} ${currency}`;

const date = (value?: string | null) => {
  if (!value) return "Без срока";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
};

const contractColumns: ColumnDef<ContractListItem>[] = [
  {
    accessorKey: "contractNumber",
    header: "Договор",
    cell: ({ row }) => (
      <div className="space-y-1.5">
        <span className="block font-semibold text-slate-950">{row.original.contractNumber}</span>
        <StatusBadge tone={statusTones[row.original.status]}>{statusLabels[row.original.status]}</StatusBadge>
      </div>
    ),
  },
  {
    id: "client",
    header: "Клиент",
    cell: ({ row }) => (
      <div>
        <span className="block font-medium text-slate-900">{row.original.primaryContact.fullName}</span>
        <span className="mt-1 block text-xs text-slate-500">{row.original.primaryContact.phone || "Телефон не указан"}</span>
      </div>
    ),
  },
  {
    id: "participant",
    header: "Ученик",
    cell: ({ row }) => (
      <div>
        <span className="block font-medium text-slate-900">{row.original.participant.fullName}</span>
        <span className="mt-1 block text-xs text-slate-500">
          {row.original.participant.birthDate ? `Дата рождения: ${date(row.original.participant.birthDate)}` : "Получатель услуги"}
        </span>
      </div>
    ),
  },
  {
    id: "period",
    header: "Период",
    cell: ({ row }) => (
      <div className="text-sm text-slate-700">
        {date(row.original.startDate)}
        <span className="block text-xs text-slate-500">до {date(row.original.endDate)}</span>
      </div>
    ),
  },
  {
    id: "finance",
    header: "Финансы",
    cell: ({ row }) => {
      const outstanding = Number(row.original.outstandingAmount ?? 0);
      return (
        <div>
          <span className="block font-semibold tabular-nums text-slate-950">{money(row.original.amount, row.original.currency)}</span>
          <span className={`mt-1 block text-xs ${outstanding > 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {outstanding > 0 ? `Осталось ${money(outstanding, row.original.currency)}` : "Оплачено"}
          </span>
        </div>
      );
    },
  },
  {
    id: "open",
    header: "",
    size: 40,
    cell: () => <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />,
  },
];

const ContractsPage: React.FC = () => {
  const { branchId } = useAdminBranch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ContractsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "all") as ContractStatus | "all";
  const page = Math.max(Number(searchParams.get("page") ?? 0), 0);
  const createOpen = searchParams.get("drawer") === "create-contract";
  const contextClientId = searchParams.get("clientId") ?? undefined;

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await ContractsApi.list({ branchId, search, status, page, size: 20, clientId: contextClientId }));
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось загрузить договоры"));
    } finally {
      setLoading(false);
    }
  }, [branchId, contextClientId, page, search, status]);

  useEffect(() => { void load(); }, [load]);

  const updateQuery = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const pageSummary = useMemo(() => {
    const items = data?.content ?? [];
    return {
      active: items.filter((item) => item.status === "ACTIVE").length,
      drafts: items.filter((item) => item.status === "DRAFT").length,
      debt: items
        .filter((item) => item.status === "ACTIVE" || item.status === "UPCOMING")
        .reduce((sum, item) => sum + Number(item.outstandingAmount ?? 0), 0),
    };
  }, [data]);

  if (!branchId) return null;

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Договоры"
        description="Коммерческие условия между клиентом и учеником"
        actions={<Button onClick={() => updateQuery("drawer", "create-contract")}><Plus className="h-4 w-4" /> Создать договор</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={<FileText />} title="Всего в выдаче" value={data?.totalElements ?? 0} note="С учётом фильтров" />
        <MetricCard icon={<FileText />} title="Активные на странице" value={pageSummary.active} note={`Черновиков: ${pageSummary.drafts}`} />
        <MetricCard icon={<Wallet />} title="Остаток по действующим" value={money(pageSummary.debt)} note="Без отменённых договоров" tone={pageSummary.debt > 0 ? "danger" : "success"} />
      </div>

      <FilterBar>
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => updateQuery("search", event.target.value)}
            className="pl-9"
            placeholder="Номер, клиент или ученик"
            aria-label="Поиск договоров"
          />
        </div>
        <Select value={status} onValueChange={(value) => updateQuery("status", value)}>
          <SelectTrigger aria-label="Статус договора" className="w-full sm:w-52"><SelectValue placeholder="Все статусы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      {loading ? <LoadingState label="Загрузка договоров..." /> : error ? (
        <ErrorState title="Не удалось загрузить договоры" message={error} onRetry={() => void load()} />
      ) : (
        <DataTable
          columns={contractColumns}
          data={data?.content ?? []}
          getRowId={(contract) => contract.id}
          onRowOpen={(contract) => navigate(`/admin/contracts/${contract.id}/overview`)}
          tableClassName="min-w-[960px]"
          emptyState={<EmptyState title="Договоров не найдено" description="Измените фильтры или создайте первый договор." />}
          pagination={data ? {
            pageIndex: data.number,
            totalPages: data.totalPages,
            totalElements: data.totalElements,
            onPageChange: (nextPage) => updateQuery("page", String(nextPage)),
          } : undefined}
        />
      )}

      {createOpen ? (
        <ContractCreateDrawer
          branchId={branchId}
          initialClientId={contextClientId}
          onClose={() => updateQuery("drawer")}
          onCreated={(contractId) => navigate(`/admin/contracts/${contractId}/overview`, { replace: true })}
        />
      ) : null}
    </PageShell>
  );
};

export default ContractsPage;
