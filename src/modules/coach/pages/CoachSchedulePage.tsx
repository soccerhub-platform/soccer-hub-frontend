import React, { useEffect, useMemo, useState } from "react";
import { CoachApi, CoachScheduleDay } from "../coach.api";
import { SESSION_STATUS_META } from "../coach.labels";

const CoachSchedulePage: React.FC = () => {
  const [days, setDays] = useState<CoachScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 6);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await CoachApi.getSchedule(period.from, period.to);
        if (!mounted) return;
        setDays(response.days ?? []);
      } catch {
        if (!mounted) return;
        setError("Не удалось загрузить расписание");
        setDays([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [period.from, period.to]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="heading-font text-xl font-semibold text-teal-950">Расписание</h1>
        <p className="mt-1 text-sm text-teal-900/65">Тренировки сгруппированы по дням недели.</p>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-teal-900/70">Загрузка...</div>}

      {days.map((day) => (
        <div key={day.date} className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5">
          <div className="text-sm font-semibold text-teal-950">{day.date}</div>
          <div className="mt-2 space-y-2">
            {day.sessions.map((session) => (
              <div key={session.id} className="rounded-2xl bg-teal-50/70 px-3 py-3 text-sm">
                <div className="font-medium text-teal-950">{session.time} — {session.groupName}</div>
                <div className="mt-1 text-xs text-teal-900/65">Статус: {SESSION_STATUS_META[session.status].label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && days.length === 0 && (
        <div className="rounded-2xl border border-teal-100 bg-white p-4 text-sm text-teal-900/65">Расписание на выбранную неделю пустое.</div>
      )}
    </div>
  );
};

export default CoachSchedulePage;
