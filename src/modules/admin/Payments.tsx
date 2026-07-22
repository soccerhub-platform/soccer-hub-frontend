import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  NoSymbolIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../shared/api";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ModalShell,
  PageHeader,
  PageShell,
  SectionCard,
} from "../../shared/ui";
import { useAuth } from "../../shared/AuthContext";
import { useAdminBranch } from "./BranchContext";
import { ContractsApi } from "./contracts/contracts.api";
import type {
  ContractPaymentItem,
  PaymentMethod,
  PaymentStatus,
} from "./contracts/contracts.types";

const formatAmount = (value: number, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU").format(value)} ${currency}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const paymentMethodLabel = (method: PaymentMethod) => {
  switch (method) {
    case "CASH":
      return "Наличные";
    case "CARD":
      return "Карта";
    case "BANK_TRANSFER":
      return "Перевод";
    case "KASPI":
      return "Kaspi";
    case "OTHER":
      return "Другое";
    default:
      return method;
  }
};

const paymentStatusLabel = (status: PaymentStatus) => (status === "CANCELLED" ? "Отменен" : "Зафиксирован");

const paymentStatusBadgeClassName = (status: PaymentStatus) =>
  status === "CANCELLED"
    ? "border-rose-100 bg-rose-50 text-rose-700"
    : "border-emerald-100 bg-emerald-50 text-emerald-800";

