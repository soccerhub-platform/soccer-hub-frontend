import React, { useMemo } from "react";
import { Button, EmptyState } from "../../shared/ui";
import type {
  DashboardAttentionItem,
  DashboardSession,
} from "./dashboard-summary.types";
import type { DayOfWeek, GroupScheduleDto } from "./groups/schedule/schedule.types";

type GroupMeta = Record<string, { name: string; bg: string; border: string; text: string }>;
type CoachDirectory = Record<string, { fullName: string; todaySessions: number; overdueReports: number }>;
type LegacyWeeklyTrendItem = {
  bucket: string;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новые",
  IN_PROGRESS: "В работе",
  TRIAL_SCHEDULED: "Пробное",
  DECISION_PENDING: "Ожидают решения",
  CONVERTED: "Клиенты",
  LOST: "Потеряны",
};

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "Пн" },
  { key: "TUESDAY", label: "Вт" },
  { key: "WEDNESDAY", label: "Ср" },
  { key: "THURSDAY", label: "Чт" },
  { key: "FRIDAY", label: "Пт" },
  { key: "SATURDAY", label: "Сб" },
  { key: "SUNDAY", label: "Вс" },
];

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;

const formatNumber = (value?: number) => Number(value ?? 0).toLocaleString("ru-RU");
const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const formatTimeRange = (start: string, end: string) => `${start.slice(0, 5)}-${end.slice(0, 5)}`;
const formatOffsetTimeRange = (startAt: string, endAt: string) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
};

