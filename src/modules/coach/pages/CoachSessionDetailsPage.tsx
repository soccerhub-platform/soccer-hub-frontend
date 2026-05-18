import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { COACH_SESSIONS, CoachStudentAttendance } from "../mock/coach.mock";
import { ATTENDANCE_LABELS, SESSION_STATUS_META } from "../coach.labels";

const CoachSessionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const session = COACH_SESSIONS.find((item) => item.id === id);
  const [students, setStudents] = useState<CoachStudentAttendance[]>(session?.students ?? []);
  const [topic, setTopic] = useState("");
  const [comment, setComment] = useState("");
  const [incidents, setIncidents] = useState("");
  const [homework, setHomework] = useState("");

  const attendanceSummary = useMemo(() => {
    const present = students.filter((student) => student.attendance === "PRESENT").length;
    return `${present}/${students.length}`;
  }, [students]);

  if (!session) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-rose-600">Тренировка не найдена</div>
        <Link to="/coach/today" className="text-sm text-cyan-700">Вернуться на сегодня</Link>
      </div>
    );
  }

  const setAllPresent = () => {
    setStudents((prev) => prev.map((student) => ({ ...student, attendance: "PRESENT" })));
  };

  const updateAttendance = (studentId: string, value: CoachStudentAttendance["attendance"]) => {
    setStudents((prev) => prev.map((student) => (student.id === studentId ? { ...student, attendance: value } : student)));
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
          <button onClick={setAllPresent} className="rounded-xl border border-teal-100 px-3 py-2 text-xs font-medium text-teal-900 hover:bg-teal-50">
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
      </div>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <button className="rounded-xl bg-teal-950 px-3 py-2 text-xs font-medium text-white">Начать</button>
        <button className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-medium text-white">Сохранить посещаемость</button>
        <button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white">Завершить</button>
        <button className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white">Отменить</button>
      </div>
    </div>
  );
};

export default CoachSessionDetailsPage;
