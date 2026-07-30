import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, MapPin, Phone } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  PageHeader,
  PageShell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "../../../shared/ui";
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
  const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" })
    .format(new Date(`${item.sessionDate}T00:00:00`));
  const interval = [formatTime(start), formatTime(end)].filter(Boolean).join("–");

  return interval ? `${date} · ${interval}` : date;
};

const columns: ColumnDef<TrialBookingListItem>[] = [
  {
    id: "participant",
    header: "Участник",
    size: 210,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="min-w-0">
          <div className="truncate ui-section-title">{item.studentName || item.leadName || "Участник пробного"}</div>
          <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
            {item.leadPhone ? <Phone className="h-3.5 w-3.5 shrink-0" /> : null}
            {item.leadPhone || item.leadEmail || "Контакт не указан"}
          </div>
        </div>
      );
    },
  },
  {
    id: "session",
    header: "Когда",
    size: 170,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-800">
        <Clock3 className="h-4 w-4 shrink-0 text-[#0066cc]" />
        {formatSessionTime(row.original)}
      </div>
    ),
  },
  {
    id: "group",
    header: "Группа и тренер",
    size: 220,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">{item.groupName || "Группа не указана"}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{item.coachName || "Тренер не указан"}</div>
          <div className="mt-1 flex items-center gap-1 truncate text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />{item.locationName || "Локация не указана"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Состояние",
    size: 135,
    cell: ({ row }) => (
      <StatusBadge tone={trialStatusTone[row.original.status]}>
        {trialStatusLabels[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "attendanceStatus",
    header: "Посещение",
    size: 140,
    cell: ({ row }) => <span className="text-sm text-slate-700">{attendanceLabels[row.original.attendanceStatus]}</span>,
  },
  {
    id: "result",
    header: "Итог",
    size: 190,
    cell: ({ row }) => {
      const item = row.original;
      const nextAction = item.nextActionType && item.nextActionAt
        ? { type: item.nextActionType, dueAt: item.nextActionAt }
        : null;
      const followUpOverdue = item.result === "FOLLOW_UP" && isOverdue(nextAction?.dueAt);

      return (
        <div className="min-w-0">
          <div className="truncate text-sm text-slate-700">{resultLabels[item.result]}</div>
          {item.result === "FOLLOW_UP" && nextAction ? (
            <span className={`mt-1 block truncate text-xs ${followUpOverdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
              {nextActionLabels[nextAction.type]} · {formatDateTime(nextAction.dueAt)}
              {followUpOverdue ? " · просрочено" : ""}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "open",
    header: "",
    size: 36,
    cell: () => <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />,
  },
];

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
    <PageShell>
      <PageHeader
        title="Пробные занятия"
        description="Следите за расписанием, посещением и следующим шагом после пробного занятия."
      />

      <FilterBar>
        <span className="px-1 text-sm font-medium text-slate-600">Статус</span>
        <Select value={status} onValueChange={(value) => updateQuery("status", value)}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Статус пробного занятия">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(trialStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={<CalendarDays />} title="Запланированы" value={metrics.scheduled} note="Ожидают занятия" />
        <MetricCard icon={<CheckCircle2 />} title="Завершены" value={metrics.completed} note="Посещение отмечено" />
        <MetricCard icon={<ClipboardCheck />} title="Без отметки" value={metrics.unmarked} note="Требуют внимания" />
      </div>

      {loading ? (
        <section className="rounded-2xl border border-black/[0.08] bg-white p-6">
          <LoadingState label="Загрузка пробных занятий..." />
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-black/[0.08] bg-white p-6">
          <ErrorState title="Пробные недоступны" message={error} onRetry={() => void load()} />
        </section>
      ) : (
        <DataTable
          columns={columns}
          data={data?.content ?? []}
          getRowId={(item) => item.id}
          onRowOpen={(item) => navigate(`/admin/trials/${item.id}`)}
          tableClassName="min-w-[1080px]"
          emptyState={<EmptyState title="Пробных занятий пока нет" description="Назначенные пробные появятся в этом реестре." />}
          pagination={data ? {
            pageIndex: data.number,
            totalPages: data.totalPages,
            totalElements: data.totalElements,
            onPageChange: (nextPage) => updateQuery("page", String(nextPage)),
          } : undefined}
        />
      )}
    </PageShell>
  );
};

export default TrialsPage;
