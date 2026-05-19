import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CoachApi, CoachSessionDetailsResponse, CoachStudentAttendance } from "../coach.api";
import { ATTENDANCE_LABELS, SESSION_STATUS_META } from "../coach.labels";
import toast from "react-hot-toast";

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
    const present = students.filter((student) => student.attendance === "PRESENT").length;
    return `${present}/${students.length}`;
  }, [students]);

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
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-3xl border border-teal-100 bg-white p-4 text-sm shadow-sm shadow-teal-900/5">
        <div>Дата: {session.date}</div>
        <div>Время: {session.time}</div>
        <div>Статус: {statusMeta.label}</div>
        <div>Посещаемость: {attendanceSummary}</div>
      </div>

      <div className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-teal-950">Посещаемость</h2>
            <p className="text-xs text-teal-900/60">Отметьте каждого ученика перед завершением тренировки.</p>
          </div>
          <button onClick={handleMarkAllPresent} disabled={saving} className="rounded-xl border border-teal-100 px-3 py-2 text-xs font-medium text-teal-900 hover:bg-teal-50 disabled:opacity-60">
            Все были
          </button>
        </div>
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
      </div>

      <div className="space-y-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
        <div>
          <h2 className="text-sm font-semibold text-teal-950">Отчет тренера</h2>
          <p className="text-xs text-teal-900/60">Коротко зафиксируйте тему, прогресс и домашнее задание.</p>
        </div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема тренировки" className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий тренера" className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={3} />
        <textarea value={incidents} onChange={(e) => setIncidents(e.target.value)} placeholder="Инциденты или важные заметки" className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={2} />
        <textarea value={homework} onChange={(e) => setHomework(e.target.value)} placeholder="Домашнее задание" className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={2} />
        {session.status === "CANCELLED" && (
          <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Причина отмены" className="w-full rounded-xl border border-teal-100 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100" rows={2} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <button disabled={saving} onClick={() => runStatusAction(() => CoachApi.startSession(id), "Тренировка начата")} className="rounded-xl bg-teal-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">Начать</button>
        <button disabled={saving} onClick={persistAttendance} className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">Сохранить посещаемость</button>
        <button disabled={saving} onClick={saveReport} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">Сохранить отчет</button>
        <button disabled={saving} onClick={() => runStatusAction(() => CoachApi.completeSession(id), "Тренировка завершена")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">Завершить</button>
        <button disabled={saving} onClick={() => runStatusAction(() => CoachApi.cancelSession(id, cancelReason || "Не указано"), "Тренировка отменена")} className="col-span-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">Отменить тренировку</button>
      </div>
    </div>
  );
};

export default CoachSessionDetailsPage;
