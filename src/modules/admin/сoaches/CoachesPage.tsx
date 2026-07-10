import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PencilSquareIcon,
  PlusIcon,
  PowerIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import {
  CoachApi,
  CoachOverviewItem,
  CoachOverviewSortKey,
  CoachOverviewStatus,
  CoachOverviewResponse,
  CoachProfile,
  CoachGroupNextSession,
  CoachGroupRiskFlag,
  CoachStatus,
  SortDirection,
  AccountStatus,
  WorkStatus,
  GroupFilter,
  WorkloadStatus,
  ReportStatus,
  TrainerOverview,
  CoachAvailability,
  TrainerActivityResponse,
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
  PageShell,
  SectionCard,
  formControlClassName,
} from "../../../shared/ui";
import { ApiError } from "../../../shared/api";

type StatusFilter = CoachOverviewStatus;

type SortState = {
  key: CoachOverviewSortKey | null;
  direction: SortDirection;
};

type AdvancedFilters = {
  accountStatuses: AccountStatus[];
  workStatuses: WorkStatus[];
  groupFilter: GroupFilter | "";
  workloadStatus: WorkloadStatus | "";
  reportStatus: ReportStatus | "";
  hasSessionToday: "" | "true" | "false";
};

const emptyAdvancedFilters: AdvancedFilters = { accountStatuses: [], workStatuses: [], groupFilter: "", workloadStatus: "", reportStatus: "", hasSessionToday: "" };
const filterLabels: Record<string, string> = {
  ACTIVE: "Активные", DISABLED: "Отключенные", AVAILABLE: "Доступен", BUSY: "Занят", VACATION: "В отпуске",
  WITHOUT_GROUP: "Без групп", ONE_GROUP: "1 группа", TWO_OR_THREE_GROUPS: "2–3 группы", FOUR_OR_MORE_GROUPS: "4 и более групп",
  LOW: "Низкая нагрузка", MEDIUM: "Средняя нагрузка", HIGH: "Высокая нагрузка", FULL: "Нагрузка 100%", OVERLOADED: "Перегружен",
  NO_REPORTS: "Без отчетов", PENDING: "Ожидают отчета", OVERDUE: "Есть просроченные", SUBMITTED: "Отчет сдан",
  true: "Ведет сегодня", false: "Не ведет сегодня",
};

const emptyOverview: CoachOverviewResponse = {
  summary: {
    total: 0,
    active: 0,
    inactive: 0,
    withoutGroups: 0,
    overloaded: 0,
    withSessionsToday: 0,
  },
  coaches: {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 20,
    first: true,
    last: true,
    empty: true,
  },
};

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "ACTIVE", label: "Активные" },
  { value: "INACTIVE", label: "Отключенные" },
  { value: "WITHOUT_GROUPS", label: "Без групп" },
  { value: "OVERLOADED", label: "Перегружены" },
  { value: "TODAY", label: "Сегодня ведут" },
];

const pageSizeOptions = [20, 50, 100];

const isStatusFilter = (value: string | null): value is StatusFilter =>
  statusFilters.some((item) => item.value === value);

const isSortKey = (value: string | null): value is CoachOverviewSortKey =>
  ["lastName", "groupsCount", "todaySessionsCount", "loadPercent", "lastReportAt"].includes(value ?? "");

const weekDays = [
  { key: "MONDAY", label: "Пн" },
  { key: "TUESDAY", label: "Вт" },
  { key: "WEDNESDAY", label: "Ср" },
  { key: "THURSDAY", label: "Чт" },
  { key: "FRIDAY", label: "Пт" },
  { key: "SATURDAY", label: "Сб" },
  { key: "SUNDAY", label: "Вс" },
];

const formatDateTime = (value?: string | null) => {
  if (!value) return "Нет данных";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/);
  if (match) {
    const [, , month, day, hour = "00", minute = "00"] = match;
    const months = ["янв.", "февр.", "мар.", "апр.", "мая", "июня", "июля", "авг.", "сент.", "окт.", "нояб.", "дек."];
    return `${day} ${months[Number(month) - 1]}, ${hour}:${minute}`;
  }
  return translateEnglishDate(value);
};

const formatDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const [, , month, day] = match;
  const months = ["янв.", "февр.", "мар.", "апр.", "мая", "июня", "июля", "авг.", "сент.", "окт.", "нояб.", "дек."];
  return `${day} ${months[Number(month) - 1]}`;
};

const timeShort = (value: string) => value.slice(0, 5);

