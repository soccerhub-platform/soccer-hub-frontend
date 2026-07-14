import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PencilSquareIcon,
  PlayIcon,
  StopIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import {
  AdminGroupDetailsModel,
  GroupApi,
  GroupUpdatePayload,
} from "./group.api";
import GroupCoachesTab from "./components/GroupCoachesTab";
import GroupMembersTab from "./components/GroupMembersTab";
import GroupScheduleTab from "./schedule/GroupScheduleTab";
import toast from "react-hot-toast";
import {
  Button,
  ErrorState,
  FormField,
  formControlClassName,
  LoadingState,
  ModalShell,
  PageShell,
  SectionCard,
} from "../../../shared/ui";

/* ================= STATUS BADGE ================= */

const StatusBadge = ({ status }: { status: AdminGroupDetailsModel["status"] }) => {
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

const formatGroupAudience = (group: AdminGroupDetailsModel) => {
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

const getGroupId = (group: AdminGroupDetailsModel | null, fallback?: string) =>
  group?.groupId ?? group?.id ?? fallback ?? "";

const getBranchId = (group: AdminGroupDetailsModel | null) =>
  group?.branchId ?? group?.branch?.id ?? group?.branch?.branchId ?? null;

const getSessionsPerWeek = (group: AdminGroupDetailsModel | null) =>
  group?.summary?.sessionsPerWeek ?? group?.summary?.sessionPerWeek ?? 0;

const getNextSessionStart = (group: AdminGroupDetailsModel | null) => {
  const next = group?.nextSession;
  if (!next) return null;
  if (typeof next === "string") return next;
  return next.startsAt ?? next.startAt ?? null;
};

const getNextSessionId = (group: AdminGroupDetailsModel | null) => {
  const next = group?.nextSession;
  if (!next || typeof next === "string") return null;
  return next.id ?? next.sessionId ?? null;
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

const groupSections = [
  { key: "overview", label: "Обзор", enabled: true },
  { key: "students", label: "Ученики", enabled: true },
  { key: "attendance", label: "Посещаемость", enabled: true },
  { key: "coaches", label: "Тренеры", enabled: true },
  { key: "schedule", label: "Расписание", enabled: true },
] as const;

type GroupSection = (typeof groupSections)[number]["key"];

const isGroupSection = (value: string | undefined): value is GroupSection =>
  groupSections.some((section) => section.key === value);

/* ================= PAGE ================= */

const GroupDetailsPage: React.FC = () => {
  const { groupId, section } = useParams<{ groupId: string; section: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const token = user?.accessToken;

  const [group, setGroup] = useState<AdminGroupDetailsModel | null>(null);

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
      const groupData = await GroupApi.getDetails(groupId, token);
      setGroup(groupData);
    } catch (e) {
      console.error("Failed to load group details", e);
      setError("Не удалось загрузить данные группы");
      setGroup(null);
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
      await GroupApi.updateStatus(getGroupId(group, groupId), status, token);
      await loadGroup();
      toast.success("Статус группы обновлен");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус группы");
    } finally {
      setUpdating(false);
    }
  };

  const activeSection = isGroupSection(section) ? section : null;

  const sectionPath = (nextSection: GroupSection, action?: string) => {
    const search = new URLSearchParams();
    if (action) {
      search.set("action", action);
    }
    const qs = search.toString();
    return `/admin/groups/${groupId}/${nextSection}${qs ? `?${qs}` : ""}`;
  };

  const openSection = (nextSection: GroupSection, action?: string) => {
    navigate(sectionPath(nextSection, action));
  };

  const mapRecommendedAction = (action: string) => {
    switch (action) {
      case "ASSIGN_MAIN_COACH":
        return {
          label: "Назначить главного тренера",
          hint: "Откроется окно назначения тренера с ролью MAIN по умолчанию.",
          onClick: () => openSection("coaches", "assign-main"),
        };
      case "CHECK_SCHEDULE":
        return {
          label: "Проверить расписание",
          hint: "Откроется расписание группы для проверки конфликтов и пустых дней.",
          onClick: () => openSection("schedule"),
        };
      case "OPEN_MEMBERS":
        return {
          label: "Открыть состав группы",
          hint: "Откроется список учеников и статусы их контрактов.",
          onClick: () => openSection("students"),
        };
      default:
        return null;
    }
  };

  const detailsGroupId = getGroupId(group, groupId);
  const detailsBranchId = getBranchId(group);
  const summary = group?.summary ?? null;
  const health = group?.health ?? null;
  const healthIssues = Array.isArray(health?.issues) ? health.issues : [];
  const recommendedActions = Array.isArray(health?.recommendedActions) ? health.recommendedActions : [];
  const capabilities = group?.capabilities ?? {};
  const canEdit = capabilities.canEdit ?? true;
  const canPause = capabilities.canPause ?? group?.status === "ACTIVE";
  const canResume = capabilities.canResume ?? group?.status === "PAUSED";
  const canStop = capabilities.canStop ?? group?.status !== "STOPPED";
  const capacity = summary?.capacity ?? group?.capacity ?? 0;
  const displayStudentsCount = summary?.studentsCount ?? 0;
  const nextSessionStart = getNextSessionStart(group);
  const nextSessionId = getNextSessionId(group);
  const editOpen = activeSection === "overview" && searchParams.get("edit") === "true";

  const openEdit = () => {
    const next = new URLSearchParams(searchParams);
    next.set("edit", "true");
    setSearchParams(next);
  };

  const closeEdit = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  };

  const overviewCards = useMemo(
    () => [
      {
        icon: <UsersIcon className="h-4 w-4" />,
        label: "Участники",
        value: summary ? `${displayStudentsCount}/${capacity}` : "Нет данных",
        to: sectionPath("students"),
      },
      {
        icon: <UserGroupIcon className="h-4 w-4" />,
        label: "Тренеры",
        value: summary?.coachesCount ?? "Нет данных",
        to: sectionPath("coaches"),
      },
      {
        icon: <CalendarDaysIcon className="h-4 w-4" />,
        label: "В неделю",
        value: group ? getSessionsPerWeek(group) : "Нет данных",
        hint: summary ? (summary.scheduleActive ? "расписание активно" : "расписание выключено") : undefined,
        to: sectionPath("schedule"),
      },
      {
        icon: <ClockIcon className="h-4 w-4" />,
        label: "Ближайшая",
        value: formatDateTime(nextSessionStart),
        to: sectionPath("schedule"),
      },
    ],
    [capacity, displayStudentsCount, group, groupId, nextSessionStart, summary]
  );

  /* ================= UI ================= */

  if (section && !activeSection) {
    return <Navigate to={`/admin/groups/${groupId}/overview`} replace />;
  }

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
              {canEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openEdit}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Редактировать
                </Button>
              ) : null}

              {canResume ? (
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

              {canPause ? (
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

              {canStop ? (
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
              {overviewCards.map((card) => (
                <NavLink key={card.label} to={card.to} className="block rounded-xl transition hover:-translate-y-0.5 hover:ring-2 hover:ring-cyan-100">
                  <SummaryPill icon={card.icon} label={card.label} value={card.value} hint={card.hint} />
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <nav className="sticky top-3 z-10 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        {groupSections.map((item) => (
          <NavLink
            key={item.key}
            to={sectionPath(item.key)}
            className={({ isActive }) =>
              `shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-50 text-cyan-900 ring-1 ring-cyan-100"
                  : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {activeSection === "overview" && healthIssues.length > 0 ? (
        <SectionCard
          id="group-details-attention"
          title="Требует внимания"
          description="Проблемы, которые важно закрыть по этой группе"
          className="scroll-mt-20"
        >
          <div className="space-y-2">
            {healthIssues.map((issue) => (
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
          {recommendedActions.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recommendedActions
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

      {activeSection === "overview" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Состояние группы"
            description="Основные операционные показатели из новой admin-деталки."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <OverviewMetric label="Заполненность" value={`${displayStudentsCount}/${capacity}`} hint={`${summary?.occupancyPercent ?? 0}% мест занято`} />
              <OverviewMetric label="Средняя посещаемость" value={`${summary?.averageAttendancePercent ?? 0}%`} hint="по активным занятиям группы" />
              <OverviewMetric label="Тренеры" value={summary?.coachesCount ?? 0} hint="назначены на группу" />
              <OverviewMetric label="Занятий в неделю" value={getSessionsPerWeek(group)} hint="по активному расписанию" />
            </div>
          </SectionCard>

          <SectionCard
            title="Следующее занятие"
            description="Ближайшая тренировка группы."
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
                  <CalendarDaysIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950">{formatDateTime(nextSessionStart)}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {nextSessionStart ? "Откройте занятие, чтобы управлять переносом, заменой тренера или отменой." : "Ближайших занятий пока нет."}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full justify-center"
                onClick={() => {
                  if (nextSessionId) {
                    navigate(`/admin/groups/${detailsGroupId}/sessions/${nextSessionId}`);
                    return;
                  }
                  openSection("schedule");
                }}
              >
                <CalendarDaysIcon className="h-4 w-4" />
                {nextSessionId ? "Открыть занятие" : "Открыть расписание"}
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Быстрые переходы"
            description="Ключевые разделы группы открываются отдельными ссылками."
            className="xl:col-span-2"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <OverviewAction
                title="Ученики"
                description="Состав группы, договоры и посещаемость по ученикам."
                to={sectionPath("students")}
              />
              <OverviewAction
                title="Тренеры"
                description="Назначенные тренеры, роли и действия по группе."
                to={sectionPath("coaches")}
              />
              <OverviewAction
                title="Расписание"
                description="Недельная сетка, периоды и конфликты расписания."
                to={sectionPath("schedule")}
              />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeSection === "students" ? (
        <SectionCard title="Ученики" description="Состав группы и статусы договоров.">
          <GroupMembersTab groupId={detailsGroupId} />
        </SectionCard>
      ) : null}

      {activeSection === "attendance" ? (
        <SectionCard
          title="Посещаемость"
          description="Раздел подготовлен под admin attendance API."
        >
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <div className="text-sm font-semibold text-slate-900">Журнал посещаемости появится здесь</div>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Для полноценной работы нужен admin API по занятиям и посещаемости. Пока перейти к расписанию можно через соседнюю вкладку.
            </p>
            <Button type="button" variant="secondary" className="mt-4" onClick={() => openSection("schedule")}>
              <CalendarDaysIcon className="h-4 w-4" />
              Открыть расписание
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "coaches" ? (
        <SectionCard title="Тренеры" description="Назначенные тренеры и их роли.">
          <GroupCoachesTab groupId={detailsGroupId} branchId={detailsBranchId} />
        </SectionCard>
      ) : null}

      {activeSection === "schedule" ? (
        <SectionCard title="Расписание" description="Недельная сетка и периоды занятий.">
          <GroupScheduleTab groupId={detailsGroupId} />
        </SectionCard>
      ) : null}

      {editOpen ? (
        <EditGroupModal
          group={group}
          token={token}
          onClose={closeEdit}
          onSaved={async () => {
            closeEdit();
            await loadGroup();
          }}
        />
      ) : null}
    </PageShell>
  );
};

const OverviewMetric: React.FC<{ label: string; value: string | number; hint: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <ChartBarIcon className="h-4 w-4" />
      {label}
    </div>
    <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{hint}</div>
  </div>
);

const OverviewAction: React.FC<{ title: string; description: string; to: string }> = ({
  title,
  description,
  to,
}) => (
  <NavLink
    to={to}
    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-sm"
  >
    <div className="text-sm font-semibold text-slate-950">{title}</div>
    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
  </NavLink>
);

const LEVELS = [
  { value: "BEGINNER", label: "Начальный" },
  { value: "INTERMEDIATE", label: "Средний" },
  { value: "PRO", label: "Продвинутый" },
];

const AUDIENCE_TYPES = [
  { value: "CHILDREN", label: "Детская группа" },
  { value: "ADULT", label: "Взрослая группа" },
] as const;

const EditGroupModal: React.FC<{
  group: AdminGroupDetailsModel;
  token: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}> = ({ group, token, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: group.name ?? "",
    description: group.description ?? "",
    audienceType: group.audienceType ?? "CHILDREN",
    ageFrom: group.ageFrom != null ? String(group.ageFrom) : "",
    ageTo: group.ageTo != null ? String(group.ageTo) : "",
    capacity: String(group.capacity ?? group.summary?.capacity ?? ""),
    level: group.level ?? "BEGINNER",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Название обязательно");
      return;
    }

    const ageFrom = form.ageFrom ? Number(form.ageFrom) : undefined;
    const ageTo = form.ageTo ? Number(form.ageTo) : undefined;
    const capacity = Number(form.capacity);

    if (!Number.isFinite(capacity) || capacity <= 0) {
      toast.error("Вместимость должна быть положительным числом");
      return;
    }
    if (form.audienceType === "CHILDREN" && ageFrom !== undefined && (!Number.isFinite(ageFrom) || ageFrom <= 0)) {
      toast.error("Возраст от должен быть положительным числом");
      return;
    }
    if (form.audienceType === "CHILDREN" && ageTo !== undefined && (!Number.isFinite(ageTo) || ageTo <= 0)) {
      toast.error("Возраст до должен быть положительным числом");
      return;
    }
    if (form.audienceType === "CHILDREN" && ageFrom !== undefined && ageTo !== undefined && ageFrom > ageTo) {
      toast.error("Возраст от не может быть больше возраста до");
      return;
    }

    const payload: GroupUpdatePayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      audienceType: form.audienceType as "CHILDREN" | "ADULT",
      ageFrom: form.audienceType === "CHILDREN" ? ageFrom : undefined,
      ageTo: form.audienceType === "CHILDREN" ? ageTo : undefined,
      capacity,
      level: form.level,
    };

    setSaving(true);
    try {
      await GroupApi.update(getGroupId(group), payload, token);
      toast.success("Группа обновлена");
      await onSaved();
    } catch (e) {
      console.error("Failed to update group", e);
      toast.error("Не удалось обновить группу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Редактирование группы"
      description="Основные данные группы и ограничения."
      onClose={onClose}
      closeDisabled={saving}
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" isLoading={saving} onClick={submit}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Название" className="sm:col-span-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>

        <FormField label="Описание" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            className={formControlClassName}
          />
        </FormField>

        <FormField label="Тип аудитории">
          <select
            value={form.audienceType}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                audienceType: event.target.value as "CHILDREN" | "ADULT",
              }))
            }
            className={formControlClassName}
          >
            {AUDIENCE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Уровень">
          <select
            value={form.level}
            onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))}
            className={formControlClassName}
          >
            {LEVELS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={form.audienceType === "ADULT" ? "Возраст от (необязательно)" : "Возраст от"}>
          <input
            type="number"
            min={1}
            value={form.ageFrom}
            disabled={form.audienceType === "ADULT"}
            onChange={(event) => setForm((prev) => ({ ...prev, ageFrom: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>

        <FormField label={form.audienceType === "ADULT" ? "Возраст до (необязательно)" : "Возраст до"}>
          <input
            type="number"
            min={1}
            value={form.ageTo}
            disabled={form.audienceType === "ADULT"}
            onChange={(event) => setForm((prev) => ({ ...prev, ageTo: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>

        <FormField label="Вместимость">
          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>
      </div>
    </ModalShell>
  );
};

export default GroupDetailsPage;
