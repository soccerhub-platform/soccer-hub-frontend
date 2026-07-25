import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, CalendarDaysIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, MapPinIcon, UserCircleIcon, UserGroupIcon, XCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, ErrorState, LoadingState, ModalShell, PageShell, SectionCard, WorkspaceBreadcrumbs, WorkspaceHeader, WorkspaceMetric, WorkspaceTabs, formControlClassName } from "../../../shared/ui";
import { TrialsApi, attendanceLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialAttendanceStatus, TrialDetails, TrialResult } from "./trials.types";

const sections = [{ key: "overview", label: "Обзор" }] as const;

const TrialDetailsPage: React.FC = () => {
  const { trialId, section } = useParams<{ trialId: string; section: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trial, setTrial] = useState<TrialDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const drawer = searchParams.get("drawer");

  const load = useCallback(async () => {
    if (!trialId) return;
    setLoading(true);
    setError(null);
    try {
      setTrial(await TrialsApi.getById(trialId));
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось загрузить пробное занятие"));
    } finally {
      setLoading(false);
    }
  }, [trialId]);

  useEffect(() => { void load(); }, [load]);

  const setDrawer = (value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("drawer", value); else next.delete("drawer");
    setSearchParams(next);
  };

  const apply = async (operation: () => Promise<TrialDetails>, successMessage: string) => {
    setActing(true);
    try {
      setTrial(await operation());
      setDrawer();
      toast.success(successMessage);
    } catch (reason) {
      toast.error(getApiErrorMessage(reason, "Не удалось изменить пробное занятие"));
    } finally {
      setActing(false);
    }
  };

  if (section && section !== "overview") return <Navigate to={`/admin/trials/${trialId}/overview`} replace />;
  if (loading) return <PageShell><LoadingState label="Загрузка пробного занятия..." /></PageShell>;
  if (error || !trial) return <PageShell><ErrorState title="Пробное недоступно" message={error || "Пробное занятие не найдено"} onRetry={() => void load()} /></PageShell>;

  const studentName = trial.student?.fullName ?? "Ученик";
  const sessionLabel = trial.session ? `${formatDate(trial.session.date)} · ${formatTime(trial.session.startsAt)}–${formatTime(trial.session.endsAt)}` : "Занятие не указано";

  return (
    <PageShell className="space-y-4">
      <WorkspaceBreadcrumbs items={[{ label: "Пробные занятия", to: "/admin/trials" }, { label: studentName }]} />
      <WorkspaceHeader
        actions={<>
          {trial.capabilities.canConfirm ? <Button rounded="rounded-lg" isLoading={acting} onClick={() => void apply(() => TrialsApi.confirm(trial.id), "Пробное подтверждено")}><CheckCircleIcon className="h-4 w-4" /> Подтвердить</Button> : null}
          {trial.capabilities.canMarkAttendance ? <Button variant="secondary" rounded="rounded-lg" onClick={() => setDrawer("attendance")}><ClipboardDocumentCheckIcon className="h-4 w-4" /> Посещение</Button> : null}
          {trial.capabilities.canRecordResult ? <Button variant="secondary" rounded="rounded-lg" onClick={() => setDrawer("result")}><UserGroupIcon className="h-4 w-4" /> Результат</Button> : null}
          {trial.capabilities.canCancel ? <Button variant="softDanger" rounded="rounded-lg" onClick={() => setDrawer("cancel")}><XCircleIcon className="h-4 w-4" /> Отменить</Button> : null}
        </>}
      >
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-admin-50 text-admin-700"><CalendarDaysIcon className="h-7 w-7" /></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="heading-font truncate text-2xl font-semibold text-slate-950">Пробное занятие · {studentName}</h1><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${trialStatusTone[trial.status]}`}>{trialStatusLabels[trial.status]}</span></div><p className="mt-2 text-sm text-slate-500">{sessionLabel}</p></div>
        </div>
      </WorkspaceHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceMetric icon={<CalendarDaysIcon />} label="Занятие" value={trial.group?.name ?? "Без группы"} note={sessionLabel} />
        <WorkspaceMetric icon={<ClipboardDocumentCheckIcon />} label="Посещение" value={attendanceLabels[trial.attendanceStatus]} note={trial.attendance?.comment || "Отметка ещё не добавлена"} />
        <WorkspaceMetric icon={<CheckCircleIcon />} label="Результат" value={resultLabels[trial.result]} note={trial.outcome?.coachFeedback || "Результат ещё не записан"} />
      </div>

      <WorkspaceTabs items={sections.map((item) => ({ ...item, to: `/admin/trials/${trial.id}/${item.key}` }))} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Ученик" description="Получатель пробного занятия">
          <DetailLine label="Имя" value={studentName} />
          <DetailLine label="Возраст" value={trial.student?.age ? `${trial.student.age} лет` : "Не указан"} />
          <DetailLine label="Дата рождения" value={formatDate(trial.student?.birthDate)} />
        </SectionCard>
        <SectionCard title="Контактное лицо" description="Источник заявки">
          <DetailLine label="Имя" value={trial.lead?.fullName || "Не связан с лидом"} />
          <DetailLine label="Телефон" value={trial.lead?.phone || "Не указан"} />
          <DetailLine label="Email" value={trial.lead?.email || "Не указан"} />
        </SectionCard>
        <SectionCard title="Занятие" description="Конкретная тренировка, к которой привязано пробное">
          <DetailLine label="Дата и время" value={sessionLabel} />
          <DetailLine label="Тренер" value={trial.coach?.fullName || "Не указан"} />
          <DetailLine label="Локация" value={trial.location?.name || "Не указана"} />
        </SectionCard>
      </div>

      {drawer === "cancel" ? <CancelTrialDrawer close={() => setDrawer()} saving={acting} onSubmit={(reason) => void apply(() => TrialsApi.cancel(trial.id, reason), "Пробное отменено")} /> : null}
      {drawer === "attendance" ? <AttendanceDrawer close={() => setDrawer()} saving={acting} onSubmit={(status, comment) => void apply(() => TrialsApi.markAttendance(trial.id, status, comment), "Посещение сохранено")} /> : null}
      {drawer === "result" ? <ResultDrawer close={() => setDrawer()} saving={acting} onSubmit={(result, groupId, feedback) => void apply(() => TrialsApi.recordResult(trial.id, result, groupId || undefined, feedback), "Результат сохранён")} /> : null}
    </PageShell>
  );
};