const formatDateLong = (value?: string | null) => {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/);
  if (!match) return value;
  const [, , month, day, hour = "00", minute = "00"] = match;
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${day} ${months[Number(month) - 1]}, ${hour}:${minute}`;
};

const translateEnglishDate = (value: string) => {
  const months: Record<string, string> = {
    Jan: "янв.",
    January: "января",
    Feb: "февр.",
    February: "февраля",
    Mar: "мар.",
    March: "марта",
    Apr: "апр.",
    April: "апреля",
    May: "мая",
    Jun: "июня",
    June: "июня",
    Jul: "июля",
    July: "июля",
    Aug: "авг.",
    August: "августа",
    Sep: "сент.",
    Sept: "сент.",
    September: "сентября",
    Oct: "окт.",
    October: "октября",
    Nov: "нояб.",
    November: "ноября",
    Dec: "дек.",
    December: "декабря",
  };
  return value
    .replace(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (month) => months[month] ?? month)
    .replace(/\sAM\b/g, "")
    .replace(/\sPM\b/g, "");
};

const dayLabels: Record<string, string> = {
  MON: "Пн",
  TUE: "Вт",
  WED: "Ср",
  THU: "Чт",
  FRI: "Пт",
  SAT: "Сб",
  SUN: "Вс",
  MONDAY: "Пн",
  TUESDAY: "Вт",
  WEDNESDAY: "Ср",
  THURSDAY: "Чт",
  FRIDAY: "Пт",
  SATURDAY: "Сб",
  SUNDAY: "Вс",
};

const normalizeAvailabilityDay = (day: unknown): string => {
  const text = String(day);
  const map: Record<string, string> = {
    MONDAY: "MON",
    TUESDAY: "TUE",
    WEDNESDAY: "WED",
    THURSDAY: "THU",
    FRIDAY: "FRI",
    SATURDAY: "SAT",
    SUNDAY: "SUN",
    MON: "MON",
    TUE: "TUE",
    WED: "WED",
    THU: "THU",
    FRI: "FRI",
    SAT: "SAT",
    SUN: "SUN",
  };
  return map[text.trim().toUpperCase()] ?? text.trim().toUpperCase();
};

export const normalizeAvailabilityDays = (days: unknown): string[] => {
  const flatten = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === "string") return value.split(",");
    return [];
  };
  return Array.from(new Set(flatten(days).map(normalizeAvailabilityDay))).filter((day) =>
    ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(day)
  );
};

const formatAvailabilityDays = (days: unknown) => {
  const normalized = normalizeAvailabilityDays(days);
  if (normalized.length === 0) return "Дни не указаны";
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI"];
  if (normalized.length === 5 && weekdays.every((day) => normalized.includes(day))) return "Пн–Пт";
  return normalized.map((day) => dayLabels[day] ?? day).join(", ");
};

const coachFullName = (coach: Pick<CoachOverviewItem, "firstName" | "lastName">) =>
  `${coach.firstName} ${coach.lastName}`.trim();

const coachInitials = (coach: Pick<CoachOverviewItem, "firstName" | "lastName">) =>
  `${coach.firstName?.[0] ?? ""}${coach.lastName?.[0] ?? ""}`.toUpperCase() || "T";

const reportState = (coach: CoachOverviewItem) => {
  if (coach.reports.overdueCount > 0) {
    return {
      label: "Отчет просрочен",
      className: "border-rose-100 bg-rose-50 text-rose-700",
    };
  }
  if (!coach.reports.lastReportAt) {
    if ((coach.reports.pendingCount ?? 0) > 0) return { label: "Ожидает отчет", className: "border-amber-100 bg-amber-50 text-amber-700" };
    return {
      label: "Отчетов еще нет",
      className: "border-slate-200 bg-slate-100 text-slate-600",
    };
  }
  return {
    label: "Отчет сдан",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };
};

const sessionStatusLabels: Record<string, string> = {
  PLANNED: "Запланировано",
  COMPLETED: "Проведено",
  CANCELLED: "Отменено",
};

const coachStatusHistoryLabels: Record<string, string> = {
  ACTIVE: "Активен",
  INACTIVE: "Отключен",
};

const formatSessionStatus = (status: string) => sessionStatusLabels[status] ?? status;

const formatCoachStatusHistory = (status: string) => coachStatusHistoryLabels[status] ?? status;

const riskToneClassName = (severity: string) => {
  if (severity === "CRITICAL") return "border-rose-100 bg-rose-50 text-rose-700";
  if (severity === "WARNING") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export type CoachGroupAssignment = {
  groupId: string;
  groupName: string;
  branchId: string;
  groupCoachId: string | null;
  role: "MAIN" | "ASSISTANT" | null;
  studentsCount?: number;
  activeStudentsCount?: number;
  weeklySlotsCount?: number;
  nextSession?: CoachGroupNextSession | null;
  riskFlags?: CoachGroupRiskFlag[];
};

const isOverloaded = (coach: CoachOverviewItem) =>
  coach.load?.status === "OVERLOADED" ||
  coach.load?.status === "HIGH" ||
  (coach.load?.maxSlots > 0 && coach.load.usedSlots > coach.load.maxSlots);

const CoachesPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersRef = useRef<HTMLDivElement>(null);

  const [overview, setOverview] = useState<CoachOverviewResponse>(emptyOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") ?? "");
  const [filter, setFilter] = useState<StatusFilter>(() => isStatusFilter(searchParams.get("status")) ? searchParams.get("status") as StatusFilter : "ALL");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(() => ({
    accountStatuses: searchParams.getAll("accountStatus").filter((value): value is AccountStatus => value === "ACTIVE" || value === "DISABLED"),
    workStatuses: searchParams.getAll("workStatus").filter((value): value is WorkStatus => ["AVAILABLE", "BUSY", "VACATION"].includes(value)),
    groupFilter: (searchParams.get("groupFilter") as GroupFilter | null) ?? "",
    workloadStatus: (searchParams.get("workload") as WorkloadStatus | null) ?? "",
    reportStatus: (searchParams.get("reportStatus") as ReportStatus | null) ?? "",
    hasSessionToday: (searchParams.get("today") as AdvancedFilters["hasSessionToday"] | null) ?? "",
  }));
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(advancedFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(() => Math.max(0, Number(searchParams.get("page") ?? 1) - 1));
  const [pageSize, setPageSize] = useState(() => pageSizeOptions.includes(Number(searchParams.get("size"))) ? Number(searchParams.get("size")) : 20);
  const [sort, setSort] = useState<SortState>(() => ({
    key: isSortKey(searchParams.get("sort")) ? searchParams.get("sort") as CoachOverviewSortKey : "lastName",
    direction: searchParams.get("direction") === "desc" ? "desc" : "asc",
  }));
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState<CoachProfile | null>(null);
  const [assignCoach, setAssignCoach] = useState<CoachOverviewItem | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const loadOverview = async () => {
    if (!branchId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const sortParams = !sort.key ? [] :
        sort.key === "lastName"
          ? [
              { key: "lastName" as const, direction: sort.direction },
              { key: "firstName" as const, direction: sort.direction },
            ]
          : [{ key: sort.key, direction: sort.direction }];
      const data = await CoachApi.overview(branchId, token, {
        page,
        size: pageSize,
        search: debouncedSearch,
        status: filter,
        accountStatuses: advancedFilters.accountStatuses,
        workStatuses: advancedFilters.workStatuses,
        groupFilter: advancedFilters.groupFilter || undefined,
        workloadStatus: advancedFilters.workloadStatus || undefined,
        reportStatus: advancedFilters.reportStatus || undefined,
        hasSessionToday: advancedFilters.hasSessionToday === "" ? undefined : advancedFilters.hasSessionToday === "true",
        sort: sortParams,
      });
      setOverview({
        summary: data.summary ?? emptyOverview.summary,
        coaches: data.coaches ?? emptyOverview.coaches,
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
  }, [branchId, token, page, pageSize, debouncedSearch, filter, advancedFilters, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("search", debouncedSearch);
    if (filter !== "ALL") next.set("status", filter);
    advancedFilters.accountStatuses.forEach((value) => next.append("accountStatus", value));
    advancedFilters.workStatuses.forEach((value) => next.append("workStatus", value));
    if (advancedFilters.groupFilter) next.set("groupFilter", advancedFilters.groupFilter);
    if (advancedFilters.workloadStatus) next.set("workload", advancedFilters.workloadStatus);
    if (advancedFilters.reportStatus) next.set("reportStatus", advancedFilters.reportStatus);
    if (advancedFilters.hasSessionToday) next.set("today", advancedFilters.hasSessionToday);
    if (sort.key) {
      next.set("sort", sort.key);
      next.set("direction", sort.direction);
    }
    next.set("page", String(page + 1));
    next.set("size", String(pageSize));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, filter, advancedFilters, page, pageSize, sort, setSearchParams]);

  useEffect(() => {
    if (!showFilters && !activeMenuId) return;
    const close = (event: MouseEvent) => {
      if (showFilters && !filtersRef.current?.contains(event.target as Node)) setShowFilters(false);
      if (activeMenuId && !(event.target as Element).closest("[data-coach-menu]")) setActiveMenuId(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setShowFilters(false); setActiveMenuId(null); }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [showFilters, activeMenuId]);

  const coaches = overview.coaches.content ?? [];
  const totalElements = overview.coaches.totalElements ?? 0;
  const totalPages = overview.coaches.totalPages ?? 0;
  const currentPage = overview.coaches.number ?? page;
  const currentPageSize = overview.coaches.size ?? pageSize;
  const pageStart = totalElements === 0 ? 0 : currentPage * currentPageSize + 1;
  const pageEnd = Math.min(totalElements, currentPage * currentPageSize + coaches.length);
  const advancedFilterCount = advancedFilters.accountStatuses.length + advancedFilters.workStatuses.length + Number(Boolean(advancedFilters.groupFilter)) + Number(Boolean(advancedFilters.workloadStatus)) + Number(Boolean(advancedFilters.reportStatus)) + Number(Boolean(advancedFilters.hasSessionToday));
  const hasActiveFilters = filter !== "ALL" || advancedFilterCount > 0 || search.trim().length > 0;

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilter("ALL");
    setAdvancedFilters(emptyAdvancedFilters);
    setDraftFilters(emptyAdvancedFilters);
    setPage(0);
  };

  const changeFilter = (value: StatusFilter) => {
    setFilter(value);
    setPage(0);
  };

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(0);
  };

  const changeSort = (key: CoachOverviewSortKey) => {
    setSort((current) => current.key !== key
      ? { key, direction: "asc" }
      : current.direction === "asc"
      ? { key, direction: "desc" }
      : { key: null, direction: "asc" });
    setPage(0);
  };

  const activeAdvancedChips = [
    ...advancedFilters.accountStatuses.map((value) => ({ key: `account:${value}`, value, clear: () => setAdvancedFilters((current) => ({ ...current, accountStatuses: current.accountStatuses.filter((item) => item !== value) })) })),
    ...advancedFilters.workStatuses.map((value) => ({ key: `work:${value}`, value, clear: () => setAdvancedFilters((current) => ({ ...current, workStatuses: current.workStatuses.filter((item) => item !== value) })) })),
    ...(advancedFilters.groupFilter ? [{ key: "group", value: advancedFilters.groupFilter, clear: () => setAdvancedFilters((current) => ({ ...current, groupFilter: "" })) }] : []),
    ...(advancedFilters.workloadStatus ? [{ key: "workload", value: advancedFilters.workloadStatus, clear: () => setAdvancedFilters((current) => ({ ...current, workloadStatus: "" })) }] : []),
    ...(advancedFilters.reportStatus ? [{ key: "report", value: advancedFilters.reportStatus, clear: () => setAdvancedFilters((current) => ({ ...current, reportStatus: "" })) }] : []),
    ...(advancedFilters.hasSessionToday ? [{ key: "today", value: advancedFilters.hasSessionToday, clear: () => setAdvancedFilters((current) => ({ ...current, hasSessionToday: "" })) }] : []),
  ];

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

  const openEdit = async (coach: CoachOverviewItem) => {
    if (!token) return;
    setLoadingActionId(coach.coachId);
    try {
      const profile = await CoachApi.profile(coach.coachId, token);
      setEditProfile(profile);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось открыть редактирование");
    } finally {
      setLoadingActionId(null);
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
    <PageShell className="max-w-none space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="heading-font text-[28px] font-semibold leading-tight text-slate-950">Тренеры</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Управление тренерами, их нагрузкой, группами и отчетностью.
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate(true)} className="shadow-lg shadow-cyan-900/10">
          <PlusIcon className="h-4 w-4" />
          Добавить тренера
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-5">
        <MetricCard
          icon={<UserGroupIcon className="h-5 w-5" />}
          label="Всего тренеров"
          value={overview.summary.total}
          tone="info"
          active={filter === "ALL"}
          onClick={() => changeFilter("ALL")}
        />
        <MetricCard
          icon={<CheckCircleIcon className="h-5 w-5" />}
          label="Активны"
          value={overview.summary.active}
          tone="success"
          active={filter === "ACTIVE"}
          onClick={() => changeFilter("ACTIVE")}
        />
        <MetricCard
          icon={<BriefcaseIcon className="h-5 w-5" />}
          label="Без групп"
          value={overview.summary.withoutGroups}
          tone="warning"
          active={filter === "WITHOUT_GROUPS"}
          onClick={() => changeFilter("WITHOUT_GROUPS")}
        />
        <MetricCard
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          label="Перегружены"
          value={overview.summary.overloaded}
          tone="danger"
          active={filter === "OVERLOADED"}
          onClick={() => changeFilter("OVERLOADED")}
        />
        <MetricCard
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          label="Сегодня ведут"
          value={overview.summary.withSessionsToday}
          tone="purple"
          active={filter === "TODAY"}
          onClick={() => changeFilter("TODAY")}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-[420px]">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по имени, email или телефону"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            {search ? <button type="button" aria-label="Очистить поиск" onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"><XMarkIcon className="h-4 w-4" /></button> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeFilter(item.value)}
                  aria-pressed={filter === item.value}
                  className={`h-9 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${
                    filter === item.value
                      ? "border-cyan-700 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {item.label} <span className="ml-1 text-xs opacity-70">{item.value === "ALL" ? overview.summary.total : item.value === "ACTIVE" ? overview.summary.active : item.value === "INACTIVE" ? overview.summary.inactive : item.value === "WITHOUT_GROUPS" ? overview.summary.withoutGroups : item.value === "OVERLOADED" ? overview.summary.overloaded : overview.summary.withSessionsToday}</span>
                </button>
              ))}
            <div className="relative" ref={filtersRef}><button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition ${
                showFilters || hasActiveFilters
                  ? "border-cyan-700 bg-cyan-50 text-cyan-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
              aria-expanded={showFilters}
              aria-haspopup="dialog"
            >
              <FunnelIcon className="h-4 w-4" />
              Фильтры{advancedFilterCount > 0 ? ` · ${advancedFilterCount}` : ""}
            </button>
            {showFilters ? <div role="dialog" aria-label="Расширенные фильтры" className="absolute right-0 top-12 z-30 w-[min(760px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <FilterCheckGroup title="Статус аккаунта" options={[["ACTIVE", "Активные"], ["DISABLED", "Отключенные"]]} values={draftFilters.accountStatuses} onChange={(values) => setDraftFilters((current) => ({ ...current, accountStatuses: values as AccountStatus[] }))} />
                <FilterCheckGroup title="Рабочий статус" options={[["AVAILABLE", "Доступен"], ["BUSY", "Занят"], ["VACATION", "В отпуске"]]} values={draftFilters.workStatuses} onChange={(values) => setDraftFilters((current) => ({ ...current, workStatuses: values as WorkStatus[] }))} />
                <FilterRadioGroup title="Группы" options={[["WITHOUT_GROUP", "Без групп"], ["ONE_GROUP", "1 группа"], ["TWO_OR_THREE_GROUPS", "2–3 группы"], ["FOUR_OR_MORE_GROUPS", "4 и более"]]} value={draftFilters.groupFilter} onChange={(value) => setDraftFilters((current) => ({ ...current, groupFilter: value as AdvancedFilters["groupFilter"] }))} />
                <FilterRadioGroup title="Нагрузка" options={[["LOW", "Низкая"], ["MEDIUM", "Средняя"], ["HIGH", "Высокая"], ["FULL", "100%"], ["OVERLOADED", "Перегружен"]]} value={draftFilters.workloadStatus} onChange={(value) => setDraftFilters((current) => ({ ...current, workloadStatus: value as AdvancedFilters["workloadStatus"] }))} />
                <FilterRadioGroup title="Отчетность" options={[["NO_REPORTS", "Без отчетов"], ["PENDING", "Ожидают отчета"], ["OVERDUE", "Есть просроченные"], ["SUBMITTED", "Отчет сдан"]]} value={draftFilters.reportStatus} onChange={(value) => setDraftFilters((current) => ({ ...current, reportStatus: value as AdvancedFilters["reportStatus"] }))} />
                <FilterRadioGroup title="Занятия" options={[["true", "Ведет сегодня"], ["false", "Не ведет сегодня"]]} value={draftFilters.hasSessionToday} onChange={(value) => setDraftFilters((current) => ({ ...current, hasSessionToday: value as AdvancedFilters["hasSessionToday"] }))} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => setDraftFilters(emptyAdvancedFilters)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Сбросить</button><Button type="button" size="sm" onClick={() => { setAdvancedFilters(draftFilters); setFilter("ALL"); setPage(0); setShowFilters(false); }}>Применить</Button></div>
            </div> : null}</div>
            <label className="relative inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-slate-300"><ChevronUpDownIcon className="mr-2 h-4 w-4" /><span className="sr-only">Сортировка</span><select aria-label="Сортировка тренеров" value={sort.key ? `${sort.key}:${sort.direction}` : ""} onChange={(event) => { const [key, direction] = event.target.value.split(":") as [CoachOverviewSortKey, SortDirection]; setSort(event.target.value ? { key, direction } : { key: null, direction: "asc" }); setPage(0); }} className="max-w-[240px] appearance-none bg-transparent pr-5 outline-none"><option value="">Сортировка</option><option value="lastName:asc">Имя: А–Я</option><option value="lastName:desc">Имя: Я–А</option><option value="loadPercent:desc">Нагрузка: высокая сначала</option><option value="loadPercent:asc">Нагрузка: низкая сначала</option><option value="groupsCount:desc">Больше групп</option><option value="groupsCount:asc">Меньше групп</option><option value="lastReportAt:desc">Последний отчет: новые сначала</option><option value="lastReportAt:asc">Последний отчет: старые сначала</option></select><ChevronDownIcon className="pointer-events-none absolute right-2 h-4 w-4" /></label>
          </div>
        </div>
      </div>

      {hasActiveFilters ? <div className="flex flex-wrap items-center gap-2 px-1">{filter !== "ALL" ? <FilterChip label={statusFilters.find((item) => item.value === filter)?.label ?? filter} onClear={() => changeFilter("ALL")} /> : null}{activeAdvancedChips.map((chip) => <FilterChip key={chip.key} label={filterLabels[chip.value] ?? chip.value} onClear={() => { chip.clear(); setPage(0); }} />)}{search.trim() ? <FilterChip label={`Поиск: ${search}`} onClear={() => { setSearch(""); setDebouncedSearch(""); }} /> : null}<button type="button" onClick={resetFilters} className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900">Сбросить все</button></div> : null}

      {error ? (
        <ErrorState message={error} onRetry={loadOverview} />
      ) : loading ? (
        <CoachTableSkeleton />
      ) : coaches.length === 0 ? (
        <EmptyState
          title={overview.summary.total === 0 && !hasActiveFilters ? "Тренеры пока не добавлены" : search.trim() ? "Тренеры не найдены" : "По выбранным условиям тренеры не найдены"}
          description={overview.summary.total === 0 && !hasActiveFilters ? "Добавьте первого тренера, чтобы назначать группы и отслеживать нагрузку." : "Попробуйте изменить поисковый запрос или сбросить фильтры."}
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                resetFilters();
              }}
            >
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[2fr_0.7fr_0.7fr_1.05fr_1.35fr_0.75fr_64px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                <SortableHeader label="Тренер" sortKey="lastName" currentSort={sort} onSort={changeSort} />
                <SortableHeader label="Группы" sortKey="groupsCount" currentSort={sort} onSort={changeSort} />
                <SortableHeader label="Сегодня" sortKey="todaySessionsCount" currentSort={sort} onSort={changeSort} />
                <SortableHeader label="Нагрузка" sortKey="loadPercent" currentSort={sort} onSort={changeSort} />
                <SortableHeader label="Последний отчет" sortKey="lastReportAt" currentSort={sort} onSort={changeSort} />
                <SortableHeader label="Статус" sortKey="active" currentSort={sort} onSort={changeSort} />
                <div className="text-right">Действия</div>
              </div>
              <div className="divide-y divide-slate-100">
              {coaches.map((coach) => (
                <CoachRow
                  key={coach.coachId}
                  coach={coach}
                  isUpdating={updatingId === coach.coachId}
                  menuOpen={activeMenuId === coach.coachId}
                  onToggleMenu={() => setActiveMenuId((current) => (current === coach.coachId ? null : coach.coachId))}
                  onCloseMenu={() => setActiveMenuId(null)}
                  onOpen={() => navigate(`/admin/coaches/${coach.coachId}`)}
                  onEdit={() => openEdit(coach)}
                  onAssign={() => setAssignCoach(coach)}
                  onToggleStatus={() => toggleStatus(coach)}
                  actionLoading={loadingActionId === coach.coachId}
                />
              ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-slate-500">
            <div>
              Показано {pageStart}-{pageEnd} из {totalElements} тренеров
            </div>
            <div className="flex items-center gap-3"><label className="flex items-center gap-2">На странице:<select aria-label="Количество тренеров на странице" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-700" value={pageSize} onChange={(event) => changePageSize(Number(event.target.value))}>{pageSizeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 disabled:text-slate-300"
                disabled={overview.coaches.first}
              >
                ‹
              </button>
              <div className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-cyan-700 px-3 text-sm font-semibold text-white">
                {currentPage + 1}
              </div>
              <span className="text-xs text-slate-400">из {Math.max(1, totalPages)}</span>
              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 disabled:text-slate-300"
                disabled={overview.coaches.last || totalPages <= 1}
              >
                ›
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate ? (
        <CreateCoachModal
          onClose={() => setShowCreate(false)}
          onCreated={loadOverview}
        />
      ) : null}

      {editProfile ? (
        <EditCoachModal
          profile={editProfile}
          token={token}
          onClose={() => setEditProfile(null)}
          onSaved={async () => {
            setEditProfile(null);
            await loadOverview();
          }}
        />
      ) : null}

      {assignCoach ? (
        <AssignCoachToGroupModal
          coachId={assignCoach.coachId}
          branchId={branchId}
          token={token}
          assignedGroupIds={assignCoach.groups.map((group) => group.groupId)}
          onClose={() => setAssignCoach(null)}
          onAssigned={async () => {
            setAssignCoach(null);
            await loadOverview();
          }}
        />
      ) : null}
    </PageShell>
  );
};

const FilterChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <button type="button" onClick={onClear} title={`Снять фильтр: ${label}`} className="inline-flex max-w-xs items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"><span className="truncate">{label}</span><XMarkIcon className="h-3.5 w-3.5 shrink-0" /></button>
);

const FilterCheckGroup: React.FC<{ title: string; options: string[][]; values: string[]; onChange: (values: string[]) => void }> = ({ title, options, values, onChange }) => (
  <fieldset><legend className="text-sm font-semibold text-slate-900">{title}</legend><div className="mt-2 space-y-1">{options.map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><input type="checkbox" checked={values.includes(value)} onChange={() => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])} className="h-4 w-4 rounded accent-cyan-700" />{label}</label>)}</div></fieldset>
);

