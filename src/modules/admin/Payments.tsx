import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  CreditCard,
  TriangleAlert,
  Eye,
  Ban,
  CircleUserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../shared/api";
import {
  Input,
  Textarea,
  NativeSelect,
  Button,
  Badge,
  DatePicker,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  ModalShell,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
    case "GOVERNMENT":
      return "Государственная оплата";
    case "OTHER":
      return "Другое";
    default:
      return method;
  }
};

const paymentStatusLabel = (status: PaymentStatus) => (status === "CANCELLED" ? "Отменен" : "Зафиксирован");

const paymentMethodVariant = (method: PaymentMethod): "default" | "warning" | "secondary" => {
  switch (method) {
    case "KASPI":
      return "default";
    case "CASH":
      return "warning";
    default:
      return "secondary";
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
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard title="Всего" value={summary.total} icon={<CreditCard />} tone="info" />
        <MetricCard title="Активны" value={summary.active} icon={<CreditCard />} tone="success" />
        <MetricCard title="Отменены" value={summary.cancelled} icon={<Ban />} tone="danger" />
        <MetricCard title="Сумма" value={formatAmount(summary.amount)} icon={<CreditCard />} tone="info" />
      </div>

      <SectionCard
        title="Фильтры"
        description="Поиск по договору, клиенту, игроку, идентификатору платежа или комментарию. Дополнительно можно сузить по статусу, методу и диапазону дат."
        icon={<CreditCard className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Номер договора, клиент, игрок, идентификатор платежа, комментарий"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-hidden transition focus:border-admin-600 focus:ring-4 focus:ring-blue-100"
          />
          <NativeSelect
            value={statusFilter}
            aria-label="Статус платежа"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-hidden transition focus:border-admin-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Все статусы</option>
            <option value="PAID">Зафиксирован</option>
            <option value="CANCELLED">Отменен</option>
          </NativeSelect>
          <NativeSelect
            value={methodFilter}
            aria-label="Способ оплаты"
            onChange={(event) => setMethodFilter(event.target.value as MethodFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-hidden transition focus:border-admin-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Все методы</option>
            <option value="KASPI">Kaspi</option>
            <option value="CARD">Карта</option>
            <option value="BANK_TRANSFER">Перевод</option>
            <option value="CASH">Наличные</option>
            <option value="GOVERNMENT">Государственная оплата</option>
            <option value="OTHER">Другое</option>
          </NativeSelect>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-medium text-slate-500">
              <span>С даты</span>
              <DatePicker value={paidFrom} onValueChange={setPaidFrom} clearable placeholder="Любая дата" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-500">
              <span>По дату</span>
              <DatePicker value={paidTo} min={paidFrom || undefined} onValueChange={setPaidTo} clearable placeholder="Любая дата" />
            </label>
          </div>
        </div>

      </SectionCard>

      <SectionCard
        title="Журнал платежей"
        description="Список ручных оплат с быстрым переходом в договор и отменой записи."
        icon={<CreditCard className="h-4 w-4" />}
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
          <Table className="min-w-[1080px]">
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Плательщик</TableHead><TableHead>Договор</TableHead><TableHead>Сумма</TableHead><TableHead>Дата</TableHead><TableHead>Зафиксировал</TableHead><TableHead>Действия</TableHead></TableRow></TableHeader>
            <TableBody>
            {payments.map((payment) => (
              <TableRow
                key={payment.id}
                className={payment.status === "CANCELLED" ? "bg-rose-50/60" : ""}
              >
                <TableCell><div className="min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="font-semibold text-slate-900">
                        {payment.playerName || payment.clientName || "Платеж"}
                      </div>
                      <StatusBadge tone={payment.status === "CANCELLED" ? "danger" : "success"}>
                        {paymentStatusLabel(payment.status)}
                      </StatusBadge>
                      <Badge variant={paymentMethodVariant(payment.method)}>
                        {paymentMethodLabel(payment.method)}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                      <div>
                        Договор: <span className="font-medium text-slate-900">{payment.contractNumber || payment.contractId}</span>
                      </div>
                      <div>
                        Клиент: <span className="font-medium text-slate-900">{payment.clientName || "Не указан"}</span>
                      </div>
                    </div>
                  </div></TableCell>
                <TableCell><div className="text-sm"><div className="font-medium text-slate-900">{payment.contractNumber || payment.contractId}</div><div className="mt-1 text-xs text-slate-500">{payment.clientName || "Не указан"}</div></div></TableCell>
                <TableCell><div className="font-semibold text-slate-900">{formatAmount(payment.amount, payment.currency)}</div><div className="mt-1 text-xs text-slate-500">{payment.comment || payment.externalReference || "Без комментария"}</div></TableCell>
                <TableCell><div className="text-sm text-slate-700">{formatDateTime(payment.paidAt)}</div>{payment.status === "CANCELLED" && (payment.cancelReason || payment.cancelComment) ? <div className="mt-1 text-xs text-rose-700">Платеж отменен</div> : null}</TableCell>
                <TableCell className="text-sm text-slate-600">{payment.recordedByName || payment.recordedBy || "Система"}</TableCell>
                <TableCell><div className="flex flex-wrap gap-2">
                  <ActionButton
                    icon={<Eye className="h-4 w-4" />}
                    label="Открыть"
                    onClick={() => void openPayment(payment.id)}
                  />
                  <ActionButton
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Договор"
                    onClick={() =>
                      navigate(`/admin/contracts/${encodeURIComponent(payment.contractId)}/payments`)
                    }
                  />
                  {payment.playerId ? (
                    <ActionButton
                      icon={<CircleUserRound className="h-4 w-4" />}
                      label="Ученик"
                      onClick={() => navigate(`/admin/students/${encodeURIComponent(payment.playerId!)}/overview`)}
                    />
                  ) : null}
                  {payment.status !== "CANCELLED" ? (
                    <ActionButton
                      icon={<Ban className="h-4 w-4" />}
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
                </div></TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
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
    <div className="mt-1 ui-section-title break-all">{value}</div>
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
            <CircleUserRound className="h-4 w-4" />
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
          <div className="ui-section-title">Комментарий и чек</div>
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
              <TriangleAlert className="h-5 w-5" />
              <div className="text-sm font-semibold">Отмена платежа</div>
            </div>
            <div className="mt-3 space-y-3">
              <Input
                type="text"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Причина отмены"
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm outline-hidden transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              />
              <Textarea
                value={cancelComment}
                onChange={(event) => setCancelComment(event.target.value)}
                rows={4}
                placeholder="Комментарий"
                className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm outline-hidden transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
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
