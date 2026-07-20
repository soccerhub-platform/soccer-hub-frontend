import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PhoneIcon,
  PlusIcon,
  UserGroupIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { NavLink, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../../shared/AuthContext";
import { resolveApiUrl } from "../../../shared/api";
import { useAdminBranch } from "../BranchContext";
import { Button, EmptyState, ErrorState, FormField, LoadingState, ModalShell, PageShell, SectionCard, formControlClassName } from "../../../shared/ui";
import { CoachApi, CoachAvailability, CoachGroupAssignmentHistoryItem, CoachProfile, CoachStatus, TrainerActivityResponse, TrainerOverview } from "./coach.api";
import { GroupApi } from "../groups/group.api";
import CoachScheduleTab from "./CoachScheduleTab";
import {
  AssignCoachToGroupModal,
  CoachGroupAssignment,
  EditCoachModal,
  ResetCoachPasswordModal,
  StatusBadge,
  normalizeAvailabilityDays,
} from "./CoachesPage";

const sections = [
  { key: "overview", label: "Обзор" },
  { key: "groups", label: "Группы" },
  { key: "schedule", label: "Расписание" },
  { key: "availability", label: "Доступность" },
  { key: "activity", label: "Активность" },
] as const;

type CoachSection = (typeof sections)[number]["key"];

const isCoachSection = (value?: string): value is CoachSection =>
  sections.some((item) => item.key === value);

const weekDays = [
  { key: "MONDAY", short: "Пн" },
  { key: "TUESDAY", short: "Вт" },
  { key: "WEDNESDAY", short: "Ср" },
  { key: "THURSDAY", short: "Чт" },
  { key: "FRIDAY", short: "Пт" },
  { key: "SATURDAY", short: "Сб" },
  { key: "SUNDAY", short: "Вс" },
] as const;

const formatDate = (value?: string | null) => {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};

const timeShort = (value?: string | null) => value?.slice(0, 5) || "--:--";

const todayLocalIso = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
};

const workStatusLabel = (value?: string | null) => {
  if (value === "AVAILABLE") return "Доступен";
  if (value === "BUSY") return "Занят";
  if (value === "VACATION") return "В отпуске";
  return "Не указан";
};

const roleLabel = (value?: string | null) => value === "MAIN" ? "Главный тренер" : value === "ASSISTANT" ? "Ассистент" : "Роль не указана";

const coachAvatarUrl = (profile: CoachProfile) =>
  profile.avatar?.mediumUrl || profile.avatar?.originalUrl || profile.avatar?.thumbUrl || null;

const groupAvatarUrl = (avatar?: CoachProfile["groups"][number]["avatar"] | null) =>
  avatar?.thumbUrl || avatar?.mediumUrl || avatar?.originalUrl || null;

const calculateWeeklyLoad = (profile: CoachProfile, overview: TrainerOverview | null) => {
  const weeklySlots = profile.weeklySchedule.length;
  const load = overview?.load ?? profile.load;
  const used = load?.used ?? load?.usedSlots ?? weeklySlots;
  const limit = load?.limit ?? load?.maxSlots ?? Math.max(weeklySlots, 12);
  const backendPercent = load?.percentage;
  const percentage = backendPercent && backendPercent > 0
    ? backendPercent
    : limit > 0
      ? Math.min(100, Math.round((Math.max(used, weeklySlots) / limit) * 100))
      : 0;

  return {
    used: Math.max(used, weeklySlots),
    limit,
    percentage,
  };
};

