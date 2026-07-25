import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { AdminSessionApi, AdminSessionListItem } from "../groups/session.api";
import { GroupApi, GroupApiModel } from "../groups/group.api";
import { TrialsApi } from "../trials/trials.api";
import { Lead } from "./types";

interface ScheduleTrialModalProps {
  lead: Lead;
  branchId: string;
  token: string;
  onClose: () => void;
  onSuccess: (trialId?: string) => Promise<void> | void;
}

type Step = "participant" | "session" | "review";

const getToday = () => new Date().toISOString().slice(0, 10);
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = steps[stepIndex];
  const participant = lead.participants[participantIndex] ?? null;
  const selectedGroup = groups.find((item) => item.groupId === groupId);
  const selectedSession = sessions.find((item) => item.id === selectedSessionId);

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
    if (!groupId || !trialDate) {
      setSessions([]);
      return;
    }
    let mounted = true;
    setLoadingSessions(true);
    setError(null);
    void AdminSessionApi.listByGroup(groupId, { from: trialDate, to: trialDate }, token)
      .then((response) => {
        if (!mounted) return;
        setSessions(response.items.filter((item) => item.status === "PLANNED" && new Date(item.startsAt).getTime() > Date.now()));
      })
      .catch(() => mounted && setError("Не удалось загрузить занятия на выбранную дату"))
      .finally(() => mounted && setLoadingSessions(false));
    return () => { mounted = false; };
  }, [groupId, token, trialDate]);

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
    if (!participant?.id || !selectedSession) {
      setError("Заполните обязательные поля");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await TrialsApi.create({
        leadId: lead.id,
        clientId: lead.clientId ?? null,
        participantId: participant.id,
        studentId: lead.playerId ?? null,
        trainingSessionId: selectedSession.id,
      });
      await onSuccess(created.id);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать пробное занятие");
    } finally {
      setSubmitting(false);
    }
  };

  return <ModalShell title="Назначить пробное занятие" eyebrow="Лид · Новое пробное" description={`${lead.primaryContact.fullName}. Выберите конкретное занятие — пробное будет привязано к TrainingSession.`} placement="right" maxWidthClassName="max-w-[520px]" heightClassName="h-[100dvh]" bodyClassName="bg-slate-50 px-4 py-4 sm:px-5" closeDisabled={submitting} onClose={onClose} footer={<div className="flex justify-between gap-2"><Button type="button" variant="secondary" rounded="rounded-lg" disabled={submitting} onClick={() => stepIndex ? setStepIndex((value) => value - 1) : onClose()}><ArrowLeftIcon className="h-4 w-4" />{stepIndex ? "Назад" : "Отмена"}</Button>{step.id === "review" ? <Button type="button" rounded="rounded-lg" isLoading={submitting} onClick={() => void submit()}><CheckIcon className="h-4 w-4" /> Назначить пробное</Button> : <Button type="button" rounded="rounded-lg" disabled={Boolean(stepError) || loadingOptions || loadingSessions} onClick={next}>Далее <ArrowRightIcon className="h-4 w-4" /></Button>}</div>}>
    <div className="space-y-5">
      <ol className="grid grid-cols-3 gap-2">{steps.map((item, index) => <li key={item.id}><div className={`h-1 rounded-full ${index <= stepIndex ? "bg-admin-700" : "bg-slate-200"}`} /><span className={`mt-2 block text-xs ${index === stepIndex ? "font-semibold text-slate-900" : "text-slate-500"}`}>{item.label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{item.hint}</span></li>)}</ol>
      <div className="rounded-lg border border-admin-100 bg-admin-50 px-3 py-2.5 text-xs leading-5 text-admin-900"><span className="font-semibold">Заявка:</span> {participant?.fullName || "ученик не выбран"}{lead.preferredDays ? ` · желаемые дни: ${lead.preferredDays}` : ""}</div>
      {step.id === "participant" ? <div className="space-y-4"><div><h3 className="text-sm font-semibold text-slate-900">Кого записываем?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Пробное создаётся для конкретного участника лида и занятия.</p></div><div className="rounded-lg border border-admin-100 bg-admin-50 p-3 text-xs leading-5 text-admin-900">Если ученик ещё не оформлен, пробное сначала хранится за лидом. После конвертации оно автоматически свяжется с реальным Student.</div><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Ученик <b className="text-rose-500">*</b></span><select className={formControlClassName} value={String(participantIndex)} onChange={(event) => setParticipantIndex(Number(event.target.value))}>{lead.participants.map((item, index) => <option key={item.id || index} value={index}>{item.fullName}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Группа <b className="text-rose-500">*</b></span><select className={formControlClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={loadingOptions}><option value="">Выберите активную группу</option>{groups.map((item) => <option key={item.groupId} value={item.groupId}>{item.name}</option>)}</select></label></div> : null}
      {step.id === "session" ? <div className="space-y-4"><div><h3 className="text-sm font-semibold text-slate-900">Выберите занятие</h3><p className="mt-1 text-xs leading-5 text-slate-500">Показываются только будущие запланированные занятия группы.</p></div><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Дата <b className="text-rose-500">*</b></span><input type="date" min={getToday()} className={formControlClassName} value={trialDate} onChange={(event) => setTrialDate(event.target.value)} /></label>{loadingSessions ? <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Загрузка занятий...</div> : sessions.length ? <div className="space-y-2">{sessions.map((session) => <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${selectedSessionId === session.id ? "border-admin-600 bg-admin-50" : "border-slate-200 bg-white hover:border-admin-300"}`}><span><span className="block text-sm font-semibold text-slate-900"><CalendarDaysIcon className="mr-1 inline h-4 w-4 text-admin-600" />{timeLabel(session.startsAt)}–{timeLabel(session.endsAt)}</span><span className="mt-1 block text-xs text-slate-500">{session.coaches.map((coach) => coach.fullName).join(", ") || "Тренер не указан"}{session.location?.name ? ` · ${session.location.name}` : ""}</span></span><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selectedSessionId === session.id ? "bg-admin-700 text-white" : "bg-slate-100 text-slate-600"}`}>{selectedSessionId === session.id ? "Выбрано" : "Свободно"}</span></button>)}</div> : <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">На {dateLabel(trialDate)} нет доступных занятий. Выберите другую дату.</div>}</div> : null}
      {step.id === "review" ? <div className="space-y-4"><div><h3 className="text-sm font-semibold text-slate-900">Проверьте данные</h3><p className="mt-1 text-xs leading-5 text-slate-500">После создания пробное появится в общем реестре.</p></div><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-4"><Review label="Ученик" value={participant?.fullName || "Не выбран"} /><Review label="Группа" value={selectedGroup?.name || "Не выбрана"} /><Review label="Занятие" value={selectedSession ? `${dateLabel(selectedSession.sessionDate)}, ${timeLabel(selectedSession.startsAt)}–${timeLabel(selectedSession.endsAt)}` : "Не выбрано"} /></div><div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">Договор, оплата и постоянное зачисление в группу не создаются автоматически.</div></div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div> : null}
    </div>
  </ModalShell>;
};

const Review: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="grid gap-1 py-3 sm:grid-cols-[90px_1fr]"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><span className="text-sm font-semibold text-slate-900">{value}</span></div>;

export default ScheduleTrialModal;
