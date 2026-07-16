import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  CakeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { ApiError, getApiErrorMessage } from "../../../../shared/api";
import { useAuth } from "../../../../shared/AuthContext";
import {
  Button,
  EmptyState,
  ErrorState,
  FormField,
  formControlClassName,
  LoadingState,
  ModalShell,
} from "../../../../shared/ui";
import {
  GroupApi,
  GroupApiModel,
  GroupMemberCandidate,
  GroupMemberItem,
  GroupMembershipReason,
} from "../group.api";
import type { MediaAsset } from "../../../../shared/media.types";
import { resolveApiUrl } from "../../../../shared/api";

interface Props {
  groupId: string;
  groupName?: string;
  branchId?: string | null;
  capacity?: number;
  studentsCount?: number;
  onChanged?: () => void | Promise<void>;
}

const ADD_REASONS: Array<{ value: GroupMembershipReason; label: string }> = [
  { value: "NEW_ENROLLMENT", label: "Новое зачисление" },
  { value: "TRANSFER", label: "Перевод" },
  { value: "OTHER", label: "Другое" },
];

const TRANSFER_REASONS: Array<{ value: GroupMembershipReason; label: string }> = [
  { value: "SCHEDULE_CHANGE", label: "Не подходит расписание" },
  { value: "PARENT_REQUEST", label: "Запрос родителей" },
  { value: "OTHER", label: "Другое" },
];

const REMOVE_REASONS: Array<{ value: GroupMembershipReason; label: string }> = [
  { value: "PARENT_REQUEST", label: "Запрос родителей" },
  { value: "MOVED_TO_ANOTHER_CITY", label: "Переезд" },
  { value: "MEDICAL", label: "Медицинская причина" },
  { value: "PAYMENT_ISSUES", label: "Проблемы с оплатой" },
  { value: "DISCIPLINE", label: "Дисциплина" },
  { value: "OTHER", label: "Другое" },
];

type AddScenarioMode = "additional" | "transfer";

const statusLabels: Record<string, string> = {
  UPCOMING: "Скоро",
  ACTIVE: "Активен",
  TRANSFERRED: "Переведен",
  COMPLETED: "Завершен",
  REMOVED: "Исключен",
};

const statusClasses: Record<string, string> = {
  UPCOMING: "border-cyan-100 bg-cyan-50 text-cyan-800",
  ACTIVE: "border-emerald-100 bg-emerald-50 text-emerald-700",
  TRANSFERRED: "border-blue-100 bg-blue-50 text-blue-700",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-600",
  REMOVED: "border-rose-100 bg-rose-50 text-rose-700",
};

const contractStatusLabels: Record<string, string> = {
  ACTIVE: "Договор активен",
  UPCOMING: "Договор скоро",
  EXPIRED: "Договор завершен",
};

const todayIso = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysIso = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const calculateAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
};

const displayStatus = (status?: string | null) => statusLabels[status ?? ""] ?? status ?? "-";

const displayContractStatus = (status?: string | null) => contractStatusLabels[status ?? ""] ?? status ?? "-";

const attendanceBarClassName = (rate: number) => {
  if (rate >= 80) return "bg-emerald-600";
  if (rate >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const mediaUrl = (avatar?: MediaAsset | null) => {
  const url = avatar?.thumbUrl || avatar?.mediumUrl || avatar?.originalUrl;
  return url ? resolveApiUrl(url) : null;
};

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

const MemberAvatar: React.FC<{ name: string; avatar?: MediaAsset | null }> = ({ name, avatar }) => {
  const src = mediaUrl(avatar);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full border border-white object-cover shadow-sm ring-1 ring-slate-200" onError={() => setFailed(true)} />;
  }

  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-emerald-100 text-xs font-bold text-cyan-800 ring-1 ring-cyan-200">{initials(name)}</div>;
};

const ColumnTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-slate-400">{icon}</span>
    <span>{label}</span>
  </div>
);

const normalizeIsoDate = (value?: string | null) => value?.split("T")[0] ?? null;

