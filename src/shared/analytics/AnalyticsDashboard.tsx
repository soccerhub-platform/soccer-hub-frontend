import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  ChartBar,
  Clock3,
  TriangleAlert,
  Users,
} from "lucide-react";
import { getApiErrorMessage } from "../api";
import {
  AnalyticsApi,
  AnalyticsGroupBy,
  AnalyticsRoleScope,
  CoachLoadAnalytics,
  FunnelAnalytics,
  KpiAnalytics,
  LossReasonsAnalytics,
  RetentionAnalytics,
  SlaAnalytics,
} from "./analytics.api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DatePicker,
  MetricCard,
  NativeSelect,
  Skeleton,
} from "../ui";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новые",
  IN_PROGRESS: "В работе",
  TRIAL_SCHEDULED: "Пробное назначено",
  DECISION_PENDING: "Ожидают решения",
  CONVERTED: "Стали клиентами",
  LOST: "Потеряны",
  REJECTED: "Отклонены",
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
const formatPercent = (value?: number) => `${Number(value ?? 0).toFixed(1)}%`;
const formatNumber = (value?: number) => Number(value ?? 0).toLocaleString("ru-RU");
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Almaty";

type AnalyticsState = {
  kpi: KpiAnalytics | null;
  funnel: FunnelAnalytics | null;
  coachLoad: CoachLoadAnalytics | null;
  retention: RetentionAnalytics | null;
  sla: SlaAnalytics | null;
  lossReasons: LossReasonsAnalytics | null;
};

type Props = {
  scope: AnalyticsRoleScope;
  branchId: string | null;
  title?: string;
};

