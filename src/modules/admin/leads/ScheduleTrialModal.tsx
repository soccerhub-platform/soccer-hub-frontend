import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { CoachApi, Coach } from "../сoaches/coach.api";
import { GroupApi, GroupApiModel } from "../groups/group.api";
import { AvailableSlot, Lead, ScheduleTrialPayload } from "./types";
import { LeadApi } from "./lead.api";

interface ScheduleTrialModalProps {
  lead: Lead;
  branchId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type Step = "participant" | "time" | "review";

const getToday = () => new Date().toISOString().slice(0, 10);
const MAX_COMMENT_LENGTH = 1000;
const steps: Array<{ id: Step; label: string; hint: string }> = [
  { id: "participant", label: "Участник", hint: "Кого записываем" },
  { id: "time", label: "Время", hint: "Свободный слот" },
  { id: "review", label: "Проверка", hint: "Подтверждение" },
];

const formatSlotLabel = (slot: AvailableSlot) =>
  slot.endTime ? `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}` : slot.startTime.slice(0, 5);

const formatDate = (value: string) => {
  if (!value) return "Дата не выбрана";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
};

const ScheduleTrialModal: React.FC<ScheduleTrialModalProps> = ({ lead, branchId, token, onClose, onSuccess }) => {
  const isReschedule = lead.trial?.status === "SCHEDULED";
  const [stepIndex, setStepIndex] = useState(0);
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [participantIndex, setParticipantIndex] = useState(0);
  const [groupId, setGroupId] = useState(lead.trial?.groupId ?? "");
  const [coachId, setCoachId] = useState(lead.trial?.coachId ?? "");
  const [trialDate, setTrialDate] = useState(lead.trial?.trialDate ?? getToday());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const step = steps[stepIndex];
  const selectedParticipant = lead.participants[participantIndex] ?? null;
  const selectedGroup = groups.find((group) => group.groupId === groupId) ?? null;
  const selectedCoach = coaches.find((coach) => coach.id === coachId) ?? null;

  useEffect(() => {
    let mounted = true;
    const loadOptions = async () => {
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const [groupData, coachPage] = await Promise.all([
          GroupApi.listByBranch(branchId, token),
          CoachApi.listByBranch(branchId, token, 0, 100),
        ]);
        if (!mounted) return;
        setGroups(groupData.filter((group) => group.status === "ACTIVE" && (!group.audienceType || group.audienceType === lead.leadType)));
        setCoaches(coachPage.content.filter((coach) => coach.active));
      } catch (error) {
        if (!mounted) return;
        setOptionsError(error instanceof Error ? error.message : "Не удалось загрузить варианты пробного");
      } finally {
        if (mounted) setOptionsLoading(false);
      }
    };
    void loadOptions();
    return () => { mounted = false; };
  }, [branchId, lead.leadType, token]);

  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);
    if (!trialDate || (!groupId && !coachId)) return;
    let mounted = true;
    const loadSlots = async () => {
      setSlotsLoading(true);
      try {
        const data = groupId ? await LeadApi.getAvailableGroupSlots(groupId, trialDate, token) : await LeadApi.getAvailableCoachSlots(coachId, trialDate, token);
        if (mounted) setSlots(data);
      } catch (error) {
        if (mounted) setSlotsError(error instanceof Error ? error.message : "Не удалось загрузить свободное время");
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };
    void loadSlots();
    return () => { mounted = false; };
  }, [coachId, groupId, token, trialDate]);

  const stepError = useMemo(() => {
    if (step.id === "participant" && (!selectedParticipant?.id || (!groupId && !coachId))) return "Выберите участника и группу или тренера";
    if (step.id === "time" && (!trialDate || !selectedSlot)) return "Выберите дату и свободный слот";
    return null;
  }, [coachId, groupId, selectedParticipant?.id, selectedSlot, step.id, trialDate]);

  const next = () => {
    if (stepError) {
      setSubmitError(stepError);
      return;
    }
    setSubmitError(null);
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const submit = async () => {
    if (!selectedParticipant?.id || !selectedSlot || (!groupId && !coachId)) {
      setSubmitError("Заполните обязательные поля");
      return;
    }
    const payload: ScheduleTrialPayload = {
      participantId: selectedParticipant.id,
      slot: { date: selectedSlot.date, startTime: selectedSlot.startTime },
      ...(groupId ? { groupId } : {}),
      ...(coachId ? { coachId } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LeadApi.scheduleTrial(lead.id, payload, token);
      await onSuccess();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось сохранить пробное занятие");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={isReschedule ? "Перенести пробное занятие" : "Запланировать пробное"}
      eyebrow="Лид · Пробное занятие"
      description={`${lead.primaryContact.fullName}. Пробное не создаёт договор и не зачисляет ученика в группу.`}
      placement="right"
      maxWidthClassName="max-w-[520px]"
      heightClassName="h-[100dvh]"
      bodyClassName="bg-slate-50 px-4 py-4 sm:px-5"
      closeDisabled={submitting}
      onClose={onClose}
      footer={
        <div className="flex justify-between gap-2">
          <Button type="button" variant="secondary" rounded="rounded-lg" disabled={submitting} onClick={() => stepIndex ? setStepIndex((value) => value - 1) : onClose()}>
            <ArrowLeftIcon className="h-4 w-4" /> {stepIndex ? "Назад" : "Отмена"}
          </Button>
          {step.id === "review" ? (
            <Button type="button" rounded="rounded-lg" isLoading={submitting} onClick={() => void submit()}>
              <CheckIcon className="h-4 w-4" /> {isReschedule ? "Сохранить перенос" : "Запланировать"}
            </Button>
          ) : (
            <Button type="button" rounded="rounded-lg" disabled={Boolean(stepError) || optionsLoading} onClick={next}>
              Далее <ArrowRightIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((item, index) => (
            <li key={item.id}>
              <div className={`h-1 rounded-full ${index <= stepIndex ? "bg-admin-700" : "bg-slate-200"}`} />
              <span className={`mt-2 block text-xs ${index === stepIndex ? "font-semibold text-slate-900" : "text-slate-500"}`}>{item.label}</span>
            </li>
          ))}
        </ol>

        <div className="rounded-lg border border-admin-100 bg-admin-50 px-3 py-2.5 text-xs leading-5 text-admin-900">
          <span className="font-semibold">Контекст заявки:</span> {selectedParticipant?.fullName || "участник не выбран"}{selectedParticipant?.birthDate ? ` · ${new Date(selectedParticipant.birthDate).getFullYear()} г.` : ""}
          {lead.preferredDays ? ` · желаемые дни: ${lead.preferredDays}` : ""}
        </div>

        {optionsError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{optionsError}</div> : null}
        {optionsLoading ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-lg bg-slate-100" /><div className="h-32 animate-pulse rounded-lg bg-slate-100" /></div> : null}

        {!optionsLoading && step.id === "participant" ? (
          <div className="space-y-4">
            <div><h3 className="text-sm font-semibold text-slate-900">Кого записываем?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Сначала выберите ученика и место, где пройдёт пробное.</p></div>
            <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Участник <b className="text-rose-500">*</b></span><select className={formControlClassName} value={String(participantIndex)} onChange={(event) => setParticipantIndex(Number(event.target.value))}>{lead.participants.map((participant, index) => <option key={participant.id || index} value={index}>{participant.fullName}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Группа</span><select className={formControlClassName} value={groupId} onChange={(event) => { setGroupId(event.target.value); if (event.target.value) setCoachId(""); }}><option value="">Выбрать группу</option>{groups.map((group) => <option key={group.groupId} value={group.groupId}>{group.name}</option>)}</select></label>
              <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Тренер</span><select className={formControlClassName} value={coachId} onChange={(event) => { setCoachId(event.target.value); if (event.target.value) setGroupId(""); }}><option value="">Выбрать тренера</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{`${coach.firstName} ${coach.lastName}`.trim()}</option>)}</select></label>
            </div>
            <p className="text-xs text-slate-500">Выберите группу или тренера. Свободное время будет загружено автоматически.</p>
          </div>
        ) : null}

        {!optionsLoading && step.id === "time" ? (
          <div className="space-y-4">
            <div><h3 className="text-sm font-semibold text-slate-900">Когда провести?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Показываем только слоты без конфликтов по выбранной группе или тренеру.</p></div>
            <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Дата <b className="text-rose-500">*</b></span><input type="date" min={getToday()} className={formControlClassName} value={trialDate} onChange={(event) => setTrialDate(event.target.value)} /></label>
            <div><div className="mb-2 text-xs font-medium text-slate-500">Свободное время <b className="text-rose-500">*</b></div>{slotsLoading ? <div className="grid grid-cols-2 gap-2"><div className="h-10 animate-pulse rounded-lg bg-slate-100" /><div className="h-10 animate-pulse rounded-lg bg-slate-100" /></div> : slotsError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{slotsError}</div> : slots.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{slots.map((slot) => <button key={`${slot.date}-${slot.startTime}`} type="button" onClick={() => setSelectedSlot(slot)} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime ? "border-admin-700 bg-admin-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-admin-300 hover:bg-admin-50"}`}>{formatSlotLabel(slot)}</button>)}</div> : <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">На эту дату свободных слотов нет.</div>}</div>
          </div>
        ) : null}

        {step.id === "review" ? (
          <div className="space-y-4">
            <div><h3 className="text-sm font-semibold text-slate-900">Проверьте пробное занятие</h3><p className="mt-1 text-xs leading-5 text-slate-500">После подтверждения лид перейдёт в статус «Пробное назначено».</p></div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-4"><Review label="Участник" value={selectedParticipant?.fullName || "Не выбран"} note={selectedParticipant?.birthDate ? `${new Date(selectedParticipant.birthDate).getFullYear()} год рождения` : undefined} /><Review label="Место" value={selectedGroup?.name || "Тренер"} note={selectedCoach ? `${selectedCoach.firstName} ${selectedCoach.lastName}` : undefined} /><Review label="Время" value={selectedSlot ? `${formatDate(selectedSlot.date)}, ${formatSlotLabel(selectedSlot)}` : "Не выбрано"} /></div>
            <label><span className="mb-1.5 block text-xs font-medium text-slate-500">Комментарий</span><textarea className={`${formControlClassName} min-h-24 resize-none`} value={comment} maxLength={MAX_COMMENT_LENGTH} placeholder="Что важно учесть тренеру?" onChange={(event) => setComment(event.target.value)} /><span className="mt-1 block text-right text-xs text-slate-400">{comment.length}/{MAX_COMMENT_LENGTH}</span></label>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">Пробное занятие — это отдельная заявка. Договор, оплата и постоянное зачисление в группу оформляются после решения клиента.</div>
          </div>
        ) : null}

        {submitError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{submitError}</div> : null}
      </div>
    </ModalShell>
  );
};

const Review: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => <div className="grid gap-1 py-3 sm:grid-cols-[100px_1fr]"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><span><span className="block text-sm font-semibold text-slate-900">{value}</span>{note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}</span></div>;

export default ScheduleTrialModal;