const GroupAvatar: React.FC<{ name: string; avatar?: CoachProfile["groups"][number]["avatar"] | null; size?: "sm" | "lg" }> = ({ name, avatar, size = "sm" }) => {
  const imageUrl = groupAvatarUrl(avatar);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 font-semibold text-slate-700 ${size === "lg" ? "h-14 w-14 text-sm" : "h-10 w-10 text-xs"}`}>
      {imageUrl ? <img src={resolveApiUrl(imageUrl)} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
};

const availabilityDays = [
  { value: "MON", label: "Пн" },
  { value: "TUE", label: "Вт" },
  { value: "WED", label: "Ср" },
  { value: "THU", label: "Чт" },
  { value: "FRI", label: "Пт" },
  { value: "SAT", label: "Сб" },
  { value: "SUN", label: "Вс" },
];

const CoachDetailsPage: React.FC = () => {
  const { coachId, section } = useParams<{ coachId: string; section: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [trainerOverview, setTrainerOverview] = useState<TrainerOverview | null>(null);
  const [activityPage, setActivityPage] = useState(0);
  const [activitySize] = useState(20);
  const [activity, setActivity] = useState<TrainerActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [assignments, setAssignments] = useState<CoachGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const activeDrawer = searchParams.get("drawer");
  const selectedGroupCoachId = searchParams.get("groupCoachId");

  const openDrawer = (drawer: string, params?: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", drawer);
    Object.entries(params ?? {}).forEach(([key, value]) => next.set(key, value));
    setSearchParams(next);
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("drawer");
    next.delete("groupCoachId");
    next.delete("confirm");
    next.delete("initialStatus");
    setSearchParams(next, { replace: true });
    setResetPasswordValue(null);
  };

  const reloadActivityFirstPage = () => {
    setActivityPage(0);
    if (!coachId || !token) return;
    setActivityLoading(true);
    CoachApi.getTrainerActivity(coachId, token, { page: 0, size: activitySize })
      .then((data) => setActivity(data))
      .catch((error) => {
        console.error("Failed to load trainer activity", error);
        setActivity(null);
      })
      .finally(() => setActivityLoading(false));
  };

  const loadProfile = async () => {
    if (!coachId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const [data, overview] = await Promise.all([
        CoachApi.profile(coachId, token),
        CoachApi.trainerOverview(coachId, token).catch((error) => {
          console.error("Failed to load trainer overview", error);
          return null;
        }),
      ]);
      setProfile(data);
      setTrainerOverview(overview);
      setAssignments(
        data.groups.map((group) => ({
          groupId: group.groupId,
          groupName: group.groupName,
          avatar: group.avatar,
          branchId: group.branchId,
          groupCoachId: group.groupCoachId ?? null,
          role: group.role ?? null,
          assignedFrom: group.assignedFrom ?? null,
          assignedTo: group.assignedTo ?? null,
          ageFrom: group.ageFrom ?? null,
          ageTo: group.ageTo ?? null,
          studentsCount: group.studentsCount,
          activeStudentsCount: group.activeStudentsCount,
          weeklySlotsCount: group.weeklySlotsCount,
          nextSession: group.nextSession ?? null,
          riskFlags: group.riskFlags ?? [],
        }))
      );
    } catch (e) {
      console.error("Failed to load coach profile", e);
      setError("Не удалось загрузить профиль тренера");
      setProfile(null);
      setTrainerOverview(null);
      setActivity(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [coachId, token]);

  useEffect(() => {
    if (!coachId || !token) return;

    setActivityLoading(true);
    CoachApi.getTrainerActivity(coachId, token, { page: activityPage, size: activitySize })
      .then((data) => setActivity(data))
      .catch((error) => {
        console.error("Failed to load trainer activity", error);
        setActivity(null);
      })
      .finally(() => setActivityLoading(false));
  }, [coachId, token, activityPage, activitySize]);

  const toggleStatus = async () => {
    if (!profile || !token) return;
    const nextStatus: CoachStatus = profile.active ? "INACTIVE" : "ACTIVE";

    setUpdating(true);
    try {
      await CoachApi.updateStatus(profile.coachId, nextStatus, token);
      toast.success(profile.active ? "Тренер отключен" : "Тренер включен");
      await loadProfile();
      reloadActivityFirstPage();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус");
    } finally {
      setUpdating(false);
    }
  };

  const unassignFromGroup = async (assignment: CoachGroupAssignment) => {
    if (!token) return;
    if (!assignment.groupCoachId) {
      toast.error("Нельзя снять тренера: отсутствует идентификатор назначения");
      return;
    }
    setUpdating(true);
    try {
      await GroupApi.unassignCoach(assignment.groupCoachId, token);
      toast.success("Тренер снят с группы");
      closeDrawer();
      await loadProfile();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось снять тренера с группы");
    } finally {
      setUpdating(false);
    }
  };

  const changeGroupRole = async (assignment: CoachGroupAssignment) => {
    if (!token) return;
    if (!assignment.groupCoachId) {
      toast.error("Нельзя изменить роль: отсутствует идентификатор назначения");
      return;
    }

    const nextRole = assignment.role === "MAIN" ? "ASSISTANT" : "MAIN";
    setUpdating(true);
    try {
      await GroupApi.updateCoachRole(assignment.groupCoachId, nextRole, token);
      toast.success(nextRole === "MAIN" ? "Тренер назначен главным" : "Тренер назначен ассистентом");
      await loadProfile();
      reloadActivityFirstPage();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить роль тренера");
    } finally {
      setUpdating(false);
    }
  };

  const resetPassword = async () => {
    if (!profile || !token) return;
    setResetLoading(true);
    try {
      const output = await CoachApi.resetPassword(profile.coachId, token);
      const password = output.tempPassword ?? output.temporaryPassword ?? null;
      if (!password) {
        toast.error("Сброс выполнен, но пароль не вернулся в ответе");
        closeDrawer();
        return;
      }
      setResetPasswordValue(password);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сбросить пароль тренера");
      closeDrawer();
    } finally {
      setResetLoading(false);
    }
  };

  const weeklyLoad = profile ? calculateWeeklyLoad(profile, trainerOverview) : { used: 0, limit: 12, percentage: 0 };
  const loadPercent = weeklyLoad.percentage;
  const attentionItems = useMemo(() => {
    if (trainerOverview?.attentionItems?.length) return trainerOverview.attentionItems;
    if (!profile) return [];
    return [
      profile.reports.overdueCount > 0
        ? { type: "OVERDUE_REPORTS", severity: "WARNING", title: "Просроченные отчеты", description: `${profile.reports.overdueCount} отчетов требуют внимания` }
        : null,
      profile.groups.length === 0
        ? { type: "NO_GROUPS", severity: "WARNING", title: "Нет активных групп", description: "Тренер не назначен ни в одну группу" }
        : null,
      loadPercent >= 90
        ? { type: "HIGH_LOAD", severity: "WARNING", title: "Высокая нагрузка", description: "Нагрузка близка к недельному лимиту" }
        : null,
    ].filter(Boolean) as TrainerOverview["attentionItems"];
  }, [loadPercent, profile, trainerOverview]);

  if (section && !isCoachSection(section)) {
    return <Navigate to={`/admin/coaches/${coachId}/overview`} replace />;
  }

  const activeSection: CoachSection = isCoachSection(section) ? section : "overview";
  const selectedAssignment = assignments.find((item) => item.groupCoachId === selectedGroupCoachId) ?? null;

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (!branchId) {
    return (
      <PageShell>
        <EmptyState title="Сначала выберите филиал" description="Профиль тренера доступен после выбора филиала." />
      </PageShell>
    );
  }

  if (!coachId) {
    return (
      <PageShell>
        <ErrorState message="Не найден идентификатор тренера" />
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-none space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button type="button" onClick={() => navigate("/admin/coaches")} className="font-medium transition hover:text-admin-700">Тренеры</button>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="font-medium text-slate-900">{profile ? `${profile.firstName} ${profile.lastName}` : "Профиль"}</span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadProfile} />
      ) : loading ? (
        <LoadingState label="Загрузка профиля тренера..." />
      ) : profile ? (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-admin-100 bg-admin-50 text-2xl font-semibold text-admin-800 sm:h-28 sm:w-28">
                  {coachAvatarUrl(profile) ? <img src={resolveApiUrl(coachAvatarUrl(profile)!)} alt={`${profile.firstName} ${profile.lastName}`} className="h-full w-full object-cover" /> : (`${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || <UserCircleIcon className="h-7 w-7" />)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold text-slate-950">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    <StatusBadge active={profile.active} workStatus={trainerOverview?.trainer.workStatus ?? profile.workStatus} />
                  </div>
                  <div className="mt-1 text-base text-slate-600">{profile.specialization || "Специализация не указана"}</div>
                  <div className="mt-1 line-clamp-1 text-sm text-slate-500">{trainerOverview?.branches?.length ? trainerOverview.branches.map((branch) => branch.name).join(" · ") : profile.description || "Филиал не указан"}</div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><PhoneIcon className="h-4 w-4" />{profile.phone}</span>
                    <span className="inline-flex items-center gap-1.5"><EnvelopeIcon className="h-4 w-4" />{profile.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <div className="relative">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setActionsOpen(false);
                        setContactOpen((value) => !value);
                      }}
                    >
                      <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
                      Связаться
                      <ChevronDownIcon className={`h-4 w-4 transition ${contactOpen ? "rotate-180" : ""}`} />
                    </Button>
                    {contactOpen ? (
                      <div className="absolute right-0 top-12 z-30 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                        <div className="px-2.5 pb-1.5 pt-1 text-xs font-semibold uppercase text-slate-400">Способ связи</div>
                        <a
                          href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-emerald-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">Написать в WhatsApp</span>
                            <span className="block truncate text-xs text-slate-500">{profile.phone}</span>
                          </span>
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        </a>
                        <a
                          href={`tel:${profile.phone}`}
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-sky-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                            <PhoneIcon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">Позвонить</span>
                            <span className="block truncate text-xs text-slate-500">{profile.phone}</span>
                          </span>
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        </a>
                        <a
                          href={`mailto:${profile.email}`}
                          onClick={() => setContactOpen(false)}
                          className="flex items-center gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-violet-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <EnvelopeIcon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">Написать на email</span>
                            <span className="block truncate text-xs text-slate-500">{profile.email}</span>
                          </span>
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Button type="button" variant="secondary" onClick={() => { setContactOpen(false); setActionsOpen((value) => !value); }}>Еще<ChevronDownIcon className={`h-4 w-4 transition ${actionsOpen ? "rotate-180" : ""}`} /></Button>
                    {actionsOpen ? <div className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"><button type="button" onClick={() => { setActionsOpen(false); openDrawer("work-status"); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Изменить рабочий статус</button><button type="button" onClick={() => { setActionsOpen(false); openDrawer("availability"); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Настроить доступность</button><button type="button" onClick={() => { setActionsOpen(false); openDrawer("reset-password"); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Сбросить пароль</button><button type="button" disabled={updating} onClick={() => { setActionsOpen(false); void toggleStatus(); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${profile.active ? "text-rose-700" : "text-emerald-700"}`}>{profile.active ? "Отключить аккаунт" : "Включить аккаунт"}</button></div> : null}
                  </div>
                  <Button type="button" onClick={() => openDrawer("edit-coach")}>
                    <PencilSquareIcon className="h-4 w-4" />
                    Редактировать
                  </Button>
              </div>
            </div>
          </section>

          <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
            {sections.map((item) => (
              <NavLink
                key={item.key}
                to={`/admin/coaches/${profile.coachId}/${item.key}`}
                className={({ isActive }) => `shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${isActive ? "border-admin-700 text-admin-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {activeSection === "overview" ? <CoachOverviewTab profile={profile} overview={trainerOverview} loadPercent={loadPercent} attentionItems={attentionItems} onNavigate={navigate} onAssign={() => openDrawer("assign-group")} onAvailability={() => openDrawer("availability")} onEdit={() => openDrawer("edit-coach")} /> : null}
          {activeSection === "groups" ? <CoachGroupsTab profile={profile} assignments={assignments} updating={updating} onNavigate={navigate} onAssign={() => openDrawer("assign-group")} onChangeRole={(assignment) => void changeGroupRole(assignment)} onRemove={(assignment) => openDrawer("remove-group", { groupCoachId: assignment.groupCoachId ?? "" })} /> : null}
          {activeSection === "schedule" ? <CoachScheduleTab profile={profile} onNavigate={navigate} /> : null}
          {activeSection === "availability" ? <CoachAvailabilityTab profile={profile} overview={trainerOverview} loadPercent={loadPercent} onEditAvailability={() => openDrawer("availability")} onEditStatus={() => openDrawer("work-status")} /> : null}
          {activeSection === "activity" ? <CoachActivityTab activity={activity} loading={activityLoading} onPageChange={setActivityPage} /> : null}

          {activeDrawer === "assign-group" ? (
            <AssignCoachToGroupModal
              coachId={profile.coachId}
              branchId={branchId}
              assignedGroupIds={assignments.map((item) => item.groupId)}
              token={token}
              placement="right"
              onClose={closeDrawer}
              onAssigned={async () => {
                closeDrawer();
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
          {activeDrawer === "edit-coach" ? (
            <EditCoachModal
              profile={profile}
              token={token}
              placement="right"
              onClose={closeDrawer}
              onSaved={async () => {
                closeDrawer();
                await loadProfile();
                reloadActivityFirstPage();
              }}
              onAvatarChanged={(avatar) => setProfile((current) => current ? { ...current, avatar } : current)}
            />
          ) : null}
          {activeDrawer === "reset-password" ? (
            <ResetCoachPasswordModal
              coachName={`${profile.firstName} ${profile.lastName}`}
              password={resetPasswordValue}
              loading={resetLoading}
              placement="right"
              onReset={resetPassword}
              onClose={closeDrawer}
            />
          ) : null}
          {activeDrawer === "work-status" ? (
            <WorkStatusModal
              profile={profile}
              initialStatus={searchParams.get("initialStatus") === "VACATION" ? "VACATION" : undefined}
              token={token}
              onClose={closeDrawer}
              onSaved={async () => {
                closeDrawer();
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
          {activeDrawer === "availability" ? (
            <AvailabilityModal
              coachId={profile.coachId}
              initialValue={trainerOverview?.availability ?? null}
              token={token}
              onClose={closeDrawer}
              onSaved={async () => {
                closeDrawer();
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
          {activeDrawer === "remove-group" && selectedAssignment ? (
            <ModalShell
              title="Снять тренера с группы"
              description={`Назначение в группе «${selectedAssignment.groupName}» будет завершено.`}
              placement="right"
              onClose={closeDrawer}
              maxWidthClassName="max-w-md"
              footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={closeDrawer} disabled={updating}>Отмена</Button><Button type="button" variant="softDanger" isLoading={updating} onClick={() => void unassignFromGroup(selectedAssignment)}>Снять</Button></div>}
            >
              <p className="text-sm leading-6 text-slate-600">Расписание и история группы сохранятся. Тренер больше не будет назначен на будущие занятия этой группы.</p>
            </ModalShell>
          ) : null}
        </>
      ) : (
        <EmptyState title="Тренер не найден" description="Профиль тренера не вернулся из backend." />
      )}
    </PageShell>
  );
};

const CoachMetricCard: React.FC<{
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string;
  note?: string;
  progress?: number;
  onClick?: () => void;
}> = ({ icon, iconClassName, label, value, note, progress, onClick }) => {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>{icon}</span>
        <span className="min-w-0"><span className="block text-xl font-semibold text-slate-950">{value}</span><span className="mt-0.5 block text-sm text-slate-500">{label}</span></span>
      </div>
      {progress !== undefined ? <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(progress, 100)}%` }} /></div> : null}
      {note ? <div className="mt-3 flex items-center gap-2 text-xs font-medium text-admin-700">{note}{onClick ? <ArrowRightIcon className="h-3.5 w-3.5" /> : null}</div> : null}
    </>
  );
  return onClick ? <button type="button" onClick={onClick} className="min-h-28 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-admin-200 hover:shadow">{content}</button> : <div className="min-h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">{content}</div>;
};

const CoachOverviewTab: React.FC<{
  profile: CoachProfile;
  overview: TrainerOverview | null;
  loadPercent: number;
  attentionItems: TrainerOverview["attentionItems"];
  onNavigate: (to: string) => void;
  onAssign: () => void;
  onAvailability: () => void;
  onEdit: () => void;
}> = ({ profile, overview, loadPercent, attentionItems, onNavigate, onAssign, onAvailability, onEdit }) => {
  const nextSession = overview?.nextSession ?? profile.upcomingSessions[0] ?? null;
  const todaySessions = profile.upcomingSessions.filter((item) => item.sessionDate === todayLocalIso());
  const displayedSessions = todaySessions.length ? todaySessions : nextSession ? [nextSession] : [];
  const dailyLoad = weekDays.map((day) => ({
    ...day,
    count: profile.weeklySchedule.filter((item) => item.dayOfWeek === day.key).length,
  }));
  const maxDailyLoad = Math.max(1, ...dailyLoad.map((item) => item.count));
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CoachMetricCard icon={<UserGroupIcon className="h-5 w-5" />} iconClassName="bg-emerald-50 text-emerald-700" label="Активные группы" value={String(profile.groups.length)} note="Смотреть группы" onClick={() => onNavigate(`/admin/coaches/${profile.coachId}/groups`)} />
        <CoachMetricCard icon={<CalendarDaysIcon className="h-5 w-5" />} iconClassName="bg-sky-50 text-sky-700" label="Занятия сегодня" value={String(todaySessions.length)} note="Смотреть расписание" onClick={() => onNavigate(`/admin/coaches/${profile.coachId}/schedule`)} />
        <CoachMetricCard icon={<ChartBarIcon className="h-5 w-5" />} iconClassName="bg-violet-50 text-violet-700" label="Загрузка на неделю" value={`${loadPercent}%`} progress={loadPercent} />
        <CoachMetricCard icon={<CalendarDaysIcon className="h-5 w-5" />} iconClassName="bg-amber-50 text-amber-700" label="Начало отпуска" value={profile.vacationFrom ? formatDate(profile.vacationFrom) : "Не задан"} note={profile.vacationTo ? `до ${formatDate(profile.vacationTo)}` : undefined} />
        <CoachMetricCard icon={<ArrowPathIcon className="h-5 w-5" />} iconClassName={overview?.substitutionsThisWeek ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"} label="Замены на этой неделе" value={String(overview?.substitutionsThisWeek ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr_0.85fr]">
        <SectionCard title={todaySessions.length ? "Сегодня" : "Ближайшее занятие"}>
          {displayedSessions.length ? <div className="divide-y divide-slate-100">{displayedSessions.slice(0, 3).map((session) => <button key={session.sessionId} type="button" onClick={() => onNavigate(`/admin/groups/${session.groupId}/sessions/${session.sessionId}`)} className="flex w-full items-center gap-4 py-3 text-left transition first:pt-0 last:pb-0 hover:bg-slate-50"><span className="w-14 shrink-0"><span className="block text-base font-semibold text-slate-950">{timeShort(session.startTime)}</span><span className="mt-0.5 block text-xs text-slate-400">{timeShort(session.endTime)}</span></span><span className="min-w-0 flex-1 border-l-2 border-slate-200 pl-4"><span className="block truncate text-sm font-semibold text-slate-950">{session.groupName}</span><span className="mt-1 block text-xs text-slate-500">{roleLabel(profile.groups.find((group) => group.groupId === session.groupId)?.role)}</span></span><ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div> : <EmptyState title="Занятий нет" description="В расписании тренера нет будущих занятий." />}
          <button type="button" onClick={() => onNavigate(`/admin/coaches/${profile.coachId}/schedule`)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-admin-700 hover:text-admin-900">Смотреть расписание<ArrowRightIcon className="h-4 w-4" /></button>
        </SectionCard>

        <SectionCard title="Требует внимания">
          {attentionItems.length ? <div className="divide-y divide-slate-100">{attentionItems.slice(0, 4).map((item) => <div key={`${item.type}-${item.entityId ?? item.title}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.severity === "CRITICAL" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}><ExclamationTriangleIcon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900">{item.title}</div><div className="mt-0.5 truncate text-xs text-slate-500">{item.description}</div></div><ChevronRightIcon className="h-4 w-4 text-slate-400" /></div>)}</div> : <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Критичных проблем сейчас нет.</div>}
        </SectionCard>
        <SectionCard title="Быстрые действия">
          <div className="divide-y divide-slate-100"><button type="button" onClick={onAssign} className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium text-slate-800 first:pt-0"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><UserGroupIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1">Назначить в группу</span><ChevronRightIcon className="h-4 w-4 text-slate-400" /></button><button type="button" onClick={() => onNavigate(`/admin/coaches/${profile.coachId}/overview?drawer=work-status&initialStatus=VACATION`)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium text-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><CalendarDaysIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1">Отправить в отпуск</span><ChevronRightIcon className="h-4 w-4 text-slate-400" /></button><button type="button" onClick={onAvailability} className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium text-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><ClockIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1">Настроить доступность</span><ChevronRightIcon className="h-4 w-4 text-slate-400" /></button><button type="button" onClick={onEdit} className="flex w-full items-center gap-3 py-3 text-left text-sm font-medium text-slate-800 last:pb-0"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><PencilSquareIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1">Редактировать профиль</span><ChevronRightIcon className="h-4 w-4 text-slate-400" /></button></div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Загрузка на неделю">
          <div className="flex h-44 items-end gap-3 border-b border-slate-200 px-1 pb-6">{dailyLoad.map((day) => { const height = day.count ? Math.max(18, Math.round((day.count / maxDailyLoad) * 100)) : 4; return <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="mb-1 text-center text-xs font-semibold text-slate-600">{day.count}</div><div className={`mx-auto w-full max-w-10 rounded-t ${day.count === maxDailyLoad && day.count > 1 ? "bg-amber-500" : "bg-emerald-600"}`} style={{ height: `${height}%` }} /></div>; })}</div><div className="mt-2 grid grid-cols-7 gap-3 px-1">{dailyLoad.map((day) => <div key={day.key} className="text-center text-xs text-slate-500">{day.short}</div>)}</div>
        </SectionCard>
        <SectionCard title="Текущие группы">
          {profile.groups.length ? <div className="divide-y divide-slate-100">{profile.groups.slice(0, 4).map((group) => <button key={group.groupId} type="button" onClick={() => onNavigate(`/admin/groups/${group.groupId}/overview`)} className="flex w-full items-center gap-3 py-3 text-left transition first:pt-0 last:pb-0 hover:bg-slate-50"><GroupAvatar name={group.groupName} avatar={group.avatar} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-950">{group.groupName}</span><span className="mt-0.5 block text-xs text-slate-500">{group.weeklySlotsCount ?? 0} занятий в неделю</span></span><span className="hidden text-xs font-medium text-slate-600 sm:block">{roleLabel(group.role)}</span><ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div> : <EmptyState title="Группы не назначены" description="Назначьте тренера в первую группу." />}
          <button type="button" onClick={() => onNavigate(`/admin/coaches/${profile.coachId}/groups`)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-admin-700 hover:text-admin-900">Все группы<ArrowRightIcon className="h-4 w-4" /></button>
        </SectionCard>
      </div>
    </div>
  );
};

const groupAgeLabel = (assignment: CoachGroupAssignment) => {
  if (assignment.ageFrom && assignment.ageTo) return `${assignment.ageFrom}-${assignment.ageTo}`;
  if (assignment.ageFrom) return `от ${assignment.ageFrom}`;
  if (assignment.ageTo) return `до ${assignment.ageTo}`;
  return "Не указан";
};

const assignmentScheduleLabel = (slots: CoachProfile["weeklySchedule"]) => {
  if (!slots.length) return "Расписание не задано";
  return slots
    .map((slot) => `${weekDays.find((day) => day.key === slot.dayOfWeek)?.short ?? slot.dayOfWeek} ${timeShort(slot.startTime)}`)
    .join(", ");
};

const roleBadgeClass = (role?: string | null) =>
  role === "MAIN"
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-indigo-100 bg-indigo-50 text-indigo-700";

const assignmentPeriodLabel = (assignment: CoachGroupAssignmentHistoryItem) => {
  const from = assignment.assignedFrom ? formatDate(assignment.assignedFrom) : "дата не указана";
  const to = assignment.assignedTo ? formatDate(assignment.assignedTo) : "сейчас";
  return `${from} — ${to}`;
};

const CoachGroupsTab: React.FC<{
  profile: CoachProfile;
  assignments: CoachGroupAssignment[];
  updating: boolean;
  onNavigate: (to: string) => void;
  onAssign: () => void;
  onChangeRole: (assignment: CoachGroupAssignment) => void;
  onRemove: (assignment: CoachGroupAssignment) => void;
}> = ({ profile, assignments, updating, onNavigate, onAssign, onChangeRole, onRemove }) => {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const history = profile.groupAssignmentHistory ?? [];
  const visibleHistory = historyExpanded ? history : history.slice(0, 3);

  return <div className="space-y-4">
    <SectionCard>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-950">Активные группы</h2>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {assignments.length} текущих назначений
          </span>
        </div>
        <Button type="button" size="sm" onClick={onAssign}>
          <PlusIcon className="h-4 w-4" />
          Назначить в группу
        </Button>
      </div>

      {assignments.length ? (
        <div className="space-y-2.5">
          {assignments.map((assignment) => {
            const slots = profile.weeklySchedule.filter((item) => item.groupId === assignment.groupId);
            return (
              <div
                key={assignment.groupId}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(`/admin/groups/${assignment.groupId}/overview`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onNavigate(`/admin/groups/${assignment.groupId}/overview`);
                }}
                className="group flex cursor-pointer flex-col gap-4 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-emerald-200 hover:bg-emerald-50/30 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <GroupAvatar name={assignment.groupName} avatar={assignment.avatar} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold text-slate-950">{assignment.groupName}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${roleBadgeClass(assignment.role)}`}>
                        {roleLabel(assignment.role)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span>{assignmentScheduleLabel(slots)}</span>
                      <span className="hidden text-slate-300 sm:inline">|</span>
                      <span>Возраст: {groupAgeLabel(assignment)}</span>
                      <span className="hidden text-slate-300 sm:inline">|</span>
                      <span>Дети: {assignment.activeStudentsCount ?? assignment.studentsCount ?? 0}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Назначен с {assignment.assignedFrom ? formatDate(assignment.assignedFrom) : "не указано"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={updating || !assignment.groupCoachId}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChangeRole(assignment);
                    }}
                  >
                    Изменить роль
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="softDanger"
                    disabled={updating || !assignment.groupCoachId}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(assignment);
                    }}
                  >
                    Снять
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Группы не назначены" description="Назначьте тренера в группу, чтобы здесь появилось расписание и роль." />
      )}
    </SectionCard>

    <SectionCard>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-slate-950">История назначений</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {history.length} завершенных
        </span>
      </div>

      {history.length ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[minmax(220px,1.15fr)_0.75fr_1fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-500 lg:grid">
              <span>Группа</span>
              <span>Роль</span>
              <span>Период</span>
              <span>Причина завершения</span>
            </div>
            <div className="divide-y divide-slate-200">
              {visibleHistory.map((assignment) => (
                <button
                  key={assignment.groupCoachId}
                  type="button"
                  onClick={() => onNavigate(`/admin/groups/${assignment.groupId}/overview`)}
                  className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1.15fr)_0.75fr_1fr_1.2fr] lg:items-center lg:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <GroupAvatar name={assignment.groupName} avatar={assignment.avatar} />
                    <span className="truncate text-sm font-semibold text-slate-900">{assignment.groupName}</span>
                  </span>
                  <span className="text-sm text-slate-600"><span className="mr-1 text-xs text-slate-400 lg:hidden">Роль:</span>{roleLabel(assignment.role)}</span>
                  <span className="text-sm text-slate-600"><span className="mr-1 text-xs text-slate-400 lg:hidden">Период:</span>{assignmentPeriodLabel(assignment)}</span>
                  <span className="flex min-w-0 items-center justify-between gap-3 text-sm text-slate-600">
                    <span className="truncate"><span className="mr-1 text-xs text-slate-400 lg:hidden">Причина:</span>{assignment.removalReason || "Не указана"}</span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  </span>
                </button>
              ))}
            </div>
          </div>
          {history.length > 3 ? (
            <button
              type="button"
              onClick={() => setHistoryExpanded((current) => !current)}
              className="mx-auto mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              {historyExpanded ? "Свернуть" : `Показать еще ${history.length - 3}`}
              <ChevronDownIcon className={`h-4 w-4 transition ${historyExpanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Завершенных назначений пока нет
        </div>
      )}
    </SectionCard>
  </div>;
};

const CoachAvailabilityTab: React.FC<{ profile: CoachProfile; overview: TrainerOverview | null; loadPercent: number; onEditAvailability: () => void; onEditStatus: () => void }> = ({ profile, overview, loadPercent, onEditAvailability, onEditStatus }) => {
  const availability = overview?.availability;
  return <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><SectionCard><div className="mb-4 flex items-start justify-between gap-3"><h2 className="text-base font-semibold text-slate-950">Текущий статус</h2><Button type="button" size="sm" variant="secondary" onClick={onEditStatus}>Изменить</Button></div><div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${profile.workStatus === "VACATION" ? "bg-amber-500" : profile.workStatus === "BUSY" ? "bg-rose-500" : "bg-emerald-500"}`} /><div><div className="text-lg font-semibold text-slate-950">{workStatusLabel(profile.workStatus)}</div>{profile.workStatusReason ? <div className="mt-1 text-sm text-slate-500">{profile.workStatusReason}</div> : null}</div></div>{profile.workStatus === "VACATION" ? <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">Отпуск: <span className="font-semibold text-slate-900">{formatDate(profile.vacationFrom)} — {formatDate(profile.vacationTo)}</span></div> : null}</SectionCard><SectionCard><div className="mb-4 flex items-start justify-between gap-3"><h2 className="text-base font-semibold text-slate-950">Рабочие часы</h2><Button type="button" size="sm" variant="secondary" onClick={onEditAvailability}>Настроить</Button></div>{availability ? <><div className="flex flex-wrap gap-2">{normalizeAvailabilityDays(availability.days).map((day) => <span key={day} className="flex h-9 w-9 items-center justify-center rounded-lg bg-admin-50 text-xs font-semibold text-admin-800">{availabilityDays.find((item) => item.value === day)?.label ?? day}</span>)}</div><div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><ClockIcon className="h-4 w-4" />{timeShort(availability.timeFrom)}–{timeShort(availability.timeTo)} · {availability.timezone}</div></> : <EmptyState title="Доступность не настроена" description="Укажите рабочие дни и часы тренера." />}</SectionCard><SectionCard title="Нагрузка"><div className="flex items-end justify-between"><div><div className="text-3xl font-semibold text-slate-950">{loadPercent}%</div><div className="mt-1 text-sm text-slate-500">Использовано недельного лимита</div></div><ChartBarIcon className="h-9 w-9 text-admin-600" /></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${loadPercent >= 90 ? "bg-rose-500" : loadPercent >= 70 ? "bg-amber-500" : "bg-admin-600"}`} style={{ width: `${Math.min(loadPercent, 100)}%` }} /></div></SectionCard><SectionCard title="Планирование"><div className="space-y-3 text-sm text-slate-600"><div className="flex justify-between border-b border-slate-100 pb-3"><span>Постоянных слотов</span><strong className="text-slate-950">{profile.weeklySchedule.length}</strong></div><div className="flex justify-between border-b border-slate-100 pb-3"><span>Ближайших занятий</span><strong className="text-slate-950">{profile.upcomingSessions.length}</strong></div><div className="flex justify-between"><span>Конфликтов расписания</span><strong className={profile.weeklySchedule.some((item) => item.conflicts?.length) ? "text-rose-700" : "text-emerald-700"}>{profile.weeklySchedule.filter((item) => item.conflicts?.length).length}</strong></div></div></SectionCard></div>;
};

const CoachActivityTab: React.FC<{ activity: TrainerActivityResponse | null; loading: boolean; onPageChange: React.Dispatch<React.SetStateAction<number>> }> = ({ activity, loading, onPageChange }) => (
  <SectionCard title="История изменений" description="Статусы и административные действия по тренеру">{loading ? <LoadingState label="Загрузка активности..." /> : activity?.content.length ? <><div className="divide-y divide-slate-100">{activity.content.map((item) => <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0"><span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ArrowPathIcon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-950">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.actor.name} · {formatDateTime(item.occurredAt)}</div>{item.changes.length ? <div className="mt-2 flex flex-wrap gap-2">{item.changes.map((change, index) => <span key={`${change.field}-${index}`} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">{change.label}: {change.fromLabel ?? "—"} → {change.toLabel ?? "—"}</span>)}</div> : null}</div></div>)}</div>{activity.totalPages > 1 ? <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" size="sm" variant="secondary" disabled={activity.first} onClick={() => onPageChange((page) => Math.max(0, page - 1))}>Назад</Button><Button type="button" size="sm" variant="secondary" disabled={activity.last} onClick={() => onPageChange((page) => page + 1)}>Далее</Button></div> : null}</> : <EmptyState title="История пока пуста" description="Изменения статусов и назначений появятся здесь." />}</SectionCard>
);

const WorkStatusModal: React.FC<{ profile: CoachProfile; token: string; initialStatus?: "VACATION"; onClose: () => void; onSaved: () => Promise<void> }> = ({ profile, token, initialStatus, onClose, onSaved }) => {
  const [status, setStatus] = useState(initialStatus ?? profile.workStatus ?? "AVAILABLE");
  const [from, setFrom] = useState(profile.vacationFrom ?? new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(profile.vacationTo ?? "");
  const [reason, setReason] = useState(profile.workStatusReason ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await CoachApi.updateWorkStatus(
        profile.coachId,
        status,
        status === "VACATION" ? from : null,
        status === "VACATION" ? to || null : null,
        reason.trim() || null,
        token
      );
      toast.success("Рабочий статус обновлен");
      await onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить рабочий статус");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Рабочий статус"
      description="Не влияет на статус учетной записи"
      placement="right"
      onClose={onClose}
      closeDisabled={saving}
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" onClick={submit} isLoading={saving} disabled={status === "VACATION" && (!from || !to)}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {([["AVAILABLE", "Доступен"], ["BUSY", "Занят"], ["VACATION", "В отпуске"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                status === value ? "border-cyan-600 bg-cyan-50 text-cyan-800" : "border-slate-200 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {status === "VACATION" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              Дата начала
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              Дата окончания
              <input
                type="date"
                min={from}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
        ) : null}
        <label className="block text-sm text-slate-600">
          Комментарий
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      </div>
    </ModalShell>
  );
};

const AvailabilityModal: React.FC<{
  coachId: string;
  initialValue: CoachAvailability | null;
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}> = ({ coachId, initialValue, token, onClose, onSaved }) => {
  const [form, setForm] = useState<CoachAvailability>({
    days: initialValue?.days?.length ? normalizeAvailabilityDays(initialValue.days) : ["MON", "TUE", "WED", "THU", "FRI"],
    timeFrom: initialValue?.timeFrom ?? "09:00",
    timeTo: initialValue?.timeTo ?? "18:00",
    timezone: initialValue?.timezone ?? "Asia/Almaty",
  });
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day],
    }));
  };

  const submit = async () => {
    if (form.days.length === 0) {
      toast.error("Выберите хотя бы один рабочий день");
      return;
    }
    if (!form.timeFrom || !form.timeTo || form.timeFrom >= form.timeTo) {
      toast.error("Проверьте рабочее время");
      return;
    }

    setSaving(true);
    try {
      await CoachApi.updateAvailability(coachId, { ...form, days: normalizeAvailabilityDays(form.days) }, token);
      toast.success("Рабочая доступность обновлена");
      await onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось обновить доступность");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Изменить доступность"
      description="Доступность показывает рабочие часы тренера и не удаляет существующие занятия."
      placement="right"
      onClose={onClose}
      closeDisabled={saving}
      maxWidthClassName="max-w-lg"
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
      <div className="space-y-4">
        <FormField label="Дни недели">
          <div className="grid grid-cols-7 gap-1.5">
            {availabilityDays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold ${
                  form.days.includes(day.value)
                    ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Время с">
            <input
              type="time"
              className={formControlClassName}
              value={form.timeFrom}
              onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))}
            />
          </FormField>
          <FormField label="Время до">
            <input
              type="time"
              className={formControlClassName}
              value={form.timeTo}
              onChange={(event) => setForm((current) => ({ ...current, timeTo: event.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Часовой пояс">
          <input
            type="text"
            className={formControlClassName}
            value={form.timezone}
            onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
          />
        </FormField>
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Изменение доступности не отменяет уже созданные занятия. Конфликты в расписании остаются видимыми как предупреждения.
        </div>
      </div>
    </ModalShell>
  );
};

export default CoachDetailsPage;
