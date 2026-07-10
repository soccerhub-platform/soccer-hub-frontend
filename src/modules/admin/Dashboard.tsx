import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  CreditCardIcon,
  EllipsisVerticalIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, EmptyState, LoadingState, PageShell } from "../../shared/ui";
import { useAdminBranch } from "./BranchContext";
import { DashboardSummaryApi } from "./dashboard-summary.api";
import type {
  AdminDashboardSummaryResponse,
  DashboardAttentionItem,
  DashboardFunnelRow,
  DashboardKpiItem,
  DashboardRiskItem,
  DashboardSession,
  DashboardTone,
  DashboardTopCard,
  DashboardWeeklyDynamics,
} from "./dashboard-summary.types";

type DashboardIcon = "leads" | "coach" | "payment" | "groups" | "schedule";

type InsightCard = {
  id: string;
  icon: DashboardIcon;
  tone: "danger" | "warning" | "success" | "info";
  title: string;
  description: string;
  buttonLabel: string;
  target: string;
  detailTitle: string;
  detailRows: { label: string; value: string }[];
};

const formatNumber = (value?: number) => Number(value ?? 0).toLocaleString("ru-RU");
const formatCurrency = (value?: number) => `${formatNumber(value)} ₸`;
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Almaty";
const formatNullable = (value: number | null | undefined, fallback = "—") =>
  value == null ? fallback : formatNumber(value);
const formatDelta = (value: number | null | undefined) => {
  if (value == null) return undefined;
  if (value === 0) return undefined;
  return value > 0 ? `+ ${formatNumber(value)}` : formatNumber(value);
};

const normalizeTone = (tone: string | undefined): DashboardTone => {
  if (tone === "danger" || tone === "warning" || tone === "success" || tone === "info") return tone;
  return "info";
};

const normalizeIcon = (icon: string | undefined, fallback: DashboardIcon = "leads"): DashboardIcon => {
  if (icon === "leads" || icon === "coach" || icon === "payment" || icon === "groups" || icon === "schedule") return icon;
  if (icon === "trainer" || icon === "user") return "coach";
  if (icon === "wallet" || icon === "card") return "payment";
  if (icon === "calendar") return "schedule";
  return fallback;
};

const kpiByCode = (items: DashboardKpiItem[], code: string) => items.find((item) => item.code === code);

const topCardToInsight = (card: DashboardTopCard, fallbackIcon: DashboardIcon): InsightCard => ({
  id: card.id,
  icon: normalizeIcon(card.icon, fallbackIcon),
  tone: normalizeTone(card.tone),
  title: card.title,
  description: card.description,
  buttonLabel: card.action.label,
  target: card.action.target,
  detailTitle: card.title,
  detailRows: card.details.length > 0 ? card.details : [{ label: "Следующий шаг", value: card.action.label }],
});

const iconMap: Record<DashboardIcon, React.ReactNode> = {
  leads: <UserPlusIcon className="h-8 w-8" />,
  coach: <UserIcon className="h-8 w-8" />,
  payment: <CreditCardIcon className="h-8 w-8" />,
  groups: <UserGroupIcon className="h-8 w-8" />,
  schedule: <CalendarDaysIcon className="h-8 w-8" />,
};

const toneClasses = {
  danger: "border-rose-100 bg-rose-50/55 text-rose-700",
  warning: "border-amber-100 bg-amber-50/65 text-amber-700",
  success: "border-emerald-100 bg-emerald-50/65 text-emerald-700",
  info: "border-cyan-100 bg-cyan-50/65 text-cyan-700",
};

const dotClasses = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  info: "bg-cyan-600",
};

