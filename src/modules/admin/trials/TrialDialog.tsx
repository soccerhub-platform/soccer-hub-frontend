import React, { useEffect, useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addBusinessDays, businessDate, sessionTimestamp } from "../../../shared/business-time";
import { Button, DatePicker, DateTimePicker, EmptyState, ErrorState, LoadingState, ModalShell, NativeSelect, SearchableSelect, Textarea } from "../../../shared/ui";
import { Alert, AlertDescription } from "../../../shared/ui/shadcn/alert";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../../../shared/ui/shadcn/field";
import { ToggleGroup, ToggleGroupItem } from "../../../shared/ui/shadcn/toggle-group";
import { RadioGroup, RadioGroupItem } from "../../../shared/ui/shadcn/radio-group";
import { useAdminBranch } from "../BranchContext";
import { GroupApi, type GroupApiModel } from "../groups/group.api";
import { AdminSessionApi, type AdminSessionListItem } from "../groups/session.api";
import { TrialsApi, resultLabels } from "./trials.api";
import { actionLabels, availableTrialSessions, formatTrialDate, nextActionLabels, trialInputDateTime, trialInterval, type TrialAction } from "./trial.workspace";
import { attendanceSchema, cancelSchema, resultSchema } from "./trial.validation";
import type { TrialDetails, TrialNextActionType, TrialResult } from "./trials.types";
import { TrialContext } from "./TrialUI";

type Props = { action: TrialAction; trial: TrialDetails; saving: boolean; error: string | null; blocked?: boolean; close: () => void; submit: (operation: () => Promise<TrialDetails>) => Promise<void> };
const descriptions: Record<TrialAction, string> = {
  attendance: "Подтвердите фактическое посещение. Это определит дальнейшую работу с пробным.",
  result: "Сохраните итог и следующий шаг. Данные можно уточнить позднее.",
  reschedule: "Выберите другое будущее занятие этой группы. Текущая запись сохранится до подтверждения.",
  cancel: "Отменяется только пробное ученика. Занятие группы и история записи сохранятся.",
};
const resultOptions: { value: Exclude<TrialResult, "PENDING">; description: string }[] = [
  { value: "INTERESTED", description: "Готов обсуждать зачисление" },
  { value: "FOLLOW_UP", description: "Нужно связаться ещё раз" },
  { value: "NOT_INTERESTED", description: "Не планирует продолжать" },
  { value: "CONVERTED", description: "Оформление уже выполнено" },
];

