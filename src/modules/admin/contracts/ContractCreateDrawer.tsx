import React, { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { ClientApi } from "../clients/client.api";
import type { ClientListItem } from "../clients/client.types";
import { ContractsApi } from "./contracts.api";
import type { ContractParticipantOption } from "./contracts.types";

const today = () => new Date().toISOString().slice(0, 10);
const monthLater = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const ContractCreateDrawer: React.FC<{
  branchId: string;
  initialClientId?: string;
  onClose: () => void;
  onCreated: (contractId: string) => void;
}> = ({ branchId, initialClientId, onClose, onCreated }) => {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [students, setStudents] = useState<ContractParticipantOption[]>([]);
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [playerId, setPlayerId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(monthLater());
  const [amount, setAmount] = useState("30000");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState<"draft" | "activate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => clients.find((item) => item.id === clientId), [clientId, clients]);
  const student = useMemo(() => students.find((item) => item.id === playerId), [playerId, students]);

  useEffect(() => {
    ClientApi.list({ branchId, page: 0, size: 100, sort: "fullName,asc" })
      .then((response) => setClients(response.content))
      .catch((reason) => setError(getApiErrorMessage(reason, "Не удалось загрузить клиентов")))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    if (!clientId) {
      setStudents([]);
      setPlayerId("");
      return;
    }
    setStudentsLoading(true);
    setPlayerId("");
    ContractsApi.listParticipants(branchId, clientId)
      .then((items) => {
        setStudents(items);
        if (items.length === 1) setPlayerId(items[0].id);
      })
      .catch((reason) => setError(getApiErrorMessage(reason, "Не удалось загрузить учеников клиента")))
      .finally(() => setStudentsLoading(false));
  }, [branchId, clientId]);

  const submit = async (activate: boolean) => {
    if (!clientId || !playerId) {
      setError("Выберите клиента и связанного ученика");
      return;
    }
    if (!startDate || (endDate && endDate < startDate)) {
      setError("Проверьте период действия договора");
      return;
    }
    if (!amount || Number(amount) < 0) {
      setError("Укажите корректную стоимость");
      return;
    }

    setSaving(activate ? "activate" : "draft");
    setError(null);
    try {
      const created = await ContractsApi.create({
        branchId,
        clientId,
        playerId,
        startDate,
        endDate: endDate || undefined,
        amount: Number(amount),
        currency: "KZT",
        notes: notes.trim() || undefined,
      });
      const result = activate ? await ContractsApi.activate(created.id) : created;
      onCreated(result.id);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось создать договор"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <ModalShell
      title="Новый договор"
      eyebrow="Коммерческие условия"
      description="Договор связывает существующего клиента с учеником. Зачисление в группу выполняется отдельно."
      placement="right"
      maxWidthClassName="max-w-xl"
      closeDisabled={saving !== null}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" rounded="rounded-lg" disabled={saving !== null} onClick={onClose}>Отмена</Button>
          <Button variant="secondary" rounded="rounded-lg" isLoading={saving === "draft"} disabled={saving !== null} onClick={() => void submit(false)}>
            <DocumentTextIcon className="h-4 w-4" /> Сохранить черновик
          </Button>
          <Button rounded="rounded-lg" isLoading={saving === "activate"} disabled={saving !== null} onClick={() => void submit(true)}>
            <CheckCircleIcon className="h-4 w-4" /> Создать и активировать
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <div className="text-xs font-semibold uppercase text-admin-700">Клиент</div>
            <div className="mt-1 text-sm font-semibold text-slate-950">{client?.fullName || "Не выбран"}</div>
            <div className="mt-1 text-xs text-slate-500">заключает и оплачивает</div>
          </div>
          <span className="text-slate-300">→</span>
          <div>
            <div className="text-xs font-semibold uppercase text-cyan-700">Ученик</div>
            <div className="mt-1 text-sm font-semibold text-slate-950">{student?.fullName || "Не выбран"}</div>
            <div className="mt-1 text-xs text-slate-500">получает услугу</div>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Клиент *</span>
          <select className={formControlClassName} value={clientId} disabled={loading || Boolean(initialClientId)} onChange={(event) => setClientId(event.target.value)}>
            <option value="">{loading ? "Загрузка..." : "Выберите клиента"}</option>
            {clients.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.phone ? ` · ${item.phone}` : ""}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Связанный ученик *</span>
          <select className={formControlClassName} value={playerId} disabled={!clientId || studentsLoading} onChange={(event) => setPlayerId(event.target.value)}>
            <option value="">{studentsLoading ? "Загрузка..." : students.length ? "Выберите ученика" : "Нет связанных учеников"}</option>
            {students.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
          </select>
          {clientId && !studentsLoading && !students.length ? (
            <p className="mt-2 text-xs text-amber-700">Сначала свяжите ученика с клиентом в Client Workspace.</p>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Начало *</span><input type="date" className={formControlClassName} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Окончание</span><input type="date" min={startDate} className={formControlClassName} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Стоимость, KZT *</span><input inputMode="numeric" className={formControlClassName} value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Комментарий</span><textarea className={`${formControlClassName} min-h-24 resize-none`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

export default ContractCreateDrawer;