const FilterRadioGroup: React.FC<{ title: string; options: string[][]; value: string; onChange: (value: string) => void }> = ({ title, options, value, onChange }) => (
  <fieldset><legend className="text-sm font-semibold text-slate-900">{title}</legend><div className="mt-2 space-y-1">{options.map(([optionValue, label]) => <label key={optionValue} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><input type="radio" checked={value === optionValue} onChange={() => onChange(value === optionValue ? "" : optionValue)} className="h-4 w-4 accent-cyan-700" />{label}</label>)}</div></fieldset>
);

const SortableHeader: React.FC<{
  label: string;
  sortKey: CoachOverviewSortKey;
  currentSort: SortState;
  onSort: (key: CoachOverviewSortKey) => void;
}> = ({ label, sortKey, currentSort, onSort }) => {
  const active = currentSort.key === sortKey;
  const Icon = !active ? ChevronUpDownIcon : currentSort.direction === "asc" ? ChevronUpIcon : ChevronDownIcon;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-sort={!active ? "none" : currentSort.direction === "asc" ? "ascending" : "descending"}
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition ${
        active ? "text-cyan-800" : "text-slate-500 hover:bg-white hover:text-slate-800"
      }`}
    >
      {label}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "info" | "success" | "warning" | "danger" | "purple";
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, value, tone = "info", active, onClick }) => {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
      ? "bg-orange-50 text-orange-700"
      : tone === "danger"
      ? "bg-rose-50 text-rose-700"
      : tone === "purple"
      ? "bg-violet-50 text-violet-700"
      : "bg-sky-50 text-sky-700";

  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`flex items-center gap-3 border border-transparent px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 md:border-r last:border-r-0 ${active ? "bg-cyan-50/80 ring-1 ring-inset ring-cyan-200" : "hover:border-slate-200 hover:bg-slate-50"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold leading-tight text-slate-950">{value}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{label}</div>
      </div>
    </button>
  );
};

