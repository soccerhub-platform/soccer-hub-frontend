import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import {
  GroupApi,
  GroupApiModel,
  GroupHealthResponse,
  GroupSummaryModel,
} from "./group.api";
import GroupTabs from "./components/GroupTabs";
import toast from "react-hot-toast";
import {
  Button,
  ErrorState,
  LoadingState,
  PageShell,
  SectionCard,
} from "../../../shared/ui";

/* ================= STATUS BADGE ================= */

const StatusBadge = ({ status }: { status: GroupApiModel["status"] }) => {
  const map: Record<string, string> = {
    ACTIVE: "border-emerald-100 bg-emerald-50 text-emerald-700",
    PAUSED: "border-amber-100 bg-amber-50 text-amber-700",
    STOPPED: "border-rose-100 bg-rose-50 text-rose-700",
  };

  const label =
    status === "ACTIVE"
      ? "Активна"
      : status === "PAUSED"
      ? "На паузе"
      : "Остановлена";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status]}`}
    >
      {label}
    </span>
  );
};

const formatGroupAudience = (group: GroupApiModel) => {
  if (group.audienceType === "ADULT") return "Взрослая группа";
  if (typeof group.ageFrom === "number" && typeof group.ageTo === "number") {
    return `${group.ageFrom}-${group.ageTo} лет`;
  }
  return "Возраст не указан";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Нет";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const SummaryPill: React.FC<{ icon: React.ReactNode; label: string; value: string | number; hint?: string }> = ({
  icon,
  label,
  value,
  hint,
}) => (
  <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
    {hint ? <div className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</div> : null}
  </div>
);

/* ================= PAGE ================= */

const GroupDetailsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;

  const [group, setGroup] = useState<GroupApiModel | null>(null);
  const [summary, setSummary] = useState<GroupSummaryModel | null>(null);
  const [health, setHealth] = useState<GroupHealthResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD ================= */

  const loadGroup = async () => {
    if (!token) return;
    if (!groupId) return;

    setLoading(true);
    setError(null);
    try {
      const [groupData, summaryData, healthData] = await Promise.all([
        GroupApi.getById(groupId, token),
        GroupApi.getSummary(groupId, token),
        GroupApi.getHealth(groupId, token),
      ]);
      setGroup(groupData);
      setSummary(summaryData);
      setHealth(healthData);
    } catch (e) {
      console.error("Failed to load group details", e);
      setError("Не удалось загрузить данные группы");
      setGroup(null);
      setSummary(null);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroup();
  }, [groupId, token]);

  /* ================= STATUS ================= */

  const changeStatus = async (
    status: "ACTIVE" | "PAUSED" | "STOPPED"
  ) => {
    if (!group || !token) return;

    if (status === "STOPPED") {
      const ok = confirm(
        "Вы уверены, что хотите остановить группу? Расписание будет отменено."
      );
      if (!ok) return;
    }

    setUpdating(true);
    try {
      await GroupApi.updateStatus(group.groupId, status, token);
      setGroup({ ...group, status });
      toast.success("Статус группы обновлен");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус группы");
    } finally {
      setUpdating(false);
    }
  };

  const openTab = (
    tab: "members" | "coaches" | "schedule",
    action?: string
  ) => {
    const search = new URLSearchParams({ tab });
    if (action) {
      search.set("action", action);
    }
    navigate({
      pathname: `/admin/groups/${groupId}`,
      search: `?${search.toString()}`,
    });
  };

  const mapRecommendedAction = (action: string) => {
    switch (action) {
      case "ASSIGN_MAIN_COACH":
        return {
          label: "Назначить главного тренера",
          hint: "Откроется окно назначения тренера с ролью MAIN по умолчанию.",
          onClick: () => openTab("coaches", "assign-main"),
        };
      case "CHECK_SCHEDULE":
        return {
          label: "Проверить расписание",
          hint: "Откроется расписание группы для проверки конфликтов и пустых дней.",
          onClick: () => openTab("schedule"),
        };
      case "OPEN_MEMBERS":
        return {
          label: "Открыть состав группы",
          hint: "Откроется список учеников и статусы их контрактов.",
          onClick: () => openTab("members"),
        };
      default:
        return null;
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openTabAndScroll = (tab: "members" | "coaches" | "schedule") => {
    openTab(tab);
    window.setTimeout(() => scrollToSection("group-details-tabs"), 50);
  };

  /* ================= UI ================= */

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Загрузка группы..." />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={loadGroup} />
      </PageShell>
    );
  }

  if (!group) {
    return (
      <PageShell>
        <ErrorState message="Группа не найдена" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-5">
      <button
        type="button"
        onClick={() => navigate("/admin/groups")}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-admin-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Назад к группам
      </button>

      <section
        id="group-details-overview"
        className="scroll-mt-20 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_44px_-34px_rgba(15,23,42,0.45)]"
      >
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(204,251,241,0.85),rgba(255,255,255,0.96)_42%,rgba(248,250,252,0.96))] p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-admin-700 shadow-sm ring-1 ring-admin-100">
                <UserGroupIcon className="h-8 w-8" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{group.name}</h1>
                  <StatusBadge status={group.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {formatGroupAudience(group)} · {group.level}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {group.description || "Описание группы пока не добавлено."}
                </p>
                {group.status === "STOPPED" ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    Группа остановлена. Расписание и новые занятия для нее недоступны.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {group.status === "PAUSED" ? (
                <Button
                  type="button"
                  variant="soft"
                  isLoading={updating}
                  onClick={() => changeStatus("ACTIVE")}
                >
                  <PlayIcon className="h-4 w-4" />
                  Активировать
                </Button>
              ) : null}

              {group.status === "ACTIVE" ? (
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={updating}
                  onClick={() => changeStatus("PAUSED")}
                >
                  <PauseIcon className="h-4 w-4" />
                  Пауза
                </Button>
              ) : null}

              {group.status !== "STOPPED" ? (
                <Button
                  type="button"
                  variant="softDanger"
                  isLoading={updating}
                  onClick={() => changeStatus("STOPPED")}
                >
                  <StopIcon className="h-4 w-4" />
                  Остановить
                </Button>
              ) : null}
            </div>
          </div>

          {summary ? (
            <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <SummaryPill icon={<UsersIcon className="h-4 w-4" />} label="Участники" value={`${summary.studentsCount}/${summary.capacity}`} />
              <SummaryPill icon={<UserGroupIcon className="h-4 w-4" />} label="Тренеры" value={summary.coachesCount} />
              <SummaryPill
                icon={<CalendarDaysIcon className="h-4 w-4" />}
                label="В неделю"
                value={summary.sessionPerWeek}
                hint={summary.scheduleActive ? "расписание активно" : "расписание выключено"}
              />
              <SummaryPill
                icon={<ClockIcon className="h-4 w-4" />}
                label="Ближайшая"
                value={formatDateTime(summary.nextSession)}
              />
            </div>
          ) : null}
        </div>
      </section>

      <nav className="sticky top-3 z-10 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        {[
          ["group-details-overview", "Обзор"],
          ["group-details-attention", "Риски"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800"
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={() => openTabAndScroll("members")} className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800">
          Ученики
        </button>
        <button type="button" onClick={() => openTabAndScroll("coaches")} className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800">
          Тренеры
        </button>
        <button type="button" onClick={() => openTabAndScroll("schedule")} className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800">
          Расписание
        </button>
      </nav>

      {health && health.issues.length > 0 ? (
        <SectionCard
          id="group-details-attention"
          title="Требует внимания"
          description="Проблемы, которые важно закрыть по этой группе"
          className="scroll-mt-20"
        >
          <div className="space-y-2">
            {health.issues.map((issue) => (
              <div
                key={issue.code}
                className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">{issue.message}</div>
                </div>
              </div>
            ))}
          </div>
          {health.recommendedActions.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {health.recommendedActions
                .map((action) => mapRecommendedAction(action))
                .filter((action): action is { label: string; hint: string; onClick: () => void } => Boolean(action))
                .map((action) => (
                  <div key={action.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <Button type="button" size="sm" variant="secondary" onClick={action.onClick}>
                      {action.label}
                    </Button>
                    <p className="mt-2 text-xs text-slate-600">{action.hint}</p>
                  </div>
                ))}
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {/* TABS */}
      <section id="group-details-tabs" className="scroll-mt-20">
        <GroupTabs groupId={group.groupId} branchId={group.branchId} />
      </section>
    </PageShell>
  );
};

export default GroupDetailsPage;
