import React from "react";
import { Link } from "react-router-dom";
import { CheckCircleIcon, ClipboardDocumentCheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import { COACH_SESSIONS } from "../mock/coach.mock";
import { SESSION_STATUS_META } from "../coach.labels";

const today = "2026-05-18";

const CoachTodayPage: React.FC = () => {
  const todaySessions = COACH_SESSIONS.filter((session) => session.date === today);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm shadow-teal-900/5">
        <div className="heading-font text-xl font-semibold text-teal-950">Сегодня</div>
        <p className="mt-1 text-sm text-teal-900/65">
          Здесь собраны тренировки на день. Откройте карточку, отметьте посещаемость и заполните короткий отчет.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-teal-50 p-3">
            <ClockIcon className="h-5 w-5 text-teal-700" />
            <div className="mt-2 text-lg font-semibold text-teal-950">{todaySessions.length}</div>
            <div className="text-[11px] text-teal-800/65">тренировки</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-amber-700" />
            <div className="mt-2 text-lg font-semibold text-amber-900">
              {todaySessions.filter((s) => s.status === "OVERDUE").length}
            </div>
            <div className="text-[11px] text-amber-800/70">отчета ждут</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <CheckCircleIcon className="h-5 w-5 text-emerald-700" />
            <div className="mt-2 text-lg font-semibold text-emerald-900">
              {todaySessions.filter((s) => s.status === "COMPLETED").length}
            </div>
            <div className="text-[11px] text-emerald-800/70">готово</div>
          </div>
        </div>
      </div>

      {todaySessions.map((session) => {
        const meta = SESSION_STATUS_META[session.status];
        return (
          <div key={session.id} className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
            <div className="flex items-center justify-between">
              <div className="heading-font text-lg font-semibold text-teal-950">{session.time}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}>{meta.label}</span>
            </div>
            <div className="mt-3 text-base font-medium text-teal-950">{session.groupName}</div>
            <div className="mt-1 text-sm text-teal-900/60">Учеников в группе: {session.studentCount}</div>
            <Link
              to={`/coach/sessions/${session.id}`}
              className="mt-4 inline-flex w-full justify-center rounded-2xl bg-teal-950 px-3 py-3 text-sm font-semibold text-white"
            >
              {meta.action}
            </Link>
          </div>
        );
      })}

      {todaySessions.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">На сегодня сессий нет.</div>
      )}
    </div>
  );
};

export default CoachTodayPage;