const paymentMethodToneClassName = (method: PaymentMethod) => {
  switch (method) {
    case "KASPI":
      return "border-cyan-100 bg-cyan-50 text-cyan-800";
    case "CASH":
      return "border-amber-100 bg-amber-50 text-amber-800";
    case "CARD":
      return "border-violet-100 bg-violet-50 text-violet-800";
    case "BANK_TRANSFER":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

type StatusFilter = PaymentStatus | "all";
type MethodFilter = PaymentMethod | "all";

const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const { branchId, branchName } = useAdminBranch();

  const [payments, setPayments] = useState<ContractPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<ContractPaymentItem | null>(null);
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelComment, setCancelComment] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadPayments = async (mode: "initial" | "refresh" = "initial") => {
    if (!token || !branchId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const response = await ContractsApi.listAdminPayments(
        {
          branchId,
          search: debouncedSearch || undefined,
          status: statusFilter,
          method: methodFilter,
          paidFrom: paidFrom || undefined,
          paidTo: paidTo || undefined,
          size: 200,
          sort: "paidAt,desc",
        },
        token
      );
      setPayments(response.content ?? []);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось загрузить платежи"));
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, [token, branchId, debouncedSearch, statusFilter, methodFilter, paidFrom, paidTo]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const summary = useMemo(() => {
    const active = payments.filter((payment) => payment.status !== "CANCELLED");
    return {
      total: payments.length,
      active: active.length,
      cancelled: payments.length - active.length,
      amount: active.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0),
    };
  }, [payments]);

  const openPayment = async (paymentId: string) => {
    if (!token) return;
    setPaymentDetailsLoading(true);
    setModalError(null);
    try {
      const payment = await ContractsApi.getAdminPayment(paymentId, token);
      setSelectedPayment(payment);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Не удалось открыть платеж"));
    } finally {
      setPaymentDetailsLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!token || !selectedPayment) return;
    if (!cancelReason.trim()) {
      setModalError("Укажите причину отмены");
      return;
    }
    setSubmitLoading(true);
    setModalError(null);
    try {
      await ContractsApi.cancelPayment(
        selectedPayment.id,
        {
          reason: cancelReason.trim(),
          comment: cancelComment.trim() || undefined,
        },
        token
      );
      toast.success("Платеж отменен");
      setSelectedPayment(null);
      setCancelReason("");
      setCancelComment("");
      await loadPayments("refresh");
    } catch (err) {
      console.error(err);
      setModalError(getApiErrorMessage(err, "Не удалось отменить платеж"));
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Платежи"
        description={`Журнал оплат по договорам${branchName ? ` филиала ${branchName}` : ""}. Создание платежей выполняется из карточки договора.`}
        actions={
          <Button type="button" variant="secondary" onClick={() => void loadPayments("refresh")} isLoading={refreshing}>
            <ArrowPathIcon className="h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Всего" value={summary.total} />
        <MetricCard label="Активны" value={summary.active} tone="success" />
        <MetricCard label="Отменены" value={summary.cancelled} tone="danger" />
        <MetricCard label="Сумма" value={formatAmount(summary.amount)} tone="info" />
      </div>

      <SectionCard
        title="Фильтры"
        description="Поиск по договору, клиенту, игроку, идентификатору платежа или комментарию. Дополнительно можно сузить по статусу, методу и диапазону дат."
        icon={<CreditCardIcon className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Номер договора, клиент, игрок, идентификатор платежа, комментарий"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">Все статусы</option>
            <option value="PAID">Зафиксирован</option>
            <option value="CANCELLED">Отменен</option>
          </select>
          <select
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value as MethodFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">Все методы</option>
            <option value="KASPI">Kaspi</option>
            <option value="CARD">Карта</option>
            <option value="BANK_TRANSFER">Перевод</option>
            <option value="CASH">Наличные</option>
            <option value="OTHER">Другое</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-medium text-slate-500">
              <span>С даты</span>
              <input
                type="date"
                value={paidFrom}
                onChange={(event) => setPaidFrom(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-500">
              <span>По дату</span>
              <input
                type="date"
                value={paidTo}
                onChange={(event) => setPaidTo(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
          </div>
        </div>

      </SectionCard>

      <SectionCard
        title="Журнал платежей"
        description="Список ручных оплат с быстрым переходом в договор и отменой записи."
        icon={<CreditCardIcon className="h-4 w-4" />}
      >
        {error ? (
          <ErrorState message={error} onRetry={() => void loadPayments("refresh")} />
        ) : loading ? (
          <LoadingState label="Загрузка платежей..." />
        ) : payments.length === 0 ? (
          <EmptyState
            title="Платежи не найдены"
            description="Измените фильтры или откройте карточку договора, чтобы зафиксировать оплату."
          />
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <article
                key={payment.id}
                className={`rounded-2xl border px-4 py-4 shadow-sm transition ${
                  payment.status === "CANCELLED"
                    ? "border-rose-200 bg-rose-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="text-lg font-semibold text-slate-900">
                        {payment.playerName || payment.clientName || "Платеж"}
                      </div>
                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatusBadgeClassName(
                          payment.status
                        )}`}
                      >
                        {paymentStatusLabel(payment.status)}
                      </span>
                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentMethodToneClassName(
                          payment.method
                        )}`}
                      >
                        {paymentMethodLabel(payment.method)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                      <div>
                        Договор: <span className="font-medium text-slate-900">{payment.contractNumber || payment.contractId}</span>
                      </div>
                      <div>
                        Клиент: <span className="font-medium text-slate-900">{payment.clientName || "Не указан"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-left lg:text-right">
                    <div className="text-2xl font-semibold text-slate-900">{formatAmount(payment.amount, payment.currency)}</div>
                    <div className="mt-1 text-sm text-slate-500">{formatDateTime(payment.paidAt)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                  <div>Зафиксировал: {payment.recordedByName || payment.recordedBy || "Система"}</div>
                  {payment.externalReference ? <div>Идентификатор платежа: {payment.externalReference}</div> : null}
                  {payment.comment ? <div>Комментарий: {payment.comment}</div> : null}
                </div>

                {payment.status === "CANCELLED" && (payment.cancelReason || payment.cancelComment) ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-3 text-sm text-rose-700">
                    <div className="font-medium">Платеж отменен</div>
                    {payment.cancelReason ? <div className="mt-1">Причина: {payment.cancelReason}</div> : null}
                    {payment.cancelComment ? <div className="mt-1">{payment.cancelComment}</div> : null}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    icon={<EyeIcon className="h-4 w-4" />}
                    label="Открыть"
                    onClick={() => void openPayment(payment.id)}
                  />
                  <ActionButton
                    icon={<CreditCardIcon className="h-4 w-4" />}
                    label="Договор"
                    onClick={() =>
                      navigate(`/admin/contracts/${encodeURIComponent(payment.contractId)}/payments`)
                    }
                  />
                  {payment.playerId ? (
                    <ActionButton
                      icon={<UserCircleIcon className="h-4 w-4" />}
                      label="Ученик"
                      onClick={() => navigate(`/admin/students/${encodeURIComponent(payment.playerId!)}/overview`)}
                    />
                  ) : null}
                  {payment.status !== "CANCELLED" ? (
                    <ActionButton
                      icon={<NoSymbolIcon className="h-4 w-4" />}
                      label="Отменить"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setCancelReason("");
                        setCancelComment("");
                        setModalError(null);
                      }}
                      danger
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {selectedPayment ? (
        <PaymentDetailsModal
          payment={selectedPayment}
          contractLabel={selectedPayment.contractNumber || selectedPayment.contractId}
          loading={paymentDetailsLoading}
          cancelReason={cancelReason}
          cancelComment={cancelComment}
          setCancelReason={setCancelReason}
          setCancelComment={setCancelComment}
          submitLoading={submitLoading}
          modalError={modalError}
          onOpenStudent={
            selectedPayment.playerId
              ? () => navigate(`/admin/students/${encodeURIComponent(selectedPayment.playerId!)}/overview`)
              : undefined
          }
          onClose={() => {
            setSelectedPayment(null);
            setCancelReason("");
            setCancelComment("");
            setModalError(null);
          }}
          onCancelPayment={selectedPayment.status !== "CANCELLED" ? () => void handleCancelPayment() : undefined}
        />
      ) : null}
    </PageShell>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "danger" | "info";
}> = ({ label, value, tone = "neutral" }) => {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
      ? "text-rose-700"
      : tone === "info"
      ? "text-cyan-700"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
      danger
        ? "border-rose-200 text-rose-700 hover:bg-rose-50"
        : "border-slate-200 text-slate-700 hover:bg-slate-100"
    }`}
  >
    {icon}
    {label}
  </button>
);

const DetailBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-900 break-all">{value}</div>
  </div>
);

const PaymentDetailsModal: React.FC<{
  payment: ContractPaymentItem;
  contractLabel: string;
  loading: boolean;
  cancelReason: string;
  cancelComment: string;
  setCancelReason: (value: string) => void;
  setCancelComment: (value: string) => void;
  submitLoading: boolean;
  modalError: string | null;
  onOpenStudent?: () => void;
  onClose: () => void;
  onCancelPayment?: () => void;
}> = ({
  payment,
  contractLabel,
  loading,
  cancelReason,
  cancelComment,
  setCancelReason,
  setCancelComment,
  submitLoading,
  modalError,
  onOpenStudent,
  onClose,
  onCancelPayment,
}) => (
  <ModalShell
    title="Детали платежа"
    description="Просмотр записи оплаты и, при необходимости, отмена без удаления из истории."
    eyebrow="Платеж"
    onClose={onClose}
    maxWidthClassName="max-w-2xl"
    footer={
      <div className="flex flex-wrap items-center justify-end gap-3">
        {onOpenStudent ? (
          <Button type="button" variant="secondary" onClick={onOpenStudent}>
            <UserCircleIcon className="h-4 w-4" />
            Открыть ученика
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
        {onCancelPayment ? (
          <Button type="button" variant="danger" onClick={onCancelPayment} isLoading={submitLoading}>
            Отменить платеж
          </Button>
        ) : null}
      </div>
    }
  >
    {loading ? (
      <LoadingState label="Загрузка платежа..." />
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailBlock label="Игрок" value={payment.playerName || "Не указан"} />
          <DetailBlock label="Клиент" value={payment.clientName || "Не указан"} />
          <DetailBlock label="Договор" value={contractLabel} />
          <DetailBlock label="Сумма" value={formatAmount(payment.amount, payment.currency)} />
          <DetailBlock label="Метод" value={paymentMethodLabel(payment.method)} />
          <DetailBlock label="Дата оплаты" value={formatDateTime(payment.paidAt)} />
          <DetailBlock label="Статус" value={paymentStatusLabel(payment.status)} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Комментарий и чек</div>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div>Номер чека / перевода: {payment.externalReference || "—"}</div>
            <div>Комментарий: {payment.comment || "—"}</div>
            <div>Зафиксировал: {payment.recordedByName || payment.recordedBy || "Система"}</div>
            <div className="text-xs text-slate-400">Служебный ID: {payment.id}</div>
          </div>
        </div>

        {payment.status !== "CANCELLED" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-rose-700">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <div className="text-sm font-semibold">Отмена платежа</div>
            </div>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Причина отмены"
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              />
              <textarea
                value={cancelComment}
                onChange={(event) => setCancelComment(event.target.value)}
                rows={4}
                placeholder="Комментарий"
                className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Платеж уже отменен.
            {payment.cancelReason ? ` Причина: ${payment.cancelReason}.` : ""}
            {payment.cancelComment ? ` Комментарий: ${payment.cancelComment}.` : ""}
          </div>
        )}

        {modalError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {modalError}
          </div>
        ) : null}
      </div>
    )}
  </ModalShell>
);

export default PaymentsPage;
