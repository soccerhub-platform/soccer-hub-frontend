import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage, resolveApiUrl } from "../../../shared/api";
import type { MediaAsset } from "../../../shared/media.types";
import { EmptyState, ErrorState, LoadingState, SectionCard, formControlClassName } from "../../../shared/ui";
import { StudentApi } from "./student.api";
import type {
  AdminStudentAttendanceResponse,
  AdminStudentAttendanceStatus,
  AdminStudentMembershipHistoryItem,
} from "./student.types";

const STATUS_OPTIONS: Array<{ value: AdminStudentAttendanceStatus | "all"; label: string }> = [
  { value: "all", label: "Все статусы" },
  { value: "PRESENT", label: "Присутствовал" },
  { value: "LATE", label: "Опоздал" },
  { value: "ABSENT", label: "Отсутствовал" },
  { value: "EXCUSED", label: "Уважительная причина" },
  { value: "UNMARKED", label: "Не отмечено" },
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const normalizeMonth = (value?: string | null) => /^\d{4}-\d{2}$/.test(value ?? "") ? value! : currentMonth();

const monthRange = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

const shiftMonth = (value: string, delta: number) => {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
};

const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", weekday: "short" }).format(new Date(value));
const formatTime = (value: string) => new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const avatarUrl = (avatar?: MediaAsset | null) => avatar?.thumbUrl || avatar?.mediumUrl || avatar?.originalUrl;

const statusLabel = (status: AdminStudentAttendanceStatus) => STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
const statusClassName = (status: AdminStudentAttendanceStatus) => {
  if (status === "PRESENT") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "LATE" || status === "EXCUSED") return "border-amber-100 bg-amber-50 text-amber-700";
  if (status === "ABSENT") return "border-rose-100 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

interface Props {
  playerId: string;
  memberships: AdminStudentMembershipHistoryItem[];
}

const StudentAttendanceTab: React.FC<Props> = ({ playerId, memberships }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = normalizeMonth(searchParams.get("month"));
  const groupId = searchParams.get("groupId") ?? "all";
  const rawStatus = searchParams.get("status") ?? "all";
  const status = STATUS_OPTIONS.some((item) => item.value === rawStatus) ? rawStatus : "all";
  const [data, setData] = useState<AdminStudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byId = new Map<string, AdminStudentMembershipHistoryItem["group"]>();
    memberships.forEach((item) => byId.set(item.group.id, item.group));
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [memberships]);

  const updateFilter = (key: "month" | "groupId" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const loadAttendance = async () => {
    const range = monthRange(month);
    setLoading(true);
    setError(null);
    try {
      const response = await StudentApi.getAttendance(playerId, {
        ...range,
        groupId: groupId === "all" ? undefined : groupId,
        status: status === "all" ? undefined : status,
      });
      setData(response);
    } catch (requestError) {
      console.error(requestError);
      setError(getApiErrorMessage(requestError, "Не удалось загрузить посещаемость ученика"));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAttendance(); }, [groupId, month, playerId, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <button type="button" aria-label="Предыдущий месяц" onClick={() => updateFilter("month", shiftMonth(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"><ChevronLeftIcon className="h-4 w-4" /></button>
          <div className="min-w-40 text-center text-sm font-semibold capitalize text-slate-950">{monthLabel(month)}</div>
          <button type="button" aria-label="Следующий месяц" onClick={() => updateFilter("month", shiftMonth(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"><ChevronRightIcon className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select aria-label="Фильтр по группе" value={groupId} onChange={(event) => updateFilter("groupId", event.target.value)} className={`${formControlClassName} min-w-48 py-2`}><option value="all">Все группы</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
          <select aria-label="Фильтр по статусу" value={status} onChange={(event) => updateFilter("status", event.target.value)} className={`${formControlClassName} min-w-48 py-2`}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={loadAttendance} /> : loading ? <LoadingState label="Загрузка посещаемости..." /> : data ? (
        <>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
              <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                <div className="text-xs font-medium text-slate-500">Посещаемость за {monthLabel(month)}</div>
                <div className="mt-2 text-4xl font-semibold text-slate-950">{data.summary.attendanceRate}%</div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, data.summary.attendanceRate)}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">{data.summary.markedCount} из {data.summary.sessionsCount} занятий отмечено</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
                <AttendanceValue label="Посещено" value={data.summary.presentCount} tone="text-emerald-700" />
                <AttendanceValue label="Опоздания" value={data.summary.lateCount} tone="text-amber-700" />
                <AttendanceValue label="Пропуски" value={data.summary.absentCount} tone="text-rose-700" />
                <AttendanceValue label="Уважительно" value={data.summary.excusedCount} tone="text-slate-700" />
              </div>
            </div>
          </section>

          {data.summary.absentCount > 0 || data.summary.unmarkedCount > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <div className="text-sm font-semibold text-amber-950">Требует внимания</div>
                  <div className="mt-0.5 text-sm text-amber-800">
                    {data.summary.unmarkedCount > 0
                      ? `${data.summary.unmarkedCount} занятий без отметки посещаемости`
                      : `${data.summary.absentCount} пропусков за выбранный месяц`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateFilter("status", data.summary.unmarkedCount > 0 ? "UNMARKED" : "ABSENT")}
                className="inline-flex h-9 items-center justify-center rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Показать записи
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-700" /> Нет пропусков и незаполненных занятий
            </div>
          )}

          <SectionCard title="История занятий" description={`${data.items.length} записей по выбранным фильтрам`} className="p-0" bodyClassName="overflow-hidden">
            {data.items.length === 0 ? <EmptyState title="Занятия не найдены" description="Измените месяц, группу или статус посещения." /> : (
              <div className="divide-y divide-slate-100">
                <div className="hidden grid-cols-[150px_minmax(190px,1fr)_180px_minmax(160px,0.8fr)_40px] gap-4 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase text-slate-500 lg:grid"><span>Дата и время</span><span>Группа</span><span>Посещаемость</span><span>Комментарий</span><span /></div>
                {data.items.map((item) => {
                  const image = avatarUrl(item.group.avatar);
                  return <button key={item.sessionId} type="button" onClick={() => navigate(`/admin/groups/${item.group.id}/sessions/${item.sessionId}`)} className="grid w-full grid-cols-1 gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[150px_minmax(190px,1fr)_180px_minmax(160px,0.8fr)_40px] lg:items-center lg:gap-4"><div><div className="text-sm font-semibold text-slate-950">{formatDate(item.sessionDate)}</div><div className="mt-1 text-xs text-slate-500">{formatTime(item.startsAt)}–{formatTime(item.endsAt)}</div></div><div className="flex min-w-0 items-center gap-3">{image ? <img src={resolveApiUrl(image)} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-admin-50 text-xs font-semibold text-admin-700">{item.group.name.slice(0,2).toUpperCase()}</span>}<div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-950">{item.group.name}</div><div className="mt-0.5 text-xs text-slate-500">{item.effectiveSessionStatus}</div></div></div><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(item.attendanceStatus)}`}>{statusLabel(item.attendanceStatus)}</span></div><div className="truncate text-sm text-slate-500">{item.comment || "—"}</div><ChevronRightIcon className="hidden h-4 w-4 text-slate-400 lg:block" /></button>;
                })}
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
};

const AttendanceValue: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
  <div className="flex min-h-28 flex-col justify-center px-4 py-5">
    <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
    <div className="mt-1 text-xs text-slate-500">{label}</div>
  </div>
);

export default StudentAttendanceTab;
