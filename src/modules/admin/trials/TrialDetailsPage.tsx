import React, { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarDays, CheckCircle, CircleX, ClipboardCheck, Clock3, Phone, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import {
  ActionMenu,
  Button,
  DateTimePicker,
  EntitySheet,
  ErrorState,
  Input,
  LoadingState,
  MetricCard,
  PageShell,
  SectionCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Textarea,
  WorkspaceBreadcrumbs,
  WorkspaceHeader,
  DatePicker,
  type ActionMenuItem,
} from "../../../shared/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../shared/ui/shadcn/form";
import { TrialsApi, attendanceLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialAttendanceStatus, TrialDetails, TrialNextActionType, TrialResult } from "./trials.types";
import {
  AdminSessionApi,
  type AdminSessionListItem,
} from "../groups/session.api";

const nextActionLabels: Record<TrialNextActionType, string> = {
  CALL: "Позвонить",
  MESSAGE: "Написать сообщение",
  SEND_OFFER: "Отправить предложение",
  WAIT_FOR_DECISION: "Ожидать решения",
  OTHER: "Другое",
};

const cancelSchema = z.object({
  reason: z.string().trim().min(1, "Укажите причину отмены"),
});

const attendanceSchema = z.object({
  status: z.enum(["ATTENDED", "NO_SHOW"]),
  comment: z.string(),
});

const resultSchema = z.object({
  result: z.enum(["INTERESTED", "FOLLOW_UP", "NOT_INTERESTED", "CONVERTED"]),
  groupId: z.string(),
  feedback: z.string(),
  nextActionType: z.enum(["CALL", "MESSAGE", "SEND_OFFER", "WAIT_FOR_DECISION", "OTHER"]),
  nextActionAt: z.string(),
}).superRefine((values, context) => {
  if (values.result === "FOLLOW_UP" && !values.nextActionAt) {
    context.addIssue({
      code: "custom",
      path: ["nextActionAt"],
      message: "Укажите дату следующего действия",
    });
  }
});

type CancelFormValues = z.infer<typeof cancelSchema>;
type AttendanceFormValues = z.infer<typeof attendanceSchema>;
type ResultFormValues = z.infer<typeof resultSchema>;

const TrialDetailsPage: React.FC = () => {
  const { trialId, section } = useParams<{ trialId: string; section: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trial, setTrial] = useState<TrialDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const drawer = searchParams.get("drawer");
  const hasValidSection = !section || section === "overview";

  const load = useCallback(async () => {
    if (!trialId || !hasValidSection) return;
    setLoading(true);
    setError(null);
    try {
      setTrial(await TrialsApi.getById(trialId));
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось загрузить пробное занятие"));
    } finally {
      setLoading(false);
    }
  }, [hasValidSection, trialId]);

  useEffect(() => { void load(); }, [load]);

  const setDrawer = (value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("drawer", value); else next.delete("drawer");
    setSearchParams(next);
  };

  const drawerHref = useCallback((value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", value);
    return `?${next.toString()}`;
  }, [searchParams]);

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

  const secondaryActions = useMemo<ActionMenuItem[]>(() => {
    if (!trial) return [];
    return [
      ...(trial.capabilities.canReschedule && trial.group ? [{
        key: "reschedule",
        label: "Перенести пробное",
        icon: <CalendarDays />,
        to: drawerHref("reschedule"),
        disabled: acting,
      }] : []),
      ...(trial.capabilities.canMarkAttendance ? [{
        key: "attendance",
        label: "Отметить посещение",
        icon: <ClipboardCheck />,
        to: drawerHref("attendance"),
        disabled: acting,
      }] : []),
      ...(trial.capabilities.canRecordResult ? [{
        key: "result",
        label: "Записать результат",
        icon: <Users />,
        to: drawerHref("result"),
        disabled: acting,
      }] : []),
      ...(trial.capabilities.canCancel ? [{
        key: "cancel",
        label: "Отменить пробное",
        icon: <CircleX />,
        to: drawerHref("cancel"),
        disabled: acting,
        danger: true,
        separatorBefore: true,
      }] : []),
    ];
  }, [acting, drawerHref, trial]);

  if (!hasValidSection) return <Navigate to={`/admin/trials/${trialId}`} replace />;
  if (loading) return <PageShell><LoadingState label="Загрузка пробного занятия..." /></PageShell>;
  if (error || !trial) return <PageShell><ErrorState title="Пробное недоступно" message={error || "Пробное занятие не найдено"} onRetry={() => void load()} /></PageShell>;

  const studentName = trial.student?.fullName ?? "Ученик";
  const sessionLabel = trial.session
    ? `${formatDate(trial.session.date)} · ${formatTime(trial.session.startsAt)}–${formatTime(trial.session.endsAt)}`
    : "Занятие не указано";

  return (
    <PageShell className="space-y-6">
      <WorkspaceBreadcrumbs items={[{ label: "Пробные занятия", to: "/admin/trials" }, { label: studentName }]} />
      <WorkspaceHeader
        actions={
          secondaryActions.length
            ? <ActionMenu items={secondaryActions} />
            : undefined
        }
      >
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]">
            <CalendarDays className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ui-detail-title truncate">{studentName}</h1>
              <StatusBadge tone={trialStatusTone[trial.status]}>{trialStatusLabels[trial.status]}</StatusBadge>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[15px] text-slate-500">
              <Clock3 className="h-4 w-4 text-[#0066cc]" />{sessionLabel}
            </p>
          </div>
        </div>
      </WorkspaceHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={<CalendarDays />} title="Занятие" value={trial.group?.name ?? "Без группы"} note={sessionLabel} />
        <MetricCard icon={<ClipboardCheck />} title="Посещение" value={attendanceLabels[trial.attendanceStatus]} note={trial.attendance?.comment || "Отметка ещё не добавлена"} />
        <MetricCard icon={<CheckCircle />} title="Результат" value={resultLabels[trial.result]} note={trial.nextAction ? `${nextActionLabels[trial.nextAction.type]}${trial.nextAction.dueAt ? ` · ${formatDateTime(trial.nextAction.dueAt)}` : ""}` : trial.outcome?.coachFeedback || "Результат ещё не записан"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <main className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
            <SectionCard title="Занятие" description="Тренировка, к которой привязано пробное">
              <DetailLine label="Дата и время" value={sessionLabel} />
              <DetailLine label="Тренер" value={trial.coach?.fullName || "Не указан"} />
              <DetailLine label="Локация" value={trial.location?.name || "Не указана"} />
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Посещение" description="Фактическая отметка по пробному занятию">
              <DetailLine label="Статус" value={attendanceLabels[trial.attendanceStatus]} />
              <DetailLine label="Отмечено" value={formatDateTime(trial.attendance?.markedAt)} />
              <DetailLine label="Комментарий" value={trial.attendance?.comment || "Нет комментария"} />
            </SectionCard>
            <SectionCard title="Результат" description="Итог занятия и следующий шаг">
              <DetailLine label="Результат" value={resultLabels[trial.result]} />
              <DetailLine label="Комментарий тренера" value={trial.outcome?.coachFeedback || "Нет комментария"} />
              <DetailLine label="Следующее действие" value={trial.nextAction ? `${nextActionLabels[trial.nextAction.type]} · ${formatDateTime(trial.nextAction.dueAt)}` : "Не назначено"} />
            </SectionCard>
          </div>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-5">
          <SectionCard title="Состояние">
            <div className="space-y-4">
              <StateEvent label="Пробное занятие" value={trialStatusLabels[trial.status]} active />
              <StateEvent label="Посещение" value={attendanceLabels[trial.attendanceStatus]} active={trial.attendanceStatus !== "UNMARKED"} />
              <StateEvent label="Результат" value={resultLabels[trial.result]} active={trial.result !== "PENDING"} />
            </div>
          </SectionCard>

          {trial.lead?.phone ? (
            <SectionCard title="Контакт">
              <a href={`tel:${trial.lead.phone}`} className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-black/[0.1] px-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0066cc]">
                <Phone className="h-4 w-4" /> Связаться с контактом
              </a>
            </SectionCard>
          ) : null}
        </aside>
      </div>

      {drawer === "reschedule" && trial.group ? (
        <RescheduleTrialSheet
          groupId={trial.group.id}
          currentSessionId={trial.session?.id}
          initialDate={trial.session?.date}
          close={() => setDrawer()}
          saving={acting}
          onSubmit={(trainingSessionId) =>
            void apply(
              () => TrialsApi.reschedule(
                trial.id,
                trainingSessionId,
              ),
              "Пробное перенесено",
            )
          }
        />
      ) : null}
      {drawer === "cancel" ? (
        <CancelTrialSheet
          close={() => setDrawer()}
          saving={acting}
          onSubmit={(reason) => void apply(() => TrialsApi.cancel(trial.id, reason), "Пробное отменено")}
        />
      ) : null}
      {drawer === "attendance" ? (
        <AttendanceSheet
          close={() => setDrawer()}
          saving={acting}
          onSubmit={(status, comment) => void apply(() => TrialsApi.markAttendance(trial.id, status, comment), "Посещение сохранено")}
        />
      ) : null}
      {drawer === "result" ? (
        <ResultSheet
          close={() => setDrawer()}
          saving={acting}
          onSubmit={(result, groupId, feedback, nextActionType, nextActionAt) => void apply(
            () => TrialsApi.recordResult(trial.id, result, groupId || undefined, feedback || undefined, nextActionType, nextActionAt || undefined),
            "Результат сохранён",
          )}
        />
      ) : null}
    </PageShell>
  );
};

const DetailLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] py-3 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-right text-sm font-medium text-slate-900">{value}</span>
  </div>
);

const StateEvent: React.FC<{ label: string; value: string; active?: boolean }> = ({ label, value, active }) => (
  <div className="relative flex gap-3">
    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-[#0066cc]" : "bg-slate-300"}`} />
    <div className="min-w-0">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
    </div>
  </div>
);

const today = () => new Date().toISOString().slice(0, 10);

const RescheduleTrialSheet: React.FC<{
  groupId: string;
  currentSessionId?: string;
  initialDate?: string;
  close: () => void;
  saving: boolean;
  onSubmit: (trainingSessionId: string) => void;
}> = ({
  groupId,
  currentSessionId,
  initialDate,
  close,
  saving,
  onSubmit,
}) => {
  const [date, setDate] = useState(
    initialDate && initialDate >= today()
      ? initialDate
      : today(),
  );
  const [sessions, setSessions] = useState<
    AdminSessionListItem[]
  >([]);
  const [selectedSessionId, setSelectedSessionId] =
    useState("");
  const [loadingSessions, setLoadingSessions] =
    useState(false);
  const [loadError, setLoadError] = useState<
    string | null
  >(null);

  useEffect(() => {
    let mounted = true;

    setSelectedSessionId("");
    setLoadingSessions(true);
    setLoadError(null);

    void AdminSessionApi
      .listByGroup(
        groupId,
        { from: date, to: date },
        "",
      )
      .then((response) => {
        if (!mounted) return;

        setSessions(
          response.items.filter(
            (session) =>
              session.status === "PLANNED"
              && session.id !== currentSessionId
              && new Date(session.startsAt).getTime()
                > Date.now(),
          ),
        );
      })
      .catch(() => {
        if (mounted) {
          setLoadError(
            "Не удалось загрузить доступные занятия",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoadingSessions(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentSessionId, date, groupId]);

  return (
    <EntitySheet
      title="Перенести пробное занятие"
      description="Выберите другую будущую тренировку текущей группы."
      onClose={close}
      closeDisabled={saving}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
            disabled={saving}
          >
            Отмена
          </Button>

          <Button
            type="button"
            isLoading={saving}
            disabled={!selectedSessionId}
            onClick={() => onSubmit(selectedSessionId)}
          >
            Перенести
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Новая дата
          </span>

          <DatePicker
            min={today()}
            value={date}
            onValueChange={setDate}
          />
        </div>

        {loadingSessions ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Загрузка доступных занятий...
          </div>
        ) : null}

        {!loadingSessions && loadError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {loadError}
          </div>
        ) : null}

        {!loadingSessions
          && !loadError
          && sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              На выбранную дату нет других доступных занятий.
            </div>
          ) : null}

        {!loadingSessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => {
              const selected =
                selectedSessionId === session.id;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() =>
                    setSelectedSessionId(session.id)
                  }
                  className={[
                    "flex w-full items-center justify-between",
                    "rounded-lg border p-3 text-left transition",
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-300",
                  ].join(" ")}
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      {formatTime(session.startsAt)}
                      {"–"}
                      {formatTime(session.endsAt)}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {session.coaches
                        .map((coach) => coach.fullName)
                        .join(", ")
                        || "Тренер не указан"}

                      {session.location?.name
                        ? ` · ${session.location.name}`
                        : ""}
                    </span>
                  </span>

                  <span
                    className={[
                      "rounded-full px-2 py-1",
                      "text-[11px] font-semibold",
                      selected
                        ? "bg-[#0066cc] text-white"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {selected ? "Выбрано" : "Выбрать"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </EntitySheet>
  );
};

const CancelTrialSheet: React.FC<{ close: () => void; saving: boolean; onSubmit: (reason: string) => void }> = ({ close, saving, onSubmit }) => {
  const form = useForm<CancelFormValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: "" },
  });

  return (
    <EntitySheet
      title="Отменить пробное занятие"
      description="Отмена не удаляет запись из истории."
      onClose={close}
      closeDisabled={saving}
      footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="secondary" onClick={close} disabled={saving}>Назад</Button><Button type="submit" form="cancel-trial-form" variant="danger" isLoading={saving}>Отменить</Button></div>}
    >
      <Form {...form}>
        <form id="cancel-trial-form" onSubmit={form.handleSubmit((values) => onSubmit(values.reason))}>
          <ShadcnFormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Причина</FormLabel>
                <FormControl><Textarea autoFocus placeholder="Например: ученик не сможет прийти" {...field} /></FormControl>
                <FormDescription>Причина сохранится в истории пробного занятия.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EntitySheet>
  );
};

const AttendanceSheet: React.FC<{ close: () => void; saving: boolean; onSubmit: (status: TrialAttendanceStatus, comment: string) => void }> = ({ close, saving, onSubmit }) => {
  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: { status: "ATTENDED", comment: "" },
  });

  return (
    <EntitySheet
      title="Отметить посещение"
      description="Сохраните фактическое посещение пробного занятия."
      onClose={close}
      closeDisabled={saving}
      footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="secondary" onClick={close} disabled={saving}>Отмена</Button><Button type="submit" form="attendance-form" isLoading={saving}>Сохранить</Button></div>}
    >
      <Form {...form}>
        <form id="attendance-form" className="space-y-5" onSubmit={form.handleSubmit((values) => onSubmit(values.status, values.comment))}>
          <ShadcnFormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Статус посещения</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Выберите статус" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ATTENDED">Был на занятии</SelectItem>
                    <SelectItem value="NO_SHOW">Не пришёл</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Отметьте фактическое присутствие ученика.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <ShadcnFormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Комментарий</FormLabel>
                <FormControl><Textarea placeholder="Комментарий администратора или тренера" {...field} /></FormControl>
                <FormDescription>Например, причина отсутствия или важное наблюдение.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EntitySheet>
  );
};