export const getToneClasses = (tone: DashboardAttentionItem["tone"]) => {
  switch (tone) {
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-blue-200 bg-blue-50 text-[#0066cc]";
  }
};

export const getToneDotClasses = (tone: DashboardAttentionItem["tone"]) => {
  switch (tone) {
    case "danger":
      return "bg-rose-500";
    case "warning":
      return "bg-amber-500";
    case "success":
      return "bg-emerald-500";
    default:
      return "bg-[#0066cc]";
  }
};

export const getToneBadgeClasses = (tone: DashboardAttentionItem["tone"]) => {
  switch (tone) {
    case "danger":
      return "bg-rose-100 text-rose-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-blue-100 text-[#0066cc]";
  }
};

export const getToneLabel = (tone: DashboardAttentionItem["tone"]) => {
  switch (tone) {
    case "danger":
      return "Срочно";
    case "warning":
      return "Внимание";
    case "success":
      return "Стабильно";
    default:
      return "Контроль";
  }
};

export const PanelCard = ({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-4 ${className}`}>
    <div className="text-base font-semibold tracking-tight text-slate-950">{title}</div>
    <div className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{description}</div>
    <div className="mt-4">{children}</div>
  </section>
);

export const HeaderPulseCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-black/[0.08] bg-white px-3.5 py-3.5">
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
    <div className="mt-1.5 text-sm font-semibold leading-5 text-slate-950">{value}</div>
  </div>
);

export const LeadFunnelCompact = ({ totals }: { totals: Record<string, number> }) => {
  const order = ["NEW", "IN_PROGRESS", "TRIAL_SCHEDULED", "DECISION_PENDING", "CONVERTED", "LOST"];
  const rows = order
    .map((status) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      value: Number(totals[status] ?? 0),
    }))
    .filter((row) => row.value > 0 || row.status === "NEW" || row.status === "CONVERTED");

  const max = Math.max(...rows.map((row) => row.value), 1);

  if (rows.every((row) => row.value === 0)) {
    return (
      <EmptyState
        title="Новых лидов пока нет"
        description="Когда появятся заявки, здесь будет короткий путь до клиента без громоздкой аналитики."
      />
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.status} className="grid grid-cols-[132px_1fr_40px] items-center gap-3">
          <div className="text-sm font-medium text-slate-700">{row.label}</div>
          <div className="h-3 rounded-full bg-slate-100 ring-1 ring-slate-200/70">
            <div
              className={`h-3 rounded-full ${
                row.status === "CONVERTED" ? "bg-emerald-600" : row.status === "LOST" ? "bg-rose-500" : "bg-[#0066cc]"
              }`}
              style={{ width: `${Math.max(row.value > 0 ? 10 : 0, (row.value / max) * 100)}%` }}
            />
          </div>
          <div className="text-right ui-section-title">{formatNumber(row.value)}</div>
        </div>
      ))}
    </div>
  );
};

export const TodayScheduleList = ({
  schedules,
  nextSession,
  onOpenWeeklySchedule,
}: {
  schedules: DashboardSession[];
  nextSession: DashboardSession | null;
  onOpenWeeklySchedule: () => void;
}) => {
  if (schedules.length === 0) {
    return (
      <EmptyState
        title="На сегодня тренировок нет"
        description="Если занятия появятся, они сразу окажутся здесь с тренером и статусом."
        action={
          <Button variant="secondary" onClick={onOpenWeeklySchedule}>
            Открыть недельное расписание
          </Button>
        }
      />
    );
  }

  const now = Date.now();
  const activeCount = schedules.filter((schedule) => schedule.status !== "CANCELLED").length;
  const cancelledCount = schedules.filter((schedule) => schedule.status === "CANCELLED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ScheduleStatCard label="Событий сегодня" value={schedules.length} tone="neutral" />
        <ScheduleStatCard label="В расписании" value={activeCount} tone="success" />
        <ScheduleStatCard label="Отменено" value={cancelledCount} tone="danger" />
      </div>

      {nextSession ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Ближайшая тренировка</div>
              <div className="mt-2 ui-card-title">
                {formatOffsetTimeRange(nextSession.startAt, nextSession.endAt)} · {nextSession.groupName}
              </div>
              <div className="mt-1 text-sm text-slate-600">{nextSession.coachName}</div>
            </div>
            <Button variant="soft" onClick={onOpenWeeklySchedule}>
              Открыть расписание
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {schedules.map((schedule) => {
          const isCancelled = schedule.status === "CANCELLED";
          const start = new Date(schedule.startAt).getTime();
          const end = new Date(schedule.endAt).getTime();
          const liveState =
            !isCancelled && now >= start && now < end
              ? "Сейчас идет"
              : !isCancelled && start > now
                ? "Дальше по плану"
                : isCancelled
                  ? "Отменено"
                  : schedule.status === "OVERDUE"
                    ? "Требует отчет"
                    : "Завершено";

          return (
            <button
              key={schedule.sessionId}
              type="button"
              onClick={onOpenWeeklySchedule}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:border-slate-300 ${
                isCancelled
                  ? "border-rose-200 bg-rose-50/70"
                  : "border-black/[0.08] bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {formatOffsetTimeRange(schedule.startAt, schedule.endAt)}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                      {schedule.groupName}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        liveState === "Сейчас идет"
                          ? "bg-blue-100 text-[#0066cc]"
                          : liveState === "Дальше по плану"
                            ? "bg-emerald-100 text-emerald-700"
                            : liveState === "Требует отчет"
                              ? "bg-amber-100 text-amber-700"
                              : liveState === "Завершено"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {liveState}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <div className="font-medium text-slate-900">{schedule.coachName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">Тренер</div>
                    </div>
                    <div className="text-xs text-slate-500 sm:text-right">
                      {schedule.scheduleType === "TEMPORARY" ? "Временное занятие" : "Регулярное занятие"}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
                  <span>Открыть сетку</span>
                  <span className="text-slate-400">→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const QuickActionButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-[60px] items-center justify-between rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/60"
  >
    <span>{label}</span>
    <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0066cc]">→</span>
  </button>
);

export const WeeklyTrendCompact = ({ rows }: { rows: LegacyWeeklyTrendItem[] }) => {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Нет данных по динамике"
        description="Когда накопится история по лидам, здесь появится компактный недельный тренд."
      />
    );
  }

  const totals = rows.reduce<{ NEW: number; WON: number; LOST: number }>(
    (acc, row) => {
      acc.NEW += Number(row.newLeads ?? 0);
      acc.WON += Number(row.wonLeads ?? 0);
      acc.LOST += Number(row.lostLeads ?? 0);
      return acc;
    },
    { NEW: 0, WON: 0, LOST: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <TrendMiniCard label="Новые" value={totals.NEW} tone="info" />
        <TrendMiniCard label="Клиенты" value={totals.WON} tone="success" />
        <TrendMiniCard label="Потери" value={totals.LOST} tone="danger" />
      </div>

      {rows.map((row, index) => {
        const bucket = String(row.bucket ?? `Период ${index + 1}`);
        const metrics = [
          { label: "Новые", value: Number(row.newLeads ?? 0), tone: "info" as const },
          { label: "Клиенты", value: Number(row.wonLeads ?? 0), tone: "success" as const },
          { label: "Потери", value: Number(row.lostLeads ?? 0), tone: "danger" as const },
        ];
        const bucketTotal = metrics.reduce((sum, metric) => sum + metric.value, 0);

        return (
          <div key={bucket} className="rounded-2xl border border-black/[0.08] bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">{bucket}</div>
              <div className="text-xs font-medium text-slate-500">Всего событий: {bucketTotal}</div>
            </div>
            <div className="mt-3 space-y-2">
              {metrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/95 px-3 py-2 text-sm ring-1 ring-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        metric.tone === "info"
                          ? "bg-[#0066cc]"
                          : metric.tone === "success"
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                      }`}
                    />
                    <span className="text-slate-600">{metric.label}</span>
                  </div>
                  <div className="font-semibold text-slate-900">{metric.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ScheduleStatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger";
}) => (
  <div
    className={`rounded-2xl border px-3 py-3 ${
      tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-slate-50"
    }`}
  >
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className="mt-2 ui-metric-value">{formatNumber(value)}</div>
  </div>
);

const TrendMiniCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "info" | "success" | "danger";
}) => (
  <div
    className={`rounded-2xl border px-3 py-3 ${
      tone === "info"
        ? "border-blue-200 bg-blue-50"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50"
    }`}
  >
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className="mt-2 ui-metric-value">{formatNumber(value)}</div>
  </div>
);