const CoachRow: React.FC<{
  coach: CoachOverviewItem;
  isUpdating: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onToggleStatus: () => void;
  actionLoading: boolean;
}> = ({ coach, isUpdating, menuOpen, onToggleMenu, onCloseMenu, onOpen, onEdit, onAssign, onToggleStatus, actionLoading }) => {
  const loadPercent =
    coach.load?.percentage ?? (coach.load?.maxSlots > 0
      ? Math.min(100, Math.round((coach.load.usedSlots / coach.load.maxSlots) * 100))
      : 0);
  const report = reportState(coach);

  return (
    <div className="relative grid grid-cols-[2fr_0.7fr_0.7fr_1.05fr_1.35fr_0.75fr_64px] items-center px-4 py-3 text-sm transition hover:bg-slate-50/70">
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="flex items-center gap-3">
          <CoachAvatar coach={coach} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950">{coachFullName(coach)}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{coach.email}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{coach.phone}</span>
            </div>
          </div>
        </div>
      </button>

      <div>
        <div className="font-semibold text-slate-950">{coach.groups.length}</div>
        <div className="mt-1 text-slate-500">{coach.groups.length === 1 ? "группа" : "групп"}</div>
      </div>

      <div>
        <div className="font-semibold text-slate-950">{coach.todaySessionsCount}</div>
        <div className="mt-1 text-slate-500">занятий</div>
      </div>

      <div>
        <div className="font-semibold text-slate-950">
          {coach.load?.used ?? coach.load?.usedSlots ?? 0} из {coach.load?.limit ?? coach.load?.maxSlots ?? 0} занятий
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 w-28 rounded-full bg-slate-200" title={`Нагрузка за текущую неделю: ${coach.load?.completed ?? 0} проведено, ${coach.load?.planned ?? 0} запланировано, лимит — ${coach.load?.limit ?? coach.load?.maxSlots ?? 0} занятий.`}>
            <div
              className={`h-1.5 rounded-full ${isOverloaded(coach) ? "bg-rose-500" : "bg-cyan-700"}`}
              style={{ width: `${loadPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{loadPercent}%</span>
        </div>
      </div>

      <div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${report.className}`}>
          {report.label}
        </span>
        <div className="mt-1.5 text-xs text-slate-500">
          {coach.reports.lastReportAt ? formatDateTime(coach.reports.lastReportAt) : "—"}
        </div>
      </div>

      <div>
        <StatusBadge active={coach.active} workStatus={coach.workStatus} />
      </div>

      <div className="flex justify-end" data-coach-menu>
        <button
          type="button"
          onClick={onToggleMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200"
          aria-label={`Действия для тренера ${coachFullName(coach)}`}
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>

        {menuOpen ? (
          <div className="absolute right-5 top-11 z-20 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
            <ActionMenuButton
              icon={<UserIcon className="h-4 w-4" />}
              label="Открыть профиль"
              onClick={() => {
                onCloseMenu();
                onOpen();
              }}
            />
            <ActionMenuButton
              icon={<PencilSquareIcon className="h-4 w-4" />}
              label="Редактировать"
              disabled={actionLoading}
              onClick={() => {
                onCloseMenu();
                onEdit();
              }}
            />
            <ActionMenuButton
              icon={<UserGroupIcon className="h-4 w-4" />}
              label="Назначить группы"
              onClick={() => {
                onCloseMenu();
                onAssign();
              }}
            />
            <ActionMenuButton
              icon={<PowerIcon className="h-4 w-4" />}
              label={coach.active ? "Отключить" : "Включить"}
              danger={coach.active}
              disabled={isUpdating}
              onClick={() => {
                onCloseMenu();
                onToggleStatus();
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const CoachAvatar: React.FC<{ coach: CoachOverviewItem }> = ({ coach }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-700 to-teal-500 text-sm font-semibold text-white shadow-sm">
    {coachInitials(coach)}
  </div>
);

const CoachTableSkeleton: React.FC = () => (
  <div aria-label="Загрузка тренеров" aria-busy="true" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="h-11 animate-pulse border-b border-slate-200 bg-slate-100" />
    {Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-8 border-b border-slate-100 px-5 py-4 last:border-0"><div className="h-10 animate-pulse rounded-lg bg-slate-100" /><div className="h-8 animate-pulse rounded-lg bg-slate-100" /><div className="h-8 animate-pulse rounded-lg bg-slate-100" /><div className="h-8 animate-pulse rounded-lg bg-slate-100" /></div>)}
  </div>
);

const ActionMenuButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}> = ({ icon, label, onClick, danger = false, disabled = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${
      danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
    }`}
  >
    {icon}
    {label}
  </button>
);

export const SmallStat: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

export const StatusBadge: React.FC<{ active: boolean; workStatus?: WorkStatus }> = ({ active, workStatus }) => {
  const workLabel = workStatus === "VACATION" ? "В отпуске" : workStatus === "BUSY" ? "Занят" : workStatus === "AVAILABLE" ? "Доступен" : null;
  return <div className="flex flex-wrap items-center gap-1.5"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}><span aria-hidden="true">{active ? "✓" : "—"}</span>{active ? "Активен" : "Отключен"}</span>{workLabel ? <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">{workLabel}</span> : null}</div>;
};

export const CoachProfileContent: React.FC<{
  profile: CoachProfile;
  assignments: CoachGroupAssignment[];
  trainerOverview?: TrainerOverview | null;
  activity?: TrainerActivityResponse | null;
  activityLoading?: boolean;
  onActivityPageChange?: React.Dispatch<React.SetStateAction<number>>;
  onOpenGroup: (groupId: string) => void;
  onUnassignGroup: (assignment: CoachGroupAssignment) => void | Promise<void>;
  onAssignGroup?: () => void;
  onEditAvailability?: () => void;
  showIdentity?: boolean;
  sectionPrefix?: string;
}> = ({ profile, assignments, trainerOverview, activity, activityLoading = false, onActivityPageChange, onOpenGroup, onUnassignGroup, onAssignGroup, onEditAvailability, showIdentity = true, sectionPrefix = "coach-profile" }) => {
  const [reportFilter, setReportFilter] = useState<"ALL" | "PENDING" | "OVERDUE" | "SUBMITTED">("ALL");
  const load = trainerOverview?.load ?? profile.load;
  const usedSlots = load?.used ?? load?.usedSlots ?? profile.weeklySchedule.length;
  const maxSlots = load?.limit ?? load?.maxSlots ?? Math.max(usedSlots, 12);
  const loadPercent = load?.percentage ?? (maxSlots > 0 ? Math.min(100, Math.round((usedSlots / maxSlots) * 100)) : 0);
  const fallbackAttention = [
    profile.reports.overdueCount > 0
      ? { type: "OVERDUE_REPORTS", severity: "WARNING", title: "Просроченные отчеты", description: `${profile.reports.overdueCount} отчетов требуют внимания`, action: { type: "OPEN_REPORTS", label: "Перейти к отчетам" } }
      : null,
    profile.groups.length === 0
      ? { type: "NO_GROUPS", severity: "WARNING", title: "Нет групп", description: "Тренер не назначен ни в одну группу", action: { type: "ASSIGN_GROUP", label: "Назначить в группу" } }
      : null,
    profile.upcomingSessions.length === 0 && profile.active
      ? { type: "NO_UPCOMING", severity: "INFO", title: "Нет ближайших занятий", description: "В расписании нет будущих тренировок", action: { type: "OPEN_SCHEDULE", label: "Открыть расписание" } }
      : null,
    loadPercent >= 90
      ? { type: "HIGH_LOAD", severity: "WARNING", title: "Высокая нагрузка", description: "Нагрузка близка к недельному лимиту", action: null }
      : null,
  ].filter(Boolean) as NonNullable<TrainerOverview["attentionItems"]>;
  const attentionItems = (trainerOverview?.attentionItems?.length ? trainerOverview.attentionItems : fallbackAttention)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.type === item.type && candidate.entityId === item.entityId) === index);
  const weeklyScheduleByDay = weekDays.map((day) => ({
    ...day,
    items: profile.weeklySchedule
      .filter((item) => item.dayOfWeek === day.key)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
  const conflictSlotsCount = profile.weeklySchedule.filter((item) => item.conflicts?.length).length;
  const now = new Date();
  const pendingReportSessions = profile.upcomingSessions.filter((session) => {
    const sessionEnd = new Date(`${session.sessionDate}T${session.endTime}`);
    return !session.reportDone && !Number.isNaN(sessionEnd.getTime()) && sessionEnd <= now;
  });
  const reportRows = [
    ...profile.reports.recent.map((report) => ({
      key: `submitted-${report.sessionId}`,
      groupId: report.groupId,
      groupName: report.groupName,
      date: `${formatDate(report.sessionDate)} · ${timeShort(report.startTime)}`,
      topic: "—",
      deadline: "—",
      submittedAt: formatDateTime(report.reportedAt),
      status: "SUBMITTED" as const,
      statusLabel: "Заполнен",
    })),
    ...pendingReportSessions.map((session) => ({
      key: `pending-${session.sessionId}`,
      groupId: session.groupId,
      groupName: session.groupName,
      date: `${formatDate(session.sessionDate)} · ${timeShort(session.startTime)}`,
      topic: "—",
      deadline: "После занятия",
      submittedAt: "—",
      status: "PENDING" as const,
      statusLabel: "Ожидает",
    })),
  ];
  const visibleReportRows = reportRows.filter((row) => reportFilter === "ALL" || row.status === reportFilter);
  const groupInsights = assignments.map((group) => {
    const weeklySlots = profile.weeklySchedule.filter((item) => item.groupId === group.groupId);
    const fallbackNextSession = profile.upcomingSessions
      .filter((session) => session.groupId === group.groupId)
      .slice()
      .sort((a, b) => `${a.sessionDate} ${a.startTime}`.localeCompare(`${b.sessionDate} ${b.startTime}`))[0];

    return {
      ...group,
      weeklySlots,
      weeklySlotsCount: group.weeklySlotsCount ?? weeklySlots.length,
      nextSession: group.nextSession ?? fallbackNextSession ?? null,
      studentsCount: group.studentsCount,
      activeStudentsCount: group.activeStudentsCount,
      riskFlags: group.riskFlags ?? [],
    };
  });

  const loadCard = (
    <SectionCard id={`${sectionPrefix}-load`} className="scroll-mt-20">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">Нагрузка за текущую неделю</span>
        <span className="text-slate-500">
          {usedSlots} из {maxSlots} занятий
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-cyan-700" style={{ width: `${loadPercent}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallStat icon={<CheckCircleIcon className="h-4 w-4" />} label="Проведено" value={load?.completed ?? 0} />
        <SmallStat icon={<CalendarDaysIcon className="h-4 w-4" />} label="Запланировано" value={load?.planned ?? 0} />
        <SmallStat
          icon={<ExclamationTriangleIcon className="h-4 w-4" />}
          label="Просрочено"
          value={profile.reports.overdueCount}
        />
      </div>
    </SectionCard>
  );

  const attentionCard = (
    <SectionCard
      id={`${sectionPrefix}-attention`}
      title="Требует внимания"
      description="Сигналы, на которые администратору стоит отреагировать"
      className="scroll-mt-20"
    >
      {attentionItems.length === 0 ? (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Критичных проблем по тренеру сейчас нет.
        </div>
      ) : (
        <div className="space-y-2">
          {attentionItems.map((item) => (
            <div
              key={`${item.type}-${item.entityId ?? item.title}`}
              className={`rounded-lg border px-4 py-3 text-sm ${
                item.severity === "CRITICAL"
                  ? "border-rose-100 bg-rose-50 text-rose-800"
                  : item.severity === "WARNING"
                  ? "border-amber-100 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 opacity-80">{item.description}</div>
                  {item.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.action?.type === "OPEN_GROUP" && item.entityId) onOpenGroup(item.entityId);
                        if (item.action?.type === "OPEN_SCHEDULE" && item.entityId) onOpenGroup(item.entityId);
                        if (item.action?.type === "OPEN_REPORTS") document.getElementById(`${sectionPrefix}-reports`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        if (item.action?.type === "ASSIGN_GROUP") onAssignGroup?.();
                      }}
                      className="mt-2 text-xs font-semibold underline-offset-2 hover:underline"
                    >
                      {item.action.label}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );

  const lastReportCard = (
    <SectionCard id={`${sectionPrefix}-last-report`} title="Последний отчет" className="scroll-mt-20">
      {trainerOverview?.lastReport ? (
        <div className="space-y-2 text-sm">
          <div className="font-semibold text-slate-950">{formatDateLong(trainerOverview.lastReport.submittedAt)}</div>
          <div className="text-slate-500">Группа: {trainerOverview.lastReport.groupName}</div>
          <div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${profile.reports.overdueCount > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              {profile.reports.overdueCount > 0 ? "Есть просроченные" : "Отчет сдан"}
            </span>
          </div>
        </div>
      ) : (
        <EmptyState title="Отчетов пока нет" description="Последний отчет появится после заполнения тренером." />
      )}
    </SectionCard>
  );

  const availabilityCard = (
    <SectionCard id={`${sectionPrefix}-availability`} title="Рабочая доступность" className="scroll-mt-20">
      {trainerOverview?.availability ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">{formatAvailabilityDays(trainerOverview.availability.days)}</div>
            <div className="mt-1 text-sm text-slate-600">
              {timeShort(trainerOverview.availability.timeFrom)} – {timeShort(trainerOverview.availability.timeTo)}
            </div>
            <div className="mt-1 text-xs text-slate-500">Часовой пояс: {trainerOverview.availability.timezone}</div>
          </div>
          {onEditAvailability ? (
            <Button type="button" size="sm" variant="secondary" onClick={onEditAvailability}>
              Изменить доступность
            </Button>
          ) : null}
        </div>
      ) : (
        <EmptyState title="Доступность не задана" description="Укажите рабочие дни и часы тренера." />
      )}
    </SectionCard>
  );

  return (
    <div className="space-y-5">
      {showIdentity ? (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-50">
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

        {loadCard}
      </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {loadCard}
          {attentionCard}
          {lastReportCard}
          <div className="xl:col-span-2">
            <SectionCard title="Группы тренера" className="h-full">
              {trainerOverview?.groups?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {trainerOverview.groups.slice(0, 4).map((group) => (
                    <button key={group.groupId} type="button" onClick={() => onOpenGroup(group.groupId)} className="rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50">
                      <div className="truncate text-sm font-semibold text-slate-950">{group.groupName}</div>
                      <div className="mt-1 text-xs text-slate-500">{group.role === "MAIN" ? "Главный тренер" : "Ассистент"}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="Группы не назначены" description="Тренер пока не привязан к группам." />
              )}
            </SectionCard>
          </div>
          {availabilityCard}
        </div>
      )}

      {showIdentity ? attentionCard : null}

      <SectionCard
        id={`${sectionPrefix}-groups`}
        title="Группы"
        description="Группы, где тренер назначен"
        className="scroll-mt-20"
      >
        {assignments.length === 0 ? (
          <EmptyState title="Группы не назначены" description="Тренер пока не привязан к группам." />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {groupInsights.map((group) => (
              <div
                key={group.groupId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-base font-semibold text-slate-950">{group.groupName}</div>
                      {group.role ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                          {group.role === "MAIN" ? "Главный тренер" : "Ассистент"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {group.weeklySlotsCount > 0
                        ? `${group.weeklySlotsCount} слотов в недельном расписании`
                        : "Расписание для этой группы не задано"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      group.weeklySlotsCount > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {group.weeklySlotsCount > 0 ? "Есть расписание" : "Нет расписания"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <UserGroupIcon className="h-4 w-4" />
                      Ученики
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {group.activeStudentsCount ?? "?"}
                      {group.studentsCount !== null ? (
                        <span className="ml-1 text-xs font-medium text-slate-400">из {group.studentsCount}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDaysIcon className="h-4 w-4" />
                      Слотов
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">{group.weeklySlotsCount}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <ClockIcon className="h-4 w-4" />
                      Ближайшее
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-950">
                      {group.nextSession
                        ? `${formatDate(group.nextSession.sessionDate)} ${timeShort(group.nextSession.startTime)}`
                        : "Нет"}
                    </div>
                  </div>
                </div>

                {group.riskFlags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.riskFlags.map((risk) => (
                      <span
                        key={`${risk.code}-${risk.label}`}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${riskToneClassName(risk.severity)}`}
                      >
                        {risk.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {group.weeklySlots.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.weeklySlots.slice(0, 4).map((slot) => (
                      <span
                        key={slot.scheduleId}
                        className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800"
                      >
                        {weekDays.find((day) => day.key === slot.dayOfWeek)?.label ?? slot.dayOfWeek}{" "}
                        {timeShort(slot.startTime)}
                      </span>
                    ))}
                    {group.weeklySlots.length > 4 ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        +{group.weeklySlots.length - 4}
                      </span>
                    ) : null}
                  </div>
                ) : group.weeklySlotsCount === 0 ? (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Проверьте расписание группы, чтобы тренер видел занятия в своем календаре.
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
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
        <SectionCard
          id={`${sectionPrefix}-schedule`}
          title="Недельное расписание"
          description="Постоянные слоты тренера по дням недели"
          className="scroll-mt-20 xl:col-span-2"
        >
          {conflictSlotsCount > 0 ? (
            <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Найдено конфликтных слотов: {conflictSlotsCount}. Проверьте красные карточки в недельной сетке.
            </div>
          ) : null}
          {profile.weeklySchedule.length === 0 ? (
            <EmptyState title="Расписание не задано" description="У тренера пока нет постоянных слотов." />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {weeklyScheduleByDay.map((day) => (
                <div
                  key={day.key}
                  className={`min-h-[132px] rounded-xl border px-2.5 py-2.5 ${
                    day.items.length > 0
                      ? "border-cyan-100 bg-cyan-50/45"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{day.label}</div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      {day.items.length}
                    </span>
                  </div>

                  {day.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-2 py-5 text-center text-xs text-slate-400">
                      Свободно
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {day.items.map((item) => (
                        <button
                          key={item.scheduleId}
                          type="button"
                          onClick={() => onOpenGroup(item.groupId)}
                          className={`w-full rounded-lg border px-2.5 py-2 text-left shadow-sm transition hover:bg-white ${
                            item.conflicts?.length
                              ? "border-rose-100 bg-rose-50 hover:border-rose-200"
                              : "border-white/80 bg-white hover:border-cyan-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-slate-950">
                              {timeShort(item.startTime)}-{timeShort(item.endTime)}
                            </div>
                            {item.scheduleStatusLabel ? (
                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  item.scheduleStatus === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : item.scheduleStatus === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.scheduleStatusLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-xs font-medium text-cyan-800">{item.groupName}</div>
                          {item.coachName ? (
                            <div className="mt-1 truncate text-[11px] text-slate-500">{item.coachName}</div>
                          ) : null}
                          <div className="mt-1 truncate text-[11px] text-slate-400">
                            до {item.endDate ? formatDate(item.endDate) : "без даты окончания"}
                          </div>
                          {item.conflicts?.length ? (
                            <div className="mt-2 space-y-1">
                              {item.conflicts.slice(0, 2).map((conflict) => (
                                <div
                                  key={`${conflict.conflictingGroupId}-${conflict.startTime}-${conflict.endTime}`}
                                  className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-medium text-rose-700"
                                >
                                  Конфликт: {conflict.conflictingGroupName} · {timeShort(conflict.startTime)}-
                                  {timeShort(conflict.endTime)}
                                </div>
                              ))}
                              {item.conflicts.length > 2 ? (
                                <div className="text-[11px] text-rose-600">+{item.conflicts.length - 2} еще</div>
                              ) : null}
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          id={`${sectionPrefix}-sessions`}
          title="Ближайшие занятия"
          description="Что тренер ведет в ближайшее время"
          className="scroll-mt-20"
        >
          {profile.upcomingSessions.length === 0 ? (
            <EmptyState title="Ближайших занятий нет" description="В расписании нет будущих тренировок." />
          ) : (
            <div className="space-y-2">
              {profile.upcomingSessions.map((session) => (
                <div key={session.sessionId} className="rounded-lg border border-slate-200 px-3 py-2">
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
                    · {formatSessionStatus(session.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        id={`${sectionPrefix}-reports`}
        title="Контроль отчетов"
        description="Просрочка, ближайшие занятия без отчета и последние заполненные отчеты"
        className="scroll-mt-20"
      >
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div
            className={`rounded-xl border px-4 py-3 ${
              profile.reports.overdueCount > 0
                ? "border-rose-100 bg-rose-50 text-rose-800"
                : "border-emerald-100 bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="text-xs font-medium uppercase tracking-wide opacity-75">Просрочено</div>
            <div className="mt-1 text-2xl font-semibold">{profile.reports.overdueCount}</div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-amber-800">
            <div className="text-xs font-medium uppercase tracking-wide opacity-75">Ожидают отчета</div>
            <div className="mt-1 text-2xl font-semibold">{pendingReportSessions.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Последний отчет</div>
            <div className="mt-1 text-sm font-semibold">{formatDateTime(profile.reports.lastReportAt)}</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ["ALL", "Все"],
            ["PENDING", "Ожидают"],
            ["OVERDUE", "Просрочены"],
            ["SUBMITTED", "Заполнены"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setReportFilter(value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                reportFilter === value ? "border-cyan-600 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {profile.reports.overdueCount > 0 && (reportFilter === "ALL" || reportFilter === "OVERDUE") ? (
          <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <div className="font-semibold">Просроченные отчеты: {profile.reports.overdueCount}</div>
            <div className="mt-1 text-xs leading-5">
              Backend сейчас возвращает счетчик просрочки без детализации занятий. Будущие занятия не включены в этот статус.
            </div>
          </div>
        ) : null}

        {visibleReportRows.length === 0 ? (
          <EmptyState
            title={reportFilter === "ALL" ? "Отчетов пока нет" : "Нет отчетов в выбранном фильтре"}
            description={reportFilter === "PENDING" ? "Будущие занятия не считаются ожидающими отчет." : "Измените фильтр или дождитесь новых данных от тренера."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_1fr_0.8fr_0.9fr_0.9fr_0.8fr] bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Группа</div>
              <div>Дата занятия</div>
              <div>Тема</div>
              <div>Дедлайн</div>
              <div>Заполнен</div>
              <div>Статус</div>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleReportRows.map((report) => (
                <div
                  key={report.key}
                  className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_0.8fr_0.9fr_0.9fr_0.8fr]"
                >
                  <button
                    type="button"
                    onClick={() => onOpenGroup(report.groupId)}
                    className="text-left font-medium text-cyan-800 hover:text-cyan-900"
                  >
                    {report.groupName}
                  </button>
                  <div className="font-medium text-slate-950">{report.date}</div>
                  <div className="text-slate-500">{report.topic}</div>
                  <div className="text-slate-500">{report.deadline}</div>
                  <div className="text-slate-500">{report.submittedAt}</div>
                  <div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${report.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {report.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        id={`${sectionPrefix}-history`}
        title="Активность"
        description="Изменения аккаунта и рабочего статуса"
        className="scroll-mt-20"
      >
        {activityLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Загрузка активности">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-slate-200 px-3 py-3">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-100" />
                <div className="mt-4 h-3 w-72 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : activity ? (
          activity.content.length === 0 ? (
            <EmptyState title="Активность пока пуста" description="Изменения появятся после первых действий с тренером." />
          ) : (
            <>
              <div className="space-y-0">
                {activity.content.map((event) => (
                  <div key={event.id} className="relative border-l border-slate-200 pb-5 pl-4 last:pb-0">
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-cyan-700 ring-4 ring-cyan-50" />
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <div className="font-medium text-slate-900">{event.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(event.occurredAt)}</div>
                      <div className="mt-2 text-xs text-slate-600">Изменил: {event.actor?.name || "Неизвестный пользователь"}</div>
                      {event.changes.length > 0 ? (
                        <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                          {event.changes.map((change, index) => (
                            <div key={`${change.field}-${index}`}>
                              {change.label}: {change.fromLabel ?? "Не задано"} → {change.toLabel ?? "Не задано"}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                <div>
                  Страница {(activity.number ?? 0) + 1} из {Math.max(1, activity.totalPages ?? 1)}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={activity.first}
                    onClick={() => onActivityPageChange?.((page) => Math.max(0, page - 1))}
                  >
                    Назад
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={activity.last}
                    onClick={() => onActivityPageChange?.((page) => page + 1)}
                  >
                    Вперед
                  </Button>
                </div>
              </div>
            </>
          )
        ) : profile.statusHistory.length === 0 ? (
          <EmptyState title="Активность пока пуста" description="Изменения появятся после первых действий с тренером." />
        ) : (
          <div className="space-y-0">
            {profile.statusHistory
              .slice()
              .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
              .map((item) => (
              <div key={`${item.status}-${item.changedAt}`} className="relative border-l border-slate-200 pb-5 pl-4 last:pb-0">
                <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-cyan-700 ring-4 ring-cyan-50" />
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="font-medium text-slate-900">{formatCoachStatusHistory(item.newWorkStatus ?? item.newAccountStatus ?? item.status)}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.changedAt)}</div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                    <div>Изменил: {item.changedBy || "Не указано"}</div>
                    {item.previousAccountStatus || item.newAccountStatus ? (
                      <div>Аккаунт: {item.previousAccountStatus ?? "—"} → {item.newAccountStatus ?? "—"}</div>
                    ) : null}
                    {item.previousWorkStatus || item.newWorkStatus ? (
                      <div>Рабочий статус: {item.previousWorkStatus ?? "—"} → {item.newWorkStatus ?? "—"}</div>
                    ) : null}
                    {item.reason ? <div>Причина: {item.reason}</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export const AssignCoachToGroupModal: React.FC<{
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
  const [showPeriod, setShowPeriod] = useState(false);
  const [assignedFrom, setAssignedFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

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
    if (saving) return;
    if (!groupId) {
      toast.error("Выберите группу");
      return;
    }

    setSaving(true);
    setConflictMessage(null);
    try {
      await CoachApi.assignTrainerToGroup(coachId, {
        groupId,
        role,
        assignedFrom: assignedFrom || null,
        assignedTo: assignedTo || null,
      }, token);
      toast.success("Тренер назначен в группу");
      await onAssigned();
    } catch (e) {
      console.error(e);
      if (e instanceof ApiError && e.code === "TRAINER_SCHEDULE_CONFLICT") {
        const conflicts = Array.isArray((e.metadata as { conflicts?: unknown[] } | undefined)?.conflicts)
          ? ((e.metadata as { conflicts: Array<{ groupName?: string; startAt?: string; endAt?: string }> }).conflicts)
          : [];
        const first = conflicts[0];
        setConflictMessage(first
          ? `У тренера уже есть занятие: ${first.groupName ?? "другая группа"}, ${formatDateLong(first.startAt)}, ${first.startAt ? timeShort(first.startAt.slice(11)) : ""}${first.endAt ? `–${timeShort(first.endAt.slice(11))}` : ""}.`
          : "У тренера уже есть занятие в указанное время.");
      } else {
        toast.error("Не удалось назначить тренера в группу");
      }
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
          <Button type="button" isLoading={saving} onClick={submit} disabled={availableGroups.length === 0 || !groupId || saving}>
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
          <FormField label="Роль*">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("MAIN")}
                className={`rounded-lg border px-3 py-2 text-sm ${
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
                className={`rounded-lg border px-3 py-2 text-sm ${
                  role === "ASSISTANT"
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Ассистент
              </button>
            </div>
          </FormField>
          <div className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setShowPeriod((value) => !value)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700"
            >
              Дополнительные настройки
              <ChevronDownIcon className={`h-4 w-4 transition ${showPeriod ? "rotate-180" : ""}`} />
            </button>
            {showPeriod ? (
              <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
                <FormField label="С">
                  <input
                    type="date"
                    className={formControlClassName}
                    value={assignedFrom}
                    onChange={(event) => setAssignedFrom(event.target.value)}
                  />
                </FormField>
                <FormField label="По">
                  <input
                    type="date"
                    min={assignedFrom}
                    className={formControlClassName}
                    value={assignedTo}
                    onChange={(event) => setAssignedTo(event.target.value)}
                  />
                </FormField>
              </div>
            ) : null}
          </div>
          {conflictMessage ? (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <div className="font-semibold">Обнаружен конфликт расписания</div>
              <div className="mt-1 text-xs leading-5">{conflictMessage}</div>
            </div>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
};

export const EditCoachModal: React.FC<{
  profile: CoachProfile;
  token: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}> = ({ profile, token, onClose, onSaved }) => {
  const initialForm = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    specialization: profile.specialization ?? "",
  };
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    specialization: profile.specialization ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const requestClose = () => {
    if (loading) return;
    if (isDirty && !confirm("Есть несохраненные изменения. Закрыть без сохранения?")) return;
    onClose();
  };

  const submit = async () => {
    if (!isDirty || loading) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Заполните обязательные поля");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setEmailError("Неверный формат email");
      return;
    }
    if (!/^[0-9+()\-\s]{7,20}$/.test(form.phone.trim())) {
      toast.error("Неверный формат телефона");
      return;
    }

    setLoading(true);
    setEmailError(null);
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
      if (e instanceof ApiError && (e.fields?.email || e.message.toLowerCase().includes("email"))) {
        setEmailError(e.fields?.email ?? "Email уже используется");
        return;
      }
      toast.error("Не удалось обновить профиль тренера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Редактировать тренера"
      description={`${profile.firstName} ${profile.lastName}`}
      onClose={requestClose}
      maxWidthClassName="max-w-lg"
      closeDisabled={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={requestClose}>
            Отмена
          </Button>
          <Button type="button" isLoading={loading} disabled={!isDirty || loading} onClick={submit}>
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
            onChange={(event) => {
              setEmailError(null);
              setForm({ ...form, email: event.target.value });
            }}
          />
          {emailError ? <span className="block text-xs font-medium text-rose-600">{emailError}</span> : null}
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
          <input
            type="text"
            className={formControlClassName}
            value={form.specialization}
            onChange={(event) => setForm({ ...form, specialization: event.target.value })}
          />
        </FormField>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          Поле «О тренере» пока не редактируется в admin API. Добавим textarea после появления `bio` в `AdminCoachUpdateInput`.
        </div>
      </div>
    </ModalShell>
  );
};

export const ResetCoachPasswordModal: React.FC<{
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        После сброса старый пароль перестанет работать.
      </div>
    </ModalShell>
  );
};

export default CoachesPage;
