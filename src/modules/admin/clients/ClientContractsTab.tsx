import React, { useEffect, useState } from "react";
import { ArrowTopRightOnSquareIcon, BanknotesIcon, DocumentTextIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState } from "../../../shared/ui";
import { ContractsApi } from "../contracts/contracts.api";
import type { ContractListItem, ContractStatus } from "../contracts/contracts.types";

const statusLabels: Record<ContractStatus, string> = { DRAFT: "Черновик", UPCOMING: "Предстоящий", ACTIVE: "Активный", EXPIRED: "Завершён", CANCELLED: "Отменён" };
const amount = (value?: number | null, currency = "KZT") => `${new Intl.NumberFormat("ru-RU").format(Number(value ?? 0))} ${currency}`;
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) : "Без срока";

interface ClientContractsTabProps {
  clientId: string;
  clientName: string;
  branchId: string;
  studentsCount: number;
  onAddStudent: () => void;
  onCreateContract: () => void;
}

const ClientContractsTab: React.FC<ClientContractsTabProps> = ({ clientId, clientName, branchId, studentsCount, onAddStudent, onCreateContract }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ContractsApi.list({ branchId, clientId, page: 0, size: 100 }, "")
      .then((response) => active && setItems(response.content ?? []))
      .catch((reason) => active && setError(getApiErrorMessage(reason, "Не удалось загрузить договоры клиента")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [branchId, clientId]);

  if (loading) return <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />;
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><ExclamationTriangleIcon className="mb-2 h-5 w-5" />{error}</div>;
  if (!items.length) return <div className="rounded-lg border border-slate-200 bg-white p-5"><EmptyState title="Договоров пока нет" description={studentsCount ? `Оформите договор: плательщик — ${clientName}, получатель услуг — выбранный ученик.` : "Сначала добавьте ученика, который будет посещать занятия. После этого можно оформить договор."} action={studentsCount ? <Button onClick={onCreateContract}><DocumentTextIcon className="h-4 w-4" /> Создать договор</Button> : <Button onClick={onAddStudent}>Добавить ученика</Button>} /></div>;

  return <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-950">Договоры и ученики</h2><p className="mt-1 text-xs text-slate-500">Плательщик: {clientName}. В каждом договоре отдельно указан ученик, который получает услугу.</p></div><Button size="sm" onClick={onCreateContract}><DocumentTextIcon className="h-4 w-4" /> Создать договор</Button></div>
    <div className="divide-y divide-slate-100">{items.map((contract) => <div key={contract.id} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(150px,0.8fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-slate-950">{contract.contractNumber}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{statusLabels[contract.status]}</span></div><div className="mt-1 text-xs text-slate-500">{date(contract.startDate)} — {date(contract.endDate)}</div></div><div className="min-w-0"><div className="text-[11px] font-semibold uppercase text-cyan-700">Ученик · получатель услуги</div><div className="mt-1 truncate text-sm font-medium text-slate-800">{contract.participant.fullName}</div><div className="mt-1 truncate text-xs text-slate-500">{contract.participant.birthDate ? `Дата рождения: ${date(contract.participant.birthDate)}` : "Получатель услуги"}</div></div><div><div className="text-sm font-semibold text-slate-900">{amount(contract.amount, contract.currency)}</div><div className={`mt-1 text-xs ${Number(contract.outstandingAmount ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>{Number(contract.outstandingAmount ?? 0) > 0 ? `Осталось ${amount(contract.outstandingAmount, contract.currency)}` : "Оплачен"}</div></div><div className="flex gap-2">{contract.status === "ACTIVE" ? <Button size="sm" rounded="rounded-lg" onClick={() => navigate(`/admin/contracts/${contract.id}/payments?drawer=payment`)}><BanknotesIcon className="h-4 w-4" /></Button> : null}<Button size="sm" variant="secondary" rounded="rounded-lg" onClick={() => navigate(`/admin/contracts/${contract.id}/overview`)}><ArrowTopRightOnSquareIcon className="h-4 w-4" /></Button></div></div>)}</div>
  </div>;
};

export default ClientContractsTab;
