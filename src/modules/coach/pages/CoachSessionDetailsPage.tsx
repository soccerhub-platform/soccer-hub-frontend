import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CoachApi, CoachSessionDetailsResponse, CoachStudentAttendance } from "../coach.api";
import { ATTENDANCE_LABELS, SESSION_STATUS_META } from "../coach.labels";
import toast from "react-hot-toast";

const primaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-950 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";
const saveButtonClassName =
  "inline-flex h-10 w-full items-center justify-center rounded-xl px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60";

const CoachSessionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<CoachSessionDetailsResponse | null>(null);
  const [students, setStudents] = useState<CoachStudentAttendance[]>([]);
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
      setTopic(data.report?.topic ?? "");
      setComment(data.report?.coachComment ?? "");
      setIncidents(data.report?.incidents ?? "");
      setHomework(data.report?.homework ?? "");
      setCancelReason(data.cancelReason ?? "");
    } catch {
      setError("Не удалось загрузить данные тренировки");
      setSession(null);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadSession(id);
  }, [id]);

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
        <Link to="/coach/today" className="text-sm text-cyan-700">Вернуться на сегодня</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-teal-900/70">Загрузка...</div>;
  }

  if (error || !session) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error ?? "Не удалось загрузить тренировку"}</div>
        <Link to="/coach/today" className="text-sm text-cyan-700">Вернуться на сегодня</Link>
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
  const hasReportData = Boolean(
    topic.trim() || comment.trim() || incidents.trim() || homework.trim()
  );
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
      <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm shadow-teal-900/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="heading-font text-xl font-semibold text-teal-950">Карточка тренировки</h1>
            <p className="mt-1 text-sm text-teal-900/65">Группа: {session.groupName}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.tone}`}>{statusMeta.label}</span>
        </div>
        <div className="mt-4 rounded-2xl bg-cyan-50/80 px-4 py-3 text-sm text-cyan-900">
          {nextStepText}
        </div>
        {(primaryActionLabel || canCancel) && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            {primaryActionLabel ? (
              <button
                disabled={saving || (canComplete && !canCompleteNow)}
                onClick={runPrimaryAction}
                className={primaryButtonClassName}
                title={canComplete && !canCompleteNow ? "Сначала заполните отчет" : undefined}
              >
                {saving ? "Сохранение..." : primaryActionLabel}
              </button>
            ) : null}
            {canCancel ? (
              <button
                disabled={saving}
                onClick={() =>
                  runStatusAction(
                    () => CoachApi.cancelSession(id, cancelReason || "Не указано"),
                    "Тренировка отменена"
                  )
                }
                className={secondaryButtonClassName}
              >
                Отменить
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-teal-100 bg-white p-3 text-sm shadow-sm shadow-teal-900/5">
        <div>
          <div className="text-[11px] uppercase text-teal-900/45">Дата</div>
          <div className="mt-1 font-medium text-teal-950">{session.date}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-teal-900/45">Время</div>
          <div className="mt-1 font-medium text-teal-950">{session.time}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-teal-900/45">Было</div>
          <div className="mt-1 font-medium text-teal-950">{attendanceSummary}</div>
        </div>
      </div>

      {canEditAttendance && (
        <div className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-teal-950">Посещаемость</h2>
              {isOverdue ? (
                <p className="mt-1 text-xs text-amber-700">
                  Проверьте перед закрытием тренировки.
                </p>
              ) : null}
            </div>
            <button
              onClick={handleMarkAllPresent}
              disabled={saving}
              className="rounded-xl border border-teal-100 px-3 py-2 text-xs font-medium text-teal-900 hover:bg-teal-50 disabled:opacity-60"
            >
              Все были
            </button>
          </div>
          {hasUnmarkedStudents ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Отметьте посещаемость для всех учеников перед сохранением.
            </div>
          ) : null}
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="rounded-xl border border-teal-50 bg-[#fbfdfb] p-3">
                <div className="text-sm text-teal-950">{student.name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(ATTENDANCE_LABELS) as CoachStudentAttendance["attendance"][]).map((state) => (
                    <button
                      key={state}
                      onClick={() => updateAttendance(student.id, state)}
                      className={`rounded-lg px-2 py-1 text-xs ${
                        student.attendance === state ? "bg-teal-950 text-white" : "bg-teal-50 text-teal-900"
                      }`}
                    >
                      {ATTENDANCE_LABELS[state]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            disabled={saving || !canSaveAttendance}
            onClick={persistAttendance}
            className={`${saveButtonClassName} mt-3 bg-teal-800 hover:bg-teal-700`}
            title={!canSaveAttendance ? "Отметьте всех учеников" : undefined}
          >
            Сохранить посещаемость
          </button>
        </div>
      )}

      {canEditReport ? (
      <div className="space-y-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
        <div>
          <h2 className="text-sm font-semibold text-teal-950">Отчет тренера</h2>
        </div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема тренировки" className="w-full rounded-xl border border-teal-100 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" />
        {!hasRequiredReportFields ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Укажите тему тренировки перед сохранением отчета.
          </div>
        ) : null}
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий тренера" className="w-full rounded-xl border border-teal-100 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={3} />
        <textarea value={incidents} onChange={(e) => setIncidents(e.target.value)} placeholder="Инциденты или важные заметки" className="w-full rounded-xl border border-teal-100 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={2} />
        <textarea value={homework} onChange={(e) => setHomework(e.target.value)} placeholder="Домашнее задание" className="w-full rounded-xl border border-teal-100 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={2} />
        <button
          disabled={saving || !canSaveReport}
          onClick={saveReport}
          className={`${saveButtonClassName} bg-slate-800 hover:bg-slate-700`}
          title={!canSaveReport ? "Укажите тему тренировки" : undefined}
        >
          Сохранить отчет
        </button>
      </div>
      ) : isCompleted ? (
        <div className="space-y-3 rounded-3xl border border-teal-100 bg-white p-4 text-sm shadow-sm shadow-teal-900/5">
          <h2 className="text-sm font-semibold text-teal-950">Отчет тренера</h2>
          <div className="space-y-2 text-teal-900/75">
            <div><span className="font-medium text-teal-950">Тема:</span> {topic || "Не указано"}</div>
            <div><span className="font-medium text-teal-950">Комментарий:</span> {comment || "Не указано"}</div>
            <div><span className="font-medium text-teal-950">Инциденты:</span> {incidents || "Нет"}</div>
            <div><span className="font-medium text-teal-950">Домашнее задание:</span> {homework || "Не указано"}</div>
          </div>
        </div>
      ) : isCancelled ? (
        <div className="rounded-3xl border border-rose-100 bg-white p-4 text-sm shadow-sm shadow-teal-900/5">
          <h2 className="text-sm font-semibold text-rose-900">Причина отмены</h2>
          <div className="mt-2 text-rose-800/75">{cancelReason || "Не указано"}</div>
        </div>
      ) : null}
    </div>
  );
};

export default CoachSessionDetailsPage;
