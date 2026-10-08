import React, { useMemo, useState } from "react";
import {
  Plus, Trash2 } from "lucide-react";
import {
  ExperienceLevel,
  Gender,
  LeadDetails,
  LeadParticipant,
  QualifyLeadPayload,
  TimePreference,
} from "./types";
import { LeadApi } from "./lead.api";
import LeadModalShell from "./LeadModalShell";
import { addBusinessDays, birthDateError, businessDate } from "./lead.workspace";
import { Input, Textarea, NativeSelect, DatePicker, FormField, Button, ToggleGroup, ToggleGroupItem} from "../../../shared/ui";

interface QualifyLeadModalProps {
  leadId: string;
  token: string;
  initialLead: LeadDetails | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

interface QualificationParticipantForm extends LeadParticipant {
  gender: Gender;
  experience: ExperienceLevel;
  birthDate: string;
}

const DAY_OPTIONS = [
  { value: "MON", label: "Пн" },
  { value: "TUE", label: "Вт" },
  { value: "WED", label: "Ср" },
  { value: "THU", label: "Чт" },
  { value: "FRI", label: "Пт" },
  { value: "SAT", label: "Сб" },
  { value: "SUN", label: "Вс" },
] as const;

const TIME_OPTIONS: Array<{ value: TimePreference; label: string }> = [
  { value: "MORNING", label: "Утро" },
  { value: "AFTERNOON", label: "День" },
  { value: "EVENING", label: "Вечер" },
];

const EMPTY_PARTICIPANT = (): QualificationParticipantForm => ({
  id: "",
  fullName: "",
  birthDate: "",
  gender: "MALE",
  experience: "BEGINNER",
});

const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 1000;

const parsePreferredDays = (value?: string | null) => {
  if (!value) {
    return { days: [] as string[], timePreference: null as TimePreference | null };
  }

  const parts = value
    .split(";")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  const rawDays = parts[0]?.split(",").filter(Boolean) ?? [];
  const rawTime = parts[1] ?? null;
  const normalizedTime =
    rawTime === "DAY" ? "AFTERNOON" : (rawTime as TimePreference | null);

  return {
    days: rawDays,
    timePreference:
      normalizedTime && TIME_OPTIONS.some((option) => option.value === normalizedTime)
        ? normalizedTime
        : null,
  };
};

const buildParticipants = (lead: LeadDetails | null): QualificationParticipantForm[] => {
  if (lead?.participants?.length) {
    return lead.participants.map((participant) => ({
      ...participant,
      birthDate: participant.birthDate ?? "",
      gender: participant.gender ?? "MALE",
      experience: participant.experience ?? "BEGINNER",
    }));
  }

  if (lead?.qualificationData?.participants?.length) {
    return lead.qualificationData.participants.map((participant) => ({
      id: "",
      fullName: participant.fullName,
      birthDate: participant.birthDate ?? "",
      gender: participant.gender ?? "MALE",
      experience: participant.experience ?? "BEGINNER",
    }));
  }

  return [EMPTY_PARTICIPANT()];
};

const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({
  leadId,
  token,
  initialLead,
  onClose,
  onSuccess,
}) => {
  const preferredDaysState = parsePreferredDays(
    initialLead?.preferredDays ??
      initialLead?.qualificationData?.preferredDays
  );

  const [participants, setParticipants] = useState<QualificationParticipantForm[]>(
    buildParticipants(initialLead)
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(preferredDaysState.days);
  const [timePreference, setTimePreference] = useState<TimePreference | null>(
    initialLead?.timePreference ??
      initialLead?.qualificationData?.timePreference ??
      preferredDaysState.timePreference
  );
  const [experience, setExperience] = useState<ExperienceLevel>(
    initialLead?.experience ??
      (initialLead?.qualificationData?.experience as ExperienceLevel) ??
      "BEGINNER"
  );
  const [notes, setNotes] = useState(
    initialLead?.notes ??
      initialLead?.qualificationData?.notes ??
      initialLead?.comment ??
      ""
  );
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadType = initialLead?.leadType ?? "CHILDREN";
  const participantLabel = leadType === "ADULT" ? "Игрок" : "Ребенок";
  const participantNameLabel = leadType === "ADULT" ? "игрока" : "ребенка";
  const participantsTitle = leadType === "ADULT" ? "Участники" : "Дети";

  const validation = useMemo(() => {
    const participantErrors = participants.map((participant) => ({
      fullName: participant.fullName.trim() ? "" : `Укажите имя ${participantNameLabel}`,
      birthDate: birthDateError(participant.birthDate),
    }));

    const hasValidParticipants =
      participants.length > 0 &&
      participantErrors.every((participant) => !participant.fullName && !participant.birthDate);

    return {
      participantErrors,
      isValid: hasValidParticipants && selectedDays.length > 0 && Boolean(timePreference),
      hasParticipants: participants.length > 0,
    };
  }, [participantNameLabel, participants, selectedDays, timePreference]);

  const updateParticipant = (
    index: number,
    nextParticipant: QualificationParticipantForm
  ) => {
    setParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? nextParticipant : participant
      )
    );
  };

