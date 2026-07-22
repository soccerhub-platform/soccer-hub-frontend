import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, ErrorState, LoadingState, PageShell, WorkspaceBreadcrumbs } from "../../../shared/ui";
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

const statusTone: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  UPCOMING: "bg-cyan-50 text-cyan-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const money = (value: number, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value || 0))} ${currency}`;

const date = (value?: string | null) => {
  if (!value) return "Без срока";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
};

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
      debt: items.reduce((sum, item) => sum + Number(item.outstandingAmount ?? 0), 0),
    };
  }, [data]);

  if (!branchId) return null;

  return (
    <PageShell className="space-y-4">
      <WorkspaceBreadcrumbs items={[{ label: "Договоры" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-font text-3xl font-semibold text-slate-950">Договоры</h1>
          <p className="mt-1 text-sm text-slate-500">Коммерческие условия между клиентом и учеником</p>
        </div>
        <Button rounded="rounded-lg" onClick={() => updateQuery("drawer", "create-contract")}><PlusIcon className="h-4 w-4" /> Создать договор</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<DocumentTextIcon />} label="Всего в выдаче" value={data?.totalElements ?? 0} note="С учётом фильтров" />
        <Metric icon={<DocumentTextIcon />} label="На текущей странице" value={`Активные: ${pageSummary.active} · Черновики: ${pageSummary.drafts}`} note="По статусу договора" />
        <Metric icon={<WalletIcon />} label="Остаток по странице" value={money(pageSummary.debt)} note="По зафиксированным оплатам" danger={pageSummary.debt > 0} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => updateQuery("search", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-admin-300 focus:ring-2 focus:ring-admin-100"
              placeholder="Номер, клиент или ученик"
            />
          </div>
          <select value={status} onChange={(event) => updateQuery("status", event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
            <option value="all">Все статусы</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {loading ? <div className="p-6"><LoadingState label="Загрузка договоров..." /></div> : error ? (
          <div className="p-6"><ErrorState title="Не удалось загрузить договоры" message={error} onRetry={() => void load()} /></div>
        ) : data?.content.length ? (
          <>
            <div className="hidden grid-cols-[minmax(150px,0.8fr)_minmax(190px,1.1fr)_minmax(190px,1.1fr)_150px_150px_44px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
              <span>Договор</span><span>Клиент</span><span>Ученик</span><span>Период</span><span>Финансы</span><span />
            </div>
            <div className="divide-y divide-slate-100">
              {data.content.map((contract) => <ContractRow key={contract.id} contract={contract} onOpen={() => navigate(`/admin/contracts/${contract.id}/overview`)} />)}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-xs text-slate-500">Страница {data.number + 1} из {Math.max(data.totalPages, 1)}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" rounded="rounded-lg" disabled={data.number <= 0} onClick={() => updateQuery("page", String(data.number - 1))}><ChevronLeftIcon className="h-4 w-4" /></Button>
                <Button size="sm" variant="secondary" rounded="rounded-lg" disabled={data.number + 1 >= data.totalPages} onClick={() => updateQuery("page", String(data.number + 1))}><ChevronRightIcon className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        ) : <div className="p-8"><EmptyState title="Договоров не найдено" description="Измените фильтры или создайте первый договор." /></div>}
      </div>

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

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; note: string; danger?: boolean }> = ({ icon, label, value, note, danger }) => (
  <div className="flex min-h-24 min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin-50 text-admin-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
    <span className="min-w-0"><span className="block text-xs text-slate-500">{label}</span><span className="mt-1 block truncate text-lg font-semibold text-slate-950">{value}</span><span className={`mt-1 block truncate text-xs ${danger ? "text-rose-600" : "text-slate-500"}`}>{note}</span></span>
  </div>
);

const ContractRow: React.FC<{ contract: ContractListItem; onOpen: () => void }> = ({ contract, onOpen }) => (
  <button type="button" onClick={onOpen} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(150px,0.8fr)_minmax(190px,1.1fr)_minmax(190px,1.1fr)_150px_150px_44px] lg:items-center lg:gap-4">
    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-950">{contract.contractNumber}</span><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone[contract.status]}`}>{statusLabels[contract.status]}</span></span>
    <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{contract.primaryContact.fullName}</span><span className="mt-1 block truncate text-xs text-slate-500">{contract.primaryContact.phone || "Телефон не указан"}</span></span>
    <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{contract.participant.fullName}</span><span className="mt-1 block truncate text-xs text-slate-500">{contract.participant.birthDate ? `Дата рождения: ${date(contract.participant.birthDate)}` : "Получатель услуги"}</span></span>
    <span className="text-sm text-slate-700">{date(contract.startDate)}<span className="block text-xs text-slate-500">до {date(contract.endDate)}</span></span>
    <span><span className="block text-sm font-semibold text-slate-900">{money(contract.amount, contract.currency)}</span><span className={`mt-1 block text-xs ${Number(contract.outstandingAmount ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>{Number(contract.outstandingAmount ?? 0) > 0 ? `Осталось ${money(contract.outstandingAmount ?? 0, contract.currency)}` : "Оплачено"}</span></span>
    <ChevronRightIcon className="h-5 w-5 text-slate-300" />
  </button>
);

export default ContractsPage;