export default function TrialDialog({ action, trial, saving, error, blocked, close, submit }: Props) {
  const id = useId();
  const { branchId } = useAdminBranch();
  const [reason, setReason] = useState("");
  const [attendance, setAttendance] = useState<"ATTENDED" | "NO_SHOW">(trial.attendanceStatus === "NO_SHOW" ? "NO_SHOW" : "ATTENDED");
  const [comment, setComment] = useState(trial.attendance?.comment || "");
  const [result, setResult] = useState<Exclude<TrialResult, "PENDING">>(trial.result === "PENDING" ? "INTERESTED" : trial.result);
  const [feedback, setFeedback] = useState(trial.outcome?.coachFeedback || "");
  const [groupId, setGroupId] = useState(trial.outcome?.recommendedGroupId || "");
  const [nextActionType, setNextActionType] = useState<TrialNextActionType>(trial.nextAction?.type || "CALL");
  const [nextActionAt, setNextActionAt] = useState(trialInputDateTime(trial.nextAction?.dueAt));
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(false);
  const [groupsRevision, setGroupsRevision] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [date, setDate] = useState(trial.session?.date && trial.session.date >= businessDate() ? trial.session.date : businessDate());
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [sessionsRevision, setSessionsRevision] = useState(0);
  const end = date ? addBusinessDays(date, 13) : "";

  useEffect(() => {
    if (action !== "result" || !branchId || blocked) return;
    let active = true;
    setGroupsLoading(true); setGroupsError(false); setGroups([]);
    void GroupApi.listByBranch(branchId, "").then(items => { if (active) setGroups(items.filter(g => g.status === "ACTIVE")); })
      .catch(() => { if (active) setGroupsError(true); }).finally(() => { if (active) setGroupsLoading(false); });
    return () => { active = false; };
  }, [action, branchId, blocked, groupsRevision]);

  useEffect(() => {
    if (action !== "reschedule" || !trial.group || blocked) return;
    let active = true;
    setSessionId(""); setSessions([]); setSessionsError(false);
    if (!date || date < businessDate()) { setSessionsLoading(false); return; }
    setSessionsLoading(true);
    void AdminSessionApi.listByGroup(trial.group.id, { from: date, to: end }, "")
      .then(response => { if (active) setSessions(availableTrialSessions(response.items, trial.session?.id)); })
      .catch(() => { if (active) setSessionsError(true); }).finally(() => { if (active) setSessionsLoading(false); });
    return () => { active = false; };
  }, [action, trial.group?.id, trial.session?.id, date, end, blocked, sessionsRevision]);

  const clearError = (key: string) => setErrors(current => { const next = { ...current }; delete next[key]; return next; });
  const changeDate = (value: string) => { setSessionId(""); setSessions([]); setDate(value); setErrors({}); };
  const validate = (issues: { path: PropertyKey[]; message: string }[]) => setErrors(Object.fromEntries(issues.map(issue => [String(issue.path[0]), issue.message])));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving || blocked) return;
    setErrors({});
    if (action === "cancel") {
      const parsed = cancelSchema.safeParse({ reason });
      if (!parsed.success) return validate(parsed.error.issues);
      await submit(() => TrialsApi.cancel(trial.id, parsed.data.reason));
    } else if (action === "attendance") {
      const parsed = attendanceSchema.safeParse({ status: attendance, comment });
      if (!parsed.success) return validate(parsed.error.issues);
      await submit(() => TrialsApi.markAttendance(trial.id, parsed.data.status, parsed.data.comment));
    } else if (action === "result") {
      const parsed = resultSchema.safeParse({ result, groupId, feedback, nextActionType, nextActionAt });
      if (!parsed.success) return validate(parsed.error.issues);
      await submit(() => TrialsApi.recordResult(trial.id, result, groupId || undefined, parsed.data.feedback || undefined, result === "FOLLOW_UP" ? nextActionType : undefined, result === "FOLLOW_UP" ? nextActionAt : undefined));
    } else {
      const selected = sessions.find(s => s.id === sessionId);
      if (!selected || sessionTimestamp(selected.startsAt) <= Date.now()) return setErrors({ sessionId: "Выберите будущее занятие из списка" });
      await submit(() => TrialsApi.reschedule(trial.id, selected.id));
    }
  };
  const groupOptions = groups.map(g => ({ value: g.groupId, label: g.name }));
  if (groupId && !groupOptions.some(g => g.value === groupId)) groupOptions.unshift({ value: groupId, label: trial.outcome?.recommendedGroupName || "Сохранённая рекомендация" });

  return <ModalShell title={actionLabels[action]} description={descriptions[action]} onClose={close} closeDisabled={saving} maxWidthClassName="max-w-[560px]" bodyClassName="trial-workspace" footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={close}>{blocked ? "Закрыть" : "Назад"}</Button>{!blocked && <Button type="submit" form={id} variant={action === "cancel" ? "danger" : "primary"} disabled={saving || (action === "reschedule" && (sessionsLoading || !sessionId))}>{saving ? "Сохранение…" : action === "result" ? "Сохранить результат" : action === "attendance" ? "Сохранить посещение" : action === "reschedule" ? "Перенести пробное" : "Отменить пробное"}</Button>}</div>}>
    <form id={id} onSubmit={save} noValidate><FieldGroup>
      <TrialContext trial={trial}/>
      {blocked ? <Alert><AlertDescription>{error || "Это действие недоступно в текущем состоянии пробного."}</AlertDescription></Alert> : <>
        {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        <fieldset disabled={saving} className="min-w-0"><FieldGroup>
          {action === "cancel" && <Field data-invalid={Boolean(errors.reason)}><FieldLabel htmlFor={id + "-reason"}>Причина отмены <span aria-hidden="true">*</span></FieldLabel><Textarea id={id + "-reason"} autoFocus value={reason} onChange={e => { setReason(e.target.value); clearError("reason"); }} placeholder="Например, ученик не сможет прийти" rows={4} maxLength={1000} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? id + "-reason-error" : undefined}/><FieldError id={id + "-reason-error"}>{errors.reason}</FieldError><FieldDescription>Укажите причину, чтобы команда понимала, что произошло.</FieldDescription></Field>}
          {action === "attendance" && <>
            <Field><FieldLabel id={id + "-attendance"}>Ученик был на занятии?</FieldLabel><ToggleGroup type="single" variant="outline" aria-labelledby={id + "-attendance"} value={attendance} onValueChange={v => v && setAttendance(v as typeof attendance)} className="grid grid-cols-2"><ToggleGroupItem value="ATTENDED">Был на занятии</ToggleGroupItem><ToggleGroupItem value="NO_SHOW">Не пришёл</ToggleGroupItem></ToggleGroup><FieldDescription>{attendance === "ATTENDED" ? "После сохранения можно будет записать результат." : "Пробное завершится с неявкой. Для повторного посещения нужна новая запись."}</FieldDescription></Field>
            <Field data-invalid={Boolean(errors.comment)}><FieldLabel htmlFor={id + "-comment"}>Комментарий <span className="trial-optional">необязательно</span></FieldLabel><Textarea id={id + "-comment"} value={comment} onChange={e => { setComment(e.target.value); clearError("comment"); }} placeholder="Наблюдение или причина отсутствия" rows={3} maxLength={2000} aria-invalid={Boolean(errors.comment)}/><FieldError>{errors.comment}</FieldError></Field>
          </>}
          {action === "result" && <>
            <Field><FieldLabel id={id + "-result"}>Итог пробного</FieldLabel><RadioGroup aria-labelledby={id + "-result"} value={result} onValueChange={v => setResult(v as typeof result)} className="trial-result-options">{resultOptions.map(option => <label key={option.value} className="trial-choice" data-selected={result === option.value}><RadioGroupItem value={option.value}/><span><strong>{resultLabels[option.value]}</strong><small>{option.description}</small></span></label>)}</RadioGroup>{result === "CONVERTED" && <FieldDescription>Это отметка об итоге. Она не создаёт клиента, ученика или договор — оформление выполняется в карточке лида.</FieldDescription>}</Field>
            {result === "FOLLOW_UP" && <FieldGroup className="trial-follow-up-fields">
              <Field><FieldLabel htmlFor={id + "-next"}>Следующее действие</FieldLabel><NativeSelect id={id + "-next"} value={nextActionType} onChange={e => setNextActionType(e.target.value as TrialNextActionType)}>{Object.entries(nextActionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
              <Field data-invalid={Boolean(errors.nextActionAt)}><FieldLabel>Срок следующего контакта <span aria-hidden="true">*</span></FieldLabel><DateTimePicker aria-label="Срок контакта" value={nextActionAt} onValueChange={value => { setNextActionAt(value); clearError("nextActionAt"); }} minDate={businessDate()} disabled={saving} aria-invalid={Boolean(errors.nextActionAt)}/><FieldError>{errors.nextActionAt}</FieldError><FieldDescription>Дата и время Алматы. Прошедшее время сохранить нельзя.</FieldDescription></Field>
            </FieldGroup>}
            <Field data-invalid={Boolean(errors.groupId)}><FieldLabel>Рекомендованная группа <span className="trial-optional">необязательно</span></FieldLabel><SearchableSelect value={groupId} onValueChange={value => { setGroupId(value); clearError("groupId"); }} options={groupOptions} placeholder="Рекомендованная группа" loading={groupsLoading} disabled={saving || groupsLoading}/>{groupId && <Button type="button" className="self-start" variant="ghost" size="sm" onClick={() => setGroupId("")}>Убрать рекомендацию</Button>}<FieldError>{errors.groupId}</FieldError>{groupsError && <div className="flex flex-wrap items-center gap-2"><FieldDescription>Не удалось загрузить группы. Текущая рекомендация сохранена.</FieldDescription><Button type="button" variant="ghost" size="sm" onClick={() => setGroupsRevision(v => v + 1)}>Повторить загрузку групп</Button></div>}</Field>
            <Field data-invalid={Boolean(errors.feedback)}><FieldLabel htmlFor={id + "-feedback"}>Комментарий тренера <span className="trial-optional">необязательно</span></FieldLabel><Textarea id={id + "-feedback"} value={feedback} onChange={e => { setFeedback(e.target.value); clearError("feedback"); }} placeholder="Уровень подготовки, впечатления и рекомендации" rows={3} maxLength={2000} aria-invalid={Boolean(errors.feedback)}/><FieldError>{errors.feedback}</FieldError></Field>
          </>}
          {action === "reschedule" && <>
            <Field><FieldLabel>Искать занятия начиная с</FieldLabel><DatePicker placeholder="Начальная дата поиска" value={date} onValueChange={changeDate} min={businessDate()} disabled={saving}/><FieldDescription>{date ? `${formatTrialDate(date)} — ${formatTrialDate(end)} · Алматы` : "Выберите дату поиска"}</FieldDescription><div className="flex justify-between gap-2"><Button type="button" variant="ghost" size="sm" disabled={!date || date <= businessDate() || saving} onClick={() => changeDate(addBusinessDays(date, -14) < businessDate() ? businessDate() : addBusinessDays(date, -14))}><ChevronLeft data-icon="inline-start"/>Раньше</Button><Button type="button" variant="ghost" size="sm" disabled={!date || saving} onClick={() => changeDate(addBusinessDays(date, 14))}>Ещё 14 дней<ChevronRight data-icon="inline-end"/></Button></div></Field>
            {sessionsLoading ? <LoadingState label="Ищем доступные занятия…"/> : sessionsError ? <ErrorState title="Не удалось загрузить занятия" message="Текущая запись не изменена. Повторите поиск." onRetry={() => setSessionsRevision(v => v + 1)}/> : sessions.length ? <Field><FieldLabel id={id + "-sessions"}>Доступные занятия · {sessions.length}</FieldLabel><RadioGroup aria-labelledby={id + "-sessions"} value={sessionId} onValueChange={setSessionId} className="trial-session-options">{sessions.map(session => <label className="trial-choice" key={session.id} data-selected={sessionId === session.id}><RadioGroupItem value={session.id}/><span><strong>{formatTrialDate(session.sessionDate)} · {trialInterval(session.startsAt, session.endsAt)}</strong><small>{session.coaches.map(c => c.fullName).join(", ") || "Тренер не указан"}{session.location?.name ? " · " + session.location.name : ""}</small></span></label>)}</RadioGroup><FieldError>{errors.sessionId}</FieldError></Field> : <EmptyState title="Других занятий в этом периоде нет" description="Выберите другую дату или следующие 14 дней. Текущее занятие и отменённые тренировки исключены."/>}
          </>}
        </FieldGroup></fieldset>
      </>}
    </FieldGroup></form>
  </ModalShell>;
}