  const handleSubmit = async () => {
    if (loading) return;
    setAttempted(true);
    if (!validation.isValid || !timePreference) return;

    const payload: QualifyLeadPayload = {
      participants: participants.map((participant) => ({
        fullName: participant.fullName.trim(),
        birthDate: participant.birthDate,
        gender: participant.gender,
        experience: participant.experience,
      })),
      preferredDays: selectedDays.join(","),
      timePreference,
      experience,
      notes: notes.trim(),
    };

    setLoading(true);
    setError(null);

    try {
      if (!saved) { await LeadApi.qualify(leadId, payload, token); setSaved(true); }
      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось квалифицировать лид");
    } finally {
      setLoading(false);
    }
  };

  return <LeadModalShell title="Уточнить заявку" description={initialLead?.primaryContact.fullName || "Участники и пожелания к занятиям"} eyebrow="Лид · Данные заявки" onClose={onClose} closeDisabled={loading}
    footer={<div className="flex w-full items-center justify-end gap-2"><Button variant="secondary" disabled={loading} onClick={onClose}>Отмена</Button><Button isLoading={loading} onClick={() => void handleSubmit()}>{saved ? "Обновить карточку" : "Сохранить изменения"}</Button></div>}>
    <form className="flex flex-col gap-6" onSubmit={e => {e.preventDefault(); void handleSubmit();}}>
      <fieldset disabled={loading || saved} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold text-slate-900">{participantsTitle}</legend>
        {participants.map((participant,index)=><div key={participant.id || index} className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{participantLabel} {index+1}</h3><Button type="button" variant="ghost" size="sm" disabled={participants.length===1} aria-label={`Удалить участника ${index+1}`} onClick={()=>setParticipants(prev=>prev.filter((_,i)=>i!==index))}><Trash2 data-icon="inline-start"/>Удалить</Button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Имя участника *" error={attempted ? validation.participantErrors[index]?.fullName : undefined}><Input aria-label={`Имя участника ${index+1}`} maxLength={MAX_NAME_LENGTH} value={participant.fullName} onChange={e=>updateParticipant(index,{...participant,fullName:e.target.value})} aria-invalid={attempted && Boolean(validation.participantErrors[index]?.fullName)}/></FormField>
            <FormField label="Дата рождения *" error={attempted ? validation.participantErrors[index]?.birthDate : undefined}><DatePicker placeholder={`Дата рождения участника ${index+1}`} max={addBusinessDays(businessDate(), -1)} value={participant.birthDate} onValueChange={birthDate=>updateParticipant(index,{...participant,birthDate})}/></FormField>
            <FormField label="Пол"><NativeSelect aria-label={`Пол участника ${index+1}`} value={participant.gender} onChange={e=>updateParticipant(index,{...participant,gender:e.target.value as Gender})}><option value="MALE">{leadType==="ADULT" ? "Мужчина" : "Мальчик"}</option><option value="FEMALE">{leadType==="ADULT" ? "Женщина" : "Девочка"}</option></NativeSelect></FormField>
            <FormField label="Подготовка"><NativeSelect aria-label={`Подготовка участника ${index+1}`} value={participant.experience} onChange={e=>updateParticipant(index,{...participant,experience:e.target.value as ExperienceLevel})}><option value="BEGINNER">Начинающий</option><option value="INTERMEDIATE">Средний уровень</option><option value="ADVANCED">Продвинутый</option></NativeSelect></FormField>
          </div>
        </div>)}
        <Button type="button" variant="secondary" onClick={()=>setParticipants(prev=>[...prev,EMPTY_PARTICIPANT()])}><Plus data-icon="inline-start"/>Добавить участника</Button>
      </fieldset>
      <fieldset disabled={loading || saved} className="flex min-w-0 flex-col gap-5 border-t border-slate-200 pt-5">
        <legend className="text-sm font-semibold text-slate-900">Пожелания к занятиям</legend>
        <div className="flex flex-col gap-2"><span id="lead-days-label" className="text-xs font-medium text-slate-600">Дни недели *</span>
          <ToggleGroup type="multiple" aria-labelledby="lead-days-label" value={selectedDays} onValueChange={setSelectedDays} variant="outline" className="flex flex-wrap justify-start gap-1">{DAY_OPTIONS.map(day=><ToggleGroupItem key={day.value} value={day.value}>{day.label}</ToggleGroupItem>)}</ToggleGroup>
          {attempted && !selectedDays.length && <p className="text-xs text-rose-700">Выберите хотя бы один день.</p>}
        </div>
        <div className="flex flex-col gap-2"><span id="lead-time-label" className="text-xs font-medium text-slate-600">Предпочтительное время *</span>
          <ToggleGroup type="single" aria-labelledby="lead-time-label" value={timePreference || ""} onValueChange={v=>{if(v)setTimePreference(v as TimePreference);}} variant="outline" className="grid grid-cols-3 gap-2">{TIME_OPTIONS.map(t=><ToggleGroupItem key={t.value} value={t.value}>{t.label}</ToggleGroupItem>)}</ToggleGroup>
          {attempted && !timePreference && <p className="text-xs text-rose-700">Выберите время занятий.</p>}
        </div>
        <FormField label="Общий уровень"><NativeSelect aria-label="Общий уровень" value={experience} onChange={e=>setExperience(e.target.value as ExperienceLevel)}><option value="BEGINNER">Начинающий</option><option value="INTERMEDIATE">Средний уровень</option><option value="ADVANCED">Продвинутый</option></NativeSelect></FormField>
        <FormField label="Заметки" hint="Что важно учесть при подборе группы и пробного занятия."><Textarea aria-label="Заметки" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={MAX_NOTES_LENGTH} rows={4}/></FormField>
      </fieldset>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
  </LeadModalShell>;
};
export default QualifyLeadModal;
