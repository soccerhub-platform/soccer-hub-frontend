import React, { useCallback, useEffect, useState } from "react";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PlusIcon,
  UserCircleIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ModalShell,
  PageShell,
  SectionCard,
  WorkspaceBreadcrumbs,
  WorkspaceHeader,
  WorkspaceMetric,
  WorkspaceTabs,
  formControlClassName,
} from "../../../shared/ui";
import { ContractsApi } from "./contracts.api";
import type {
  CancelReasonCode,
  ContractDetails,
  ContractPaymentItem,
  ContractStatus,
  PaymentMethod,
} from "./contracts.types";

const sections = [
  { key: "overview", label: "Обзор" },
  { key: "payments", label: "Платежи" },
  { key: "history", label: "Изменения" },
] as const;

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: "Черновик",
  UPCOMING: "Ожидает начала",
  ACTIVE: "Активный",
  EXPIRED: "Завершён",
  CANCELLED: "Отменён",
};

const money = (value?: number | null, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value ?? 0))} ${currency}`;
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) : "Без срока";
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

const ContractDetailsPage: React.FC = () => {
  const { contractId, section } = useParams<{ contractId: string; section: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [payments, setPayments] = useState<ContractPaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const activeSection = sections.some((item) => item.key === section) ? section : null;
  const drawer = searchParams.get("drawer");

  const load = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    setError(null);
    try {
      const details = await ContractsApi.getById(contractId);
      setContract(details);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось загрузить договор"));
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const loadPayments = useCallback(async () => {
    if (!contractId) return;
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      setPayments(await ContractsApi.listPayments(contractId));
    } catch (reason) {
      setPaymentsError(getApiErrorMessage(reason, "Не удалось загрузить платежи"));
    } finally {
      setPaymentsLoading(false);
    }
  }, [contractId]);

  useEffect(() => { void load(); void loadPayments(); }, [load, loadPayments]);

  const setDrawer = (value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("drawer", value); else next.delete("drawer");
    setSearchParams(next);
  };

  const activate = async () => {
    if (!contractId) return;
    setActing(true);
    try {
      setContract(await ContractsApi.activate(contractId));
      toast.success("Договор активирован");
    } catch (reason) {
      toast.error(getApiErrorMessage(reason, "Не удалось активировать договор"));
    } finally {
      setActing(false);
    }
  };

  if (section && !activeSection) return <Navigate to={`/admin/contracts/${contractId}/overview`} replace />;
  if (loading) return <PageShell><LoadingState label="Загрузка договора..." /></PageShell>;
  if (error || !contract) return <PageShell><ErrorState title="Договор недоступен" message={error || "Договор не найден"} onRetry={() => void load()} /></PageShell>;

  const paidPercent = contract.amount > 0 ? Math.min(100, Math.round((Number(contract.paidAmount ?? 0) / contract.amount) * 100)) : 0;

  return (
    <PageShell className="space-y-4">
      <WorkspaceBreadcrumbs items={[{ label: "Договоры", to: "/admin/contracts" }, { label: contract.contractNumber }]} />
      <WorkspaceHeader
        actions={
          <>
            {contract.capabilities.canActivate ? <Button rounded="rounded-lg" isLoading={acting} onClick={() => void activate()}><CheckCircleIcon className="h-4 w-4" /> Активировать</Button> : null}
            {contract.capabilities.canAddPayment ? <Button rounded="rounded-lg" onClick={() => setDrawer("payment")}><BanknotesIcon className="h-4 w-4" /> Добавить оплату</Button> : null}
            {contract.capabilities.canEdit ? <Button variant="secondary" rounded="rounded-lg" onClick={() => setDrawer("edit")}><PencilSquareIcon className="h-4 w-4" /> Редактировать</Button> : null}
            {contract.capabilities.canExtend ? <Button variant="secondary" rounded="rounded-lg" onClick={() => setDrawer("extend")}><CalendarDaysIcon className="h-4 w-4" /> Продлить</Button> : null}
            {contract.capabilities.canCancel ? <Button variant="softDanger" rounded="rounded-lg" onClick={() => setDrawer("cancel")}><XCircleIcon className="h-4 w-4" /> Отменить</Button> : null}
          </>
        }
      >
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-admin-50 text-admin-700"><DocumentTextIcon className="h-7 w-7" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="heading-font truncate text-2xl font-semibold text-slate-950">Договор {contract.contractNumber}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[contract.status]}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{contract.primaryContact.fullName} оплачивает обучение для {contract.participant.fullName}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>{date(contract.startDate)} — {date(contract.endDate)}</span><span>{money(contract.amount, contract.currency)}</span></div>
          </div>
        </div>
      </WorkspaceHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceMetric icon={<BanknotesIcon />} label="Стоимость" value={money(contract.amount, contract.currency)} note={contract.paymentStatus === "PAID" ? "Оплачено полностью" : "По условиям договора"} />
        <WorkspaceMetric icon={<CheckCircleIcon />} label="Оплачено" value={money(contract.paidAmount, contract.currency)} progress={paidPercent} note={`${paidPercent}% от суммы`} />
        <WorkspaceMetric icon={<BanknotesIcon />} label="Остаток" value={money(contract.outstandingAmount, contract.currency)} note={Number(contract.outstandingAmount ?? 0) > 0 ? "Требует оплаты" : "Задолженности нет"} />
        <WorkspaceMetric icon={<CalendarDaysIcon />} label="Период" value={date(contract.endDate)} note={`Начало: ${date(contract.startDate)}`} />
      </div>

      <WorkspaceTabs items={sections.map((item) => ({ ...item, to: `/admin/contracts/${contract.id}/${item.key}` }))} />

      {activeSection === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
          <div className="space-y-4">
            <SectionCard title="Стороны договора">
              <div className="grid gap-3 sm:grid-cols-2">
                <Party label="Клиент · сторона договора" name={contract.primaryContact.fullName} meta={contract.primaryContact.phone || contract.primaryContact.email || "Контакты не указаны"} onOpen={() => navigate(`/admin/clients/${contract.primaryContact.id}/overview`)} />
                <Party label="Ученик · получатель услуги" name={contract.participant.fullName} meta={contract.participant.birthDate ? `Дата рождения: ${date(contract.participant.birthDate)}` : "Дата рождения не указана"} onOpen={() => navigate(`/admin/students/${contract.participant.id}/overview`)} />
              </div>
            </SectionCard>
            <SectionCard title="Условия">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Definition label="Период" value={`${date(contract.startDate)} — ${date(contract.endDate)}`} />
                <Definition label="Стоимость" value={money(contract.amount, contract.currency)} />
                <Definition label="Номер" value={contract.contractNumber} />
                <Definition label="Комментарий" value={contract.notes || "Нет комментария"} />
              </dl>
            </SectionCard>
          </div>
          <div className="space-y-4">
            <SectionCard title="Зачисление">
              <div>
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-50 text-admin-700"><UserGroupIcon className="h-5 w-5" /></span><div className="text-sm font-semibold text-slate-950">Группы и история участия</div></div>
                {contract.capabilities.canEnrollStudent ? <Button className="mt-4" variant="secondary" rounded="rounded-lg" onClick={() => navigate(`/admin/students/${contract.participant.id}/groups`)}>Открыть группы ученика</Button> : null}
              </div>
            </SectionCard>
            <SectionCard title="Следующий шаг">
              <div className="text-sm text-slate-700">{contract.status === "DRAFT" ? "Проверьте условия и активируйте договор." : Number(contract.outstandingAmount ?? 0) > 0 ? "Зафиксируйте оплату клиента." : "Договор оплачен. Проверьте актуальность зачисления ученика."}</div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {activeSection === "payments" ? (
        <SectionCard title="Платежи" description="Проведённые операции не редактируются; исправления оформляются отменой или новой операцией.">
          {paymentsLoading ? <LoadingState label="Загрузка платежей..." /> : paymentsError ? <ErrorState title="Платежи недоступны" message={paymentsError} onRetry={() => void loadPayments()} /> : payments.length ? <div className="divide-y divide-slate-100">{payments.map((payment) => <div key={payment.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_160px_160px] sm:items-center"><div><div className="text-sm font-semibold text-slate-950">{money(payment.amount, payment.currency)}</div><div className="mt-1 text-xs text-slate-500">{payment.comment || "Без комментария"}</div></div><div className="text-sm text-slate-700">{payment.method}</div><div className="text-sm text-slate-500">{dateTime(payment.paidAt)}</div></div>)}</div> : <EmptyState title="Платежей пока нет" description="Добавьте первую оплату из действий договора." />}
        </SectionCard>
      ) : null}

      {activeSection === "history" ? (
        <SectionCard title="История изменений">
          {contract.history.length ? <div className="divide-y divide-slate-100">{contract.history.map((item) => <div key={item.id} className="flex gap-4 py-4"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-admin-600" /><div><div className="text-sm font-semibold text-slate-900">{item.type}</div><div className="mt-1 text-xs text-slate-500">{item.actorName} · {dateTime(item.createdAt)}</div>{item.comment ? <div className="mt-2 text-sm text-slate-700">{item.comment}</div> : null}</div></div>)}</div> : <EmptyState title="Изменений пока нет" />}
        </SectionCard>
      ) : null}

      {drawer === "edit" ? <TermsDrawer contract={contract} mode="edit" onClose={() => setDrawer()} onSaved={(value) => { setContract(value); setDrawer(); toast.success("Черновик обновлён"); }} /> : null}
      {drawer === "extend" ? <TermsDrawer contract={contract} mode="extend" onClose={() => setDrawer()} onSaved={(value) => { setContract(value); setDrawer(); toast.success("Договор продлён"); }} /> : null}
      {drawer === "cancel" ? <CancelDrawer contract={contract} onClose={() => setDrawer()} onSaved={(value) => { setContract(value); setDrawer(); toast.success("Договор отменён"); }} /> : null}
      {drawer === "payment" ? <PaymentDrawer contract={contract} onClose={() => setDrawer()} onSaved={() => { setDrawer(); toast.success("Оплата добавлена"); void load(); void loadPayments(); }} /> : null}
    </PageShell>
  );
};

const Party: React.FC<{ label: string; name: string; meta: string; onOpen: () => void }> = ({ label, name, meta, onOpen }) => (
  <button type="button" onClick={onOpen} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-admin-200">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><UserCircleIcon className="h-5 w-5" /></span>
    <span className="min-w-0"><span className="block text-xs font-semibold uppercase text-slate-500">{label}</span><span className="mt-1 block truncate text-sm font-semibold text-slate-950">{name}</span><span className="mt-1 block truncate text-xs text-slate-500">{meta}</span></span>
  </button>
);
const Definition: React.FC<{ label: string; value: string }> = ({ label, value }) => <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div>;

const TermsDrawer: React.FC<{ contract: ContractDetails; mode: "edit" | "extend"; onClose: () => void; onSaved: (contract: ContractDetails) => void }> = ({ contract, mode, onClose, onSaved }) => {
  const [startDate, setStartDate] = useState(contract.startDate);
  const [endDate, setEndDate] = useState(contract.endDate ?? "");
  const [amount, setAmount] = useState(String(contract.amount));
  const [notes, setNotes] = useState(contract.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (mode === "extend" && !endDate) {
      setError("Укажите новую дату окончания");
      return;
    }
    setSaving(true); setError(null);
    try {
      const value = mode === "edit"
        ? await ContractsApi.update(contract.id, { startDate, endDate: endDate || undefined, amount: Number(amount), currency: contract.currency, notes: notes || undefined })
        : await ContractsApi.extend(contract.id, { endDate, amount: Number(amount), notes: notes || undefined });
      onSaved(value);
    } catch (reason) { setError(getApiErrorMessage(reason, "Не удалось сохранить изменения")); } finally { setSaving(false); }
  };
  return <ModalShell title={mode === "edit" ? "Редактировать черновик" : "Продлить договор"} placement="right" maxWidthClassName="max-w-lg" onClose={onClose} closeDisabled={saving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-lg" onClick={onClose}>Отмена</Button><Button rounded="rounded-lg" isLoading={saving} onClick={() => void submit()}>Сохранить</Button></div>}><div className="space-y-4">{mode === "edit" ? <label className="block"><span className="mb-1.5 block text-sm font-medium">Начало</span><input type="date" className={formControlClassName} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label> : null}<label className="block"><span className="mb-1.5 block text-sm font-medium">Окончание</span><input type="date" min={startDate} className={formControlClassName} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Стоимость</span><input className={formControlClassName} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Комментарий</span><textarea className={`${formControlClassName} min-h-24`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>{error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}</div></ModalShell>;
};

const CancelDrawer: React.FC<{ contract: ContractDetails; onClose: () => void; onSaved: (contract: ContractDetails) => void }> = ({ contract, onClose, onSaved }) => {
  const [reasonCode, setReasonCode] = useState<CancelReasonCode>("CLIENT_REQUEST");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => { setSaving(true); try { onSaved(await ContractsApi.cancel(contract.id, { reasonCode, comment: comment || undefined })); } catch (reason) { toast.error(getApiErrorMessage(reason, "Не удалось отменить договор")); } finally { setSaving(false); } };
  return <ModalShell title="Отменить договор" description="Зачисление ученика не изменится автоматически." placement="right" maxWidthClassName="max-w-lg" onClose={onClose} closeDisabled={saving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-lg" onClick={onClose}>Назад</Button><Button variant="danger" rounded="rounded-lg" isLoading={saving} onClick={() => void submit()}>Отменить договор</Button></div>}><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium">Причина</span><select className={formControlClassName} value={reasonCode} onChange={(event) => setReasonCode(event.target.value as CancelReasonCode)}><option value="CLIENT_REQUEST">Запрос клиента</option><option value="PAYMENT_ISSUE">Проблема с оплатой</option><option value="SCHEDULE_CONFLICT">Не подходит расписание</option><option value="MEDICAL">Медицинская причина</option><option value="OTHER">Другое</option></select></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Комментарий</span><textarea className={`${formControlClassName} min-h-24`} value={comment} onChange={(event) => setComment(event.target.value)} /></label></div></ModalShell>;
};

const PaymentDrawer: React.FC<{ contract: ContractDetails; onClose: () => void; onSaved: () => void }> = ({ contract, onClose, onSaved }) => {
  const [amount, setAmount] = useState(String(Math.max(Number(contract.outstandingAmount ?? 0), 0)));
  const [method, setMethod] = useState<PaymentMethod>("KASPI");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => { setSaving(true); try { await ContractsApi.createPayment({ contractId: contract.id, amount: Number(amount), currency: contract.currency, method, paidAt, comment: comment || undefined }); onSaved(); } catch (reason) { toast.error(getApiErrorMessage(reason, "Не удалось добавить оплату")); } finally { setSaving(false); } };
  return <ModalShell title="Добавить оплату" description={contract.contractNumber} placement="right" maxWidthClassName="max-w-lg" onClose={onClose} closeDisabled={saving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-lg" onClick={onClose}>Отмена</Button><Button rounded="rounded-lg" isLoading={saving} onClick={() => void submit()}><PlusIcon className="h-4 w-4" /> Добавить</Button></div>}><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium">Сумма</span><input className={formControlClassName} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Способ</span><select className={formControlClassName} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}><option value="KASPI">Kaspi</option><option value="CASH">Наличные</option><option value="CARD">Карта</option><option value="BANK_TRANSFER">Банковский перевод</option><option value="OTHER">Другое</option></select></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Дата и время</span><input type="datetime-local" className={formControlClassName} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Комментарий</span><textarea className={`${formControlClassName} min-h-24`} value={comment} onChange={(event) => setComment(event.target.value)} /></label></div></ModalShell>;
};

export default ContractDetailsPage;