const DetailLine: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0"><span className="text-sm text-slate-500">{label}</span><span className="text-right text-sm font-medium text-slate-900">{value}</span></div>;

const CancelTrialDrawer: React.FC<{ close: () => void; saving: boolean; onSubmit: (reason: string) => void }> = ({ close, saving, onSubmit }) => {
  const [reason, setReason] = useState("");
  return <ModalShell title="Отменить пробное занятие" description="Отмена не удаляет запись из истории." placement="right" maxWidthClassName="max-w-lg" onClose={close} closeDisabled={saving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-lg" onClick={close}>Назад</Button><Button variant="danger" rounded="rounded-lg" disabled={!reason.trim()} isLoading={saving} onClick={() => onSubmit(reason.trim())}>Отменить</Button></div>}><label className="block"><span className="mb-1.5 block text-sm font-medium">Причина</span><textarea autoFocus className={`${formControlClassName} min-h-28`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Например: ученик не сможет прийти" /></label></ModalShell>;
};

const AttendanceDrawer: React.FC<{ close: () => void; saving: boolean; onSubmit: (status: TrialAttendanceStatus, comment: string) => void }> = ({ close, saving, onSubmit }) => {
  const [status, setStatus] = useState<TrialAttendanceStatus>("ATTENDED");
  const [comment, setComment] = useState("");
  return <ModalShell title="Отметить посещение" description="Сохраните фактический результат пробного занятия." placement="right" maxWidthClassName="max-w-lg" onClose={close} closeDisabled={saving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-lg" onClick={close}>Отмена</Button><Button rounded="rounded-lg" isLoading={saving} onClick={() => onSubmit(status, comment)}>Сохранить</Button></div>}><label className="block"><span className="mb-1.5 block text-sm font-medium">Статус посещения</span><select className={formControlClassName} value={status} onChange={(event) => setStatus(event.target.value as TrialAttendanceStatus)}><option value="ATTENDED">Был на занятии</option><option value="NO_SHOW">Не пришёл</option></select></label><label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Комментарий</span><textarea className={`${formControlClassName} min-h-24`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Комментарий администратора или тренера" /></label></ModalShell>;
};

const ResultDrawer: React.FC<{ close: () => void; saving: boolean; onSubmit: (result: TrialResult, groupId: string, feedback: string) => void }> = ({ close, saving, onSubmit }) => {
  const [result, setResult] = useState<TrialResult>("INTERESTED");
  const [groupId, setGroupId] = useState("");
  const [feedback, setFeedback] = useState("");
  return <ModalShell title="Записать результат" description="Зафиксируйте итог пробного и дальнейшую рекомендацию." placement="right" maxWidthClassName="max-w-lg" onClose={close} closeDisabled={saving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-lg" onClick={close}>Отмена</Button><Button rounded="rounded-lg" isLoading={saving} onClick={() => onSubmit(result, groupId, feedback)}>Сохранить результат</Button></div>}><label className="block"><span className="mb-1.5 block text-sm font-medium">Результат</span><select className={formControlClassName} value={result} onChange={(event) => setResult(event.target.value as TrialResult)}><option value="INTERESTED">Заинтересован</option><option value="FOLLOW_UP">Нужен follow-up</option><option value="NOT_INTERESTED">Не заинтересован</option><option value="CONVERTED">Конвертирован</option></select></label><label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">ID рекомендованной группы</span><input className={formControlClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)} placeholder="Необязательно" /></label><label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Комментарий тренера</span><textarea className={`${formControlClassName} min-h-28`} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Уровень, рекомендации, следующий шаг" /></label></ModalShell>;
};

const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) : "Не указана";
const formatTime = (value: string) => value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);

export default TrialDetailsPage;