const AnalyticsDashboard: React.FC<Props> = ({ scope, branchId, title = "Операционная аналитика" }) => {
  const defaultDateTo = useMemo(() => new Date(), []);
  const defaultDateFrom = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, []);

  const [dateFrom, setDateFrom] = useState(toDateInput(defaultDateFrom));
  const [dateTo, setDateTo] = useState(toDateInput(defaultDateTo));
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>("WEEK");
  const [analytics, setAnalytics] = useState<AnalyticsState>({
    kpi: null,
    funnel: null,
    coachLoad: null,
    retention: null,
    sla: null,
    lossReasons: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!branchId) return;

    let mounted = true;
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      const query = {
        branchId,
        dateFrom,
        dateTo,
        groupBy,
        timezone: localTimezone(),
      };

      try {
        const [kpi, funnel, coachLoad, retention, sla, lossReasons] = await Promise.all([
          AnalyticsApi.getKpi(scope, query),
          AnalyticsApi.getFunnel(scope, query),
          AnalyticsApi.getCoachLoad(scope, query),
          AnalyticsApi.getRetention(scope, query),
          AnalyticsApi.getSla(scope, query),
          AnalyticsApi.getLossReasons(scope, query),
        ]);

        if (!mounted) return;
        setAnalytics({ kpi, funnel, coachLoad, retention, sla, lossReasons });
      } catch (err) {
        if (!mounted) return;
        setError(getApiErrorMessage(err, "Не удалось загрузить аналитику"));
        setAnalytics({
          kpi: null,
          funnel: null,
          coachLoad: null,
          retention: null,
          sla: null,
          lossReasons: null,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [branchId, dateFrom, dateTo, groupBy, reloadKey, scope]);

  const totals = analytics.funnel?.totals ?? analytics.kpi?.totals ?? {};
  const totalLeads =
    analytics.kpi?.summary?.totalLeads ??
    Object.values(totals).reduce((acc, value) => acc + Number(value ?? 0), 0);
  const wonLeads = analytics.kpi?.summary?.wonLeads ?? totals.WON ?? 0;
  const lostLeads = analytics.kpi?.summary?.lostLeads ?? totals.LOST ?? 0;
  const winRate =
    analytics.kpi?.summary?.winRateOnClosed ??
    analytics.funnel?.summary?.winRateOnClosed ??
    0;
  const trialConversion =
    analytics.kpi?.summary?.trialScheduledToWon ??
    analytics.funnel?.summary?.trialScheduledToWon ??
    0;

  const hasAnyData =
    Boolean(totalLeads) ||
    Boolean(analytics.coachLoad?.series?.length) ||
    Boolean(analytics.retention?.series?.groups?.length) ||
    Boolean(analytics.lossReasons?.series?.length);

  if (!branchId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Выберите филиал, чтобы увидеть аналитику.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="ui-card-title">{title}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Ежедневный управленческий срез: продажи, потери лидов, загрузка тренеров, удержание групп и скорость обработки заявок.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <DatePicker
            placeholder="Начало периода аналитики"
            value={dateFrom}
            onValueChange={setDateFrom}
          />
          <DatePicker
            placeholder="Конец периода аналитики"
            value={dateTo}
            min={dateFrom}
            onValueChange={setDateTo}
          />
          <NativeSelect
            aria-label="Группировка аналитики"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as AnalyticsGroupBy)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100"
          >
            <option value="DAY">День</option>
            <option value="WEEK">Неделя</option>
            <option value="MONTH">Месяц</option>
          </NativeSelect>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : loading ? (
        <AnalyticsSkeleton />
      ) : !hasAnyData ? (
        <EmptyState reason={analytics.kpi?.empty?.reason ?? "За выбранный период данных пока нет"} />
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricCard title="Лиды всего" value={formatNumber(totalLeads)} icon={<Users className="h-5 w-5" />} />
            <MetricCard title="Стали клиентами" value={formatNumber(wonLeads)} icon={<ChartBar className="h-5 w-5" />} />
            <MetricCard title="Потеряны" value={formatNumber(lostLeads)} icon={<TriangleAlert className="h-5 w-5" />} />
            <MetricCard title="Win Rate" value={formatPercent(winRate)} icon={<Clock3 className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Воронка лидов" description="Сколько заявок находится на каждом этапе пути до клиента.">
              <FunnelTotals totals={totals} />
            </Panel>

            <Panel title="Динамика лидов" description="Тренд новых, квалифицированных и выигранных лидов по выбранному периоду." className="xl:col-span-2">
              <FunnelTrend rows={analytics.funnel?.series ?? []} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel title="Нагрузка тренеров" description="Балансировка по группам, занятиям, ученикам и незакрытым отчетам.">
              <CoachLoadTable rows={analytics.coachLoad?.series ?? []} />
            </Panel>

            <Panel title="Причины потерь" description="Почему лиды не дошли до оплаты. Нужен для работы с ценой, расписанием и коммуникацией.">
              <LossReasons rows={analytics.lossReasons?.series ?? []} totalLost={analytics.lossReasons?.totals?.totalLost ?? Number(lostLeads)} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel title="Retention по группам" description="Какие группы удерживают учеников стабильнее остальных.">
              <RetentionTable rows={analytics.retention?.series?.groups ?? []} />
            </Panel>

            <Panel title="SLA обработки" description="Скорость первого контакта, просрочки и операционные риски по лидам.">
              <SlaSummary sla={analytics.sla} trialConversion={trialConversion} />
            </Panel>
          </div>
        </div>
      )}
    </section>
  );
};

const Panel = ({
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
  <div className={`rounded-xl border border-slate-200 p-4 ${className}`}>
    <div className="text-sm font-semibold text-slate-800">{title}</div>
    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    <div className="mt-4">{children}</div>
  </div>
);

const FunnelTotals = ({ totals }: { totals: Record<string, number> }) => {
  const entries = Object.entries(totals);
  const max = Math.max(...entries.map(([, value]) => Number(value ?? 0)), 1);

  if (entries.length === 0) {
    return <div className="text-sm text-slate-500">Нет данных по воронке</div>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([status, value]) => (
        <div key={status}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">{STATUS_LABELS[status] ?? status}</span>
            <span className="font-medium text-slate-900">{formatNumber(value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-[#0066cc]" style={{ width: `${Math.max(4, (Number(value) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const FunnelTrend = ({ rows }: { rows: Array<Record<string, string | number>> }) => {
  const visible = rows.slice(-10);
  const metrics = [
    { key: "NEW", label: "Новые", color: "#0e7490" },
    { key: "IN_PROGRESS", label: "В работе", color: "#f59e0b" },
    { key: "CONVERTED", label: "Клиенты", color: "#059669" },
    { key: "LOST", label: "Потеряны", color: "#e11d48" },
  ];

  if (visible.length === 0) {
    return <div className="text-sm text-slate-500">Нет данных по динамике</div>;
  }

  if (visible.length === 1) {
    const row = visible[0];
    const maxValue = Math.max(...metrics.map((metric) => Number(row[metric.key] ?? 0)), 1);
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800">Срез за период</div>
            <div className="mt-1 text-xs text-slate-500">
              {String(row.bucket ?? "Выбранный период")} · это не динамика, а показатели за один bucket
            </div>
          </div>
          <div className="text-xs text-slate-500">Для тренда выберите DAY или более длинный период</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((metric) => {
            const value = Number(row[metric.key] ?? 0);
            return (
              <div key={metric.key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                    {metric.label}
                  </div>
                  <div className="ui-card-title">{formatNumber(value)}</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.max(value > 0 ? 6 : 0, (value / maxValue) * 100)}%`,
                      backgroundColor: metric.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const max = Math.max(
    ...visible.flatMap((row) => metrics.map((metric) => Number(row[metric.key] ?? 0))),
    1
  );

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
            {metric.label}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((row, index) => {
          const bucket = String(row.bucket ?? `P${index + 1}`);
          return (
            <div key={bucket} className="grid grid-cols-[96px_1fr] items-center gap-3">
              <div className="truncate text-xs font-medium text-slate-500">{bucket}</div>
              <div className="grid grid-cols-4 gap-2">
                {metrics.map((metric) => {
                  const value = Number(row[metric.key] ?? 0);
                  return (
                    <div key={metric.key} className="min-w-0">
                      <div className="mb-1 text-right text-[11px] font-medium text-slate-600">
                        {formatNumber(value)}
                      </div>
                      <div className="h-8 rounded-lg bg-slate-100">
                        <div
                          className="h-8 rounded-lg"
                          title={`${bucket} · ${metric.label}: ${value}`}
                          style={{
                            width: `${Math.max(value > 0 ? 8 : 0, (value / max) * 100)}%`,
                            backgroundColor: metric.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CoachLoadTable = ({ rows }: { rows: Array<Record<string, unknown>> }) => {
  if (rows.length === 0) {
    return <div className="text-sm text-slate-500">Нет данных по тренерам</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Тренер</TableHead>
          <TableHead>Группы</TableHead>
          <TableHead>Занятия</TableHead>
          <TableHead>Ученики</TableHead>
          <TableHead>Отчеты</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {rows.map((row) => (
            <TableRow key={String(row.coachId ?? row.coachName)}>
              <TableCell className="font-medium text-slate-900">{String(row.coachName ?? "Тренер")}</TableCell>
              <TableCell>{formatNumber(Number(row.groups ?? 0))}</TableCell>
              <TableCell>{formatNumber(Number(row.completedSessions ?? row.scheduledSlots ?? row.plannedSessions ?? 0))}</TableCell>
              <TableCell>{formatNumber(Number(row.students ?? 0))}</TableCell>
              <TableCell>{formatNumber(Number(row.overdueReports ?? 0))}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
};

const LossReasons = ({ rows, totalLost }: { rows: Array<{ lostReasonCode: string; name: string; count: number; share: number; trend?: number }>; totalLost: number }) => {
  if (rows.length === 0) {
    return <div className="text-sm text-slate-500">Нет данных по причинам потерь</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.lostReasonCode}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-700">{row.name}</span>
            <span className="font-medium text-slate-900">{row.count} · {formatPercent(row.share)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-rose-600" style={{ width: `${Math.max(4, Number(row.share ?? 0))}%` }} />
          </div>
        </div>
      ))}
      <div className="pt-1 text-xs text-slate-500">Всего потеряно: {formatNumber(totalLost)}</div>
    </div>
  );
};

const RetentionTable = ({ rows }: { rows: Array<Record<string, unknown>> }) => {
  if (rows.length === 0) {
    return <div className="text-sm text-slate-500">Нет данных по удержанию</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Группа</TableHead>
          <TableHead>Retention</TableHead>
          <TableHead>Слотов</TableHead>
          <TableHead>Отмен</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {rows.map((row) => (
            <TableRow key={String(row.groupId ?? row.groupName)}>
              <TableCell className="font-medium text-slate-900">{String(row.groupName ?? "Группа")}</TableCell>
              <TableCell>{formatPercent(Number(row.retentionIndex ?? 0))}</TableCell>
              <TableCell>{formatNumber(Number(row.totalSchedules ?? 0))}</TableCell>
              <TableCell>{formatNumber(Number(row.cancelled ?? 0))}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
};

const SlaSummary = ({ sla, trialConversion }: { sla: SlaAnalytics | null; trialConversion: number }) => {
  const summary = sla?.summary ?? {};
  const cards = [
    ["Первый контакт", `${formatNumber(summary.averageFirstResponseMinutes ?? summary.avgFirstResponseMinutes)} мин`],
    ["SLA breach", formatPercent(summary.breachRate)],
    ["No-show", formatPercent(summary.noShowRate)],
    ["Trial → Client", formatPercent(trialConversion)],
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 ui-card-title">{value}</div>
        </div>
      ))}
    </div>
  );
};

const AnalyticsSkeleton = () => (
  <div className="mt-5 space-y-4">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl xl:col-span-2" />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
    <div className="text-sm font-medium text-rose-800">Не удалось загрузить аналитику</div>
    <div className="mt-1 text-sm text-rose-700">{message}</div>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 rounded-xl bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800"
    >
      Повторить
    </button>
  </div>
);

const EmptyState = ({ reason }: { reason: string }) => (
  <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
    <div className="text-sm font-medium text-slate-700">Данных пока нет</div>
    <div className="mt-1 text-sm text-slate-500">{reason}</div>
  </div>
);

export default AnalyticsDashboard;
