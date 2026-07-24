import React, { useEffect, useState } from "react";
import { Button, ModalShell } from "../../../shared/ui";
import { LeadParticipant } from "./types";
import { formatBirthDate } from "./lead.format";

interface ConvertLeadModalProps {
  isOpen: boolean;
  leadName: string;
  leadType?: string | null;
  participants: LeadParticipant[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    participantId: string;
    participantBirthDate: string;
    relationshipType: "SELF" | "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER";
    replacePrimaryContact: boolean;
    replacePrimaryPayer: boolean;
  }) => Promise<void> | void;
}

const participantLabel = (participant: LeadParticipant) =>
  [participant.fullName, participant.birthDate ? formatBirthDate(participant.birthDate) : null]
    .filter(Boolean)
    .join(" · ");

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  leadName,
  leadType,
  participants,
  submitting,
  onClose,
  onSubmit,
}) => {
  const isAdult = leadType === "ADULT";
  const [participantId, setParticipantId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relationshipType, setRelationshipType] = useState<
    "SELF" | "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER"
  >(isAdult ? "SELF" : "MOTHER");
  const [replacePrimaryContact, setReplacePrimaryContact] = useState(false);
  const [replacePrimaryPayer, setReplacePrimaryPayer] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const first = participants.length === 1 ? participants[0] : null;
    setParticipantId(first?.id ?? "");
    setBirthDate(first?.birthDate ?? "");
    setRelationshipType(isAdult ? "SELF" : "MOTHER");
    setReplacePrimaryContact(false);
    setReplacePrimaryPayer(false);
    setAttempted(false);
  }, [isAdult, isOpen, participants]);

  if (!isOpen) return null;

  const invalid = !participantId || !birthDate;

  return (
    <ModalShell
      title="Оформить клиента"
      description={`Создайте роли клиента и ученика для ${leadName}. Договор и зачисление оформляются отдельно.`}
      eyebrow="Конвертация лида"
      onClose={onClose}
      closeDisabled={submitting}
      placement="right"
      maxWidthClassName="max-w-[520px]"
      heightClassName="h-[100dvh]"
      bodyClassName="bg-slate-50 px-4 py-4 sm:px-5"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={submitting || invalid}
            isLoading={submitting}
            onClick={() => {
              setAttempted(true);
              if (invalid) return;
              void onSubmit({
                participantId,
                participantBirthDate: birthDate,
                relationshipType,
                replacePrimaryContact,
                replacePrimaryPayer,
              });
            }}
          >
            Оформить клиента
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-admin-100 bg-admin-50 p-3 text-sm leading-5 text-admin-900">
          <div className="font-semibold">Что произойдёт после подтверждения</div>
          <div className="mt-1 text-xs text-admin-800/80">
            Будут созданы Client, Student и связь между ними. Договор, оплата и зачисление в группу не создаются автоматически.
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Ученик <span className="text-rose-500">*</span>
            </span>
            <select
              value={participantId}
              onChange={(event) => {
                const nextId = event.target.value;
                setParticipantId(nextId);
                setBirthDate(participants.find((item) => item.id === nextId)?.birthDate ?? "");
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              disabled={submitting}
            >
              <option value="">Выберите ученика</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participantLabel(participant)}
                </option>
              ))}
            </select>
            {attempted && !participantId ? <p className="text-xs text-rose-600">Выберите ученика</p> : null}
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Дата рождения <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              disabled={submitting}
            />
            {attempted && !birthDate ? <p className="text-xs text-rose-600">Укажите дату рождения</p> : null}
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Тип связи</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(isAdult ? ["SELF"] : ["MOTHER", "FATHER", "GUARDIAN", "OTHER"]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setRelationshipType(type as typeof relationshipType)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  relationshipType === type
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {{ SELF: "SELF", MOTHER: "Мама", FATHER: "Папа", GUARDIAN: "Опекун", OTHER: "Другое" }[type]}
              </button>
            ))}
          </div>
        </div>

        {!isAdult ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked readOnly /> Основной контакт
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked readOnly /> Основной плательщик
            </label>
            <p className="text-xs text-slate-500">Если у ученика уже есть основные роли, система попросит подтвердить замену.</p>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
};

export default ConvertLeadModal;