const getRiskTone = (tone: DashboardRiskItem["tone"]) => {
  if (tone === "danger" || tone === "warning" || tone === "success") return tone;
  return "info";
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { branchId } = useAdminBranch();

  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [activeInsight, setActiveInsight] = useState<InsightCard | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toDateInput(today), [today]);
  const timezone = useMemo(() => localTimezone(), []);
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

  const kpiItems = summary?.kpis?.items ?? [];
  const branchSummary = summary?.branchSummary ?? null;
  const risks = summary?.risks?.items ?? [];
  const attention = summary?.alerts?.attention ?? [];
  const topCards = summary?.alerts?.topCards ?? [];
  const funnelRows = summary?.funnel?.rows ?? [];
  const todaySchedule = summary?.todaySchedule ?? null;
  const weeklyDynamics = summary?.weeklyDynamics ?? null;

  const newLeadsKpi = kpiByCode(kpiItems, "newLeads");
  const activeGroupsKpi = kpiByCode(kpiItems, "activeGroups");
  const trainingsTodayKpi = kpiByCode(kpiItems, "trainingsToday");
  const paymentsTodayKpi = kpiByCode(kpiItems, "paymentsToday");

  const trainingsTodayCount = Number(trainingsTodayKpi?.count ?? trainingsTodayKpi?.value ?? todaySchedule?.summary.total ?? 0);
  const paymentsTodayAmount = Number(paymentsTodayKpi?.amount ?? paymentsTodayKpi?.value ?? 0);

  const insightCards: InsightCard[] = topCards
    .slice(0, 3)
    .map((card, index) => topCardToInsight(card, index === 1 ? "coach" : index === 2 ? "payment" : "leads"));

  const kpiCards = [
    {
      title: newLeadsKpi?.label ?? "Новые лиды",
      value: newLeadsKpi?.displayValue ?? formatNumber(Number(newLeadsKpi?.count ?? newLeadsKpi?.value ?? 0)),
      delta: newLeadsKpi?.delta.label,
      hint: newLeadsKpi?.hint ?? "Нет сравнения",
      icon: "leads" as DashboardIcon,
      target: newLeadsKpi?.target ?? "/admin/leads",
    },
    {
      title: activeGroupsKpi?.label ?? "Активные группы",
      value: activeGroupsKpi?.displayValue ?? formatNumber(Number(activeGroupsKpi?.count ?? activeGroupsKpi?.value ?? 0)),
      delta: activeGroupsKpi?.delta.label,
      hint: activeGroupsKpi?.hint ?? "Нет сравнения",
      icon: "groups" as DashboardIcon,
      target: activeGroupsKpi?.target ?? "/admin/groups",
    },
    {
      title: trainingsTodayKpi?.label ?? "Сегодняшние тренировки",
      value: trainingsTodayKpi?.displayValue ?? formatNumber(trainingsTodayCount),
      delta: trainingsTodayKpi?.delta.label,
      hint: trainingsTodayKpi?.hint ?? "Нет сравнения",
      icon: "schedule" as DashboardIcon,
      target: trainingsTodayKpi?.target ?? "/admin/schedule",
    },
    {
      title: paymentsTodayKpi?.label ?? "Оплаты за день",
      value: paymentsTodayKpi?.displayValue ?? formatCurrency(paymentsTodayAmount),
      delta: paymentsTodayKpi?.delta.label,
      hint: paymentsTodayKpi?.hint ?? "Нет сравнения",
      icon: "payment" as DashboardIcon,
      target: paymentsTodayKpi?.target ?? "/admin/payments",
    },
  ];

  const attentionRows = attention.slice(0, 4);
  const scheduleItems = todaySchedule?.items ?? [];

  return (
    <PageShell className="max-w-none space-y-5 px-0 pb-4">
      <div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">Панель администратора</h1>
          <p className="mt-1 text-sm text-slate-500">Главная картина клуба на сегодня</p>
        </div>
      </div>

      {insightCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {insightCards.map((card) => (
            <InsightSummaryCard key={card.id} card={card} onOpen={() => setActiveInsight(card)} />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <MetricCard key={card.title} {...card} loading={loadingSummary} onClick={() => navigate(card.target)} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <DashboardPanel className="xl:col-span-4" title="Что требует внимания">
          {attentionRows.length > 0 ? (
            <>
              <div className="divide-y divide-slate-100">
                {attentionRows.map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.action.target)} />
                ))}
              </div>
              <button
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-admin-700"
                onClick={() => navigate("/admin/leads")}
              >
                Показать все ({attentionRows.length})
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            <EmptyState title="Нет срочных задач" description="Backend не вернул элементы внимания для текущего филиала." />
          )}
        </DashboardPanel>

        <DashboardPanel className="xl:col-span-4" title="Воронка лидов">
          {loadingSummary ? (
            <LoadingState label="Собираем аналитику..." />
          ) : (
            <FunnelRows rows={funnelRows} conversion={summary?.funnel?.conversionToClientPercent ?? 0} />
          )}
        </DashboardPanel>

        <div className="grid grid-cols-1 gap-3 xl:col-span-4">
          <DashboardPanel title="Быстрые действия">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <QuickTile icon="leads" label="Добавить лид" onClick={() => navigate("/admin/leads?action=create")} />
              <QuickTile icon="groups" label="Создать группу" onClick={() => navigate("/admin/groups?action=create")} />
              <QuickTile icon="coach" label="Назначить тренера" onClick={() => navigate("/admin/coaches?task=assign")} />
              <QuickTile icon="payment" label="Открыть платежи" onClick={() => navigate("/admin/payments")} />
            </div>
          </DashboardPanel>

          <DashboardPanel title="Филиал сегодня">
            <div className="grid grid-cols-2 gap-3">
              <BranchMiniStat label="Всего учеников" value={formatNullable(branchSummary?.studentsTotal)} delta={formatDelta(branchSummary?.studentsDelta)} />
              <BranchMiniStat
                label="Посещено тренировок"
                value={`${formatNullable(branchSummary?.trainingsVisited)} из ${formatNullable(branchSummary?.trainingsTotal)}`}
                title={branchSummary?.unavailableReasons.trainingsVisited}
              />
              <BranchMiniStat
                label="Присутствие на тренировках"
                value={branchSummary?.attendancePercent == null ? "—" : `${formatNumber(branchSummary.attendancePercent)}%`}
                title={branchSummary?.unavailableReasons.attendancePercent}
              />
              <BranchMiniStat label="Новые ученики" value={formatNullable(branchSummary?.newStudents)} delta={formatDelta(branchSummary?.newStudentsDelta)} />
            </div>
          </DashboardPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <DashboardPanel className="xl:col-span-7" title="Расписание на сегодня" actionLabel="Полное расписание" onAction={() => navigate("/admin/schedule")}>
          <SchedulePreview schedules={scheduleItems} totalCount={todaySchedule?.summary.total ?? 0} onOpenSchedule={() => navigate("/admin/schedule")} />
        </DashboardPanel>

        <div className="grid grid-cols-1 gap-3 xl:col-span-5">
          <DashboardPanel title="Риски">
            {risks.length > 0 ? (
              <div className="space-y-2">
                {risks.slice(0, 3).map((risk, index) => (
                  <RiskRow key={`${risk.code}-${index}`} risk={risk} onClick={() => navigate(risk.target)} />
                ))}
              </div>
            ) : (
              <EmptyState title="Рисков нет" description="Backend не вернул риски по текущему филиалу." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Динамика за неделю" actionLabel="Неделя">
            <WeeklySparkline dynamics={weeklyDynamics} />
          </DashboardPanel>
        </div>
      </div>

      {activeInsight ? (
        <InsightModal
          card={activeInsight}
          onClose={() => setActiveInsight(null)}
          onPrimary={() => {
            const target = activeInsight.target;
            setActiveInsight(null);
            navigate(target);
          }}
        />
      ) : null}
    </PageShell>
  );
};

const InsightSummaryCard = ({ card, onOpen }: { card: InsightCard; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-30px_rgba(15,23,42,0.45)]"
  >
    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border ${toneClasses[card.tone]}`}>
      {iconMap[card.icon]}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-base font-semibold text-slate-950">{card.title}</div>
      <div className="mt-1 text-sm text-slate-500">{card.description}</div>
      <span className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
        {card.buttonLabel}
      </span>
    </div>
    <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
  </button>
);

const MetricCard = ({
  title,
  value,
  delta,
  hint,
  icon,
  loading,
  onClick,
}: {
  title: string;
  value: string;
  delta?: string;
  hint: string;
  icon: DashboardIcon;
  loading: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[104px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_10px_26px_-24px_rgba(15,23,42,0.45)] transition hover:border-admin-200 hover:bg-admin-50/20"
  >
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-admin-50 text-admin-700">
      {iconMap[icon]}
    </div>
    <div className="min-w-0">
      <div className="text-sm font-medium text-slate-600">{title}</div>
      <div className="mt-1 flex items-end gap-3">
        <span className="text-[28px] font-semibold leading-none tracking-tight text-slate-950">{loading ? "—" : value}</span>
        {delta ? <span className="pb-1 text-sm font-semibold text-emerald-700">▲ {delta}</span> : null}
      </div>
      <div className="mt-1 text-sm text-slate-500">{loading ? "Собираем данные" : hint}</div>
    </div>
  </button>
);

const DashboardPanel = ({
  title,
  children,
  className = "",
  actionLabel,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_-25px_rgba(15,23,42,0.45)] ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
    {children}
  </section>
);

const AttentionRow = ({ item, onClick }: { item: DashboardAttentionItem; onClick: () => void }) => {
  const tone = item.tone === "danger" || item.tone === "warning" || item.tone === "success" ? item.tone : "info";
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClasses[tone]}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">{item.title}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{item.description}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {item.action.label}
      </button>
      <EllipsisVerticalIcon className="h-5 w-5 shrink-0 text-slate-400" />
    </div>
  );
};

const QuickTile = ({ icon, label, onClick }: { icon: DashboardIcon; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[56px] items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:border-admin-200 hover:bg-admin-50/30"
  >
    <span className="text-admin-700 [&>svg]:h-5 [&>svg]:w-5">{iconMap[icon]}</span>
    {label}
  </button>
);

const BranchMiniStat = ({ label, value, delta, title }: { label: string; value: string; delta?: string; title?: string }) => (
  <div className="border-l border-slate-100 pl-3 first:border-l-0 first:pl-0" title={title}>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-950">
      {value}
      {delta ? <span className="text-xs font-semibold text-emerald-700">▲ {delta}</span> : null}
    </div>
  </div>
);

const FunnelRows = ({ rows, conversion }: { rows: DashboardFunnelRow[]; conversion: number }) => {
  if (rows.length === 0 || rows.every((row) => Number(row.count) === 0)) {
    return (
      <EmptyState
        title="Воронка пустая"
        description="Backend вернул нулевые значения по воронке лидов за выбранный период."
      />
    );
  }

  const max = Math.max(...rows.map((row) => Number(row.count ?? 0)), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.status} className="grid grid-cols-[132px_1fr_48px_42px] items-center gap-3">
          <div className="truncate text-sm font-medium text-slate-700">{row.label}</div>
          <div className="h-7 rounded-lg bg-slate-100">
            <div
              className={`flex h-7 items-center justify-end rounded-lg px-2 text-xs font-semibold text-white ${
                row.status === "WON" ? "bg-emerald-600" : row.status === "WAITING_PAYMENT" ? "bg-emerald-200 text-emerald-950" : "bg-admin-700"
              }`}
              style={{ width: `${Math.max(row.count > 0 ? 16 : 0, (row.count / max) * 100)}%` }}
            >
              {row.count > 0 ? row.count : ""}
            </div>
          </div>
          <div className="text-right text-sm font-semibold text-slate-900">{formatNumber(row.count)}</div>
          <div className="text-right text-xs text-slate-500">{formatNumber(row.percent)}%</div>
        </div>
      ))}
      <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
        Конверсия в клиенты: <span className="font-semibold text-slate-800">{formatNumber(conversion)}%</span>
      </div>
    </div>
  );
};

const SchedulePreview = ({
  schedules,
  totalCount,
  onOpenSchedule,
}: {
  schedules: DashboardSession[];
  totalCount: number;
  onOpenSchedule: () => void;
}) => {
  const visible = schedules.slice(0, 4);

  if (visible.length === 0) {
    return (
      <EmptyState
        title="На сегодня тренировок нет"
        description="Backend не вернул занятия на выбранную дату."
        action={
          <Button variant="secondary" onClick={onOpenSchedule}>
            Открыть недельное расписание
          </Button>
        }
      />
    );
  }

  const cards = visible.map((session) => ({
    group: session.groupName,
    type: session.scheduleType === "TEMPORARY" ? "Временное занятие" : "Регулярное занятие",
    coach: session.coachName,
  }));

  return (
    <div>
      <div className="grid grid-cols-[44px_1fr] gap-3">
        <div className="space-y-[34px] pt-2 text-xs text-slate-500">
          <div>09:00</div>
          <div>11:00</div>
          <div>13:00</div>
          <div>15:00</div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={`${card.group}-${card.coach}`} className="min-h-[178px] rounded-xl border border-cyan-100 bg-gradient-to-b from-cyan-50/70 to-white p-3">
              <div className="text-sm font-semibold text-admin-800">{card.group}</div>
              <div className="mt-2 text-xs text-slate-500">{card.type}</div>
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-800">ТР</span>
                {card.coach}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <CalendarDaysIcon className="h-4 w-4" />
        Сегодня запланировано {formatNumber(totalCount)} тренировок
      </div>
    </div>
  );
};

const RiskRow = ({ risk, onClick }: { risk: DashboardRiskItem; onClick: () => void }) => {
  const tone = getRiskTone(risk.tone);
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${dotClasses[tone]}`}>
        <ExclamationCircleIcon className="h-3.5 w-3.5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">{risk.label}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{risk.description || `Значение: ${formatNumber(risk.value)} ${risk.unit}`}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
      >
        Подробнее
      </button>
    </div>
  );
};

