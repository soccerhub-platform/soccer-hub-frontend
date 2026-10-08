import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { ActionMenu, Button, ErrorState, LoadingState, ModalShell, StatusBadge } from "../../../shared/ui";
import { ShadcnButton } from "../../../shared/ui/shadcn/Button";
import { getApiErrorMessage } from "../../../shared/api";
import { TrialsApi, attendanceLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialDetails } from "./trials.types";
import { actionCapability, actionLabels, detailsNextStep, formatTrialDate, nextActionLabels, trialInterval, type TrialAction } from "./trial.workspace";
import TrialDialog from "./TrialDialog";
import { TrialFacts } from "./TrialUI";

export default function TrialPreview({ id, detailHref, position, total, onPrevious, onNext, onClose, onSaved }: {
  id: string; detailHref: string; position: number; total: number; onPrevious: () => void; onNext: () => void; onClose: () => void; onSaved: () => void;
}) {
  const [trial, setTrial] = useState<TrialDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState<TrialAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setTrial(null); setAction(null);
    void TrialsApi.getById(id).then(result => { if (active) setTrial(result); })
      .catch(reason => { if (active) setError(getApiErrorMessage(reason, "Не удалось открыть пробное")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);
  const openAction = (value: TrialAction) => { setActionError(null); setAction(value); };
  const save = async (operation: () => Promise<TrialDetails>) => {
    if (!trial || !action || busy.current) return;
    busy.current = true; setSaving(true); setActionError(null);
    try {
      const fresh = await TrialsApi.getById(id);
      if (!fresh.capabilities[actionCapability[action]]) { setTrial(fresh); setActionError("Состояние пробного изменилось. Это действие больше недоступно."); return; }
      setTrial(await operation()); setAction(null); onSaved();
    } catch (reason) { setActionError(getApiErrorMessage(reason, "Не удалось сохранить изменения. Повторите попытку.")); }
    finally { busy.current = false; setSaving(false); }
  };
  const primary: TrialAction | null = trial?.capabilities.canRecordResult && trial.result === "PENDING" ? "result" : trial?.capabilities.canMarkAttendance ? "attendance" : null;
  const next = trial ? detailsNextStep(trial) : null;
  const menuActions = trial ? (Object.keys(actionLabels) as TrialAction[]).filter(key => key !== primary && trial.capabilities[actionCapability[key]] && (key !== "reschedule" || trial.group)).map(key => ({ key, label: actionLabels[key], onSelect: () => openAction(key), danger: key === "cancel" })) : [];
  return <>
    <ModalShell title="Быстрый просмотр" description="Пробное занятие · данные и следующий шаг" placement="right" maxWidthClassName="max-w-[460px]" bodyClassName="trial-workspace" onClose={onClose} closeDisabled={saving || Boolean(action)} footer={<ShadcnButton asChild variant="secondary" className="w-full"><Link to={detailHref}>Полная карточка<ArrowUpRight data-icon="inline-end"/></Link></ShadcnButton>}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2"><span className="trial-secondary">{position + 1} из {total} на странице</span><div className="flex gap-1"><Button variant="ghost" size="sm" aria-label="Предыдущее пробное" disabled={position <= 0 || saving || Boolean(action)} onClick={onPrevious}><ChevronLeft data-icon="inline-start"/></Button><Button variant="ghost" size="sm" aria-label="Следующее пробное" disabled={position + 1 >= total || saving || Boolean(action)} onClick={onNext}><ChevronRight data-icon="inline-start"/></Button></div></div>
        {loading ? <LoadingState label="Загрузка пробного…"/> : error || !trial ? <ErrorState message={error || "Запись не найдена"} onRetry={() => setRetry(v => v + 1)}/> : <>
          <div className="flex items-start justify-between gap-3"><div><h2 className="trial-preview-name">{trial.student?.fullName || trial.lead?.fullName || "Участник пробного"}</h2><div className="mt-2"><StatusBadge tone={trialStatusTone[trial.status]}>{trialStatusLabels[trial.status]}</StatusBadge></div></div>{menuActions.length > 0 && <ActionMenu compact label="Действия с пробным" items={menuActions}/>}</div>
          <div className="trial-next-panel" data-attention={next?.attention}><span className="trial-eyebrow">Следующее действие</span><strong>{next?.title}</strong><p>{next?.description}</p>{trial.result === "FOLLOW_UP" && trial.nextAction && <p className="trial-deadline"><b>{nextActionLabels[trial.nextAction.type]}</b><br/>{formatTrialDate(trial.nextAction.dueAt, true)} · Алматы</p>}{primary && <Button className="mt-3" onClick={() => openAction(primary)}>{actionLabels[primary]}</Button>}{!primary && trial.result === "FOLLOW_UP" && trial.lead?.phone && <ShadcnButton asChild className="mt-3"><a href={"tel:" + trial.lead.phone}><Phone data-icon="inline-start"/>Позвонить</a></ShadcnButton>}</div>
          <TrialFacts items={[{ label: "Занятие", value: <>{formatTrialDate(trial.session?.date)}<br/>{trialInterval(trial.session?.startsAt, trial.session?.endsAt)} · Алматы</> },{ label: "Группа", value: trial.group?.name || "Не указана" },{ label: "Тренер", value: trial.coach?.fullName || "Не указан" },{ label: "Площадка", value: trial.location?.name || "Не указана" },{ label: "Посещение", value: attendanceLabels[trial.attendanceStatus] },{ label: "Результат", value: resultLabels[trial.result] }]}/>
          <div className="trial-preview-contact"><span className="trial-eyebrow">Контакт</span><strong>{trial.lead?.fullName || "Нет связанного лида"}</strong>{trial.lead?.phone && <a className="trial-text-link" href={"tel:" + trial.lead.phone}>{trial.lead.phone}</a>}{trial.lead?.email && <a className="trial-text-link" href={"mailto:" + trial.lead.email}>{trial.lead.email}</a>}</div>
          {trial.outcome?.coachFeedback && <p className="trial-body-copy">{trial.outcome.coachFeedback}</p>}
        </>}
      </div>
    </ModalShell>
    {trial && action && <TrialDialog key={id + action} action={action} trial={trial} saving={saving} error={actionError} blocked={!trial.capabilities[actionCapability[action]]} close={() => { if (!busy.current) setAction(null); }} submit={save}/>}
  </>;
}
