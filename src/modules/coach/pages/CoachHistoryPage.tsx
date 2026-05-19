import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CoachApi, CoachHistoryItem } from "../coach.api";
import { SESSION_STATUS_META } from "../coach.labels";

const CoachHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<CoachHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 2);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await CoachApi.getHistory(period.from, period.to, 0, 20);
        if (!mounted) return;
        setHistory(response.content ?? []);
      } catch {
        if (!mounted) return;
        setError("Не удалось загрузить историю");
        setHistory([]);
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
        <h1 className="heading-font text-xl font-semibold text-teal-950">История</h1>
        <p className="mt-1 text-sm text-teal-900/65">Прошедшие тренировки, посещаемость и готовность отчёта.</p>
      </div>

      <div className="space-y-2">
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {loading && <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-teal-900/70">Загрузка...</div>}
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
        {!loading && history.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">История пуста.</div>
        )}
      </div>
    </div>
  );
};

export default CoachHistoryPage;