const seriesColor = (code: string) => {
  if (code === "leads") return "#0891b2";
  if (code === "trainings") return "#0f766e";
  return "#86d981";
};

const WeeklySparkline = ({ dynamics }: { dynamics: DashboardWeeklyDynamics | null }) => {
  if (!dynamics) {
    return <EmptyState title="Нет динамики" description="Backend не вернул недельную динамику." />;
  }

  if (dynamics.isEmpty) {
    return (
      <div>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          {dynamics.emptyReason ?? "Пока нет данных для недельной динамики."}
        </div>
      </div>
    );
  }

  const effective = dynamics;
  const series = effective.series.slice(0, 3);
  const allValues = series.flatMap((item) => item.points.map((point) => Number(point.value ?? 0)));
  const max = Math.max(...allValues, 1);
  const labels = series[0]?.points.map((point) => point.date.slice(5).replace("-", ".")) ?? [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-5 text-xs text-slate-500">
        {series.map((item) => (
          <span key={item.code} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seriesColor(item.code) }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 520 112" className="h-[112px] w-full overflow-visible">
        <line x1="0" y1="96" x2="520" y2="96" stroke="#e5e7eb" />
        <line x1="0" y1="66" x2="520" y2="66" stroke="#eef2f7" />
        <line x1="0" y1="36" x2="520" y2="36" stroke="#eef2f7" />
        {series.map((item) => {
          const points = item.points
            .map((point, index) => {
              const x = 18 + index * (468 / Math.max(item.points.length - 1, 1));
              const y = 96 - (Number(point.value ?? 0) / max) * 68;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={item.code}
              points={points}
              fill="none"
              stroke={seriesColor(item.code)}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div className="grid text-center text-xs text-slate-400" style={{ gridTemplateColumns: `repeat(${Math.max(labels.length, 1)}, minmax(0, 1fr))` }}>
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
};

const InsightModal = ({
  card,
  onClose,
  onPrimary,
}: {
  card: InsightCard;
  onClose: () => void;
  onPrimary: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${toneClasses[card.tone]}`}>
          {iconMap[card.icon]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-slate-950">{card.detailTitle}</div>
          <div className="mt-1 text-sm text-slate-500">{card.description}</div>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {card.detailRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-500">{row.label}</span>
            <span className="text-right text-sm font-semibold text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        <Button onClick={onPrimary}>{card.buttonLabel}</Button>
      </div>
    </div>
  </div>
);

export default Dashboard;