const ResultSheet: React.FC<{
  close: () => void;
  saving: boolean;
  onSubmit: (
    result: TrialResult,
    groupId: string,
    feedback: string,
    nextActionType?: TrialNextActionType,
    nextActionAt?: string,
  ) => void;
}> = ({ close, saving, onSubmit }) => {
  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      result: "INTERESTED",
      groupId: "",
      feedback: "",
      nextActionType: "CALL",
      nextActionAt: "",
    },
  });
  const requiresFollowUp = form.watch("result") === "FOLLOW_UP";

  const submit = (values: ResultFormValues) => onSubmit(
    values.result,
    values.groupId.trim(),
    values.feedback.trim(),
    values.result === "FOLLOW_UP" ? values.nextActionType : undefined,
    values.result === "FOLLOW_UP" ? values.nextActionAt : undefined,
  );

  return (
    <EntitySheet
      title="Записать результат"
      description="Зафиксируйте итог пробного и дальнейшую рекомендацию."
      onClose={close}
      closeDisabled={saving}
      footer={<div className="flex w-full justify-end gap-2"><Button type="button" variant="secondary" onClick={close} disabled={saving}>Отмена</Button><Button type="submit" form="result-form" isLoading={saving}>Сохранить результат</Button></div>}
    >
      <Form {...form}>
        <form id="result-form" className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <ShadcnFormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Результат</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Выберите результат" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="INTERESTED">Заинтересован</SelectItem>
                    <SelectItem value="FOLLOW_UP">Нужен follow-up</SelectItem>
                    <SelectItem value="NOT_INTERESTED">Не заинтересован</SelectItem>
                    <SelectItem value="CONVERTED">Конвертирован</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Результат определяет следующий шаг после пробного.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {requiresFollowUp ? <>
            <ShadcnFormField
              control={form.control}
              name="nextActionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Следующее действие</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Выберите действие" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(nextActionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>Что администратор должен сделать дальше.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="nextActionAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Когда выполнить</FormLabel>
                  <FormControl><DateTimePicker value={field.value} onValueChange={field.onChange} aria-invalid={Boolean(form.formState.errors.nextActionAt)} /></FormControl>
                  <FormDescription>Дата и время напоминания для follow-up.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </> : null}

          <ShadcnFormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID рекомендованной группы</FormLabel>
                <FormControl><Input placeholder="UUID группы — необязательно" {...field} /></FormControl>
                <FormDescription>Заполняйте только если конкретная группа уже согласована.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <ShadcnFormField
            control={form.control}
            name="feedback"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Комментарий тренера</FormLabel>
                <FormControl><Textarea placeholder="Уровень, рекомендации, следующий шаг" {...field} /></FormControl>
                <FormDescription>Наблюдения помогут администратору продолжить общение с клиентом.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EntitySheet>
  );
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value))
  : "Не указана";
const formatDateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Не указано";
const formatTime = (value: string) => value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);

export default TrialDetailsPage;
