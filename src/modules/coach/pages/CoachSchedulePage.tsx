import React, { useMemo } from "react";
import { COACH_SESSIONS } from "../mock/coach.mock";
import { SESSION_STATUS_META } from "../coach.labels";

const CoachSchedulePage: React.FC = () => {
  const grouped = useMemo(() => {
    return COACH_SESSIONS.reduce<Record<string, typeof COACH_SESSIONS>>((acc, session) => {
      acc[session.date] = acc[session.date] ?? [];
      acc[session.date].push(session);
      return acc;
    }, {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="heading-font text-xl font-semibold text-teal-950">Расписание</h1>
        <p className="mt-1 text-sm text-teal-900/65">Тренировки сгруппированы по дням недели.</p>
      </div>

      {Object.entries(grouped).map(([date, sessions]) => (
        <div key={date} className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
          <div className="text-sm font-semibold text-teal-950">{date}</div>
          <div className="mt-2 space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-2xl bg-teal-50/70 px-3 py-3 text-sm">
                <div className="font-medium text-teal-950">{session.time} — {session.groupName}</div>
                <div className="mt-1 text-xs text-teal-900/65">Статус: {SESSION_STATUS_META[session.status].label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CoachSchedulePage;
