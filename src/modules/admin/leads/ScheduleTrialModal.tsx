import LeadModalShell from "./LeadModalShell";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check } from "lucide-react";
import { NativeSelect, Button, DatePicker, formControlClassName   } from "../../../shared/ui";
import { AdminSessionApi, AdminSessionListItem } from "../groups/session.api";
import { GroupApi, GroupApiModel } from "../groups/group.api";
import { TrialsApi } from "../trials/trials.api";
import type { TrialBookingListItem } from "../trials/trials.types";
import { LeadApi } from "./lead.api";
import { Lead } from "./types";
import { businessDate, sessionTimestamp, sessionSearchRanges, addBusinessDays } from "./lead.workspace";

interface ScheduleTrialModalProps {
  lead: Lead;
  branchId: string;
  token: string;
  onClose: () => void;
  onSuccess: (trialId?: string) => Promise<void> | void;
}

type Step = "participant" | "session" | "review";

const getToday = businessDate;
const addDays = addBusinessDays;
const steps: Array<{ id: Step; label: string; hint: string }> = [
  { id: "participant", label: "Ученик", hint: "Кого записываем" },
  { id: "session", label: "Занятие", hint: "Конкретный слот" },
  { id: "review", label: "Проверка", hint: "Подтверждение" },
];

const dateLabel = (value: string) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`));
const timeLabel = (value: string) => value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);

const ScheduleTrialModal: React.FC<ScheduleTrialModalProps> = ({ lead, branchId, token, onClose, onSuccess }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [participantIndex, setParticipantIndex] = useState(0);
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [groupId, setGroupId] = useState("");
  const [trialDate, setTrialDate] = useState(getToday());
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [existingTrials, setExistingTrials] = useState<TrialBookingListItem[]>([]);
  const [existingTrialError, setExistingTrialError] = useState("");
  const [rangeStart, setRangeStart] = useState(getToday());
  const rangeEnd = addDays(rangeStart, 59);
  const [loadingExistingTrial, setLoadingExistingTrial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = steps[stepIndex];
  const participant = lead.participants[participantIndex] ?? null;
  const selectedGroup = groups.find((item) => item.groupId === groupId);
  const existingTrial = existingTrials.find(t => t.status === "SCHEDULED" && (t.participantId === participant?.id || (participant?.playerId && t.studentId === participant.playerId)));
  const daySessions = sessions.filter(s => s.sessionDate === trialDate);
  const availableDates = Array.from(new Set(sessions.map(s => s.sessionDate))).sort();
  const selectedSession = sessions.find((item) => item.id === selectedSessionId);
  const isRescheduling =
    Boolean(existingTrial);

  useEffect(() => {
    let mounted = true;
    setLoadingExistingTrial(true);
    void LeadApi.getById(lead.id, token)
      .then((trial) => {
        if (mounted) setExistingTrials(trial.currentTrials ?? []);
      })
      .catch(() => {
        if (mounted) setExistingTrialError("Не удалось проверить существующие пробные. Закройте окно и повторите попытку.");
      })
      .finally(() => mounted && setLoadingExistingTrial(false));
    return () => { mounted = false; };
  }, [lead.id, token]);

  useEffect(() => {
    let mounted = true;
    void GroupApi.listByBranch(branchId, token)
      .then((items) => {
        if (mounted) setGroups(items.filter((item) => item.status === "ACTIVE" && (!item.audienceType || item.audienceType === lead.leadType)));
      })
      .catch(() => mounted && setError("Не удалось загрузить активные группы"))
      .finally(() => mounted && setLoadingOptions(false));
    return () => { mounted = false; };
  }, [branchId, lead.leadType, token]);

  useEffect(() => {
    setSelectedSessionId("");
    if (!groupId) {
      setSessions([]);
      return;
    }
    let mounted = true;
    setLoadingSessions(true);
    setError(null);
    void Promise.all(sessionSearchRanges(rangeStart).map(range => AdminSessionApi.listByGroup(groupId, range, token)))
      .then((responses) => {
        if (!mounted) return;
        const upcoming = responses.flatMap(response => response.items).filter(item => item.status === "PLANNED" && sessionTimestamp(item.startsAt) > Date.now())
          .sort((a, b) => sessionTimestamp(a.startsAt) - sessionTimestamp(b.startsAt));
        setSessions(upcoming);
        setTrialDate(upcoming[0]?.sessionDate ?? rangeStart);
      })
      .catch(() => mounted && setError("Не удалось загрузить занятия. Попробуйте выбрать группу ещё раз."))
      .finally(() => mounted && setLoadingSessions(false));
    return () => { mounted = false; };
  }, [groupId, token, rangeStart, rangeEnd]);

  const stepError = useMemo(() => {
    if (step.id === "participant" && (!participant || !groupId)) return "Выберите ученика и группу";
    if (step.id === "session" && !selectedSession) return "Выберите конкретное занятие";
    return null;
  }, [groupId, participant?.id, selectedSession, step.id]);

  const next = () => {
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const submit = async () => {
    if (existingTrialError || loadingExistingTrial || submitting) return;
    if (!participant?.id || !selectedSession) {
      setError("Заполните обязательные поля");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let trialId: string;
      if (existingTrial?.status === "SCHEDULED") {
        const updated = await TrialsApi.reschedule(existingTrial.id, selectedSession.id);
        trialId = updated.id;
      } else {
        const created = await TrialsApi.create({
            leadId: lead.id,
            clientId: lead.clientId ?? null,
            participantId: participant.id,
            studentId: participant.playerId ?? null,
            trainingSessionId: selectedSession.id,
          });
        trialId = created.id;
      }
      await onSuccess(trialId);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : isRescheduling
            ? "Не удалось перенести пробное занятие"
            : "Не удалось создать пробное занятие"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return <LeadModalShell title={isRescheduling ? "Перенести пробное занятие" : "Назначить пробное занятие"} eyebrow={isRescheduling ? "Лид · Перенос пробного" : "Лид · Новое пробное"} description={`${lead.primaryContact.fullName}. Выберите конкретное занятие — пробное будет ${isRescheduling ? "перенесено" : "привязано"} к занятию в расписании.`} placement="right" maxWidthClassName="max-w-[520px]" heightClassName="h-dvh" bodyClassName="bg-slate-50 px-4 py-4 sm:px-5" closeDisabled={submitting} onClose={onClose} footer={<div className="flex justify-between gap-2"><Button type="button" variant="secondary" rounded="rounded-lg" disabled={submitting} onClick={() => stepIndex ? setStepIndex((value) => value - 1) : onClose()}><ArrowLeft className="h-4 w-4" />{stepIndex ? "Назад" : "Отмена"}</Button>{step.id === "review" ? <Button type="button" rounded="rounded-lg" isLoading={submitting} disabled={loadingExistingTrial || Boolean(existingTrialError)} onClick={() => void submit()}><Check className="h-4 w-4" /> {isRescheduling ? "Перенести пробное" : "Назначить пробное"}</Button> : <Button type="button" rounded="rounded-lg" disabled={Boolean(stepError) || loadingOptions || loadingSessions || loadingExistingTrial || Boolean(existingTrialError)} onClick={next}>Далее <ArrowRight className="h-4 w-4" /></Button>}</div>}>
    <div className="flex flex-col gap-5">
      <ol className="grid grid-cols-3 gap-2">{steps.map((item, index) => <li key={item.id}><div className={`h-1 rounded-full ${index <= stepIndex ? "bg-admin-600" : "bg-slate-200"}`} /><span className={`mt-2 block text-xs ${index === stepIndex ? "font-semibold text-slate-900" : "text-slate-600"}`}>{item.label}</span><span className="mt-0.5 block text-[11px] text-slate-600">{item.hint}</span></li>)}</ol>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-admin-600"><span className="font-semibold">Заявка:</span> {participant?.fullName || "ученик не выбран"}{lead.preferredDays ? ` · желаемые дни: ${lead.preferredDays}` : ""}</div>
      {step.id === "participant" ? <div className="flex flex-col gap-4"><div><h3 className="ui-section-title">Кого записываем?</h3><p className="mt-1 text-xs leading-5 text-slate-600">Пробное создаётся для конкретного участника лида и занятия.</p></div><div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-admin-600">Если ученик ещё не оформлен, пробное сначала хранится за лидом. После конвертации оно автоматически свяжется с карточкой ученика.</div><label><span className="mb-1.5 block text-xs font-medium text-slate-600">Ученик <b className="text-rose-500">*</b></span><NativeSelect aria-label="Ученик" className={formControlClassName} value={String(participantIndex)} onChange={(event) => setParticipantIndex(Number(event.target.value))}>{lead.participants.map((item, index) => <option key={item.id || index} value={index}>{item.fullName}</option>)}</NativeSelect></label><label><span className="mb-1.5 block text-xs font-medium text-slate-600">Группа <b className="text-rose-500">*</b></span><NativeSelect aria-label="Группа" className={formControlClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={loadingOptions}><option value="">Выберите активную группу</option>{groups.map((item) => <option key={item.groupId} value={item.groupId}>{item.name}</option>)}</NativeSelect></label></div> : null}
      {step.id === "session" ? <div className="flex flex-col gap-4"><div><h3 className="ui-section-title">Выберите занятие</h3><p className="mt-1 text-xs leading-5 text-slate-600">Показываются только будущие запланированные занятия группы.</p></div><label><span className="mb-1.5 block text-xs font-medium text-slate-600">Дата <b className="text-rose-500">*</b></span><DatePicker min={getToday()} value={trialDate} onValueChange={value => { setTrialDate(value); setSelectedSessionId(""); if (value < rangeStart || value > rangeEnd) setRangeStart(value); }} /></label><div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600"><p>Поиск занятий: {dateLabel(rangeStart)} — {dateLabel(rangeEnd)}. Время Алматы.</p>
        {availableDates.length > 0 && <label className="mt-2 block">Даты с занятиями<NativeSelect aria-label="Даты с занятиями" value={availableDates.includes(trialDate) ? trialDate : ""} onChange={e => { setTrialDate(e.target.value); setSelectedSessionId(""); }}><option value="" disabled>Выберите дату</option>{availableDates.map(date => <option key={date} value={date}>{dateLabel(date)}</option>)}</NativeSelect></label>}
        <Button type="button" variant="ghost" size="sm" disabled={loadingSessions} onClick={() => setRangeStart(addDays(rangeEnd, 1))}>Следующие 60 дней</Button>
      </div>{loadingSessions ? <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Загрузка занятий...</div> : daySessions.length ? <div className="flex flex-col gap-2">{daySessions.map((session) => <button key={session.id} type="button" aria-pressed={selectedSessionId === session.id} onClick={() => setSelectedSessionId(session.id)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${selectedSessionId === session.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}><span><span className="block ui-section-title"><CalendarDays className="mr-1 inline h-4 w-4 text-admin-600" />{timeLabel(session.startsAt)}–{timeLabel(session.endsAt)}</span><span className="mt-1 block text-xs text-slate-600">{session.coaches.map((coach) => coach.fullName).join(", ") || "Тренер не указан"}{session.location?.name ? ` · ${session.location.name}` : ""}</span></span><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selectedSessionId === session.id ? "bg-admin-600 text-white" : "bg-slate-100 text-slate-600"}`}>{selectedSessionId === session.id ? "Выбрано" : "Выбрать"}</span></button>)}</div> : <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">На {dateLabel(trialDate)} нет доступных занятий. Выберите другую дату.</div>}</div> : null}
      {step.id === "review" ? <div className="flex flex-col gap-4"><div><h3 className="ui-section-title">Проверьте данные</h3><p className="mt-1 text-xs leading-5 text-slate-600">{isRescheduling ? "После подтверждения новое время появится в общем реестре." : "После создания пробное появится в общем реестре."}</p></div><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-4"><Review label="Ученик" value={participant?.fullName || "Не выбран"} /><Review label="Группа" value={selectedGroup?.name || "Не выбрана"} /><Review label="Занятие" value={selectedSession ? `${dateLabel(selectedSession.sessionDate)}, ${timeLabel(selectedSession.startsAt)}–${timeLabel(selectedSession.endsAt)}` : "Не выбрано"} /></div><div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">Договор, оплата и постоянное зачисление в группу не создаются автоматически.</div></div> : null}
      {existingTrialError && <p role="alert" className="text-sm text-red-700">{existingTrialError}</p>}
      {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div> : null}
    </div>
  </LeadModalShell>;
};

const Review: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="grid gap-1 py-3 sm:grid-cols-[90px_1fr]"><span className="text-xs font-semibold uppercase text-slate-600">{label}</span><span className="ui-section-title">{value}</span></div>;

export default ScheduleTrialModal;
