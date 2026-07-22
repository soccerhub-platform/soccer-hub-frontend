import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
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
import GroupAttendanceTab from "./components/GroupAttendanceTab";
import GroupActivityTimeline from "./components/GroupActivityTimeline";
import GroupScheduleTab from "./schedule/GroupScheduleTab";
import GroupAvatar from "./components/GroupAvatar";
import type { MediaAsset } from "../../../shared/media.types";
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
  WorkspaceBreadcrumbs,
  WorkspaceHeader,
  WorkspaceMetric,
  WorkspaceTabs,
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

const humanizeLevel = (level?: string | null) => {
  const map: Record<string, string> = {
    BEGINNER: "Начальный",
    INTERMEDIATE: "Средний",
    ADVANCED: "Продвинутый",
    PRO: "PRO",
  };

  return level ? map[level] ?? level : "Уровень не указан";
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
  const [actionsOpen, setActionsOpen] = useState(false);
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
  ): Promise<boolean> => {
    if (!group || !token) return false;

    setUpdating(true);
    try {
      await GroupApi.updateStatus(getGroupId(group, groupId), status, token);
      await loadGroup();
      toast.success("Статус группы обновлен");
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус группы");
      return false;
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

  const detailsGroupId = getGroupId(group, groupId);
  const detailsBranchId = getBranchId(group);
  const summary = group?.summary ?? null;
  const health = group?.health ?? null;
  const healthIssues = Array.isArray(health?.issues) ? health.issues : [];
  const capabilities = group?.capabilities ?? {};
  const canEdit = capabilities.canEdit ?? true;
  const canPause = capabilities.canPause ?? group?.status === "ACTIVE";
  const canResume = capabilities.canResume ?? group?.status === "PAUSED";
  const canStop = capabilities.canStop ?? group?.status !== "STOPPED";
  const capacity = summary?.capacity ?? group?.capacity ?? 0;
  const displayStudentsCount = summary?.studentsCount ?? 0;
  const nextSessionStart = getNextSessionStart(group);
  const nextSessionId = getNextSessionId(group);
  const editOpen = searchParams.get("drawer") === "edit-group" || searchParams.get("edit") === "true";
  const stopOpen = searchParams.get("drawer") === "stop-group";
  const deleteAvatarConfirmOpen = editOpen && searchParams.get("confirm") === "delete-avatar";
  const branchName = group?.branch?.name;

  const openEdit = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "edit-group");
    next.delete("edit");
    setSearchParams(next);
  };

  const closeEdit = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    next.delete("drawer");
    next.delete("confirm");
    setSearchParams(next, { replace: true });
  };

  const openStop = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "stop-group");
    setSearchParams(next);
  };

  const openDeleteAvatarConfirm = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "edit-group");
    next.set("confirm", "delete-avatar");
    setSearchParams(next);
  };

  const closeDeleteAvatarConfirm = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("confirm");
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
    <PageShell className="max-w-none space-y-5 px-0 pb-4">
      <WorkspaceBreadcrumbs items={[{ label: "Группы", to: "/admin/groups" }, { label: group.name }]} />

      <WorkspaceHeader
        id="group-details-overview"
        className="scroll-mt-20"
        actions={(
          <div className="relative flex flex-wrap gap-2 lg:justify-end">
            {canEdit ? (
              <Button type="button" variant="secondary" onClick={openEdit}>
                <PencilSquareIcon className="h-4 w-4" />
                Редактировать
              </Button>
            ) : null}

            {canResume || canPause || canStop ? (
              <button
                type="button"
                aria-label="Действия с группой"
                onClick={() => setActionsOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>
            ) : null}

            {actionsOpen ? (
              <div className="absolute right-0 top-11 z-30 min-w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                {canResume ? (
                  <button type="button" disabled={updating} onClick={() => { setActionsOpen(false); void changeStatus("ACTIVE"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <PlayIcon className="h-4 w-4" /> Активировать
                  </button>
                ) : null}
                {canPause ? (
                  <button type="button" disabled={updating} onClick={() => { setActionsOpen(false); void changeStatus("PAUSED"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <PauseIcon className="h-4 w-4" /> Поставить на паузу
                  </button>
                ) : null}
                {canStop ? (
                  <button type="button" disabled={updating} onClick={() => { setActionsOpen(false); openStop(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">
                    <StopIcon className="h-4 w-4" /> Остановить группу
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        alert={group.status === "STOPPED" ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            Группа остановлена. Расписание и новые занятия для нее недоступны.
          </div>
        ) : null}
      >
          <div className="flex min-w-0 gap-4">
            <GroupAvatar name={group.name} avatar={group.avatar} size="lg" className="h-16 w-16 sm:h-20 sm:w-20" />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight text-slate-950">{group.name}</h1>
                <StatusBadge status={group.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                <span>{formatGroupAudience(group)}</span><span aria-hidden="true">·</span>
                <span>{humanizeLevel(group.level)}</span>
                {branchName ? <><span aria-hidden="true">·</span><span>{branchName}</span></> : null}
                <span aria-hidden="true">·</span><span>{displayStudentsCount} из {capacity} учеников</span>
              </div>
              {group.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-500">{group.description}</p>
              ) : null}
            </div>
          </div>
      </WorkspaceHeader>

      <WorkspaceTabs items={groupSections.map((item) => ({ ...item, to: sectionPath(item.key) }))} />

      {activeSection === "overview" ? (
        <div className="space-y-3">
          {summary ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <WorkspaceMetric key={card.label} icon={card.icon} label={card.label} value={card.value} note={card.hint} onClick={() => navigate(card.to)} />
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <SectionCard
            icon={<CalendarDaysIcon className="h-4 w-4" />}
            title="Следующее занятие"
            description="Ближайшая тренировка группы"
          >
            <button
              type="button"
              className="group flex w-full items-center gap-4 rounded-xl p-2 text-left transition hover:bg-slate-50"
              onClick={() => {
                if (nextSessionId) {
                  navigate(`/admin/groups/${detailsGroupId}/sessions/${nextSessionId}`);
                  return;
                }
                openSection("schedule");
              }}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-admin-50 text-admin-700">
                <CalendarDaysIcon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-slate-950">{formatDateTime(nextSessionStart)}</span>
                <span className="mt-1 block text-sm text-slate-500">
                  {nextSessionStart ? "Откройте занятие для управления и посещаемости" : "Откройте расписание, чтобы запланировать занятие"}
                </span>
              </span>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-admin-700" />
            </button>
          </SectionCard>

          <SectionCard
            icon={<ExclamationTriangleIcon className="h-4 w-4" />}
            title="Требует внимания"
            description="Проблемы, которые важно закрыть по этой группе"
          >
            {healthIssues.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {healthIssues.slice(0, 3).map((issue) => (
                  <div key={issue.code} className="flex items-start gap-3 py-3 text-sm text-slate-700 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="leading-5">{issue.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2 text-sm text-slate-600">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircleIcon className="h-5 w-5" />
                </span>
                <span><strong className="block font-semibold text-slate-900">Всё в порядке</strong>Нет активных рисков по группе.</span>
              </div>
            )}
          </SectionCard>

          <SectionCard icon={<ClockIcon className="h-4 w-4" />} title="Последняя активность" description="Недавние изменения по группе и рабочим действиям" className="xl:col-span-2">
            <GroupActivityTimeline groupId={detailsGroupId} limit={5} />
          </SectionCard>
          </div>
        </div>
      ) : null}

      {activeSection === "students" ? (
        <SectionCard className="p-0" bodyClassName="p-4">
          <GroupMembersTab
            groupId={detailsGroupId}
            groupName={group.name}
            branchId={detailsBranchId}
            capacity={capacity}
            studentsCount={displayStudentsCount}
            onChanged={loadGroup}
          />
        </SectionCard>
      ) : null}

      {activeSection === "attendance" ? (
        <SectionCard className="p-0" bodyClassName="p-4">
          <GroupAttendanceTab groupId={detailsGroupId} />
        </SectionCard>
      ) : null}

      {activeSection === "coaches" ? (
        <SectionCard className="p-0" bodyClassName="p-4">
          <GroupCoachesTab groupId={detailsGroupId} branchId={detailsBranchId} />
        </SectionCard>
      ) : null}

      {activeSection === "schedule" ? (
        <SectionCard className="p-0" bodyClassName="p-4">
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
          onAvatarChanged={(avatar) => {
            setGroup((current) => current ? { ...current, avatar } : current);
          }}
          deleteAvatarConfirmOpen={deleteAvatarConfirmOpen}
          onRequestDeleteAvatar={openDeleteAvatarConfirm}
          onCancelDeleteAvatar={closeDeleteAvatarConfirm}
        />
      ) : null}
      {stopOpen ? (
        <StopGroupDrawer
          groupName={group.name}
          saving={updating}
          onClose={closeEdit}
          onConfirm={async () => {
            if (await changeStatus("STOPPED")) closeEdit();
          }}
        />
      ) : null}
    </PageShell>
  );
};

const StopGroupDrawer: React.FC<{
  groupName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}> = ({ groupName, saving, onClose, onConfirm }) => (
  <ModalShell
    title="Остановить группу"
    description={`Группа «${groupName}» перестанет работать по текущему расписанию.`}
    placement="right"
    maxWidthClassName="max-w-lg"
    closeDisabled={saving}
    onClose={onClose}
    footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button><Button variant="danger" isLoading={saving} onClick={onConfirm}>Остановить группу</Button></div>}
  >
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div><div className="text-sm font-semibold text-rose-900">Группа станет неактивной</div><p className="mt-1 text-xs leading-5 text-rose-700">Статус изменится на «Остановлена». История группы, расписание и созданные занятия сохранятся.</p></div>
      </div>
      <p className="text-sm leading-6 text-slate-600">Если будущие занятия больше не должны проводиться, завершите активный период расписания отдельно. Группу можно будет снова активировать из меню действий.</p>
    </div>
  </ModalShell>
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
  onAvatarChanged: (avatar: MediaAsset | null) => void;
  deleteAvatarConfirmOpen: boolean;
  onRequestDeleteAvatar: () => void;
  onCancelDeleteAvatar: () => void;
}> = ({ group, token, onClose, onSaved, onAvatarChanged, deleteAvatarConfirmOpen, onRequestDeleteAvatar, onCancelDeleteAvatar }) => {
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
  const [avatar, setAvatar] = useState<MediaAsset | null>(group.avatar ?? null);
  const [avatarAction, setAvatarAction] = useState<"upload" | "delete" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Фото должно быть не больше 5 МБ");
      return;
    }

    setAvatarAction("upload");
    try {
      const nextAvatar = await GroupApi.uploadAvatar(getGroupId(group), file, token);
      setAvatar(nextAvatar);
      onAvatarChanged(nextAvatar);
      toast.success("Фото группы обновлено");
    } catch (error) {
      console.error("Failed to upload group avatar", error);
      toast.error("Не удалось загрузить фото группы");
    } finally {
      setAvatarAction(null);
    }
  };

  const deleteAvatar = async () => {
    setAvatarAction("delete");
    try {
      await GroupApi.deleteAvatar(getGroupId(group), token);
      setAvatar(null);
      onAvatarChanged(null);
      onCancelDeleteAvatar();
      toast.success("Фото группы удалено");
    } catch (error) {
      console.error("Failed to delete group avatar", error);
      toast.error("Не удалось удалить фото группы");
    } finally {
      setAvatarAction(null);
    }
  };

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
      closeDisabled={saving || avatarAction !== null}
      maxWidthClassName="max-w-2xl"
      placement="right"
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
        <div className="sm:col-span-2">
          <div className="text-sm font-medium text-slate-700">Фото группы</div>
          <div className="mt-2 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <GroupAvatar name={form.name || group.name} avatar={avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">
                {avatar ? "Фото используется в реестре и шапке группы" : "Фото пока не загружено"}
              </div>
              <div className="mt-1 text-xs text-slate-500">PNG, JPG или WebP, до 5 МБ.</div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarFile}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  isLoading={avatarAction === "upload"}
                  disabled={avatarAction !== null}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <PhotoIcon className="h-4 w-4" />
                  {avatar ? "Заменить" : "Загрузить"}
                </Button>
                {avatar ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="softDanger"
                    isLoading={avatarAction === "delete"}
                    disabled={avatarAction !== null}
                    onClick={onRequestDeleteAvatar}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Удалить
                  </Button>
                ) : null}
              </div>
              {deleteAvatarConfirmOpen ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rose-900">Удалить фото группы?</p>
                      <p className="mt-1 text-xs leading-5 text-rose-700">В реестре и шапке снова будут показаны инициалы группы.</p>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button type="button" size="sm" variant="secondary" disabled={avatarAction !== null} onClick={onCancelDeleteAvatar}>Отмена</Button>
                        <Button type="button" size="sm" variant="danger" isLoading={avatarAction === "delete"} onClick={deleteAvatar}>Удалить фото</Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

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
