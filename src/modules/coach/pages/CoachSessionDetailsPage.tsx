import { Button, Input, NativeSelect, StatusBadge, Textarea, ToggleGroup, ToggleGroupItem, type StatusTone } from "../../../shared/ui";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CoachApi,
  CoachSessionDetailsResponse,
  CoachStudentAttendance,
  CoachTrialAttendanceStatus,
  CoachTrialStudent,
  CoachProfileGroup,
  CoachTrialRecommendation,
} from "../coach.api";
import {
  ATTENDANCE_LABELS,
  SESSION_STATUS_META,
  TRIAL_ATTENDANCE_LABELS,
  TRIAL_RECOMMENDATION_LABELS,
} from "../coach.labels";
import toast from "react-hot-toast";

const sessionStatusTones: Record<CoachSessionDetailsResponse["status"], StatusTone> = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  OVERDUE: "warning",
};

const trialAttendanceOptions: Exclude<
  CoachTrialAttendanceStatus,
  "UNMARKED"
>[] = ["ATTENDED", "NO_SHOW"];

const trialRecommendationOptions: CoachTrialRecommendation[] = [
  "RECOMMEND_ENROLLMENT",
  "RECOMMEND_ANOTHER_GROUP",
  "RECOMMEND_REPEAT_TRIAL",
  "NOT_RECOMMENDED",
];

const CoachSessionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<CoachSessionDetailsResponse | null>(null);
  const [students, setStudents] = useState<CoachStudentAttendance[]>([]);
  const [trialStudents, setTrialStudents] = useState<CoachTrialStudent[]>([]);
  const [recommendationGroups, setRecommendationGroups] = useState<CoachProfileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [comment, setComment] = useState("");
  const [incidents, setIncidents] = useState("");
  const [homework, setHomework] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const loadSession = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CoachApi.getSessionDetails(sessionId);
      setSession(data);
      setStudents(data.students ?? []);
      setTrialStudents(data.trialStudents ?? []);
      setTopic(data.report?.topic ?? "");
      setComment(data.report?.coachComment ?? "");
      setIncidents(data.report?.incidents ?? "");
      setHomework(data.report?.homework ?? "");
      setCancelReason(data.cancelReason ?? "");
    } catch {
      setError("Не удалось загрузить данные тренировки");
      setSession(null);
      setStudents([]);
      setTrialStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadSession(id);
  }, [id]);

  useEffect(() => {
    let active = true;

    CoachApi.getProfile()
      .then((profile) => {
        if (active) {
          setRecommendationGroups(profile.groups ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setRecommendationGroups([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const attendanceSummary = useMemo(() => {
    if (session?.status === "COMPLETED" && session.attendanceSummary) {
      return session.attendanceSummary;
    }

    const attended = students.filter(
      (student) => student.attendance === "PRESENT" || student.attendance === "LATE"
    ).length;
    return `${attended}/${students.length}`;
  }, [session?.attendanceSummary, session?.status, students]);

  if (!id) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-rose-600">Тренировка не найдена</div>
        <Link to="/coach/today" className="text-sm text-[#0066cc]">Вернуться на сегодня</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border border-black/[0.12] bg-white px-4 py-3 text-sm text-slate-500">Загрузка...</div>;
  }

  if (error || !session) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error ?? "Не удалось загрузить тренировку"}</div>
        <Link to="/coach/today" className="text-sm text-[#0066cc]">Вернуться на сегодня</Link>
      </div>
    );
  }

  const updateAttendance = (studentId: string, value: CoachStudentAttendance["attendance"]) => {
    setStudents((prev) => prev.map((student) => (student.id === studentId ? { ...student, attendance: value } : student)));
  };

  const persistAttendance = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await CoachApi.updateAttendance(
        id,
        students.map((student) => ({ studentId: student.id, attendance: student.attendance }))
      );
      toast.success("Посещаемость сохранена");
      await loadSession(id);
    } catch {
      toast.error("Не удалось сохранить посещаемость");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await CoachApi.markAllPresent(id);
      await loadSession(id);
      toast.success("Все ученики отмечены как присутствующие");
    } catch {
      toast.error("Не удалось обновить посещаемость");
    } finally {
      setSaving(false);
    }
  };

  const updateTrialAttendance = (
    trialBookingId: string,
    value: Exclude<CoachTrialAttendanceStatus, "UNMARKED">,
  ) => {
    setTrialStudents((prev) =>
      prev.map((trial) =>
        trial.trialBookingId === trialBookingId
          ? { ...trial, attendance: value }
          : trial,
      ),
    );
  };

  const updateTrialAttendanceComment = (
    trialBookingId: string,
    attendanceComment: string,
  ) => {
    setTrialStudents((prev) =>
      prev.map((trial) =>
        trial.trialBookingId === trialBookingId
          ? { ...trial, attendanceComment }
          : trial,
      ),
    );
  };

  const persistTrialAttendance = async (trial: CoachTrialStudent) => {
    if (!id) return;

    if (trial.attendance === "UNMARKED") {
      toast.error("Отметьте пробного ученика");
      return;
    }

    setSaving(true);
    try {
      await CoachApi.markTrialAttendance(
        id,
        trial.trialBookingId,
        trial.attendance,
        trial.attendanceComment?.trim() || undefined,
      );
      toast.success("Пробный ученик отмечен");
      await loadSession(id);
    } catch {
      toast.error("Не удалось сохранить пробного ученика");
    } finally {
      setSaving(false);
    }
  };

  const updateTrialRecommendation = (
    trialBookingId: string,
    coachRecommendation: CoachTrialRecommendation,
  ) => {
    setTrialStudents((prev) =>
      prev.map((trial) =>
        trial.trialBookingId === trialBookingId
          ? {
              ...trial,
              coachRecommendation,
              coachRecommendedGroupId:
                coachRecommendation === "RECOMMEND_ANOTHER_GROUP"
                  ? trial.coachRecommendedGroupId
                  : null,
            }
          : trial,
      ),
    );
  };

  const updateTrialRecommendedGroup = (
    trialBookingId: string,
    coachRecommendedGroupId: string,
  ) => {
    setTrialStudents((prev) =>
      prev.map((trial) =>
        trial.trialBookingId === trialBookingId
          ? { ...trial, coachRecommendedGroupId }
          : trial,
      ),
    );
  };

  const updateTrialRecommendationComment = (
    trialBookingId: string,
    coachRecommendationComment: string,
  ) => {
    setTrialStudents((prev) =>
      prev.map((trial) =>
        trial.trialBookingId === trialBookingId
          ? { ...trial, coachRecommendationComment }
          : trial,
      ),
    );
  };

  const persistTrialRecommendation = async (trial: CoachTrialStudent) => {
    if (!id) return;

    if (!trial.coachRecommendation) {
      toast.error("Выберите рекомендацию");
      return;
    }

    if (
      trial.coachRecommendation === "RECOMMEND_ANOTHER_GROUP" &&
      !trial.coachRecommendedGroupId
    ) {
      toast.error("Выберите рекомендуемую группу");
      return;
    }

    setSaving(true);
    try {
      await CoachApi.recordTrialRecommendation(
        id,
        trial.trialBookingId,
        trial.coachRecommendation,
        trial.coachRecommendedGroupId ?? undefined,
        trial.coachRecommendationComment?.trim() || undefined,
      );
      toast.success("Рекомендация сохранена");
      await loadSession(id);
    } catch {
      toast.error("Не удалось сохранить рекомендацию");
    } finally {
      setSaving(false);
    }
  };

  const saveReport = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await CoachApi.saveReport(id, {
        topic,
        coachComment: comment,
        incidents,
        homework,
      });
      toast.success("Отчет сохранен");
      await loadSession(id);
    } catch {
      toast.error("Не удалось сохранить отчет");
    } finally {
      setSaving(false);
    }
  };

  const runStatusAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    if (!id) return;
    setSaving(true);
    try {
      await fn();
      toast.success(successMessage);
      await loadSession(id);
    } catch {
      toast.error("Не удалось выполнить действие");
    } finally {
      setSaving(false);
    }
  };

  const statusMeta = SESSION_STATUS_META[session.status];
  const isPlanned = session.status === "PLANNED";
  const isInProgress = session.status === "IN_PROGRESS";
  const isOverdue = session.status === "OVERDUE";
  const isCompleted = session.status === "COMPLETED";
  const isCancelled = session.status === "CANCELLED";
  const canEditAttendance = isInProgress || isOverdue;
  const canEditReport = isInProgress || isOverdue;
  const canStart = isPlanned;
  const canComplete = isInProgress || isOverdue;
  const canCancel = isPlanned || isInProgress;
  const hasRequiredReportFields = Boolean(topic.trim());
  const hasUnmarkedStudents = students.some((student) => !student.attendance);
  const canSaveAttendance = canEditAttendance && !hasUnmarkedStudents;
  const canSaveReport = canEditReport && hasRequiredReportFields;
  const canCompleteNow =
    canComplete && !hasUnmarkedStudents && (isInProgress ? true : hasRequiredReportFields);

  const nextStepText = (() => {
    if (isPlanned) return "Начните тренировку, когда группа готова.";
    if (isInProgress) return "Отметьте учеников и заполните короткий отчет.";
    if (isOverdue) return "Проверьте посещаемость, заполните отчет и закройте тренировку.";
    if (isCompleted) return "Тренировка завершена. Доступен только просмотр.";
    if (isCancelled) return "Тренировка отменена.";
    return "";
  })();

  const primaryActionLabel = canStart
    ? "Начать тренировку"
    : isOverdue
    ? "Закрыть тренировку"
    : canComplete
    ? "Завершить тренировку"
    : null;

  const runPrimaryAction = async () => {
    if (!primaryActionLabel) return;
    if (hasUnmarkedStudents) {
      toast.error("Отметьте посещаемость для всех учеников");
      return;
    }
    if (isOverdue && !hasRequiredReportFields) {
      toast.error("Укажите тему тренировки");
      return;
    }
    if (canStart) {
      await runStatusAction(() => CoachApi.startSession(id), "Тренировка начата");
      return;
    }
    if (isOverdue) {
      setSaving(true);
      try {
        await CoachApi.updateAttendance(
          id,
          students.map((student) => ({ studentId: student.id, attendance: student.attendance }))
        );
        await CoachApi.saveReport(id, {
          topic,
          coachComment: comment,
          incidents,
          homework,
        });
        await CoachApi.completeSession(id);
        toast.success("Тренировка закрыта");
        await loadSession(id);
      } catch {
        toast.error("Не удалось закрыть тренировку");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (canComplete) {
      await runStatusAction(() => CoachApi.completeSession(id), "Тренировка завершена");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/[0.12] bg-white p-5 ">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="ui-page-title">Карточка тренировки</h1>
            <p className="mt-1 text-sm text-slate-500">Группа: {session.groupName}</p>
          </div>
          <StatusBadge tone={sessionStatusTones[session.status]}>{statusMeta.label}</StatusBadge>
        </div>
        <div className="mt-4 rounded-2xl bg-blue-50/80 px-4 py-3 text-sm text-[#0066cc]">
          {nextStepText}
        </div>
        {(primaryActionLabel || canCancel) && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            {primaryActionLabel ? (
              <Button
                disabled={saving || (canComplete && !canCompleteNow)}
                onClick={runPrimaryAction}
                className="w-full"
                title={canComplete && !canCompleteNow ? "Сначала заполните отчет" : undefined}
              >
                {saving ? "Сохранение..." : primaryActionLabel}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                disabled={saving}
                onClick={() =>
                  runStatusAction(
                    () => CoachApi.cancelSession(id, cancelReason || "Не указано"),
                    "Тренировка отменена"
                  )
                }
                variant="softDanger"
                className="w-full"
              >
                Отменить
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-black/[0.12] bg-white p-3 text-sm ">
        <div>
          <div className="text-[11px] uppercase text-slate-700/45">Дата</div>
          <div className="mt-1 font-medium text-slate-950">{session.date}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-700/45">Время</div>
          <div className="mt-1 font-medium text-slate-950">{session.time}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-700/45">Было</div>
          <div className="mt-1 font-medium text-slate-950">{attendanceSummary}</div>
        </div>
      </div>

      {canEditAttendance && (
        <div className="rounded-2xl border border-black/[0.12] bg-white p-4 ">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="ui-section-title">Посещаемость</h2>
              {isOverdue ? (
                <p className="mt-1 text-xs text-amber-700">
                  Проверьте перед закрытием тренировки.
                </p>
              ) : null}
            </div>
            <Button
              onClick={handleMarkAllPresent}
              disabled={saving}
              variant="secondary"
              size="sm"
            >
              Все были
            </Button>
          </div>
          {hasUnmarkedStudents ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Отметьте посещаемость для всех учеников перед сохранением.
            </div>
          ) : null}
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="rounded-xl border border-black/[0.06] bg-[#fbfdfb] p-3">
                <div className="text-sm text-slate-950">{student.name}</div>
                <ToggleGroup type="single" value={student.attendance ?? ""} onValueChange={(value) => value && updateAttendance(student.id, value as CoachStudentAttendance["attendance"])} variant="outline" className="mt-2 flex-wrap justify-start">
                  {(Object.keys(ATTENDANCE_LABELS) as CoachStudentAttendance["attendance"][]).map((state) => <ToggleGroupItem key={state} value={state} size="sm">{ATTENDANCE_LABELS[state]}</ToggleGroupItem>)}
                </ToggleGroup>
              </div>
            ))}
          </div>
          <Button
            disabled={saving || !canSaveAttendance}
            onClick={persistAttendance}
            className="mt-3 w-full"
            title={!canSaveAttendance ? "Отметьте всех учеников" : undefined}
          >
            Сохранить посещаемость
          </Button>
        </div>
      )}

      {trialStudents.length > 0 ? (
        <div className="rounded-2xl border border-black/[0.12] bg-white p-4">
          <div className="mb-3">
            <h2 className="ui-section-title">Пробные ученики</h2>
            <p className="mt-1 text-xs text-slate-500">
              Пробные отмечаются отдельно и не влияют на посещаемость группы.
            </p>
          </div>

          <div className="space-y-3">
            {trialStudents.map((trial) => {
              const canSaveTrialAttendance =
                canEditAttendance && trial.attendance !== "UNMARKED";

              return (
                <div
                  key={trial.trialBookingId}
                  className="rounded-xl border border-black/[0.06] bg-[#fbfdfb] p-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-950">
                        {trial.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {trial.age ? `${trial.age} лет` : "Возраст не указан"}
                      </div>
                    </div>

                    {!canEditAttendance ? (
                      <StatusBadge tone={trial.attendance === "ATTENDED" ? "success" : trial.attendance === "NO_SHOW" ? "danger" : "neutral"}>
                        {TRIAL_ATTENDANCE_LABELS[trial.attendance]}
                      </StatusBadge>
                    ) : null}
                  </div>

                  {canEditAttendance ? (
                    <>
                      <ToggleGroup
                        type="single"
                        value={trial.attendance === "UNMARKED" ? "" : trial.attendance}
                        onValueChange={(value) =>
                          value &&
                          updateTrialAttendance(
                            trial.trialBookingId,
                            value as Exclude<CoachTrialAttendanceStatus, "UNMARKED">,
                          )
                        }
                        variant="outline"
                        className="mt-2 flex-wrap justify-start"
                      >
                        {trialAttendanceOptions.map((state) => (
                          <ToggleGroupItem key={state} value={state} size="sm">
                            {TRIAL_ATTENDANCE_LABELS[state]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>

                      <Textarea
                        value={trial.attendanceComment ?? ""}
                        onChange={(event) =>
                          updateTrialAttendanceComment(
                            trial.trialBookingId,
                            event.target.value,
                          )
                        }
                        placeholder="Комментарий по пробному ученику"
                        className="mt-2 w-full rounded-xl border border-black/[0.12] px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100"
                        rows={2}
                      />

                      <Button
                        disabled={saving || !canSaveTrialAttendance}
                        onClick={() => persistTrialAttendance(trial)}
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        title={!canSaveTrialAttendance ? "Отметьте пробного ученика" : undefined}
                      >
                        Сохранить пробного
                      </Button>
                    </>
                  ) : trial.attendanceComment ? (
                    <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {trial.attendanceComment}
                    </div>
                  ) : null}

                  {isCompleted && trial.attendance === "ATTENDED" ? (
                    <div className="mt-3 border-t border-black/[0.06] pt-3">
                      <div className="text-xs font-medium uppercase text-slate-500">
                        Рекомендация тренера
                      </div>

                      <ToggleGroup
                        type="single"
                        value={trial.coachRecommendation ?? ""}
                        onValueChange={(value) =>
                          value &&
                          updateTrialRecommendation(
                            trial.trialBookingId,
                            value as CoachTrialRecommendation,
                          )
                        }
                        variant="outline"
                        className="mt-2 flex-wrap justify-start"
                      >
                        {trialRecommendationOptions.map((recommendation) => (
                          <ToggleGroupItem
                            key={recommendation}
                            value={recommendation}
                            size="sm"
                          >
                            {TRIAL_RECOMMENDATION_LABELS[recommendation]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>

                      {trial.coachRecommendation === "RECOMMEND_ANOTHER_GROUP" ? (
                        <NativeSelect
                          value={trial.coachRecommendedGroupId ?? ""}
                          onChange={(event) =>
                            updateTrialRecommendedGroup(
                              trial.trialBookingId,
                              event.target.value,
                            )
                          }
                          className="mt-2"
                        >
                          <option value="">Выберите группу</option>
                          {recommendationGroups.map((group) => (
                            <option key={group.groupId} value={group.groupId}>
                              {group.groupName}
                            </option>
                          ))}
                        </NativeSelect>
                      ) : null}

                      <Textarea
                        value={trial.coachRecommendationComment ?? ""}
                        onChange={(event) =>
                          updateTrialRecommendationComment(
                            trial.trialBookingId,
                            event.target.value,
                          )
                        }
                        placeholder="Комментарий или рекомендация тренера"
                        className="mt-2 w-full rounded-xl border border-black/[0.12] px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100"
                        rows={2}
                      />

                      <Button
                        disabled={saving || !trial.coachRecommendation}
                        onClick={() => persistTrialRecommendation(trial)}
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                      >
                        Сохранить рекомендацию
                      </Button>
                    </div>
                  ) : trial.coachRecommendation ? (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">
                        {TRIAL_RECOMMENDATION_LABELS[trial.coachRecommendation]}
                      </div>
                      {trial.coachRecommendationComment ? (
                        <div className="mt-1">{trial.coachRecommendationComment}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {canEditReport ? (
      <div className="space-y-3 rounded-2xl border border-black/[0.12] bg-white p-4 ">
        <div>
          <h2 className="ui-section-title">Отчет тренера</h2>
        </div>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема тренировки" className="w-full rounded-xl border border-black/[0.12] px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100" />
        {!hasRequiredReportFields ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Укажите тему тренировки перед сохранением отчета.
          </div>
        ) : null}
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий тренера" className="w-full rounded-xl border border-black/[0.12] px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100" rows={3} />
        <Textarea value={incidents} onChange={(e) => setIncidents(e.target.value)} placeholder="Инциденты или важные заметки" className="w-full rounded-xl border border-black/[0.12] px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100" rows={2} />
        <Textarea value={homework} onChange={(e) => setHomework(e.target.value)} placeholder="Домашнее задание" className="w-full rounded-xl border border-black/[0.12] px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100" rows={2} />
        <Button
          disabled={saving || !canSaveReport}
          onClick={saveReport}
          className="w-full"
          title={!canSaveReport ? "Укажите тему тренировки" : undefined}
        >
          Сохранить отчет
        </Button>
      </div>
      ) : isCompleted ? (
        <div className="space-y-3 rounded-2xl border border-black/[0.12] bg-white p-4 text-sm ">
          <h2 className="ui-section-title">Отчет тренера</h2>
          <div className="space-y-2 text-slate-600">
            <div><span className="font-medium text-slate-950">Тема:</span> {topic || "Не указано"}</div>
            <div><span className="font-medium text-slate-950">Комментарий:</span> {comment || "Не указано"}</div>
            <div><span className="font-medium text-slate-950">Инциденты:</span> {incidents || "Нет"}</div>
            <div><span className="font-medium text-slate-950">Домашнее задание:</span> {homework || "Не указано"}</div>
          </div>
        </div>
      ) : isCancelled ? (
        <div className="rounded-2xl border border-rose-100 bg-white p-4 text-sm ">
          <h2 className="text-sm font-semibold text-rose-900">Причина отмены</h2>
          <div className="mt-2 text-rose-800/75">{cancelReason || "Не указано"}</div>
        </div>
      ) : null}
    </div>
  );
};

export default CoachSessionDetailsPage;
