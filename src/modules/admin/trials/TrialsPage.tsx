import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, ErrorState, LoadingState, PageShell, WorkspaceBreadcrumbs, WorkspaceMetric } from "../../../shared/ui";
import { TrialsApi, attendanceLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialBookingListItem, TrialBookingStatus, TrialDetails, TrialsPageResponse } from "./trials.types";

const TrialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<TrialsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const status = (searchParams.get("status") ?? "all") as TrialBookingStatus | "all";
  const page = Math.max(Number(searchParams.get("page") ?? 0), 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await TrialsApi.list({ status, page, size: 20 }));
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось загрузить пробные занятия"));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);

  const updateQuery = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const metrics = useMemo(() => {
    const items = data?.content ?? [];
    return {
      scheduled: items.filter((item) => item.status === "SCHEDULED" || item.status === "CONFIRMED").length,
      completed: items.filter((item) => item.status === "COMPLETED").length,
      unmarked: items.filter((item) => item.attendanceStatus === "UNMARKED").length,
    };
  }, [data]);

  return (
    <PageShell className="space-y-4">
      <WorkspaceBreadcrumbs items={[{ label: "Пробные занятия" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-font text-3xl font-semibold text-slate-950">Пробные занятия</h1>
          <p className="mt-1 text-sm text-slate-500">Контроль назначенных пробных и их результатов</p>
        </div>
        <select value={status} onChange={(event) => updateQuery("status", event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
          <option value="all">Все статусы</option>
          {Object.entries(trialStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceMetric icon={<CalendarDaysIcon />} label="Запланированы" value={metrics.scheduled} note="Ожидают занятия" />
        <WorkspaceMetric icon={<CheckCircleIcon />} label="Завершены" value={metrics.completed} note="Посещение отмечено" />
        <WorkspaceMetric icon={<ClipboardDocumentCheckIcon />} label="Без отметки" value={metrics.unmarked} note="Требуют внимания" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="p-6"><LoadingState label="Загрузка пробных занятий..." /></div> : error ? <div className="p-6"><ErrorState title="Пробные недоступны" message={error} onRetry={() => void load()} /></div> : data?.content.length ? <>
          <div className="hidden grid-cols-[minmax(190px,1.2fr)_minmax(170px,1fr)_150px_150px_150px_40px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
            <span>Ученик</span><span>Занятие</span><span>Статус</span><span>Посещение</span><span>Результат</span><span />
          </div>
          <div className="divide-y divide-slate-100">
            {data.content.map((item) => <TrialRow key={item.id} item={item} onOpen={() => navigate(`/admin/trials/${item.id}/overview`)} />)}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <span className="text-xs text-slate-500">Страница {data.number + 1} из {Math.max(data.totalPages, 1)}</span>
            <div className="flex gap-2"><Button size="sm" variant="secondary" rounded="rounded-lg" disabled={data.number <= 0} onClick={() => updateQuery("page", String(data.number - 1))}><ChevronLeftIcon className="h-4 w-4" /></Button><Button size="sm" variant="secondary" rounded="rounded-lg" disabled={data.number + 1 >= data.totalPages} onClick={() => updateQuery("page", String(data.number + 1))}><ChevronRightIcon className="h-4 w-4" /></Button></div>
          </div>
        </> : <div className="p-8"><EmptyState title="Пробных занятий пока нет" description="Назначенные пробные появятся в этом реестре." /></div>}
      </div>
    </PageShell>
  );
};

const TrialRow: React.FC<{ item: TrialBookingListItem | TrialDetails; onOpen: () => void }> = ({ item, onOpen }) => {
  const listItem = "studentId" in item;
  const details = listItem ? null : item as TrialDetails;

  return (
  <button type="button" onClick={onOpen} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(190px,1.2fr)_minmax(170px,1fr)_150px_150px_150px_40px] lg:items-center lg:gap-4">
    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-950">{details?.student?.fullName ?? (listItem && item.studentId ? `Ученик ${item.studentId.slice(0, 8)}` : listItem ? "Участник лида" : "Ученик")}</span><span className="mt-1 block truncate text-xs text-slate-500">ID пробного: {item.id.slice(0, 8)}</span></span>
    <span className="min-w-0"><span className="block truncate text-sm text-slate-700">{details?.session ? `${details.session.date} · ${details.session.startsAt.slice(11, 16)}` : listItem ? `Занятие ${item.trainingSessionId.slice(0, 8)}` : "Занятие не указано"}</span><span className="mt-1 block truncate text-xs text-slate-500">{details?.group?.name ?? "Группа загружается в деталке"}</span></span>
    <span className={`inline-flex w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${trialStatusTone[item.status]}`}>{trialStatusLabels[item.status]}</span>
    <span className="text-sm text-slate-700">{attendanceLabels[item.attendanceStatus]}</span>
    <span className="text-sm text-slate-700">{resultLabels[item.result]}</span>
    <span className="text-slate-300">›</span>
  </button>
  );
};

export default TrialsPage;
