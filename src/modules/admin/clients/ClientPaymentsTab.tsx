import React, { useEffect, useMemo, useState } from "react";
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, formControlClassName } from "../../../shared/ui";
import { ContractsApi } from "../contracts/contracts.api";
import type { ContractListItem, ContractPaymentItem } from "../contracts/contracts.types";

const amount = (value: number, currency = "KZT") => `${new Intl.NumberFormat("ru-RU").format(Number(value ?? 0))} ${currency}`;
const dateTime = (value: string) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const methodLabels = { CASH: "Наличные", CARD: "Карта", BANK_TRANSFER: "Перевод", KASPI: "Kaspi", OTHER: "Другое" } as const;

const ClientPaymentsTab: React.FC<{ clientId: string; clientName: string; branchId: string }> = ({ clientId, clientName, branchId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContractPaymentItem[]>([]);
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      ContractsApi.listAdminPayments({ branchId, clientId, page: 0, size: 100, sort: "paidAt,desc" }, ""),
      ContractsApi.list({ branchId, clientId, status: "ACTIVE", page: 0, size: 100 }, ""),
    ])
      .then(([paymentsResponse, contractsResponse]) => {
        if (!active) return;
        const activeContracts = contractsResponse.content ?? [];
        setItems(paymentsResponse.content ?? []);
        setContracts(activeContracts);
        setSelectedContractId((current) => current || activeContracts[0]?.id || "");
      })
      .catch((reason) => active && setError(getApiErrorMessage(reason, "Не удалось загрузить платежи клиента")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [branchId, clientId]);
  const paid = useMemo(() => items.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + Number(item.amount ?? 0), 0), [items]);
  const openPayment = () => {
    if (!selectedContractId) return;
    const params = new URLSearchParams({
      contractId: selectedContractId,
      mode: "view",
      payment: "create",
      returnTo: `/admin/clients/${clientId}/payments`,
    });
    navigate(`/admin/contracts?${params.toString()}`);
  };

  if (loading) return <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />;
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><ExclamationTriangleIcon className="mb-2 h-5 w-5" />{error}</div>;
  const paymentAction = contracts.length ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end"><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">Договор · ученик</span><select value={selectedContractId} onChange={(event) => setSelectedContractId(event.target.value)} className={`${formControlClassName} min-w-56`}><option value="">Выберите договор</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contractNumber} · {contract.participant.fullName}</option>)}</select></label><Button onClick={openPayment} disabled={!selectedContractId}><PlusIcon className="h-4 w-4" /> Добавить платёж</Button></div> : <Button variant="secondary" onClick={() => navigate(`/admin/clients/${clientId}/contracts`)}>Открыть договоры</Button>;

  return <div className="space-y-3"><div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-semibold uppercase text-emerald-700">Плательщик · {clientName}</div><div className="mt-2 text-xs text-slate-500">Всего зафиксировано</div><div className="mt-1 text-xl font-semibold text-slate-950">{amount(paid, items.find((item) => item.status !== "CANCELLED")?.currency ?? "KZT")}</div>{!contracts.length ? <div className="mt-1 text-xs text-slate-500">Сначала нужен активный договор с выбранным учеником</div> : null}</div>{paymentAction}</div><div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">История платежей</h2><p className="mt-1 text-xs text-slate-500">Каждый платёж относится к договору и конкретному ученику.</p></div>{items.length ? <div className="divide-y divide-slate-100">{items.map((payment) => <div key={payment.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_140px_auto] md:items-center"><div><div className="text-sm font-semibold text-slate-950">{amount(payment.amount, payment.currency)}</div><div className="mt-1 text-xs text-slate-500">{dateTime(payment.paidAt)}</div></div><div className="min-w-0"><div className="text-[11px] font-semibold uppercase text-cyan-700">Ученик</div><div className="mt-1 truncate text-sm text-slate-800">{payment.playerName || "Не указан"}</div><div className="mt-1 truncate text-xs text-slate-500">Договор {payment.contractNumber || payment.contractId}</div></div><div><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{methodLabels[payment.method]}</span>{payment.status === "CANCELLED" ? <div className="mt-2 text-xs font-semibold text-rose-600">Отменён</div> : null}</div><Button size="sm" variant="secondary" rounded="rounded-lg" onClick={() => navigate(`/admin/contracts?contractId=${payment.contractId}&mode=view`)}><ArrowTopRightOnSquareIcon className="h-4 w-4" /></Button></div>)}</div> : <div className="p-5"><EmptyState title="Платежей пока нет" description="Первый платёж появится здесь после сохранения." /></div>}</div></div>;
};

export default ClientPaymentsTab;