export const SummaryPill = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "danger";
}) => (
  <div
    className={`rounded-2xl border px-3 py-2 text-sm ${
      tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-slate-50 text-slate-700"
    }`}
  >
    <span className="text-xs opacity-80">{label}</span>
    <div className="mt-1 font-semibold">{formatNumber(value)}</div>
  </div>
);

export const WeekCalendar: React.FC<{
  schedules: GroupScheduleDto[];
  groupMeta: GroupMeta;
  coachDirectory: CoachDirectory;
  onSelectSchedule: (schedule: GroupScheduleDto) => void;
}> = ({ schedules, groupMeta, coachDirectory, onSelectSchedule }) => {
  const byDay = useMemo(() => {
    return schedules.reduce<Record<DayOfWeek, GroupScheduleDto[]>>((acc, schedule) => {
      acc[schedule.dayOfWeek] = acc[schedule.dayOfWeek] ?? [];
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {} as Record<DayOfWeek, GroupScheduleDto[]>);
  }, [schedules]);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
      <div className="grid grid-cols-[88px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
        <div className="p-2 text-xs text-slate-400">Время</div>
        {DAYS.map((day) => (
          <div key={day.key} className="p-2 text-center text-xs font-medium text-slate-600">
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[88px_repeat(7,1fr)]">
        <div className="border-r border-slate-200 bg-slate-50">
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: HOUR_HEIGHT }}
              className="flex items-start border-b border-slate-100 px-2 pt-1 text-xs text-slate-400"
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {DAYS.map((day) => (
          <div key={day.key} className="relative border-r border-slate-100 last:border-r-0">
            {hours.map((hour) => (
              <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
            ))}

            {(byDay[day.key] ?? []).map((schedule) => {
              const start = timeToMinutes(schedule.startTime);
              const end = timeToMinutes(schedule.endTime);
              const minStart = Math.max(start, START_HOUR * 60);
              const minEnd = Math.min(end, END_HOUR * 60);

              if (minEnd <= minStart) return null;

              const top = ((minStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const height = ((minEnd - minStart) / 60) * HOUR_HEIGHT;
              const isCancelled = schedule.status === "CANCELLED";
              const meta = groupMeta[schedule.groupId];
              const coachName = coachDirectory[schedule.coachId]?.fullName ?? "Тренер не назначен";

              return (
                <button
                  key={schedule.scheduleId}
                  type="button"
                  className={`absolute left-1.5 right-1.5 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs ${
                    meta ? `${meta.bg} ${meta.border} ${meta.text}` : "border-slate-200 bg-white text-slate-700"
                  } ${isCancelled ? "opacity-75" : ""}`}
                  style={{ top, height }}
                  onClick={() => onSelectSchedule(schedule)}
                >
                  <div className="font-semibold">{formatTimeRange(schedule.startTime, schedule.endTime)}</div>
                  <div className="truncate text-[10px] opacity-85">{meta?.name ?? "Группа"}</div>
                  <div className="truncate text-[10px] opacity-80">{coachName}</div>
                  {isCancelled ? (
                    <div className="mt-1 inline-flex rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                      Отменено
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ScheduleDetailsModal = ({
  schedule,
  groupMeta,
  coachName,
  onClose,
  onToggleStatus,
}: {
  schedule: GroupScheduleDto;
  groupMeta: GroupMeta;
  coachName: string | null;
  onClose: () => void;
  onToggleStatus: () => void;
}) => {
  const meta = groupMeta[schedule.groupId];
  const typeLabel = schedule.scheduleType === "TEMPORARY" ? "Временное" : "Регулярное";
  const statusLabel = schedule.status === "ACTIVE" ? "Активно" : "Отменено";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="ui-modal-title">Детали занятия</h3>
            <p className="mt-1 text-sm text-slate-500">
              {schedule.dayOfWeek} · {formatTimeRange(schedule.startTime, schedule.endTime)}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${meta?.bg ?? "bg-slate-50"} ${
              meta?.border ?? "border-slate-200"
            } ${meta?.text ?? "text-slate-700"}`}
          >
            {meta?.name ?? "Группа"}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Тип" value={typeLabel} />
            <InfoBox label="Статус" value={statusLabel} />
          </div>

          <InfoBox label="Период" value={`${schedule.startDate} - ${schedule.endDate}`} />
          <InfoBox label="Тренер" value={coachName ?? "Тренер не найден"} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button variant={schedule.status === "ACTIVE" ? "danger" : "primary"} onClick={onToggleStatus}>
            {schedule.status === "ACTIVE" ? "Отменить" : "Активировать"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 font-medium text-slate-900">{value}</div>
  </div>
);
