import React, { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { ContractsApi } from "../contracts/contracts.api";
import type { ContractGroupOption, ContractParticipantOption, CreateContractRequest } from "../contracts/contracts.types";

const today = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => {
  const value = new Date();
  value.setMonth(value.getMonth() + 1);
  return value.toISOString().slice(0, 10);
};

const ClientContractDrawer: React.FC<{
  clientId: string;
  clientName: string;
  branchId: string;
  onClose: () => void;
  onCreated: () => void;
}> = ({ clientId, clientName, branchId, onClose, onCreated }) => {
  const [participants, setParticipants] = useState<ContractParticipantOption[]>([]);
  const [groups, setGroups] = useState<ContractGroupOption[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(nextMonth());
  const [amount, setAmount] = useState("30000");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participant = useMemo(() => participants.find((item) => item.id === participantId) ?? null, [participantId, participants]);
  const group = useMemo(() => groups.find((item) => item.id === groupId) ?? null, [groupId, groups]);

  useEffect(() => {
    ContractsApi.listParticipants(branchId, "", clientId)
      .then((items) => {
        setParticipants(items);
        if (items.length === 1) setParticipantId(items[0].id);
      })
      .catch((reason) => setError(getApiErrorMessage(reason, "Не удалось загрузить учеников клиента")))
      .finally(() => setLoading(false));
  }, [branchId, clientId]);

  useEffect(() => {
    if (!participant) { setGroups([]); setGroupId(""); return; }
    setGroupsLoading(true);
    setGroupId("");
    ContractsApi.listGroups(branchId, participant.leadType, "")
      .then(setGroups)
      .catch((reason) => setError(getApiErrorMessage(reason, "Не удалось загрузить группы")))
      .finally(() => setGroupsLoading(false));
  }, [branchId, participant?.id, participant?.leadType]);

  const submit = async () => {
    if (!participant) { setError("Выберите ученика"); return; }
    if (!group) { setError("Выберите группу"); return; }
    if (!startDate || !endDate || endDate < startDate) { setError("Проверьте срок договора"); return; }
    if (!amount.trim() || Number(amount) < 0) { setError("Укажите корректную сумму договора"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: CreateContractRequest = {
        branchId,
        leadType: participant.leadType,
        participantId: participant.id,
        primaryContactId: clientId,
        groupId: group.id,
        coachId: group.coach?.id ?? null,
        startDate,
        endDate,
        amount: Number(amount),
        currency: "KZT",
        notes: notes.trim() || undefined,
      };
      const result = await ContractsApi.create(payload, "");
      if ("valid" in result) {
        setError(result.errors.map((item) => item.message).join(". ") || "Договор не прошёл проверку");
        return;
      }
      onCreated();
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось создать договор"));
    } finally {
      setSaving(false);
    }
  };

  const groupType = participant?.leadType === "ADULT" ? "взрослых" : "детских";

  return (
    <ModalShell
      title="Создать договор"
      description={`Плательщик: ${clientName}`}
      eyebrow="Договор на обучение"
      placement="right"
      maxWidthClassName="max-w-xl"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button><Button onClick={() => void submit()} isLoading={saving} disabled={loading || !participants.length}><DocumentTextIcon className="h-4 w-4" /> Создать договор</Button></div>}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div><div className="text-xs font-semibold uppercase text-emerald-700">Клиент</div><div className="mt-1 text-sm font-semibold text-slate-950">{clientName}</div><div className="mt-1 text-xs text-slate-500">заключает и оплачивает</div></div>
            <span className="text-slate-300">→</span>
            <div><div className="text-xs font-semibold uppercase text-cyan-700">Ученик</div><div className="mt-1 text-sm font-semibold text-slate-950">{participant?.fullName || "Выберите ниже"}</div><div className="mt-1 text-xs text-slate-500">посещает занятия</div></div>
          </div>
        </div>

        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Ученик — получатель услуг *</span><select className={formControlClassName} value={participantId} onChange={(event) => { setParticipantId(event.target.value); setError(null); }} disabled={loading}><option value="">{loading ? "Загрузка..." : participants.length ? "Выберите ученика" : "У клиента нет связанных учеников"}</option>{participants.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>

        {participant ? <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Группа *</span><select className={formControlClassName} value={groupId} onChange={(event) => { setGroupId(event.target.value); setError(null); }} disabled={groupsLoading}><option value="">{groupsLoading ? "Загрузка групп..." : groups.length ? "Выберите группу" : `Подходящих ${groupType} групп нет`}</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}{item.coach?.fullName ? ` · ${item.coach.fullName}` : ""}</option>)}</select>{!groupsLoading && !groups.length ? <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">В филиале сейчас нет доступных групп для этой категории. Создать договор можно после добавления подходящей группы.</div> : null}</label> : null}

        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Начало *</span><input type="date" className={formControlClassName} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Окончание *</span><input type="date" min={startDate} className={formControlClassName} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Стоимость, KZT *</span><input inputMode="numeric" className={formControlClassName} value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Комментарий</span><textarea className={`${formControlClassName} min-h-24 resize-none`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Необязательно" /></label>
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

export default ClientContractDrawer;
