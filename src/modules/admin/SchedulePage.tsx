import React, { useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../shared/AuthContext";
import { LoadingState, PageHeader, PageShell, SectionCard } from "../../shared/ui";
import { useAdminBranch } from "./BranchContext";
import { GroupApi, type GroupApiModel } from "./groups/group.api";
import { ScheduleApi } from "./groups/schedule/schedule.api";
import type { GroupScheduleDto } from "./groups/schedule/schedule.types";
import { CoachApi, type CoachOverviewResponse } from "./сoaches/coach.api";
import { ScheduleDetailsModal, SummaryPill, WeekCalendar } from "./dashboard-ui";

type ScheduleFilter = "ALL" | "ACTIVE" | "CANCELLED";
type CoachDirectory = Record<string, { fullName: string; todaySessions: number; overdueReports: number }>;
type GroupMeta = Record<string, { name: string; bg: string; border: string; text: string }>;

const normalizeBranchName = (value: string | null | undefined) => {
  if (!value) return "Текущий филиал";
  if (value === "Main Branch") return "Главный филиал";
  return value;
};

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId, branchName } = useAdminBranch();

  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [coachesOverview, setCoachesOverview] = useState<CoachOverviewResponse | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("ALL");
  const [allSchedules, setAllSchedules] = useState<GroupScheduleDto[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<GroupScheduleDto | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  const branchLabel = useMemo(() => normalizeBranchName(branchName), [branchName]);

  useEffect(() => {
    if (!token || !branchId) {
      setGroups([]);
      setCoachesOverview(null);
      setLoadingMeta(false);
      return;
    }

    let active = true;
    setLoadingMeta(true);

    Promise.all([GroupApi.listByBranch(branchId, token), CoachApi.overview(branchId, token, { size: 100 })])
      .then(([groupsData, coachesData]) => {
        if (!active) return;
        setGroups(groupsData);
        setCoachesOverview(coachesData);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        toast.error("Не удалось загрузить данные для расписания");
      })
      .finally(() => {
        if (active) setLoadingMeta(false);
      });

    return () => {
      active = false;
    };
  }, [branchId, token]);

  useEffect(() => {
    if (!token || !branchId || groups.length === 0) {
      setAllSchedules([]);
      setLoadingSchedules(false);
      return;
    }

    let active = true;

    const loadSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const chunks = await Promise.all(
          groups.map(async (group) => {
            const [activeSchedules, cancelledSchedules] = await Promise.all([
              ScheduleApi.listByGroupAndBranch(group.groupId, branchId, token, "ACTIVE"),
              ScheduleApi.listByGroupAndBranch(group.groupId, branchId, token, "CANCELLED"),
            ]);
            return [...(activeSchedules ?? []), ...(cancelledSchedules ?? [])];
          })
        );

        if (!active) return;
        setAllSchedules(chunks.flat());
      } catch (error) {
        console.error(error);
        if (!active) return;
        toast.error("Не удалось загрузить недельную сетку");
        setAllSchedules([]);
      } finally {
        if (active) setLoadingSchedules(false);
      }
    };

    void loadSchedules();

    return () => {
      active = false;
    };
  }, [branchId, groups, token]);

  const groupMeta = useMemo<GroupMeta>(() => {
    const palette = [
      { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
      { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
      { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
      { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
      { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
      { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
    ];

    return Object.fromEntries(
      groups.map((group, index) => [group.groupId, { name: group.name, ...palette[index % palette.length] }])
    );
  }, [groups]);

  const coachDirectory = useMemo<CoachDirectory>(() => {
    return Object.fromEntries(
      (coachesOverview?.coaches.content ?? []).map((coach) => [
        coach.coachId,
        {
          fullName: `${coach.firstName} ${coach.lastName}`.trim(),
          todaySessions: coach.todaySessionsCount,
          overdueReports: coach.reports.overdueCount,
        },
      ])
    );
  }, [coachesOverview]);

  const filteredSchedules = useMemo(() => {
    if (scheduleFilter === "ALL") return allSchedules;
    return allSchedules.filter((schedule) => schedule.status === scheduleFilter);
  }, [allSchedules, scheduleFilter]);

  const scheduleCounts = useMemo(() => {
    const active = allSchedules.filter((schedule) => schedule.status === "ACTIVE").length;
    const cancelled = allSchedules.filter((schedule) => schedule.status === "CANCELLED").length;
    return { total: allSchedules.length, active, cancelled };
  }, [allSchedules]);

  const refreshSchedules = async () => {
    if (!token || !branchId || groups.length === 0) return;

    setLoadingSchedules(true);
    try {
      const chunks = await Promise.all(
        groups.map(async (group) => {
          const [activeSchedules, cancelledSchedules] = await Promise.all([
            ScheduleApi.listByGroupAndBranch(group.groupId, branchId, token, "ACTIVE"),
            ScheduleApi.listByGroupAndBranch(group.groupId, branchId, token, "CANCELLED"),
          ]);
          return [...(activeSchedules ?? []), ...(cancelledSchedules ?? [])];
        })
      );
      setAllSchedules(chunks.flat());
    } catch (error) {
      console.error(error);
      toast.error("Не удалось обновить расписание");
    } finally {
      setLoadingSchedules(false);
    }
  };

  return (
    <PageShell className="space-y-6">
      <PageHeader
        title="Недельное расписание"
        description={`Полная рабочая сетка филиала ${branchLabel}: занятия, фильтры и статусы.`}
      />

      <SectionCard className="rounded-[28px] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-admin-700">
              <CalendarDaysIcon className="h-5 w-5" />
              <h3 className="heading-font text-lg font-semibold">Сетка недели</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Рабочий экран для контроля занятий по всем группам филиала.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {(["ALL", "ACTIVE", "CANCELLED"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScheduleFilter(value)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                    scheduleFilter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {value === "ALL" ? "Все" : value === "ACTIVE" ? "Активные" : "Отмененные"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <SummaryPill label="Всего событий" value={scheduleCounts.total} />
          <SummaryPill label="Активные" value={scheduleCounts.active} tone="success" />
          <SummaryPill label="Отмененные" value={scheduleCounts.cancelled} tone="danger" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {groups.map((group) => {
            const meta = groupMeta[group.groupId];
            return (
              <span
                key={group.groupId}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${meta.bg} ${meta.border} ${meta.text}`}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                {group.name}
              </span>
            );
          })}
        </div>

        <div className="mt-5">
          {loadingMeta || loadingSchedules ? (
            <LoadingState label="Загрузка недельной сетки..." />
          ) : filteredSchedules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Для текущего фильтра нет расписания. Проверьте группы или активность занятий.
            </div>
          ) : (
            <WeekCalendar
              schedules={filteredSchedules}
              groupMeta={groupMeta}
              coachDirectory={coachDirectory}
              onSelectSchedule={setSelectedSchedule}
            />
          )}
        </div>
      </SectionCard>

      {selectedSchedule ? (
        <ScheduleDetailsModal
          schedule={selectedSchedule}
          groupMeta={groupMeta}
          coachName={coachDirectory[selectedSchedule.coachId]?.fullName ?? null}
          onClose={() => setSelectedSchedule(null)}
          onToggleStatus={async () => {
            if (!token) return;
            try {
              if (selectedSchedule.status === "ACTIVE") {
                await ScheduleApi.cancelSchedule(selectedSchedule.scheduleId, token);
                toast.success("Занятие отменено");
              } else {
                await ScheduleApi.activateSchedule(selectedSchedule.scheduleId, token);
                toast.success("Занятие активировано");
              }
              setSelectedSchedule(null);
              await refreshSchedules();
            } catch (error) {
              console.error(error);
              toast.error("Не удалось обновить статус занятия");
            }
          }}
        />
      ) : null}
    </PageShell>
  );
};

export default SchedulePage;
