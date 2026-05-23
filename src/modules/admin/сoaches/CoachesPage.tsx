import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  PhoneIcon,
  PlusIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import {
  CoachApi,
  CoachOverviewItem,
  CoachOverviewResponse,
  CoachProfile,
  CoachStatus,
} from "./coach.api";
import CreateCoachModal from "./CreateCoachModal";
import { GroupApi, GroupApiModel } from "../groups/group.api";
import {
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  ModalShell,
  PageHeader,
  PageShell,
  SectionCard,
  formControlClassName,
} from "../../../shared/ui";

type StatusFilter = "all" | "active" | "inactive" | "withoutGroups" | "overloaded" | "today";

const emptyOverview: CoachOverviewResponse = {
  summary: {
    total: 0,
    active: 0,
    inactive: 0,
    withoutGroups: 0,
    overloaded: 0,
    withSessionsToday: 0,
  },
  coaches: [],
};

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "inactive", label: "Отключенные" },
  { value: "withoutGroups", label: "Без групп" },
  { value: "overloaded", label: "Перегружены" },
  { value: "today", label: "Сегодня" },
];

const dayLabels: Record<string, string> = {
  MONDAY: "Пн",
  TUESDAY: "Вт",
  WEDNESDAY: "Ср",
  THURSDAY: "Чт",
  FRIDAY: "Пт",
  SATURDAY: "Сб",
  SUNDAY: "Вс",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Нет данных";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const timeShort = (value: string) => value.slice(0, 5);

type CoachGroupAssignment = {
  groupId: string;
  groupName: string;
  branchId: string;
  groupCoachId: string | null;
  role: "MAIN" | "ASSISTANT" | null;
};

const isOverloaded = (coach: CoachOverviewItem) =>
  coach.load?.status === "OVERLOADED" ||
  coach.load?.status === "HIGH" ||
  (coach.load?.maxSlots > 0 && coach.load.usedSlots > coach.load.maxSlots);

const CoachesPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [overview, setOverview] = useState<CoachOverviewResponse>(emptyOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  const loadOverview = async () => {
    if (!branchId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await CoachApi.overview(branchId, token);
      setOverview({
        summary: data.summary ?? emptyOverview.summary,
        coaches: data.coaches ?? [],
      });
    } catch (e) {
      console.error("Failed to load coach overview", e);
      setError("Не удалось загрузить тренеров");
      setOverview(emptyOverview);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, [branchId, token]);

  const filteredCoaches = useMemo(() => {
    const term = search.trim().toLowerCase();

    return overview.coaches.filter((coach) => {
      if (filter === "active" && !coach.active) return false;
      if (filter === "inactive" && coach.active) return false;
      if (filter === "withoutGroups" && coach.groups.length > 0) return false;
      if (filter === "overloaded" && !isOverloaded(coach)) return false;
      if (filter === "today" && coach.todaySessionsCount === 0) return false;

      if (!term) return true;
      const fullName = `${coach.firstName} ${coach.lastName}`.toLowerCase();
      const email = coach.email.toLowerCase();
      const phone = coach.phone.toLowerCase();
      return fullName.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [overview.coaches, filter, search]);

  const toggleStatus = async (coach: CoachOverviewItem) => {
    if (!token) return;
    const nextStatus: CoachStatus = coach.active ? "INACTIVE" : "ACTIVE";
    setUpdatingId(coach.coachId);
    try {
      await CoachApi.updateStatus(coach.coachId, nextStatus, token);
      toast.success(coach.active ? "Тренер отключен" : "Тренер включен");
      await loadOverview();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (!branchId) {
    return (
      <PageShell>
        <EmptyState
          title="Сначала выберите филиал"
          description="Обзор тренеров доступен после выбора филиала."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Тренеры"
        description="Нагрузка, группы, расписание и отчеты тренеров по выбранному филиалу."
        actions={
          <Button type="button" onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-4 w-4" />
            Добавить тренера
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Всего" value={overview.summary.total} />
        <MetricCard label="Активны" value={overview.summary.active} tone="success" />
        <MetricCard label="Отключены" value={overview.summary.inactive} tone="danger" />
        <MetricCard label="Без групп" value={overview.summary.withoutGroups} tone="warning" />
        <MetricCard label="Перегружены" value={overview.summary.overloaded} tone="warning" />
        <MetricCard label="Сегодня ведут" value={overview.summary.withSessionsToday} />
      </div>

      <SectionCard>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr]">
          <FormField label="Поиск">
            <input
              type="text"
              placeholder="Имя, email или телефон"
              className={formControlClassName}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>

          <FormField label="Быстрый фильтр">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    filter === item.value
                      ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </FormField>
        </div>
      </SectionCard>

      {error ? (
        <ErrorState message={error} onRetry={loadOverview} />
      ) : loading ? (
        <LoadingState label="Загрузка тренеров..." />
      ) : filteredCoaches.length === 0 ? (
        <EmptyState
          title="Тренеры не найдены"
          description="Измените фильтры или добавьте нового тренера."
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredCoaches.map((coach) => (
            <CoachCard
              key={coach.coachId}
              coach={coach}
              isUpdating={updatingId === coach.coachId}
              onOpen={() => setSelectedCoachId(coach.coachId)}
              onToggleStatus={() => toggleStatus(coach)}
            />
          ))}
        </div>
      )}

      {selectedCoachId ? (
        <CoachProfileDrawer
          coachId={selectedCoachId}
          branchId={branchId}
          token={token}
          onClose={() => setSelectedCoachId(null)}
          onChanged={loadOverview}
        />
      ) : null}

      {showCreate ? (
        <CreateCoachModal
          onClose={() => setShowCreate(false)}
          onCreated={loadOverview}
        />
      ) : null}
    </PageShell>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}> = ({ label, value, tone = "neutral" }) => {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-rose-700"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
};

const CoachCard: React.FC<{
  coach: CoachOverviewItem;
  isUpdating: boolean;
  onOpen: () => void;
  onToggleStatus: () => void;
}> = ({ coach, isUpdating, onOpen, onToggleStatus }) => {
  const loadPercent =
    coach.load?.maxSlots > 0
      ? Math.min(100, Math.round((coach.load.usedSlots / coach.load.maxSlots) * 100))
      : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
              <UserCircleIcon className="h-7 w-7 text-cyan-800" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  {coach.firstName} {coach.lastName}
                </h3>
                <StatusBadge active={coach.active} />
                {coach.reports.overdueCount > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                    отчет просрочен
                  </span>
                ) : null}
              </div>
              {coach.specialization ? (
                <div className="mt-1 text-xs font-medium text-cyan-800">{coach.specialization}</div>
              ) : null}
              <div className="mt-1 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                  {coach.email}
                </div>
                <div className="flex items-center gap-1.5">
                  <PhoneIcon className="h-4 w-4 text-slate-400" />
                  {coach.phone}
                </div>
              </div>
            </div>
          </div>
        </button>

        <Button
          type="button"
          size="sm"
          variant={coach.active ? "softDanger" : "soft"}
          isLoading={isUpdating}
          onClick={onToggleStatus}
        >
          {coach.active ? "Отключить" : "Включить"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SmallStat icon={<UserGroupIcon className="h-4 w-4" />} label="Группы" value={coach.groups.length} />
        <SmallStat icon={<CalendarDaysIcon className="h-4 w-4" />} label="В неделю" value={coach.weeklySessionsCount} />
        <SmallStat icon={<ClockIcon className="h-4 w-4" />} label="Сегодня" value={coach.todaySessionsCount} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Нагрузка</span>
          <span className="text-slate-500">
            {coach.load?.usedSlots ?? 0}/{coach.load?.maxSlots ?? 0}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full ${isOverloaded(coach) ? "bg-amber-500" : "bg-cyan-700"}`}
            style={{ width: `${loadPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {coach.groups.length === 0 ? (
          <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
            Без групп
          </span>
        ) : (
          <>
            {coach.groups.slice(0, 3).map((group) => (
              <span
                key={group.groupId}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
              >
                {group.groupName}
              </span>
            ))}
            {coach.groups.length > 3 ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                +{coach.groups.length - 3}
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="text-xs text-slate-500">
          Последний отчет: {formatDateTime(coach.reports.lastReportAt)}
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
          Открыть
        </Button>
      </div>
    </section>
  );
};

const SmallStat: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
      active
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-rose-100 bg-rose-50 text-rose-700"
    }`}
  >
    {active ? "Активен" : "Отключен"}
  </span>
);

const CoachProfileDrawer: React.FC<{
  coachId: string;
  branchId: string;
  token: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}> = ({ coachId, branchId, token, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [assignments, setAssignments] = useState<CoachGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showAssignGroup, setShowAssignGroup] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CoachApi.profile(coachId, token);
      setProfile(data);
      setAssignments(
        data.groups.map((group) => ({
          groupId: group.groupId,
          groupName: group.groupName,
          branchId: group.branchId,
          groupCoachId: group.groupCoachId ?? null,
          role: group.role ?? null,
        }))
      );
    } catch (e) {
      console.error("Failed to load coach profile", e);
      setError("Не удалось загрузить профиль тренера");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [coachId, token]);

  const toggleStatus = async () => {
    if (!profile) return;
    const nextStatus: CoachStatus = profile.active ? "INACTIVE" : "ACTIVE";
    setUpdating(true);
    try {
      await CoachApi.updateStatus(profile.coachId, nextStatus, token);
      toast.success(profile.active ? "Тренер отключен" : "Тренер включен");
      await loadProfile();
      await onChanged();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус");
    } finally {
      setUpdating(false);
    }
  };

  const unassignFromGroup = async (assignment: CoachGroupAssignment) => {
    if (!assignment.groupCoachId) {
      toast.error("Нельзя снять тренера: отсутствует идентификатор назначения");
      return;
    }
    if (!confirm(`Снять тренера с группы "${assignment.groupName}"?`)) return;

    setUpdating(true);
    try {
      await GroupApi.unassignCoach(assignment.groupCoachId, token);
      toast.success("Тренер снят с группы");
      await loadProfile();
      await onChanged();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось снять тренера с группы");
    } finally {
      setUpdating(false);
    }
  };

  const resetPassword = async () => {
    if (!profile) return;
    setResetLoading(true);
    try {
      const output = await CoachApi.resetPassword(profile.coachId, token);
      const password = output.tempPassword ?? output.temporaryPassword ?? null;
      if (!password) {
        toast.error("Сброс выполнен, но пароль не вернулся в ответе");
        setShowResetPassword(false);
        return;
      }
      setResetPasswordValue(password);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сбросить пароль тренера");
      setShowResetPassword(false);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <ModalShell
      title={profile ? `${profile.firstName} ${profile.lastName}` : "Профиль тренера"}
      description="Группы, расписание, ближайшие занятия и отчеты"
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      heightClassName="max-h-[92vh]"
      footer={
        profile ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowEdit(true)}>
              Редактировать
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowResetPassword(true)}>
              <KeyIcon className="h-4 w-4" />
              Сбросить пароль
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowAssignGroup(true)}>
              <PlusIcon className="h-4 w-4" />
              Назначить в группу
            </Button>
            <Button
              type="button"
              variant={profile.active ? "softDanger" : "soft"}
              isLoading={updating}
              onClick={toggleStatus}
            >
              {profile.active ? "Отключить тренера" : "Включить тренера"}
            </Button>
          </div>
        ) : null
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={loadProfile} />
      ) : loading ? (
        <LoadingState label="Загрузка профиля..." />
      ) : profile ? (
        <CoachProfileContent
          profile={profile}
          assignments={assignments}
          onOpenGroup={(groupId) => navigate(`/admin/groups/${groupId}`)}
          onUnassignGroup={unassignFromGroup}
        />
      ) : null}

      {showAssignGroup && profile ? (
        <AssignCoachToGroupModal
          coachId={profile.coachId}
          branchId={branchId}
          assignedGroupIds={assignments.map((item) => item.groupId)}
          token={token}
          onClose={() => setShowAssignGroup(false)}
          onAssigned={async () => {
            setShowAssignGroup(false);
            await loadProfile();
            await onChanged();
          }}
        />
      ) : null}
      {showEdit && profile ? (
        <EditCoachModal
          profile={profile}
          token={token}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await loadProfile();
            await onChanged();
          }}
        />
      ) : null}
      {showResetPassword && profile ? (
        <ResetCoachPasswordModal
          coachName={`${profile.firstName} ${profile.lastName}`}
          password={resetPasswordValue}
          loading={resetLoading}
          onReset={resetPassword}
          onClose={() => {
            setShowResetPassword(false);
            setResetPasswordValue(null);
          }}
        />
      ) : null}
    </ModalShell>
  );
};

const CoachProfileContent: React.FC<{
  profile: CoachProfile;
  assignments: CoachGroupAssignment[];
  onOpenGroup: (groupId: string) => void;
  onUnassignGroup: (assignment: CoachGroupAssignment) => void | Promise<void>;
}> = ({ profile, assignments, onOpenGroup, onUnassignGroup }) => {
  const usedSlots = profile.load?.usedSlots ?? profile.weeklySchedule.length;
  const maxSlots = profile.load?.maxSlots ?? Math.max(usedSlots, 12);
  const loadPercent = maxSlots > 0 ? Math.min(100, Math.round((usedSlots / maxSlots) * 100)) : 0;
  const attentionItems = [
    profile.reports.overdueCount > 0
      ? `${profile.reports.overdueCount} просроченных отчетов`
      : null,
    profile.groups.length === 0 ? "не назначен ни в одну группу" : null,
    profile.upcomingSessions.length === 0 && profile.active ? "нет ближайших занятий" : null,
    loadPercent >= 90 ? "нагрузка близка к пределу" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
                <UserCircleIcon className="h-8 w-8 text-cyan-800" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {profile.firstName} {profile.lastName}
                  </h3>
                  <StatusBadge active={profile.active} />
                </div>
                {profile.specialization ? (
                  <div className="mt-1 text-xs font-medium text-cyan-800">
                    {profile.specialization}
                  </div>
                ) : null}
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <EnvelopeIcon className="h-4 w-4" />
                    {profile.email}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="h-4 w-4" />
                    {profile.phone}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-900">Нагрузка</span>
            <span className="text-slate-500">
              {usedSlots}/{maxSlots}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-cyan-700" style={{ width: `${loadPercent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SmallStat icon={<UserGroupIcon className="h-4 w-4" />} label="Группы" value={profile.groups.length} />
            <SmallStat
              icon={<ExclamationTriangleIcon className="h-4 w-4" />}
              label="Просрочено"
              value={profile.reports.overdueCount}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Требует внимания" description="Сигналы, на которые администратору стоит отреагировать">
        {attentionItems.length === 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Критичных проблем по тренеру сейчас нет.
          </div>
        ) : (
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Группы" description="Группы, где тренер назначен">
        {assignments.length === 0 ? (
          <EmptyState title="Группы не назначены" description="Тренер пока не привязан к группам." />
        ) : (
          <div className="space-y-2">
            {assignments.map((group) => (
              <div
                key={group.groupId}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-slate-900">{group.groupName}</div>
                    {group.role ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                        {group.role === "MAIN" ? "Главный тренер" : "Ассистент"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Группа доступна для управления из профиля тренера.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => onOpenGroup(group.groupId)}>
                    Открыть группу
                  </Button>
                  <Button type="button" size="sm" variant="softDanger" onClick={() => onUnassignGroup(group)}>
                    Снять с группы
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Недельное расписание" description="Постоянные слоты тренера">
          {profile.weeklySchedule.length === 0 ? (
            <EmptyState title="Расписание не задано" description="У тренера пока нет постоянных слотов." />
          ) : (
            <div className="space-y-2">
              {profile.weeklySchedule.map((item) => (
                <div key={item.scheduleId} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      {dayLabels[item.dayOfWeek] ?? item.dayOfWeek} · {timeShort(item.startTime)}-
                      {timeShort(item.endTime)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenGroup(item.groupId)}
                      className="text-xs font-medium text-cyan-800 hover:text-cyan-900"
                    >
                      {item.groupName}
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {item.startDate} - {item.endDate || "без даты окончания"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Ближайшие занятия" description="Что тренер ведет в ближайшее время">
          {profile.upcomingSessions.length === 0 ? (
            <EmptyState title="Ближайших занятий нет" description="В расписании нет будущих тренировок." />
          ) : (
            <div className="space-y-2">
              {profile.upcomingSessions.map((session) => (
                <div key={session.sessionId} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      {formatDate(session.sessionDate)} · {timeShort(session.startTime)}-
                      {timeShort(session.endTime)}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        session.reportDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {session.reportDone ? "отчет есть" : "без отчета"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => onOpenGroup(session.groupId)}
                      className="font-medium text-cyan-800 hover:text-cyan-900"
                    >
                      {session.groupName}
                    </button>{" "}
                    · {session.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Отчеты" description="Последние заполненные отчеты тренера">
        <div className="mb-3 text-sm text-slate-500">
          Последний отчет: {formatDateTime(profile.reports.lastReportAt)}
        </div>
        {profile.reports.recent.length === 0 ? (
          <EmptyState title="Отчетов пока нет" description="Последние отчеты появятся после проведенных занятий." />
        ) : (
          <div className="space-y-2">
            {profile.reports.recent.map((report) => (
              <div key={report.sessionId} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="font-medium text-slate-900">
                  {report.groupName} · {formatDate(report.sessionDate)} {timeShort(report.startTime)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Заполнен: {formatDateTime(report.reportedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="История статусов" description="Когда менялся статус тренера">
        {profile.statusHistory.length === 0 ? (
          <EmptyState title="История пока пуста" description="Изменения статуса появятся после первых действий." />
        ) : (
          <div className="space-y-2">
            {profile.statusHistory.map((item) => (
              <div key={`${item.status}-${item.changedAt}`} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="font-medium text-slate-900">{item.status}</div>
                <div className="mt-1 text-xs text-slate-500">Изменен: {formatDateTime(item.changedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const AssignCoachToGroupModal: React.FC<{
  coachId: string;
  branchId: string;
  assignedGroupIds: string[];
  token: string;
  onClose: () => void;
  onAssigned: () => void | Promise<void>;
}> = ({ coachId, branchId, assignedGroupIds, token, onClose, onAssigned }) => {
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [groupId, setGroupId] = useState("");
  const [role, setRole] = useState<"MAIN" | "ASSISTANT">("ASSISTANT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableGroups = groups.filter((group) => !assignedGroupIds.includes(group.groupId));

  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await GroupApi.listByBranch(branchId, token);
        setGroups(data);
      } catch (e) {
        console.error("Failed to load groups for coach assignment", e);
        setError("Не удалось загрузить группы филиала");
      } finally {
        setLoading(false);
      }
    };

    void loadGroups();
  }, [branchId, token]);

  const submit = async () => {
    if (!groupId) {
      toast.error("Выберите группу");
      return;
    }

    setSaving(true);
    try {
      await GroupApi.assignCoach(groupId, coachId, role, token);
      toast.success("Тренер назначен в группу");
      await onAssigned();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось назначить тренера в группу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Назначить в группу"
      description="Добавьте тренера в одну из групп текущего филиала."
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" isLoading={saving} onClick={submit} disabled={availableGroups.length === 0}>
            Назначить
          </Button>
        </div>
      }
    >
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState label="Загрузка групп..." />
      ) : availableGroups.length === 0 ? (
        <EmptyState
          title="Свободных групп нет"
          description="Тренер уже назначен во все доступные группы этого филиала."
        />
      ) : (
        <div className="space-y-4">
          <FormField label="Группа">
            <select className={formControlClassName} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">Выберите группу</option>
              {availableGroups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Роль">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("MAIN")}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  role === "MAIN"
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Главный тренер
              </button>
              <button
                type="button"
                onClick={() => setRole("ASSISTANT")}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  role === "ASSISTANT"
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Ассистент
              </button>
            </div>
          </FormField>
        </div>
      )}
    </ModalShell>
  );
};

const EditCoachModal: React.FC<{
  profile: CoachProfile;
  token: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}> = ({ profile, token, onClose, onSaved }) => {
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    specialization: profile.specialization ?? "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Заполните обязательные поля");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Неверный формат email");
      return;
    }
    if (!/^[0-9+()\-\\s]{7,20}$/.test(form.phone.trim())) {
      toast.error("Неверный формат телефона");
      return;
    }

    setLoading(true);
    try {
      await CoachApi.update(
        profile.coachId,
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          specialization: form.specialization.trim() || undefined,
        },
        token
      );
      toast.success("Профиль тренера обновлен");
      await onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось обновить профиль тренера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Редактировать тренера"
      description={`${profile.firstName} ${profile.lastName}`}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      closeDisabled={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" isLoading={loading} onClick={submit}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Имя*">
          <input
            type="text"
            className={formControlClassName}
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
        </FormField>
        <FormField label="Фамилия*">
          <input
            type="text"
            className={formControlClassName}
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
        </FormField>
        <FormField label="Email*">
          <input
            type="email"
            className={formControlClassName}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </FormField>
        <FormField label="Телефон*">
          <input
            type="text"
            className={formControlClassName}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </FormField>
        <FormField label="Специализация">
          <textarea
            className={formControlClassName}
            value={form.specialization}
            onChange={(event) => setForm({ ...form, specialization: event.target.value })}
            rows={3}
          />
        </FormField>
      </div>
    </ModalShell>
  );
};

const ResetCoachPasswordModal: React.FC<{
  coachName: string;
  password: string | null;
  loading: boolean;
  onReset: () => void | Promise<void>;
  onClose: () => void;
}> = ({ coachName, password, loading, onReset, onClose }) => {
  if (password) {
    return (
      <ModalShell
        title="Пароль сброшен"
        description={`Новый временный пароль для тренера ${coachName}`}
        onClose={onClose}
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Готово
            </Button>
          </div>
        }
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <code className="text-sm font-semibold text-slate-900">{password}</code>
        </div>
        <p className="mt-2 text-xs text-rose-600">Сохраните пароль сейчас. Повторно он показан не будет.</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Сбросить пароль"
      description={`Для тренера ${coachName} будет сгенерирован новый временный пароль.`}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      closeDisabled={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="danger" isLoading={loading} onClick={onReset}>
            Сбросить пароль
          </Button>
        </div>
      }
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        После сброса старый пароль перестанет работать.
      </div>
    </ModalShell>
  );
};

export default CoachesPage;
