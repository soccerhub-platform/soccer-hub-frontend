import React from "react";
import { Link } from "react-router-dom";
import { COACH_SESSIONS } from "../mock/coach.mock";
import { SESSION_STATUS_META } from "../coach.labels";

const CoachHistoryPage: React.FC = () => {
  const history = COACH_SESSIONS.filter((session) => session.date < "2026-05-18");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="heading-font text-xl font-semibold text-teal-950">История</h1>
        <p className="mt-1 text-sm text-teal-900/65">Прошедшие тренировки, посещаемость и готовность отчёта.</p>
      </div>

      <div className="space-y-2">
        {history.map((session) => (
          <Link
            to={`/coach/sessions/${session.id}`}
            key={session.id}
            className="block rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5"
          >
            <div className="text-sm font-medium text-teal-950">{session.date} · {session.groupName}</div>
            <div className="mt-1 text-xs text-teal-900/65">Статус: {SESSION_STATUS_META[session.status].label}</div>
            <div className="text-xs text-teal-900/65">Посещаемость: {session.attendanceSummary}</div>
            <div className="text-xs text-teal-900/65">Отчёт: {session.reportDone ? "заполнен" : "ожидает заполнения"}</div>
          </Link>
        ))}
        {history.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">История пуста.</div>
        )}
      </div>
    </div>
  );
};

export default CoachHistoryPage;
