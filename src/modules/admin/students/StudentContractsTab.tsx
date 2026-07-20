import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../../shared/ui";
import { getApiErrorMessage, resolveApiUrl } from "../../../shared/api";
import { StudentApi } from "./student.api";
import type { AdminStudentContractsResponse } from "./student.types";
import type { ContractStatus } from "../contracts/contracts.types";

type ContractItem = AdminStudentContractsResponse["items"][number];

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: "Черновик",
  UPCOMING: "Предстоящий",
  ACTIVE: "Активный",
  EXPIRED: "Завершён",
  CANCELLED: "Отменён",
};

const paymentLabels = {
  PAID: "Оплачен",
  PARTIALLY_PAID: "Оплачен частично",
  UNPAID: "Не оплачен",
} as const;

const statusClasses: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  UPCOMING: "bg-sky-50 text-sky-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value)
  );
};

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "KZT",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const end = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59` : value);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
};

const getTermLabel = (item: ContractItem) => {
  const days = daysUntil(item.endDate);
  if (item.status === "CANCELLED") return "Договор отменён";
  if (item.status === "EXPIRED" || (days !== null && days < 0)) return "Срок завершён";
  if (days === null) return "Без даты окончания";
  if (days === 0) return "Заканчивается сегодня";
  if (days === 1) return "Остался 1 день";
  if (days < 5) return `Осталось ${days} дня`;
  return `Осталось ${days} дней`;
};

const GroupAvatar = ({ item }: { item: ContractItem }) => {
  const src = item.group?.avatar?.thumbUrl || item.group?.avatar?.mediumUrl;
  if (src) return <img src={resolveApiUrl(src)} alt="" className="h-9 w-9 rounded-md object-cover" />;
  return (
    <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
      {(item.group?.name || "Г").slice(0, 2).toUpperCase()}
    </span>
  );
};

const StudentContractsTab = ({ playerId }: { playerId: string }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminStudentContractsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    StudentApi.getContracts(playerId)
      .then((response) => active && setData(response))
      .catch((reason) => active && setError(getApiErrorMessage(reason, "Не удалось загрузить договоры ученика")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [playerId]);

  const current = data?.items.find((item) => item.current) ?? null;
  const history = useMemo(() => (data?.items ?? []).filter((item) => !item.current), [data]);

  const openContract = (contractId: string, mode = "view") =>
    navigate(`/admin/contracts?contractId=${encodeURIComponent(contractId)}&mode=${mode}`);

  const addPayment = (contractId: string) =>
    navigate(`/admin/contracts?contractId=${encodeURIComponent(contractId)}&mode=view&payment=create`);

  if (loading) {
    return <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-6 w-6 text-rose-600" />
        <div className="mt-3 text-sm font-semibold text-rose-900">{error}</div>
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <DocumentTextIcon className="mx-auto h-8 w-8 text-slate-400" />
        <div className="mt-3 text-sm font-semibold text-slate-900">У ученика пока нет договоров</div>
        <p className="mt-1 text-sm text-slate-500">Создание и оформление доступны в разделе договоров.</p>
        <Button rounded="rounded-md" className="mt-5" onClick={() => navigate("/admin/contracts")}>
          Открыть договоры <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const paidPercent = current?.amount ? Math.min(100, Math.round((current.paidAmount / current.amount) * 100)) : 0;
  const currentDaysLeft = current ? daysUntil(current.endDate) : null;
  const endingSoon = current?.status === "ACTIVE" && currentDaysLeft !== null && currentDaysLeft >= 0 && currentDaysLeft <= 30;
  const hasDebt = Boolean(current && current.outstandingAmount > 0);

  return (
    <div className="space-y-4">
      {current && (hasDebt || endingSoon) ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="text-sm font-semibold text-amber-950">Требует внимания</div>
              <div className="mt-0.5 text-sm text-amber-800">
                {hasDebt
                  ? `Осталось оплатить ${formatAmount(current.outstandingAmount, current.currency)}`
                  : getTermLabel(current)}
              </div>
            </div>
          </div>
          {hasDebt ? (
            <Button rounded="rounded-md" size="sm" onClick={() => addPayment(current.id)}>
              <BanknotesIcon className="h-4 w-4" /> Добавить оплату
            </Button>
          ) : (
            <Button rounded="rounded-md" size="sm" variant="secondary" onClick={() => openContract(current.id)}>
              Управлять договором <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : null}

      {current ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-950">Договор {current.contractNumber}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[current.status]}`}>
                  {statusLabels[current.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <span>{formatDate(current.startDate)} — {formatDate(current.endDate)}</span>
                {current.group ? (
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    <GroupAvatar item={current} /> {current.group.name}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                <FinancialValue label="Стоимость" value={formatAmount(current.amount, current.currency)} />
                <FinancialValue label="Оплачено" value={formatAmount(current.paidAmount, current.currency)} />
                <FinancialValue
                  label="Осталось"
                  value={formatAmount(current.outstandingAmount, current.currency)}
                  alert={current.outstandingAmount > 0}
                />
                <FinancialValue label="Последняя оплата" value={formatDate(current.lastPaidAt)} />
              </div>

              <div className="mt-5 max-w-2xl">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{current.paymentStatus ? paymentLabels[current.paymentStatus] : "Нет данных об оплате"}</span>
                  <span>{paidPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPercent}%` }} />
                </div>
              </div>
            </div>

            <aside className="border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="text-xs font-medium text-slate-500">Срок договора</div>
              <div className={`mt-1 text-lg font-semibold ${endingSoon ? "text-amber-800" : "text-slate-950"}`}>
                {getTermLabel(current)}
              </div>
              <div className="mt-1 text-xs text-slate-500">до {formatDate(current.endDate)}</div>
              <div className="mt-5 flex flex-col gap-2">
                {current.status === "ACTIVE" ? (
                  <Button rounded="rounded-md" onClick={() => addPayment(current.id)}>
                    <BanknotesIcon className="h-4 w-4" /> Добавить оплату
                  </Button>
                ) : null}
                <Button rounded="rounded-md" variant="secondary" onClick={() => openContract(current.id)}>
                  Открыть договор <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Button>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-6">
          <div className="text-sm font-semibold text-slate-950">Нет текущего договора</div>
          <p className="mt-1 text-sm text-slate-500">Все договоры ученика находятся в истории.</p>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">История договоров</h2>
          <p className="mt-1 text-xs text-slate-500">Предыдущие договоры и их финансовый результат</p>
        </div>
        {history.length ? (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openContract(item.id)}
                className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(180px,1.3fr)_minmax(160px,1fr)_minmax(170px,0.9fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{item.contractNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(item.startDate)} — {formatDate(item.endDate)}</div>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <GroupAvatar item={item} />
                  <span className="truncate text-sm text-slate-700">{item.group?.name || "Группа не указана"}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{formatAmount(item.amount, item.currency)}</div>
                  <div className={`mt-1 text-xs ${item.outstandingAmount > 0 ? "text-rose-600" : "text-slate-500"}`}>
                    {item.outstandingAmount > 0
                      ? `Не оплачено ${formatAmount(item.outstandingAmount, item.currency)}`
                      : item.paymentsCount > 0
                        ? `Оплат: ${item.paymentsCount}`
                        : "Оплат не было"}
                  </div>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[item.status]}`}>
                  {statusLabels[item.status]}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600" /> Предыдущих договоров нет
          </div>
        )}
      </section>
    </div>
  );
};

const FinancialValue = ({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) => (
  <div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`mt-1 text-base font-semibold ${alert ? "text-rose-700" : "text-slate-950"}`}>{value}</div>
  </div>
);

export default StudentContractsTab;
