import React, { useEffect, useMemo, useState } from "react";
import {
  CreditCardIcon,
  Squares2X2Icon,
  UserGroupIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, LoadingState, PageHeader, PageShell } from "../../shared/ui";
import { useAdminBranch } from "./BranchContext";
import { DashboardSummaryApi } from "./dashboard-summary.api";
import type { AdminDashboardSummaryResponse } from "./dashboard-summary.types";
import {
  getToneBadgeClasses,
  getToneClasses,
  getToneDotClasses,
  getToneLabel,
  HeaderPulseCard,
  KpiCard,
  LeadFunnelCompact,
  PanelCard,
  QuickActionButton,
  TodayScheduleList,
  WeeklyTrendCompact,
} from "./dashboard-ui";

const formatNumber = (value?: number) => Number(value ?? 0).toLocaleString("ru-RU");
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Almaty";

const normalizeBranchName = (value: string | null | undefined) => {
  if (!value) return "Текущий филиал";
  if (value === "Main Branch") return "Главный филиал";
  return value;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { branchId, branchName } = useAdminBranch();

  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toDateInput(today), [today]);
  const timezone = useMemo(() => localTimezone(), []);
  const branchLabel = useMemo(
    () => normalizeBranchName(summary?.meta.branchName ?? branchName),
    [branchName, summary?.meta.branchName]
  );

  useEffect(() => {
    if (!branchId) {
      setSummary(null);
      setLoadingSummary(false);
      return;
    }

    let active = true;
    setLoadingSummary(true);

    DashboardSummaryApi.get(branchId, todayIso, timezone)
      .then((data) => {
        if (!active) return;
        setSummary(data);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        toast.error("Не удалось загрузить summary панели");
        setSummary(null);
      })
      .finally(() => {
        if (active) setLoadingSummary(false);
      });

    return () => {
      active = false;
    };
  }, [branchId, todayIso, timezone]);

  const summaryAttention = summary?.attention ?? [];
  const summaryKpis = summary?.kpis ?? null;
  const summaryFunnelTotals = summary?.leadFunnel.totals ?? {};
  const summaryBranchToday = summary?.branchToday ?? null;
  const summaryRisks = summary?.risks ?? [];
  const summaryTrendRows = summary?.weeklyTrend.items ?? [];
  const summaryTodaySchedule = summary?.todaySchedule ?? null;
  const heroTitle = summary?.hero.title ?? "Панель администратора";
  const heroSubtitle =
    summary?.hero.subtitle ??
    "Экран дня для филиала: что требует внимания, что происходит сегодня и куда перейти следующим действием.";

  const kpis = [
    {
      title: summaryKpis?.newLeads.label ?? "Новые лиды",
      value: Number(summaryKpis?.newLeads.value ?? 0),
      hint: summaryKpis?.newLeads.hint ?? "За период",
      icon: <Squares2X2Icon className="h-5 w-5" />,
    },
    {
      title: summaryKpis?.activeGroups.label ?? "Активные группы",
      value: Number(summaryKpis?.activeGroups.value ?? 0),
      hint: summaryKpis?.activeGroups.hint ?? "Без данных",
      icon: <UserGroupIcon className="h-5 w-5" />,
    },
    {
      title: summaryKpis?.trainingsToday.label ?? "Тренировки сегодня",
      value: Number(summaryKpis?.trainingsToday.value ?? 0),
      hint: summaryKpis?.trainingsToday.hint ?? "Без данных",
      icon: <CalendarDaysIcon className="h-5 w-5" />,
    },
    {
      title: summaryKpis?.paymentsToday.label ?? "Оплаты за день",
      value: Number(summaryKpis?.paymentsToday.value ?? 0),
      hint: summaryKpis?.paymentsToday.hint ?? "Без данных",
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
  ];

  const branchStats = [
    { label: "Тренеры в работе", value: Number(summaryBranchToday?.trainersOnDuty ?? 0) },
    { label: "Группы без тренера", value: Number(summaryBranchToday?.groupsWithoutCoach ?? 0) },
    { label: "Группы без расписания", value: Number(summaryBranchToday?.groupsWithoutSchedule ?? 0) },
    { label: "Средний первый ответ", value: `${formatNumber(Number(summaryBranchToday?.avgFirstResponseMinutes ?? 0))} мин` },
  ];

  return (
    <PageShell className="space-y-6 pb-4">
      <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(207,250,254,0.8)_0%,rgba(255,255,255,0.96)_34%,rgba(248,250,252,0.98)_100%)] px-5 py-5 shadow-[0_24px_72px_-46px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full bg-cyan-100/70 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-800 shadow-sm">
              Операционный обзор дня
            </div>
            <PageHeader title={heroTitle} description={heroSubtitle} className="mt-3" />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                {branchLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Срочных сигналов: {summary?.hero.urgentCount ?? 0}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600">
                Дата: {todayIso}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:w-[280px]">
            <HeaderPulseCard label="Филиал" value={branchLabel} />
            <HeaderPulseCard label="Срочных задач" value={String(summary?.hero.urgentCount ?? 0)} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={loadingSummary ? "—" : formatNumber(item.value)}
            hint={loadingSummary ? "Собираем данные" : item.hint}
            icon={item.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <PanelCard title="Сегодня" description="Что требует внимания прямо сейчас и какой следующий шаг по филиалу.">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
              <div className="space-y-3">
                {summaryAttention.slice(0, 2).map((item, index) => (
                  <div key={item.id} className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-3 ring-1 ring-slate-200/70">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${getToneBadgeClasses(item.tone)}`}
                          >
                            {index + 1}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${getToneBadgeClasses(item.tone)}`}>
                            {getToneLabel(item.tone)}
                          </span>
                          {item.area ? (
                            <span className="inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                              {item.area}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-600">{item.description}</div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <Button variant={item.tone === "danger" ? "danger" : "secondary"} onClick={() => navigate(item.action.target)}>
                          {item.action.label}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Короткая сводка</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200/70">
                    <div className="text-[10px] text-slate-500">Срочных задач</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{summary?.hero.urgentCount ?? 0}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200/70">
                    <div className="text-[10px] text-slate-500">Тренировок сегодня</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{summaryTodaySchedule?.summary.total ?? 0}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200/70">
                    <div className="text-[10px] text-slate-500">Просроченные отчеты</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">
                      {summaryRisks.find((risk) => risk.code === "overdue-reports")?.value ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200/70">
                    <div className="text-[10px] text-slate-500">Средний ответ</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{Number(summaryBranchToday?.avgFirstResponseMinutes ?? 0)} мин</div>
                  </div>
                </div>
              </div>
            </div>
          </PanelCard>
        </div>

        <div className="xl:col-span-8 xl:grid xl:grid-cols-1 xl:gap-5">
          <PanelCard title="Расписание на сегодня" description="Ближайшие тренировки и статусы без перехода в недельную сетку." className="min-h-[340px]">
            {loadingSummary ? (
              <LoadingState label="Загрузка summary..." />
            ) : (
              <TodayScheduleList
                schedules={summaryTodaySchedule?.items ?? []}
                nextSession={summaryTodaySchedule?.nextSession ?? null}
                onOpenWeeklySchedule={() => navigate("/admin/schedule")}
              />
            )}
          </PanelCard>

          <PanelCard title="Продажи и лиды" description="Короткий аналитический блок без лишнего визуального шума." className="min-h-[220px]">
            {loadingSummary ? (
              <LoadingState label="Собираем аналитику..." />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                <LeadFunnelCompact totals={summaryFunnelTotals} />
                <WeeklyTrendCompact rows={summaryTrendRows.slice(0, 3)} />
              </div>
            )}
          </PanelCard>
        </div>

        <div className="xl:col-span-4 xl:grid xl:grid-cols-1 xl:gap-5">
          <PanelCard title="Центр управления" description={`Быстрые действия и короткая операционная сводка по филиалу ${branchLabel}.`} className="min-h-[340px]">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Быстрые действия</div>
                <div className="grid grid-cols-1 gap-3">
                  <QuickActionButton label="Добавить лид" onClick={() => navigate("/admin/leads")} />
                  <QuickActionButton label="Создать группу" onClick={() => navigate("/admin/groups")} />
                  <QuickActionButton label="Назначить тренера" onClick={() => navigate("/admin/coaches")} />
                  <QuickActionButton label="Открыть недельное расписание" onClick={() => navigate("/admin/schedule")} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Филиал сегодня</div>
                <div className="grid grid-cols-2 gap-3">
                  {branchStats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)] px-3 py-3 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70">
                      <div className="text-xs font-medium leading-5 text-slate-500">{item.label}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Риски" description="Сигналы, которые влияют на продажи, расписание и стабильность филиала." className="min-h-[220px]">
            <div className="space-y-3">
              {summaryRisks.map((row) => (
                <div key={row.code} className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 px-3 py-3 ring-1 ring-slate-200/70">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        row.tone === "danger" ? "bg-rose-500" : row.tone === "warning" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    <span>{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                        row.tone === "danger"
                          ? "bg-rose-100 text-rose-700"
                          : row.tone === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.tone === "danger" ? "Риск" : row.tone === "warning" ? "Контроль" : "Ок"}
                    </span>
                    <div className="text-sm font-semibold text-slate-900">{formatNumber(row.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </PageShell>
  );
};

export default Dashboard;
