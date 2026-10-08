import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ClipboardCheck, Mail, Phone, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { ActionMenu, Button, ErrorState, LoadingState, PageShell, StatusBadge } from "../../../shared/ui";
import { ShadcnButton } from "../../../shared/ui/shadcn/Button";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/shadcn/alert";
import { TrialsApi, attendanceLabels, coachRecommendationLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialDetails } from "./trials.types";
import { actionCapability, actionLabels, detailsNextStep, formatTrialDate, nextActionLabels, trialInterval, trialReturnTo, type TrialAction } from "./trial.workspace";
import { TrialCard, TrialFacts } from "./TrialUI";
import TrialDialog from "./TrialDialog";

const TrialDetailsPage: React.FC = () => {
  const { trialId, section } = useParams<{ trialId: string; section: string }>();
  const [params, setParams] = useSearchParams();
  const [trial, setTrial] = useState<TrialDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = useRef(false);
  const currentId = useRef(trialId); currentId.current = trialId;
  const drawer = params.get("drawer");
  const action = drawer && Object.prototype.hasOwnProperty.call(actionLabels, drawer) ? drawer as TrialAction : null;
  const validSection = !section || section === "overview";
  const back = trialReturnTo(params.get("returnTo"));

  useEffect(() => {
    if (!trialId || !validSection) return;
    let active = true;
    setLoading(true); setError(null); setTrial(null); setActionError(null);
    void TrialsApi.getById(trialId).then(value => { if (active) setTrial(value); })
      .catch(reason => { if (active) setError(getApiErrorMessage(reason, "Не удалось загрузить пробное занятие")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trialId, validSection, revision]);

  const setDrawer = useCallback((value?: TrialAction) => {
    if (busy.current) return;
    setActionError(null); toast.dismiss("trial-save");
    const next = new URLSearchParams(params);
    if (value) next.set("drawer", value); else next.delete("drawer");
    setParams(next);
  }, [params, setParams]);

  const apply = async (operation: () => Promise<TrialDetails>) => {
    if (!trial || !action || busy.current) return;
    const id = trial.id;
    busy.current = true; setActing(true); setActionError(null);
    try {
      const fresh = await TrialsApi.getById(id);
      if (currentId.current !== id) return;
      if (!fresh.capabilities[actionCapability[action]]) {
        setTrial(fresh); setActionError("Состояние пробного изменилось. Это действие больше недоступно."); return;
      }
      const updated = await operation();
      if (currentId.current !== id) return;
      setTrial(updated);
      const next = new URLSearchParams(params); next.delete("drawer"); setParams(next, { replace: true });
      toast.success("Изменения сохранены", { id: "trial-save" });
    } catch (reason) {
      if (currentId.current === id) setActionError(getApiErrorMessage(reason, "Не удалось сохранить изменения. Повторите попытку."));
    } finally { busy.current = false; setActing(false); }
  };

  if (!validSection) return <Navigate to={"/admin/trials/" + trialId} replace/>;
  if (loading) return <PageShell><LoadingState label="Загрузка пробного занятия…"/></PageShell>;
  if (error || !trial) return <PageShell><ShadcnButton asChild variant="ghost" className="self-start"><Link to={back}><ArrowLeft data-icon="inline-start"/>К пробным</Link></ShadcnButton><ErrorState title="Пробное недоступно" message={error || "Запись не найдена"} onRetry={() => setRevision(v => v + 1)}/></PageShell>;

  const name = trial.student?.fullName || trial.lead?.fullName || "Участник пробного";
  const next = detailsNextStep(trial);
  const primary: TrialAction | null = trial.capabilities.canRecordResult && trial.result === "PENDING" ? "result" : trial.capabilities.canMarkAttendance ? "attendance" : null;
  const available = (["attendance", "result", "reschedule", "cancel"] as TrialAction[]).filter(key => trial.capabilities[actionCapability[key]] && (key !== "reschedule" || trial.group));
  const canAct = action && available.includes(action);
  const sessionLink = trial.group && trial.session ? "/admin/groups/" + trial.group.id + "/sessions/" + trial.session.id : null;

  return <PageShell className="trial-workspace">
    <div className="flex items-center justify-between gap-3"><Link to={back} className="trial-text-link"><ArrowLeft aria-hidden="true"/>Пробные занятия</Link><Button size="sm" variant="ghost" disabled={acting} onClick={() => setRevision(v => v + 1)} aria-label="Обновить пробное"><RefreshCw data-icon="inline-start"/></Button></div>
    <header className="trial-detail-header">
      <div className="flex min-w-0 items-start gap-4"><div className="min-w-0"><p className="trial-eyebrow">Пробное занятие</p><h1 className="ui-detail-title break-words">{name}</h1><p className="trial-subtitle">{formatTrialDate(trial.session?.date)} · {trialInterval(trial.session?.startsAt, trial.session?.endsAt)} · Алматы</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={trialStatusTone[trial.status]}>{trialStatusLabels[trial.status]}</StatusBadge>{available.some(key => key !== primary) && <ActionMenu items={available.filter(key => key !== primary).map(key => ({ key, label: actionLabels[key], onSelect: () => setDrawer(key), disabled: acting, danger: key === "cancel" }))}/>}</div>
    </header>
    <div className="trial-detail-grid">
      <div className="flex min-w-0 flex-col gap-5">
        <TrialCard title="Занятие" description="Конкретная тренировка, на которую записан ученик" action={sessionLink && <Link className="trial-text-link" to={sessionLink}>Открыть занятие<ArrowRight aria-hidden="true"/></Link>}>
          <div className="trial-session-heading"><span className="trial-detail-icon"><CalendarDays aria-hidden="true"/></span><div><strong>{trial.group ? <Link className="trial-text-link" to={"/admin/groups/" + trial.group.id}>{trial.group.name}</Link> : "Группа не указана"}</strong><p>{formatTrialDate(trial.session?.date)} · {trialInterval(trial.session?.startsAt, trial.session?.endsAt)}</p></div></div>
          <TrialFacts items={[{label:"Тренер",value:trial.coach?.fullName || "Не указан"},{label:"Площадка",value:trial.location?.name || "Не указана"}]}/>
        </TrialCard>
        <div className="trial-two-columns">
          <TrialCard title="Посещение">
            <StatusBadge tone={trial.attendanceStatus === "ATTENDED" ? "success" : trial.attendanceStatus === "NO_SHOW" ? "warning" : "neutral"}>{attendanceLabels[trial.attendanceStatus]}</StatusBadge>
            <p className="trial-body-copy">{trial.attendance?.comment || (trial.attendanceStatus === "UNMARKED" ? "После занятия отметьте, присутствовал ли ученик." : "Комментарий к посещению не добавлен.")}</p>
            {trial.attendance?.markedAt && <p className="trial-secondary">Отмечено {formatTrialDate(trial.attendance.markedAt, true)}</p>}
          </TrialCard>
          <TrialCard title="Результат">
            <StatusBadge tone={trial.result === "CONVERTED" ? "success" : trial.result === "FOLLOW_UP" ? "warning" : "neutral"}>{resultLabels[trial.result]}</StatusBadge>
            <p className="trial-body-copy">{trial.outcome?.coachFeedback || (trial.result === "PENDING" ? "Итог можно записать после подтверждения посещения." : "Комментарий к результату не добавлен.")}</p>
            {trial.outcome?.recommendedGroupId && <Link className="trial-text-link" to={"/admin/groups/" + trial.outcome.recommendedGroupId}>{trial.outcome.recommendedGroupName || "Рекомендованная группа"}<ArrowRight aria-hidden="true"/></Link>}
            {trial.coachRecommendation && <div className="trial-recommendation"><strong>{coachRecommendationLabels[trial.coachRecommendation.recommendation]}</strong>{trial.coachRecommendation.comment && <p>{trial.coachRecommendation.comment}</p>}</div>}
          </TrialCard>
        </div>
        <TrialCard title="Участник и контакт">
          <div className="trial-two-columns"><TrialFacts items={[{label:"Ученик",value:name},{label:"Дата рождения",value:formatTrialDate(trial.student?.birthDate)},{label:"Возраст",value:trial.student?.age != null ? trial.student.age + " лет" : "Не указан"}]}/>
          <TrialFacts items={[{label:"Контакт",value:trial.lead?.fullName || "Нет связанного лида"},{label:"Телефон",value:trial.lead?.phone ? <a className="trial-text-link" href={"tel:" + trial.lead.phone}>{trial.lead.phone}</a> : "Не указан"},{label:"Email",value:trial.lead?.email ? <a className="trial-text-link" href={"mailto:" + trial.lead.email}>{trial.lead.email}</a> : "Не указан"}]}/></div>
        </TrialCard>
      </div>
      <aside className="trial-detail-aside">
        <TrialCard title="Следующий шаг">
          <div className="trial-next-panel" data-attention={next.attention}><strong>{next.title}</strong><p>{next.description}</p>{trial.result === "FOLLOW_UP" && trial.nextAction && <p className="trial-deadline"><b>{nextActionLabels[trial.nextAction.type]}</b><br/>{formatTrialDate(trial.nextAction.dueAt, true)} · Алматы</p>}</div>
          <div className="mt-4 flex flex-col gap-2">
            {primary && <Button disabled={acting} onClick={() => setDrawer(primary)}><ClipboardCheck data-icon="inline-start"/>{actionLabels[primary]}</Button>}
            {trial.lead?.phone && <ShadcnButton asChild variant="secondary"><a href={"tel:" + trial.lead.phone}><Phone data-icon="inline-start"/>Позвонить</a></ShadcnButton>}
            {trial.lead?.email && <ShadcnButton asChild variant="secondary"><a href={"mailto:" + trial.lead.email}><Mail data-icon="inline-start"/>Написать email</a></ShadcnButton>}
            {trial.lead && <ShadcnButton asChild variant="secondary"><Link to={"/admin/leads/" + trial.lead.id}>Открыть лида<ArrowRight data-icon="inline-end"/></Link></ShadcnButton>}
          </div>
        </TrialCard>
        {trial.status === "CANCELED" && <Alert><AlertTitle>Запись сохранена</AlertTitle><AlertDescription>Отмена относится к пробному ученика, а не ко всему занятию группы.</AlertDescription></Alert>}
      </aside>
    </div>
    {action && <TrialDialog key={trial.id + action} action={action} trial={trial} saving={acting} error={actionError} blocked={!canAct} close={() => setDrawer()} submit={apply}/>}
  </PageShell>;
};
export default TrialDetailsPage;
