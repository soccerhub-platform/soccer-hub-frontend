import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, ClockIcon, MapPinIcon, PhoneIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, ErrorState, LoadingState, PageShell, WorkspaceBreadcrumbs, WorkspaceMetric } from "../../../shared/ui";
import { TrialsApi, attendanceLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialBookingListItem, TrialBookingStatus, TrialNextActionType, TrialsPageResponse } from "./trials.types";

const nextActionLabels: Record<TrialNextActionType, string> = {
  CALL: "Позвонить",
  MESSAGE: "Написать",
  SEND_OFFER: "Отправить предложение",
  WAIT_FOR_DECISION: "Ждать решения",
  OTHER: "Другое",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Дата не указана";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const isOverdue = (value?: string | null) => {
  if (!value) return false;

  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && timestamp < Date.now();
};

const formatSessionTime = (item: TrialBookingListItem) => {
  if (!item.sessionDate) return "Занятие не указано";

  const start = item.sessionStartsAt ? new Date(item.sessionStartsAt) : null;
  const end = item.sessionEndsAt ? new Date(item.sessionEndsAt) : null;
  const formatTime = (value: Date | null) => value && !Number.isNaN(value.getTime())
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(value)
    : null;
  const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(`${item.sessionDate}T00:00:00`));
  const interval = [formatTime(start), formatTime(end)].filter(Boolean).join("–");

  return interval ? `${date} · ${interval}` : date;
};

const formatShortDate = (value?: string | null) => {
  if (!value) return "Дата не указана";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Дата не указана" : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(date);
};

const TrialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<TrialsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestedStatus = searchParams.get("status");
  const status = requestedStatus && requestedStatus in trialStatusLabels
    ? requestedStatus as TrialBookingStatus
    : "all";
  const parsedPage = Number(searchParams.get("page"));
  const page = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

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
    <PageShell className="space-y-6">
      <WorkspaceBreadcrumbs items={[{ label: "Пробные занятия" }]} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-700">Рабочий список администратора</p>
          <h1 className="heading-font mt-2 text-4xl font-semibold tracking-tight text-slate-950">Пробные занятия</h1>
          <p className="mt-2 text-[15px] leading-6 text-slate-500">Следите за расписанием, посещением и следующим шагом после пробного занятия.</p>
        </div>
        <select value={status} onChange={(event) => updateQuery("status", event.target.value)} className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
          <option value="all">Все статусы</option>
          {Object.entries(trialStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceMetric icon={<CalendarDaysIcon />} label="Запланированы" value={metrics.scheduled} note="Ожидают занятия" />
        <WorkspaceMetric icon={<CheckCircleIcon />} label="Завершены" value={metrics.completed} note="Посещение отмечено" />
        <WorkspaceMetric icon={<ClipboardDocumentCheckIcon />} label="Без отметки" value={metrics.unmarked} note="Требуют внимания" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-none">
        {loading ? <div className="p-6"><LoadingState label="Загрузка пробных занятий..." /></div> : error ? <div className="p-6"><ErrorState title="Пробные недоступны" message={error} onRetry={() => void load()} /></div> : data?.content.length ? <>
          <div className="hidden grid-cols-[minmax(220px,1.25fr)_minmax(170px,1fr)_minmax(150px,0.9fr)_130px_130px_minmax(190px,1fr)_28px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid">
            <span>Участник</span><span>Когда</span><span>Группа и тренер</span><span>Состояние</span><span>Посещение</span><span>Итог и следующий шаг</span><span />
          </div>
          <div className="divide-y divide-slate-100">
            {data.content.map((item) => <TrialRow key={item.id} item={item} onOpen={() => navigate(`/admin/trials/${item.id}/overview`)} />)}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <span className="text-xs text-slate-500">Страница {data.number + 1} из {Math.max(data.totalPages, 1)}</span>
            <div className="flex gap-2"><Button size="sm" variant="secondary" rounded="rounded-lg" disabled={data.number <= 0} onClick={() => updateQuery("page", String(data.number - 1))}><ChevronLeftIcon className="h-4 w-4" /></Button><Button size="sm" variant="secondary" rounded="rounded-lg" disabled={data.number + 1 >= data.totalPages} onClick={() => updateQuery("page", String(data.number + 1))}><ChevronRightIcon className="h-4 w-4" /></Button></div>
          </div>
        </> : <div className="p-8"><EmptyState title="Пробных занятий пока нет" description="Назначенные пробные появятся в этом реестре." /></div>}
      </div>
    </PageShell>
  );
};

const TrialRow: React.FC<{ item: TrialBookingListItem; onOpen: () => void }> = ({ item, onOpen }) => {
  const nextAction = item.nextActionType && item.nextActionAt
    ? { type: item.nextActionType, dueAt: item.nextActionAt }
    : null;

  const followUpOverdue = item.result === "FOLLOW_UP" && isOverdue(nextAction?.dueAt);
  return (
  <button type="button" onClick={onOpen} className="grid w-full gap-4 border-b border-slate-100 px-4 py-5 text-left transition hover:bg-slate-50/70 lg:grid-cols-[minmax(220px,1.25fr)_minmax(170px,1fr)_minmax(150px,0.9fr)_130px_130px_minmax(190px,1fr)_28px] lg:items-center lg:px-5">
    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Участник</span><span className="block truncate text-sm font-semibold text-slate-950">{item.studentName || item.leadName || "Участник пробного"}</span><span className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">{item.leadPhone ? <PhoneIcon className="h-3.5 w-3.5 shrink-0" /> : null}{item.leadPhone || item.leadEmail || "Контакт не указан"}</span></span>
    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Когда</span><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ClockIcon className="h-4 w-4 text-admin-700" />{formatSessionTime(item)}</span><span className="mt-1 block truncate text-xs text-slate-400">{formatShortDate(item.sessionDate)}</span></span>
    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Группа и тренер</span><span className="block truncate text-sm text-slate-700">{item.groupName || "Группа не указана"}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.coachName || "Тренер не указан"}</span><span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-400"><MapPinIcon className="h-3.5 w-3.5 shrink-0" />{item.locationName || "Локация не указана"}</span></span>
    <span><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Состояние</span><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${trialStatusTone[item.status]}`}>{trialStatusLabels[item.status]}</span></span>
    <span className="text-sm text-slate-700"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Посещение</span>{attendanceLabels[item.attendanceStatus]}</span>
    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Итог и следующий шаг</span><span className="block text-sm text-slate-700">{resultLabels[item.result]}</span>

      {item.result === "FOLLOW_UP" && nextAction?.type && nextAction.dueAt ? (
        <span
          className={`mt-1 block truncate text-xs ${
            followUpOverdue ? "font-semibold text-rose-600" : "text-slate-500"
          }`}
        >
          {nextActionLabels[nextAction.type]} · {formatDateTime(nextAction.dueAt)}
          {followUpOverdue ? " · просрочено" : ""}
        </span>
      ) : null}
    </span>
    <span className="text-right text-slate-300">›</span>
  </button>
  );
};

export default TrialsPage;
