import React, { useEffect, useMemo, useState } from "react";
import { Button, ModalShell } from "../../../shared/ui";
import { GroupApiModel } from "../groups/group.api";
import { LeadParticipant } from "./types";
import { formatBirthDate } from "./lead.format";

interface ConvertLeadModalProps {
  isOpen: boolean;
  leadName: string;
  participants: LeadParticipant[];
  groups: GroupApiModel[];
  loadingGroups: boolean;
  groupsError: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    participantId: string;
    groupId: string;
    participantBirthDate: string;
    contractStartDate: string;
    contractEndDate?: string | null;
    amount?: number | null;
  }) => Promise<void> | void;
}

const toIsoDate = (value: Date) => {
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, "0");
  const d = `${value.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const participantDisplayLabel = (participant: LeadParticipant) => {
  const parts = [participant.fullName];
  if (participant.birthDate) {
    parts.push(formatBirthDate(participant.birthDate));
  }
  return parts.filter(Boolean).join(" · ");
};

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  leadName,
  participants,
  groups,
  loadingGroups,
  groupsError,
  submitting,
  onClose,
  onSubmit,
}) => {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [participantId, setParticipantId] = useState(
    participants.length === 1 ? participants[0].id : ""
  );
  const [groupId, setGroupId] = useState(groups.length === 1 ? groups[0].groupId : "");
  const [participantBirthDate, setParticipantBirthDate] = useState(
    participants.length === 1 ? participants[0].birthDate ?? "" : ""
  );
  const [contractStartDate, setContractStartDate] = useState(today);
  const [contractEndDate, setContractEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setParticipantId(participants.length === 1 ? participants[0].id : "");
    setGroupId(groups.length === 1 ? groups[0].groupId : "");
    setParticipantBirthDate(participants.length === 1 ? participants[0].birthDate ?? "" : "");
    setContractStartDate(today);
    setContractEndDate("");
    setAmount("");
    setSubmitAttempted(false);
  }, [participants, groups, isOpen, today]);

  useEffect(() => {
    if (!isOpen) return;
    if (!groupId && groups.length === 1) {
      setGroupId(groups[0].groupId);
    }
  }, [groupId, groups, isOpen]);

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.id === participantId) ?? null,
    [participants, participantId]
  );

  const fieldErrors = useMemo(() => {
    const participantError = participantId ? "" : "Выберите участника";
    const groupError = groupId ? "" : "Выберите группу";
    const birthDateError = participantBirthDate ? "" : "Укажите дату рождения участника";
    const startDateError = contractStartDate ? "" : "Укажите дату начала договора";
    const endDateError =
      contractEndDate && contractStartDate && contractEndDate < contractStartDate
        ? "Дата окончания должна быть не раньше даты начала"
        : "";
    const amountNumber = amount.trim() ? Number(amount) : null;
    const amountError =
      amount.trim().length > 0 && (Number.isNaN(amountNumber) || (amountNumber ?? 0) < 0)
        ? "Сумма должна быть 0 или больше"
        : "";

    return {
      participantError,
      groupError,
      birthDateError,
      startDateError,
      endDateError,
      amountError,
    };
  }, [
    amount,
    participantBirthDate,
    participantId,
    contractEndDate,
    contractStartDate,
    groupId,
  ]);

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const submitDisabled = submitting || loadingGroups || Boolean(groupsError) || hasFieldErrors;

  if (!isOpen) return null;

  return (
    <ModalShell
      title="Конвертация лида в клиента"
      description={`Создание клиента, игрока и договора из лида ${leadName}.`}
      eyebrow="Конвертация"
      onClose={onClose}
      closeDisabled={submitting}
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={submitDisabled}
            isLoading={submitting}
            onClick={async () => {
              setSubmitAttempted(true);
              if (submitDisabled) return;
              await onSubmit({
                participantId,
                groupId,
                participantBirthDate,
                contractStartDate,
                contractEndDate: contractEndDate || null,
                amount: amount.trim().length > 0 ? Number(amount) : null,
              });
            }}
          >
            Конвертировать в клиента
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Участник <span className="text-rose-500">*</span>
          </span>
          <select
            value={participantId}
            onChange={(event) => {
              const nextId = event.target.value;
              setParticipantId(nextId);
              const participant = participants.find((item) => item.id === nextId);
              if (participant) {
                setParticipantBirthDate(participant.birthDate ?? "");
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            disabled={submitting}
          >
            <option value="">Выберите участника</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participantDisplayLabel(participant)}
              </option>
            ))}
          </select>
          {submitAttempted && fieldErrors.participantError ? (
            <p className="text-xs text-rose-600">{fieldErrors.participantError}</p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Группа <span className="text-rose-500">*</span>
          </span>
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            disabled={loadingGroups || submitting}
          >
            <option value="">Выберите группу</option>
            {groups.map((group) => (
              <option key={group.groupId} value={group.groupId}>
                {[
                  group.name,
                  group.audienceType === "ADULT"
                    ? "взрослая группа"
                    : `${group.ageFrom}-${group.ageTo} лет`,
                  group.level,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </select>
          {!loadingGroups && !groupsError && groups.length === 0 ? (
            <p className="text-xs text-amber-600">Нет доступных групп для этого филиала</p>
          ) : null}
          {groupsError ? (
            <p className="text-xs text-rose-600">Не удалось загрузить группы</p>
          ) : null}
          {submitAttempted && fieldErrors.groupError ? (
            <p className="text-xs text-rose-600">{fieldErrors.groupError}</p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Дата рождения <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            value={participantBirthDate}
            onChange={(event) => setParticipantBirthDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            disabled={submitting}
          />
          {submitAttempted && fieldErrors.birthDateError ? (
            <p className="text-xs text-rose-600">{fieldErrors.birthDateError}</p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Дата начала договора <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            value={contractStartDate}
            onChange={(event) => setContractStartDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            disabled={submitting}
          />
          {submitAttempted && fieldErrors.startDateError ? (
            <p className="text-xs text-rose-600">{fieldErrors.startDateError}</p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Дата окончания
          </span>
          <input
            type="date"
            value={contractEndDate}
            onChange={(event) => setContractEndDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            disabled={submitting}
          />
          {submitAttempted && fieldErrors.endDateError ? (
            <p className="text-xs text-rose-600">{fieldErrors.endDateError}</p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Сумма
          </span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            disabled={submitting}
          />
          {submitAttempted && fieldErrors.amountError ? (
            <p className="text-xs text-rose-600">{fieldErrors.amountError}</p>
          ) : null}
        </label>

        {selectedParticipant ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Выбранный участник
            </div>
            <div className="mt-1 font-medium text-slate-900">{selectedParticipant.fullName}</div>
            <div className="mt-1 text-slate-500">
              Дата рождения: {formatBirthDate(selectedParticipant.birthDate)}
            </div>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
};

export default ConvertLeadModal;