const deriveMembershipStatus = (item: GroupMemberItem) => {
  const rawStatus = item.membershipStatus?.toUpperCase();
  const today = todayIso();
  const joinedAt = normalizeIsoDate(item.joinedAt);
  const leftAt = normalizeIsoDate(item.leftAt);

  if (leftAt && leftAt < today) {
    if (rawStatus === "TRANSFERRED" || rawStatus === "COMPLETED") return rawStatus;
    return "REMOVED";
  }

  if (rawStatus === "TRANSFERRED" || rawStatus === "COMPLETED" || rawStatus === "REMOVED") {
    return rawStatus;
  }

  if (joinedAt && joinedAt > today) {
    return "UPCOMING";
  }

  return "ACTIVE";
};

const isCurrentMembership = (item: GroupMemberItem) => {
  const status = deriveMembershipStatus(item);
  return status === "ACTIVE" || status === "UPCOMING";
};

const GroupMembersTab: React.FC<Props> = ({ groupId, groupName, branchId, capacity, studentsCount, onChanged }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<GroupMemberItem[]>([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(0);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidates, setCandidates] = useState<GroupMemberCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [addDateError, setAddDateError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddScenarioMode>("additional");
  const [selectedCurrentMembershipId, setSelectedCurrentMembershipId] = useState<string>("");

  const [addForm, setAddForm] = useState({
    playerId: "",
    joinedAt: todayIso(),
    reason: "NEW_ENROLLMENT" as GroupMembershipReason,
    comment: "",
  });
  const [transferForm, setTransferForm] = useState({
    targetGroupId: "",
    transferDate: todayIso(),
    reason: "SCHEDULE_CHANGE" as GroupMembershipReason,
    comment: "",
  });
  const [removeForm, setRemoveForm] = useState({
    leftAt: todayIso(),
    reason: "PARENT_REQUEST" as GroupMembershipReason,
    comment: "",
  });

  const action = searchParams.get("action");
  const drawer = searchParams.get("drawer");
  const membershipId = searchParams.get("membershipId");
  const addOpen = drawer === "add-student" || searchParams.get("add") === "true";
  const transferOpen = (drawer === "transfer-student" || action === "transfer") && Boolean(membershipId);
  const removeOpen = (drawer === "remove-student" || action === "remove") && Boolean(membershipId);

  const selectedMember = useMemo(
    () => items.find((item) => item.membershipId === membershipId) ?? null,
    [items, membershipId]
  );
  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.playerId === addForm.playerId) ?? null,
    [candidates, addForm.playerId]
  );
  const selectedCurrentMembership = useMemo(
    () =>
      selectedCandidate?.currentMemberships?.find(
        (membership) => membership.membershipId === selectedCurrentMembershipId
      ) ?? null,
    [selectedCandidate, selectedCurrentMembershipId]
  );
  const earliestAvailableJoinDate = selectedCandidate?.earliestAvailableJoinDate ?? null;
  const selectedDateError = addDateError ?? (
    earliestAvailableJoinDate && addForm.joinedAt < earliestAvailableJoinDate
      ? `Выберите дату не раньше ${formatDate(earliestAvailableJoinDate)}`
      : null
  );

  const visibleItems = useMemo(() => items.filter(isCurrentMembership), [items]);
  const filteredItems = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return visibleItems;
    return visibleItems.filter((item) => item.childName.toLowerCase().includes(query));
  }, [memberSearch, visibleItems]);
  const activeMembersOnPage = visibleItems.filter((item) => deriveMembershipStatus(item) === "ACTIVE").length;
  const activeMembersCount = studentsCount ?? activeMembersOnPage;
  const shownCapacity = capacity ?? Math.max(studentsCount ?? visibleItems.length, activeMembersCount);
  const availablePlaces = Math.max(0, shownCapacity - activeMembersCount);

  const loadMembers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await GroupApi.getMembers(groupId, page, size, token);
      setItems(data.content ?? []);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch (e) {
      console.error("Failed to load group members", e);
      setError(getApiErrorMessage(e, "Не удалось загрузить состав группы"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    if (!token || !addOpen) return;
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      const data = await GroupApi.getMemberCandidates(
        groupId,
        { search: candidateSearch.trim(), page: candidatePage, size: 20 },
        token
      );
      setCandidates(data.items ?? []);
      setCandidateTotal(data.total ?? 0);
    } catch (e) {
      console.error("Failed to load member candidates", e);
      setCandidatesError(getApiErrorMessage(e, "Не удалось загрузить кандидатов"));
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!token || !branchId) return;
    setGroupsLoading(true);
    try {
      const data = await GroupApi.listByBranch(branchId, token);
      setGroups(data.filter((group) => group.groupId !== groupId));
    } catch (e) {
      console.error("Failed to load groups", e);
      toast.error(getApiErrorMessage(e, "Не удалось загрузить группы для перевода"));
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [groupId, page, token]);

  useEffect(() => {
    if (!addOpen) return;
    const timeout = window.setTimeout(() => {
      void loadCandidates();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [addOpen, candidateSearch, candidatePage, groupId, token]);

  useEffect(() => {
    if (!transferOpen) return;
    void loadGroups();
  }, [transferOpen, branchId, groupId, token]);

  useEffect(() => {
    if (!transferOpen) return;
    setTransferForm((prev) => ({
      ...prev,
      targetGroupId: prev.targetGroupId || groups[0]?.groupId || "",
    }));
  }, [groups, transferOpen]);

  const closeAction = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    next.delete("action");
    next.delete("membershipId");
    next.delete("drawer");
    setSearchParams(next, { replace: true });
    setMenuOpenFor(null);
  };

  const openAdd = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "add-student");
    next.delete("add");
    next.delete("action");
    next.delete("membershipId");
    setSearchParams(next);
    setCandidateSearch("");
    setCandidatePage(0);
    setAddForm({ playerId: "", joinedAt: todayIso(), reason: "NEW_ENROLLMENT", comment: "" });
    setAddDateError(null);
    setAddMode("additional");
    setSelectedCurrentMembershipId("");
  };

  const openMemberAction = (nextAction: "transfer" | "remove", item: GroupMemberItem) => {
    if (!item.membershipId) {
      toast.error("Для этого ученика нет идентификатора участия");
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    next.delete("action");
    next.set("drawer", nextAction === "transfer" ? "transfer-student" : "remove-student");
    next.set("membershipId", item.membershipId);
    setSearchParams(next);
    setMenuOpenFor(null);
    if (nextAction === "transfer") {
      const transferDate = todayIso();
      setTransferForm({
        targetGroupId: "",
        transferDate,
        reason: "SCHEDULE_CHANGE",
        comment: "",
      });
    } else {
      setRemoveForm({ leftAt: todayIso(), reason: "PARENT_REQUEST", comment: "" });
    }
  };

  const afterMutation = async (message: string) => {
    toast.success(message);
    closeAction();
    await loadMembers();
    await onChanged?.();
  };

  const submitAdd = async () => {
    if (!token) return;
    if (!addForm.playerId) {
      toast.error("Выберите ученика");
      return;
    }
    if (!addForm.joinedAt) {
      toast.error("Укажите дату вступления");
      return;
    }
    if (selectedDateError) {
      toast.error(selectedDateError);
      return;
    }
    if (addMode === "transfer" && !selectedCurrentMembershipId) {
      toast.error("Для перевода нужно выбрать текущее участие ученика");
      return;
    }

    setSaving(true);
    try {
      if (addMode === "transfer") {
        await GroupApi.transferMember(
          selectedCurrentMembershipId,
          {
            targetGroupId: groupId,
            transferDate: addForm.joinedAt,
            reason: addForm.reason,
            comment: addForm.comment.trim() || null,
          },
          token
        );
        await afterMutation("Ученик переведен в группу");
      } else {
        await GroupApi.addMember(
          groupId,
          {
            playerId: addForm.playerId,
            joinedAt: addForm.joinedAt,
            reason: addForm.reason,
            comment: addForm.comment.trim() || null,
          },
          token
        );
        await afterMutation("Ученик добавлен в группу");
      }
    } catch (e) {
      console.error("Failed to add group member", e);
      if (e instanceof ApiError && e.code === "MEMBERSHIP_DATE_OVERLAP") {
        const metadata = e.metadata as { earliestAvailableJoinDate?: string } | undefined;
        const earliestDate = metadata?.earliestAvailableJoinDate;
        const message = earliestDate
          ? `Ученик уже состоял в группе на выбранную дату. Выберите дату не раньше ${formatDate(earliestDate)}.`
          : "Ученик уже состоял в группе на выбранную дату.";
        setAddDateError(message);
        setCandidates((current) => current.map((candidate) => candidate.playerId === addForm.playerId
          ? {
              ...candidate,
              eligible: Boolean(earliestDate),
              earliestAvailableJoinDate: earliestDate ?? candidate.earliestAvailableJoinDate,
              warnings: [
                ...(candidate.warnings ?? []).filter((warning) => warning.code !== "MEMBERSHIP_DATE_OVERLAP"),
                { code: "MEMBERSHIP_DATE_OVERLAP", message },
              ],
            }
          : candidate));
        toast.error(message);
        return;
      }
      toast.error(
        getApiErrorMessage(
          e,
          addMode === "transfer" ? "Не удалось перевести ученика" : "Не удалось добавить ученика"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const submitTransfer = async () => {
    if (!token || !membershipId) return;
    if (!transferForm.targetGroupId) {
      toast.error("Выберите новую группу");
      return;
    }
    if (!transferForm.transferDate) {
      toast.error("Укажите дату перевода");
      return;
    }

    setSaving(true);
    try {
      await GroupApi.transferMember(
        membershipId,
        {
          targetGroupId: transferForm.targetGroupId,
          transferDate: transferForm.transferDate,
          reason: transferForm.reason,
          comment: transferForm.comment.trim() || null,
        },
        token
      );
      await afterMutation("Ученик переведен");
    } catch (e) {
      console.error("Failed to transfer group member", e);
      toast.error(getApiErrorMessage(e, "Не удалось перевести ученика"));
    } finally {
      setSaving(false);
    }
  };

  const submitRemove = async () => {
    if (!token || !membershipId) return;
    if (!removeForm.leftAt) {
      toast.error("Укажите дату выхода");
      return;
    }

    setSaving(true);
    try {
      await GroupApi.removeMember(
        membershipId,
        {
          leftAt: removeForm.leftAt,
          reason: removeForm.reason,
          comment: removeForm.comment.trim() || null,
        },
        token
      );
      await afterMutation("Ученик исключен из группы");
    } catch (e) {
      console.error("Failed to remove group member", e);
      toast.error(getApiErrorMessage(e, "Не удалось исключить ученика"));
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                <UsersIcon className="h-4 w-4" />
              </span>
              Ученики
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
              <span>{activeMembersCount} учеников</span>
              <span className="text-slate-300">·</span>
              <span>{availablePlaces} свободных мест</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              rounded="rounded-lg"
              className="h-9 w-9 p-0"
              onClick={loadMembers}
              disabled={loading}
              aria-label="Обновить список учеников"
              title="Обновить список"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button type="button" size="sm" onClick={openAdd}>
              <UserPlusIcon className="h-4 w-4" />
              Добавить ученика
            </Button>
          </div>
        </div>

        <div className="max-w-sm">
          <FormField label="Поиск по составу" className="mb-0">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Имя ученика"
                className={`${formControlClassName} pl-9`}
              />
            </div>
          </FormField>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadMembers} />
      ) : loading ? (
        <LoadingState label="Загрузка состава..." />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="Состав группы пуст"
          description="Добавьте первого ученика, чтобы он появился в будущих занятиях и журнале посещаемости."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить запрос поиска по составу группы."
        />
      ) : (
        <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-[0_10px_28px_-28px_rgba(15,23,42,0.45)]">
          <div className="hidden grid-cols-[minmax(240px,1.5fr)_110px_165px_170px_120px_48px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <ColumnTitle icon={<UsersIcon className="h-3.5 w-3.5" />} label="Ученик" />
            <ColumnTitle icon={<CakeIcon className="h-3.5 w-3.5" />} label="Возраст" />
            <ColumnTitle icon={<CalendarDaysIcon className="h-3.5 w-3.5" />} label="В группе" />
            <ColumnTitle icon={<ChartBarIcon className="h-3.5 w-3.5" />} label="Посещаемость" />
            <ColumnTitle icon={<ShieldCheckIcon className="h-3.5 w-3.5" />} label="Статус" />
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const age = calculateAge(item.birthDate);
              const membershipStatus = deriveMembershipStatus(item);
              const canTransfer = membershipStatus === "ACTIVE" && (item.capabilities?.canTransfer ?? true);
              const canRemove = membershipStatus === "ACTIVE" && (item.capabilities?.canRemove ?? true);
              const menuKey = item.membershipId ?? item.playerId;

              return (
                <div key={menuKey} className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 lg:grid-cols-[minmax(240px,1.5fr)_110px_165px_170px_120px_48px] lg:items-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/students?playerId=${encodeURIComponent(item.playerId)}`)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <MemberAvatar name={item.childName} avatar={item.avatar} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{item.childName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span>{displayContractStatus(item.contractStatus)}</span>
                        {item.leftAt ? <span>Последний день: {formatDate(item.leftAt)}</span> : null}
                      </div>
                    </div>
                  </button>

                  <div className="text-sm text-slate-700">
                    <span className="lg:hidden text-xs text-slate-400">Возраст: </span>
                    {age != null ? `${age} лет` : "-"}
                  </div>

                  <div className="text-sm text-slate-700">
                    <span className="lg:hidden text-xs text-slate-400">В группе: </span>
                    <div>{formatDate(item.joinedAt)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {membershipStatus === "UPCOMING" ? "дата будущего вступления" : "дата вступления"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm">
                      <span className="font-semibold text-slate-950">{Math.round(item.attendanceRate ?? 0)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${attendanceBarClassName(item.attendanceRate ?? 0)}`}
                        style={{ width: `${Math.min(100, Math.max(0, item.attendanceRate ?? 0))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses[membershipStatus] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {displayStatus(membershipStatus)}
                    </span>
                  </div>

                  <div className="relative flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      rounded="rounded-lg"
                      className="h-9 w-9 border border-transparent p-0 text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                      onClick={() => setMenuOpenFor((prev) => (prev === menuKey ? null : menuKey))}
                      aria-label="Действия с учеником"
                      title="Действия"
                    >
                      <EllipsisHorizontalIcon className="h-5 w-5" />
                    </Button>

                    {menuOpenFor === menuKey ? (
                      <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                          onClick={() => navigate(`/admin/students?playerId=${encodeURIComponent(item.playerId)}`)}
                        >
                          Открыть профиль
                        </button>
                        <button
                          type="button"
                          disabled={!canTransfer}
                          className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                          onClick={() => openMemberAction("transfer", item)}
                        >
                          Перевести
                        </button>
                        <button
                          type="button"
                          disabled={!canRemove}
                          className="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                          onClick={() => openMemberAction("remove", item)}
                        >
                          Исключить
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-xs text-slate-500">
            Страница {page + 1} из {totalPages}
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Вперед
          </Button>
        </div>
      ) : null}

      {addOpen ? (
        <ModalShell
          title="Добавить ученика"
          description={`Выберите ученика и настройте его участие в ${groupName ?? "группе"}.`}
          maxWidthClassName="max-w-xl"
          placement="right"
          bodyClassName="p-0"
          onClose={closeAction}
          closeDisabled={saving}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={closeAction}>
                Отмена
              </Button>
              <Button
                type="button"
                isLoading={saving}
                disabled={!selectedCandidate || !selectedCandidate.eligible || Boolean(selectedDateError) || (addMode === "transfer" && !selectedCurrentMembershipId)}
                onClick={submitAdd}
              >
                {addMode === "transfer" ? "Перевести" : "Добавить"}
              </Button>
            </div>
          }
        >
          <div>
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Выберите ученика</div>
                {!candidatesLoading ? <div className="text-xs text-slate-500">Найдено: {candidateTotal}</div> : null}
              </div>
              <FormField label="Поиск по имени" className="mb-0">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={candidateSearch}
                    onChange={(event) => {
                      setCandidateSearch(event.target.value);
                      setCandidatePage(0);
                    }}
                    placeholder="Начните вводить имя"
                    className={`${formControlClassName} pl-9`}
                  />
                </div>
              </FormField>
            </div>

            <div className="space-y-4 px-5 py-4">
            {candidatesError ? (
              <ErrorState message={candidatesError} onRetry={loadCandidates} />
            ) : candidatesLoading ? (
              <LoadingState label="Поиск учеников..." />
            ) : candidates.length === 0 ? (
              <EmptyState title="Кандидаты не найдены" description="Попробуйте изменить поисковый запрос." />
            ) : (
              <div className="space-y-1.5">
                {candidates.map((candidate) => {
                  const selected = addForm.playerId === candidate.playerId;
                  return (
                    <button
                      key={candidate.playerId}
                      type="button"
                      disabled={!candidate.eligible}
                      onClick={() => {
                        const nextMembershipId = candidate.currentMemberships?.[0]?.membershipId ?? "";
                        const nextJoinedAt = candidate.earliestAvailableJoinDate && candidate.earliestAvailableJoinDate > addForm.joinedAt
                          ? candidate.earliestAvailableJoinDate
                          : addForm.joinedAt;
                        setAddForm((prev) => ({
                          ...prev,
                          playerId: candidate.playerId,
                          joinedAt: nextJoinedAt,
                          reason: candidate.currentMemberships?.length ? "SCHEDULE_CHANGE" : "NEW_ENROLLMENT",
                        }));
                        setAddDateError(null);
                        setAddMode(candidate.currentMemberships?.length ? "transfer" : "additional");
                        setSelectedCurrentMembershipId(nextMembershipId);
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                        selected ? "border-cyan-300 bg-cyan-50" : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                      } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(candidate.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-950">{candidate.fullName}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span>{candidate.age != null ? `${candidate.age} лет` : formatDate(candidate.birthDate)}</span>
                            {!candidate.eligible ? (
                              <span className="font-medium text-rose-700">Недоступен для добавления</span>
                            ) : candidate.earliestAvailableJoinDate ? (
                              <span className="font-medium text-amber-700">Доступен с {formatDate(candidate.earliestAvailableJoinDate)}</span>
                            ) : (candidate.currentMemberships ?? []).length > 0 ? (
                              <span>Сейчас: {(candidate.currentMemberships ?? []).map((membership) => membership.groupName).join(", ")}</span>
                            ) : (
                              <span>Можно добавить</span>
                            )}
                          </div>
                        </div>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 bg-white"}`}>
                          {selected ? <CheckCircleIcon className="h-4 w-4" /> : null}
                        </span>
                      </div>
                      {(candidate.warnings ?? []).length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {(candidate.warnings ?? []).map((warning) => (
                            <div key={warning.code} className="flex items-start gap-1.5 text-xs text-amber-700">
                              <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              {warning.message}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {candidateTotal > 20 ? (
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={candidatePage === 0} onClick={() => setCandidatePage((p) => p - 1)}>
                  Назад
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={(candidatePage + 1) * 20 >= candidateTotal}
                  onClick={() => setCandidatePage((p) => p + 1)}
                >
                  Вперед
                </Button>
              </div>
            ) : null}

            {selectedCandidate ? (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Параметры участия</div>
                  <p className="mt-1 text-xs text-slate-500">Настройки применятся только к выбранному ученику.</p>
                </div>

                <FormField
                  label={addMode === "transfer" ? "Дата перевода" : "Дата вступления"}
                  error={selectedDateError ?? undefined}
                  hint={addMode === "transfer" ? "С этой даты ученик начнет заниматься в новой группе." : "С этой даты ученик попадет в состав и будущие занятия."}
                >
                  <input
                    type="date"
                    min={earliestAvailableJoinDate ?? undefined}
                    value={addForm.joinedAt}
                    onChange={(event) => {
                      setAddDateError(null);
                      setAddForm((prev) => ({ ...prev, joinedAt: event.target.value }));
                    }}
                    className={`${formControlClassName} ${selectedDateError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                  />
                </FormField>

                {(selectedCandidate.currentMemberships ?? []).length > 0 ? (
                  <>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Что сделать с учеником</div>
                      <p className="mt-1 text-sm text-slate-500">
                        Ученик уже состоит в другой группе. Выберите, нужно ли оставить текущее участие или закрыть его переводом.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode("additional");
                          setAddForm((prev) => ({ ...prev, reason: "NEW_ENROLLMENT" }));
                        }}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          addMode === "additional"
                            ? "border-cyan-300 bg-cyan-50"
                            : "border-slate-200 bg-white hover:border-cyan-200"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-950">Добавить ещё в одну группу</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Оставить текущие группы и добавить в {groupName ?? "эту группу"}.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAddMode("transfer");
                          setAddForm((prev) => ({ ...prev, reason: "SCHEDULE_CHANGE" }));
                          setSelectedCurrentMembershipId(
                            selectedCurrentMembershipId || selectedCandidate.currentMemberships?.[0]?.membershipId || ""
                          );
                        }}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          addMode === "transfer"
                            ? "border-cyan-300 bg-cyan-50"
                            : "border-slate-200 bg-white hover:border-cyan-200"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-950">Перевести в эту группу</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Закрыть выбранное участие и перевести в {groupName ?? "эту группу"}.
                        </p>
                      </button>
                    </div>

                    {addMode === "transfer" ? (
                      <FormField label="Из какой группы перевести">
                        <select
                          value={selectedCurrentMembershipId}
                          onChange={(event) => setSelectedCurrentMembershipId(event.target.value)}
                          className={formControlClassName}
                        >
                          {(selectedCandidate.currentMemberships ?? []).map((membership) => (
                            <option
                              key={membership.membershipId ?? `${membership.groupId}-${membership.joinedAt}`}
                              value={membership.membershipId ?? ""}
                            >
                              {membership.groupName} · с {formatDate(membership.joinedAt)}
                              {membership.leftAt ? ` до ${formatDate(membership.leftAt)}` : ""}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    ) : null}
                  </>
                ) : null}

                <div
                  className={`rounded-lg border px-3 py-2.5 text-xs leading-5 ${
                    addMode === "transfer"
                      ? "border-blue-100 bg-blue-50 text-blue-800"
                      : (selectedCandidate.currentMemberships ?? []).length > 0
                      ? "border-amber-100 bg-amber-50 text-amber-800"
                      : "border-cyan-100 bg-cyan-50 text-cyan-800"
                  }`}
                >
                  {addMode === "transfer" && selectedCurrentMembership ? (
                    <>
                      <div className="font-semibold">Последствия перевода</div>
                      <p className="mt-1">
                        Участие в группе {selectedCurrentMembership.groupName} будет закрыто {" "}
                        {formatDate(addDaysIso(addForm.joinedAt, -1))}, а в {groupName ?? "новой группе"} ученик вступит {formatDate(addForm.joinedAt)}.
                      </p>
                    </>
                  ) : addMode === "transfer" ? (
                    <>
                      <div className="font-semibold">Нужен идентификатор текущего участия</div>
                      <p className="mt-1">
                        Для перевода backend должен вернуть <code>currentMemberships[].membershipId</code>. Пока он не пришёл, доступно только обычное добавление.
                      </p>
                    </>
                  ) : (selectedCandidate.currentMemberships ?? []).length > 0 ? (
                    <>
                      <div className="font-semibold">Последствия добавления</div>
                      <p className="mt-1">
                        Ученик будет числиться сразу в нескольких группах. Текущие участия останутся без изменений.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">Добавление в группу</div>
                      <p className="mt-1">
                        Ученик вступит в {groupName ?? "группу"} {formatDate(addForm.joinedAt)} и попадет в будущие занятия.
                      </p>
                    </>
                  )}
                </div>
            <FormField
              label="Причина"
              hint={
                addMode === "transfer"
                  ? `Предыдущее участие завершится ${formatDate(addDaysIso(addForm.joinedAt, -1))}`
                  : undefined
              }
            >
              {addMode === "transfer" ? (
                <select
                  value={addForm.reason}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, reason: event.target.value }))}
                  className={formControlClassName}
                >
                  {TRANSFER_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={addForm.reason}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, reason: event.target.value }))}
                  className={formControlClassName}
                >
                  {ADD_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Комментарий">
              <textarea
                rows={2}
                value={addForm.comment}
                onChange={(event) => setAddForm((prev) => ({ ...prev, comment: event.target.value }))}
                className={formControlClassName}
              />
            </FormField>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                Выберите ученика, чтобы настроить дату и способ добавления.
              </div>
            )}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {transferOpen ? (
        <ModalShell
          title="Перевести ученика"
          description={selectedMember ? selectedMember.childName : "Выберите новую группу и дату перевода."}
          onClose={closeAction}
          placement="right"
          maxWidthClassName="max-w-lg"
          closeDisabled={saving}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={closeAction}>
                Отмена
              </Button>
              <Button type="button" isLoading={saving} onClick={submitTransfer}>
                Перевести
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <FormField label="Новая группа">
              <select
                value={transferForm.targetGroupId}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, targetGroupId: event.target.value }))}
                disabled={groupsLoading || !branchId}
                className={formControlClassName}
              >
                <option value="">{groupsLoading ? "Загрузка..." : "Выберите группу"}</option>
                {groups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>{group.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Дата перевода" hint={`Последний день в текущей группе: ${formatDate(addDaysIso(transferForm.transferDate, -1))}`}>
              <input
                type="date"
                value={transferForm.transferDate}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, transferDate: event.target.value }))}
                className={formControlClassName}
              />
            </FormField>

            <FormField label="Причина">
              <select
                value={transferForm.reason}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, reason: event.target.value }))}
                className={formControlClassName}
              >
                {TRANSFER_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Комментарий">
              <textarea
                rows={3}
                value={transferForm.comment}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, comment: event.target.value }))}
                className={formControlClassName}
              />
            </FormField>
          </div>
        </ModalShell>
      ) : null}

      {removeOpen ? (
        <ModalShell
          title="Исключить ученика"
          description={selectedMember ? `${selectedMember.childName} будет выведен из текущего состава. История участия сохранится.` : "Укажите последний день в группе и причину исключения."}
          onClose={closeAction}
          placement="right"
          maxWidthClassName="max-w-lg"
          closeDisabled={saving}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={closeAction}>
                Отмена
              </Button>
              <Button type="button" variant="danger" isLoading={saving} onClick={submitRemove}>
                Исключить
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <FormField
              label="Последний день в группе"
              hint="Со следующего дня ученик больше не будет считаться участником группы."
            >
              <input
                type="date"
                value={removeForm.leftAt}
                onChange={(event) => setRemoveForm((prev) => ({ ...prev, leftAt: event.target.value }))}
                className={formControlClassName}
              />
            </FormField>

            <FormField label="Причина">
              <select
                value={removeForm.reason}
                onChange={(event) => setRemoveForm((prev) => ({ ...prev, reason: event.target.value }))}
                className={formControlClassName}
              >
                {REMOVE_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Комментарий">
              <textarea
                rows={3}
                value={removeForm.comment}
                onChange={(event) => setRemoveForm((prev) => ({ ...prev, comment: event.target.value }))}
                className={formControlClassName}
              />
            </FormField>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
};

export default GroupMembersTab;
