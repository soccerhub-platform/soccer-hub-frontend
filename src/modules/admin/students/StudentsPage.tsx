import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  PhotoIcon,
  TrashIcon,
  UserGroupIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage, resolveApiUrl } from "../../../shared/api";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ModalShell,
  PageShell,
} from "../../../shared/ui";
import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import { GroupApi } from "../groups/group.api";
import { StudentApi } from "./student.api";
import type {
  AdminStudentDetails,
  AdminStudentListItem,
  AdminStudentMembershipHistoryItem,
  AdminStudentsSummary,
  StudentRisk,
  StudentRiskCode,
  StudentRiskSeverity,
} from "./student.types";
import type { ContractPaymentStatus, ContractStatus, PaymentMethod, PaymentStatus } from "../contracts/contracts.types";
import type { MediaAsset } from "../../../shared/media.types";

type PaymentFilter = ContractPaymentStatus | "all";
type ContractFilter = ContractStatus | "all";
type RiskFilter = StudentRiskCode | "all";
type StudentSortKey =
  | "playerName"
  | "outstandingAmount"
  | "paidAmount"
  | "contractEndDate"
  | "attendanceRate"
  | "createdAt";
type SortDirection = "asc" | "desc";

type StudentSortOption = {
  key: StudentSortKey;
  direction: SortDirection;
  label: string;
};

const emptyStudentsSummary: AdminStudentsSummary = {
  total: 0,
  paid: 0,
  partiallyPaid: 0,
  unpaid: 0,
  withDebt: 0,
  withRisks: 0,
  withoutGroup: 0,
  lowAttendance: 0,
  expiredContracts: 0,
  endingSoon: 0,
};

const STUDENT_SORT_OPTIONS: StudentSortOption[] = [
  { key: "createdAt", direction: "desc", label: "Новые ученики" },
  { key: "createdAt", direction: "asc", label: "Старые ученики" },
  { key: "playerName", direction: "asc", label: "Имя: А-Я" },
  { key: "playerName", direction: "desc", label: "Имя: Я-А" },
  { key: "outstandingAmount", direction: "desc", label: "Сначала большой долг" },
  { key: "outstandingAmount", direction: "asc", label: "Сначала без долга" },
  { key: "contractEndDate", direction: "asc", label: "Договор скоро истекает" },
  { key: "contractEndDate", direction: "desc", label: "Договор позже истекает" },
  { key: "attendanceRate", direction: "asc", label: "Низкая посещаемость" },
  { key: "attendanceRate", direction: "desc", label: "Высокая посещаемость" },
  { key: "paidAmount", direction: "desc", label: "Больше оплачено" },
];

const studentSortValue = (sort: StudentSortOption) => `${sort.key},${sort.direction}`;

const formatAmount = (value?: number | null, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU").format(Number(value ?? 0))} ${currency}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const avatarUrl = (avatar?: MediaAsset | null, size: "thumb" | "medium" | "original" = "thumb") => {
  if (!avatar) return undefined;
  const url =
    size === "thumb"
      ? avatar.thumbUrl || avatar.mediumUrl || avatar.originalUrl
      : size === "medium"
      ? avatar.mediumUrl || avatar.originalUrl || avatar.thumbUrl
      : avatar.originalUrl || avatar.mediumUrl || avatar.thumbUrl;
  return url ? resolveApiUrl(url) : undefined;
};

const initialsFromName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

const paymentStatusLabel = (status?: ContractPaymentStatus | null) => {
  switch (status) {
    case "PAID":
      return "Оплачен";
    case "PARTIALLY_PAID":
      return "Частично оплачен";
    case "UNPAID":
      return "Не оплачен";
    default:
      return "Нет договора";
  }
};

const contractStatusLabel = (status?: ContractStatus | null) => {
  switch (status) {
    case "ACTIVE":
      return "Активен";
    case "UPCOMING":
      return "Скоро начнется";
    case "EXPIRED":
      return "Истек";
    case "CANCELLED":
      return "Отменен";
    case "DRAFT":
      return "Черновик";
    default:
      return "Нет договора";
  }
};

const attendanceLabel = (status: AdminStudentDetails["recentAttendance"][number]["status"]) => {
  switch (status) {
    case "PRESENT":
      return "Присутствовал";
    case "ABSENT":
      return "Отсутствовал";
    case "LATE":
      return "Опоздал";
    case "EXCUSED":
      return "Уважительная причина";
    default:
      return status;
  }
};

const paymentMethodLabel = (method: PaymentMethod) => {
  switch (method) {
    case "CASH":
      return "Наличные";
    case "CARD":
      return "Карта";
    case "BANK_TRANSFER":
      return "Перевод";
    case "KASPI":
      return "Kaspi";
    case "OTHER":
      return "Другое";
    default:
      return method;
  }
};

const paymentRecordStatusLabel = (status: PaymentStatus) => (status === "CANCELLED" ? "Отменен" : "Зафиксирован");

const clientStatusLabel = (status?: string | null) => {
  switch (status) {
    case "ACTIVE":
      return "Активный";
    case "INACTIVE":
      return "Неактивный";
    case "ARCHIVED":
      return "В архиве";
    case "BLOCKED":
      return "Заблокирован";
    default:
      return status || "Не указан";
  }
};

const riskLabel = (risk: StudentRisk) => {
  switch (risk.code) {
    case "DEBT":
      return "Есть долг";
    case "ENDING_SOON":
      return "Договор истекает";
    case "EXPIRED_CONTRACT":
      return "Договор истек";
    case "LOW_ATTENDANCE":
      return "Низкая посещаемость";
    case "NO_GROUP":
      return "Без группы";
    default:
      return risk.label;
  }
};

const riskClassName = (severity: StudentRiskSeverity) => {
  switch (severity) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const membershipStatusLabel = (status?: string | null) => {
  switch (status) {
    case "UPCOMING":
      return "Скоро";
    case "ACTIVE":
      return "Активно";
    case "TRANSFERRED":
      return "Переведен";
    case "COMPLETED":
      return "Завершено";
    case "REMOVED":
      return "Исключен";
    default:
      return status || "Не указано";
  }
};

const membershipStatusClassName = (status?: string | null) => {
  switch (status) {
    case "UPCOMING":
      return "border-cyan-100 bg-cyan-50 text-cyan-800";
    case "ACTIVE":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    case "TRANSFERRED":
      return "border-blue-100 bg-blue-50 text-blue-800";
    case "COMPLETED":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "REMOVED":
      return "border-rose-100 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const paymentBadgeClassName = (status?: ContractPaymentStatus | null) => {
  switch (status) {
    case "PAID":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    case "PARTIALLY_PAID":
      return "border-amber-100 bg-amber-50 text-amber-800";
    case "UNPAID":
      return "border-rose-100 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedPlayerIdRef = useRef<string | null>(null);
  const { branchId, branchName } = useAdminBranch();

  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [summary, setSummary] = useState<AdminStudentsSummary>(emptyStudentsSummary);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(4);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>("all");
  const [contractStatus, setContractStatus] = useState<ContractFilter>("all");
  const [groupId, setGroupId] = useState("all");
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<StudentSortOption>(STUDENT_SORT_OPTIONS[0]);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentDetails | null>(null);
  const detailsLoading = false;

  const loadStudents = async (mode: "initial" | "refresh" = "initial") => {
    if (!token || !branchId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const response = await StudentApi.list({
        branchId,
        search: debouncedSearch || undefined,
        paymentStatus,
        contractStatus,
        groupId: groupId !== "all" ? groupId : undefined,
        risk,
        page,
        size: pageSize,
        sort: studentSortValue(sort),
      });
      setStudents(response.content ?? []);
      setSummary(response.summary ?? emptyStudentsSummary);
      setTotalElements(response.totalElements ?? 0);
      setTotalPages(Math.max(1, response.totalPages ?? 1));
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось загрузить учеников"));
      setStudents([]);
      setSummary(emptyStudentsSummary);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, [token, branchId, debouncedSearch, paymentStatus, contractStatus, groupId, risk, page, pageSize, sort]);

  useEffect(() => {
    if (!token || !branchId) {
      setGroups([]);
      setGroupId("all");
      return;
    }

    const loadGroups = async () => {
      setGroupsLoading(true);
      try {
        const result = await GroupApi.listByBranch(branchId, token);
        setGroups(result.map((group) => ({ id: group.groupId, name: group.name })));
      } catch (err) {
        console.error(err);
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };

    void loadGroups();
  }, [branchId, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const playerIdFromQuery = searchParams.get("playerId");
    if (!token || !branchId || !playerIdFromQuery) return;
    if (autoOpenedPlayerIdRef.current === playerIdFromQuery) return;

    autoOpenedPlayerIdRef.current = playerIdFromQuery;
    void openStudent(playerIdFromQuery);
  }, [branchId, searchParams, students, token]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPaymentStatus("all");
    setContractStatus("all");
    setGroupId("all");
    setRisk("all");
    setSort(STUDENT_SORT_OPTIONS[0]);
    setPage(0);
  };

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (paymentStatus !== "all") {
      items.push({ key: "payment", label: paymentStatusLabel(paymentStatus), onRemove: () => setPaymentStatus("all") });
    }
    if (contractStatus !== "all") {
      items.push({ key: "contract", label: contractStatusLabel(contractStatus), onRemove: () => setContractStatus("all") });
    }
    if (groupId !== "all") {
      const group = groups.find((item) => item.id === groupId);
      items.push({ key: "group", label: group?.name ?? "Группа", onRemove: () => setGroupId("all") });
    }
    if (risk !== "all") {
      items.push({
        key: "risk",
        label: QUICK_RISK_FILTERS.find((item) => item.value === risk)?.label ?? "Риск",
        onRemove: () => setRisk("all"),
      });
    }
    return items;
  }, [contractStatus, groupId, groups, paymentStatus, risk]);

  const setQuickRisk = (value: RiskFilter) => {
    setRisk(value);
    if (value !== "all" && sort.key === "playerName") {
      setSort(STUDENT_SORT_OPTIONS.find((item) => item.key === "outstandingAmount" && item.direction === "desc") ?? STUDENT_SORT_OPTIONS[0]);
    }
    setPage(0);
  };

  const changeSort = (value: string) => {
    const nextSort = STUDENT_SORT_OPTIONS.find((item) => studentSortValue(item) === value) ?? STUDENT_SORT_OPTIONS[0];
    setSort(nextSort);
    setSortOpen(false);
    setPage(0);
  };

  const openStudent = async (playerId: string) => {
    navigate(`/admin/students/${encodeURIComponent(playerId)}/overview`);
  };

  const closeStudentDetails = () => {
    autoOpenedPlayerIdRef.current = null;
    setSelectedStudent(null);
    if (searchParams.get("playerId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("playerId");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const updateStudentAvatar = (playerId: string, avatar: MediaAsset | null) => {
    setStudents((items) =>
      items.map((item) => (item.playerId === playerId ? { ...item, avatar } : item))
    );
    setSelectedStudent((current) =>
      current?.player.id === playerId
        ? { ...current, player: { ...current.player, avatar } }
        : current
    );
  };

  const refreshStudentAvatar = async (playerId: string) => {
    try {
      const details = await StudentApi.get(playerId);
      updateStudentAvatar(playerId, details.player.avatar ?? null);
      setSelectedStudent((current) => (current?.player.id === playerId ? details : current));
    } catch (err) {
      console.error(err);
    }
  };

  const uploadStudentAvatar = async (playerId: string, file: File) => {
    const avatar = await StudentApi.uploadAvatar(playerId, file);
    updateStudentAvatar(playerId, avatar);
    toast.success("Фото ученика обновлено");
  };

  const deleteStudentAvatar = async (playerId: string) => {
    await StudentApi.deleteAvatar(playerId);
    updateStudentAvatar(playerId, null);
    toast.success("Фото ученика удалено");
  };

  const downloadStudentAvatar = async (playerId: string) => {
    const response = await StudentApi.getAvatarDownloadUrl(playerId);
    window.open(resolveApiUrl(response.url), "_blank", "noopener,noreferrer");
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell className="max-w-none space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="heading-font text-[28px] font-semibold leading-tight text-slate-950">Ученики</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {summary.total} учеников
            <span className="mx-2 text-cyan-700">• {summary.paid} оплачены</span>
            <span className="mx-2 text-emerald-700">• {summary.withDebt} с долгом</span>
            <span className="mx-2 text-rose-600">• {summary.withRisks} с рисками</span>
            {branchName ? <span className="ml-2 text-slate-400">{branchName}</span> : null}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadStudents("refresh")} isLoading={refreshing}>
          <ArrowPathIcon className="h-4 w-4" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard icon={<UserGroupIcon className="h-5 w-5" />} label="Всего" value={summary.total} tone="info" />
        <MetricCard icon={<CheckCircleIcon className="h-5 w-5" />} label="Оплачены" value={summary.paid} tone="success" />
        <MetricCard icon={<WalletIcon className="h-5 w-5" />} label="С долгом" value={summary.withDebt} tone="danger" />
        <MetricCard icon={<ExclamationTriangleIcon className="h-5 w-5" />} label="С рисками" value={summary.withRisks} tone="warning" />
      </div>

      <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Поиск ученика, родителя, телефона или договора"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSortOpen((value) => !value);
              setFiltersOpen(false);
            }}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              sortOpen
                ? "border-cyan-700 bg-cyan-50 text-cyan-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
            {sort.label}
            <ChevronDownIcon className={`h-4 w-4 transition ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFiltersOpen((value) => !value);
              setSortOpen(false);
            }}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              filtersOpen || activeFilters.length > 0
                ? "border-cyan-700 bg-cyan-50 text-cyan-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            Фильтры
            <ChevronDownIcon className={`h-4 w-4 transition ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <QuickRiskFilters value={risk} summary={summary} onChange={setQuickRisk} />

        {activeFilters.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Активные фильтры:</span>
            {activeFilters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  item.onRemove();
                  setPage(0);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                {item.label}
                <span className="text-slate-400">×</span>
              </button>
            ))}
            <button type="button" onClick={resetFilters} className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
              Сбросить все
            </button>
          </div>
        ) : null}

        {sortOpen ? (
          <div className="absolute right-3 top-[64px] z-20 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-400">Сортировка</div>
            {STUDENT_SORT_OPTIONS.map((item) => {
              const active = studentSortValue(item) === studentSortValue(sort);
              return (
                <button
                  key={studentSortValue(item)}
                  type="button"
                  onClick={() => changeSort(studentSortValue(item))}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                  {active ? <span className="h-2 w-2 rounded-full bg-cyan-700" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="absolute right-3 top-[64px] z-20 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
            <FilterSelect label="Оплата" value={paymentStatus} onChange={(value) => { setPaymentStatus(value as PaymentFilter); setPage(0); }}>
              <option value="all">Любая</option>
              <option value="PAID">Оплачено</option>
              <option value="PARTIALLY_PAID">Частично</option>
              <option value="UNPAID">Долг</option>
            </FilterSelect>
            <FilterSelect label="Договор" value={contractStatus} onChange={(value) => { setContractStatus(value as ContractFilter); setPage(0); }}>
              <option value="all">Любой</option>
              <option value="ACTIVE">Активный</option>
              <option value="UPCOMING">Скоро начнется</option>
              <option value="EXPIRED">Истек</option>
              <option value="CANCELLED">Отменен</option>
            </FilterSelect>
            <FilterSelect label="Группа" value={groupId} onChange={(value) => { setGroupId(value); setPage(0); }} disabled={groupsLoading}>
              <option value="all">{groupsLoading ? "Группы загружаются..." : "Любая"}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Посещаемость" value={risk === "LOW_ATTENDANCE" ? "LOW_ATTENDANCE" : "all"} onChange={(value) => setQuickRisk(value === "LOW_ATTENDANCE" ? "LOW_ATTENDANCE" : "all")}>
              <option value="all">Любая</option>
              <option value="LOW_ATTENDANCE">Низкая</option>
            </FilterSelect>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={resetFilters}>
                Сбросить
              </Button>
              <Button type="button" className="flex-1" onClick={() => setFiltersOpen(false)}>
                Применить
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error ? (
          <ErrorState message={error} onRetry={() => void loadStudents("refresh")} />
        ) : loading ? (
          <LoadingState label="Загрузка учеников..." />
        ) : students.length === 0 ? (
          <EmptyState title="Ученики не найдены" description="Измените фильтры или проверьте выбранный филиал." />
        ) : (
          <div className="divide-y divide-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(240px,1.25fr)_116px_minmax(130px,0.65fr)_124px_136px_136px_1fr_54px] items-center gap-4 bg-white px-5 py-4 text-sm font-semibold text-slate-500 lg:grid">
              <span>Ученик</span>
              <span>Создан</span>
              <span>Группа</span>
              <span>Оплата</span>
              <span>Договор до</span>
              <span>Посещаемость</span>
              <span>Риски</span>
              <span />
            </div>
            {students.map((student) => (
              <StudentRow
                key={student.playerId}
                student={student}
                onOpen={() => void openStudent(student.playerId)}
                onAvatarExpired={() => void refreshStudentAvatar(student.playerId)}
                onOpenContract={() =>
                  student.contractId
                    ? navigate(`/admin/contracts?contractId=${encodeURIComponent(student.contractId)}&mode=view`)
                    : undefined
                }
                onOpenGroup={() => (student.groupId ? navigate(`/admin/groups/${student.groupId}/overview`) : undefined)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Показано {totalElements === 0 ? 0 : page * pageSize + 1}-{Math.min(totalElements, page * pageSize + students.length)} из {totalElements} учеников
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 disabled:text-slate-300"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index).map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                page === index ? "bg-cyan-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 disabled:text-slate-300"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedStudent || detailsLoading ? (
        <StudentDetailsModal
          student={selectedStudent}
          loading={detailsLoading}
          onClose={closeStudentDetails}
          onOpenContract={(contractId) =>
            navigate(`/admin/contracts?contractId=${encodeURIComponent(contractId)}&mode=view`)
          }
          onAddPayment={(contractId) =>
            navigate(`/admin/contracts?contractId=${encodeURIComponent(contractId)}&mode=view&payment=create`)
          }
          onOpenGroup={(groupId) => navigate(`/admin/groups/${groupId}/overview`)}
          onUploadAvatar={uploadStudentAvatar}
          onDeleteAvatar={deleteStudentAvatar}
          onDownloadAvatar={downloadStudentAvatar}
          onAvatarExpired={refreshStudentAvatar}
        />
      ) : null}
    </PageShell>
  );
};

const StudentRow: React.FC<{
  student: AdminStudentListItem;
  onOpen: () => void;
  onAvatarExpired: () => void;
  onOpenContract: () => void | undefined;
  onOpenGroup: () => void | undefined;
}> = ({ student, onOpen, onAvatarExpired, onOpenGroup }) => (
  <article className="grid gap-3 bg-white px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(240px,1.25fr)_116px_minmax(130px,0.65fr)_124px_136px_136px_1fr_54px] lg:items-center lg:gap-4">
    <div className="flex min-w-0 gap-3">
      <StudentAvatar name={student.playerName} avatar={student.avatar} size="md" onImageError={onAvatarExpired} />
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block min-w-0 truncate text-left text-[15px] font-semibold text-slate-950 transition hover:text-cyan-800"
        >
          {student.playerName}
        </button>
        <div className="mt-1 text-sm text-slate-500">{student.age ? `${student.age} лет` : "Возраст не указан"}</div>
        <div className="mt-1 text-xs text-slate-500">Родитель: {student.parentName}</div>
        <div className="mt-1 text-xs text-slate-500">{student.phone || "Телефон не указан"}</div>
      </div>
    </div>

    <div className="text-sm">
      <div className="font-semibold text-slate-900">{formatDate(student.createdAt)}</div>
      <div className="mt-1 text-xs text-slate-500 lg:hidden">Создан</div>
    </div>

    <div className="min-w-0 text-sm">
      <button
        type="button"
        onClick={student.groupId ? onOpenGroup : undefined}
        className="truncate font-semibold text-slate-900 transition hover:text-cyan-800 disabled:hover:text-slate-900"
        disabled={!student.groupId}
      >
        {student.groupName || "Без группы"}
      </button>
      <div className="mt-0.5 truncate text-xs text-slate-500">{student.coachName || "Тренер не указан"}</div>
    </div>

    <div className="text-sm">
      <div className={`font-semibold ${Number(student.outstandingAmount ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
        {paymentStatusLabel(student.paymentStatus) === "Нет договора" ? "—" : paymentStatusLabel(student.paymentStatus)}
      </div>
      <div className={`mt-1 font-semibold ${Number(student.outstandingAmount ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
        {formatAmount(student.outstandingAmount)}
      </div>
    </div>

    <div className="text-sm">
      <div className="font-semibold text-slate-900">{formatDate(student.contractEndDate)}</div>
      {student.contractStatus ? (
        <div className={`mt-1 text-xs ${student.contractStatus === "EXPIRED" ? "text-rose-600" : "text-amber-600"}`}>
          {contractStatusLabel(student.contractStatus)}
        </div>
      ) : null}
    </div>

    <AttendanceBar value={student.attendanceRate} />

    <div className="flex flex-wrap gap-1.5">
      {student.risks.length > 0 ? (
        student.risks.slice(0, 3).map((item) => <RiskBadge key={item.code} risk={item} />)
      ) : (
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          Нет рисков
        </span>
      )}
    </div>

    <button
      type="button"
      onClick={onOpen}
      className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      aria-label="Открыть действия ученика"
    >
      <EllipsisVerticalIcon className="h-5 w-5" />
    </button>
  </article>
);

const QUICK_RISK_FILTERS: Array<{ value: RiskFilter; label: string; countKey?: keyof AdminStudentsSummary }> = [
  { value: "all", label: "Все", countKey: "total" },
  { value: "DEBT", label: "С долгом", countKey: "withDebt" },
  { value: "ENDING_SOON", label: "Истекают", countKey: "endingSoon" },
  { value: "EXPIRED_CONTRACT", label: "Истек договор", countKey: "expiredContracts" },
  { value: "LOW_ATTENDANCE", label: "Низкая посещаемость", countKey: "lowAttendance" },
  { value: "NO_GROUP", label: "Без группы", countKey: "withoutGroup" },
];

const QuickRiskFilters: React.FC<{
  value: RiskFilter;
  summary: AdminStudentsSummary;
  onChange: (value: RiskFilter) => void;
}> = ({
  value,
  summary,
  onChange,
}) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {QUICK_RISK_FILTERS.map((item) => {
      const active = item.value === value;
      const count = item.countKey ? summary[item.countKey] : undefined;
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            active
              ? "border-cyan-700 bg-cyan-50 text-cyan-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {item.label}
          {typeof count === "number" ? <span className="ml-1 text-slate-400">{count}</span> : null}
        </button>
      );
    })}
  </div>
);

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, value, onChange, disabled = false, children }) => (
  <label className="mb-3 block text-sm font-semibold text-slate-600">
    <span className="mb-1.5 block">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-400"
    >
      {children}
    </select>
  </label>
);

const AttendanceBar: React.FC<{ value?: number | null }> = ({ value }) => {
  const percent = value == null ? 0 : Math.max(0, Math.min(100, value));
  const tone = percent >= 75 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="text-sm">
      <div className="font-semibold text-slate-900">{value == null ? "—" : `${value}%`}</div>
      <div className="mt-2 h-2 w-28 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const StudentAvatar: React.FC<{
  name: string;
  avatar?: MediaAsset | null;
  size?: "sm" | "md" | "lg";
  onImageError?: () => void;
}> = ({ name, avatar, size = "sm", onImageError }) => {
  const src = avatarUrl(avatar, size === "lg" ? "medium" : "thumb");
  const sizeClass = size === "lg" ? "h-28 w-28 text-2xl" : size === "md" ? "h-14 w-14 text-base" : "h-10 w-10 text-sm";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover`}
        onError={() => {
          setFailedSrc(src);
          onImageError?.();
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-cyan-100 bg-cyan-50 font-semibold text-cyan-800`}
      aria-label={name}
    >
      {initialsFromName(name)}
    </div>
  );
};

const StudentPhotoPanel: React.FC<{
  student: AdminStudentDetails;
  onUploadAvatar: (playerId: string, file: File) => Promise<void>;
  onDeleteAvatar: (playerId: string) => Promise<void>;
  onDownloadAvatar: (playerId: string) => Promise<void>;
  onAvatarExpired: (playerId: string) => Promise<void>;
}> = ({ student, onUploadAvatar, onDeleteAvatar, onDownloadAvatar, onAvatarExpired }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busyAction, setBusyAction] = useState<"upload" | "delete" | "download" | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setBusyAction("upload");
    try {
      await onUploadAvatar(student.player.id, file);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось загрузить фото"));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    setBusyAction("delete");
    try {
      await onDeleteAvatar(student.player.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось удалить фото"));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async () => {
    setBusyAction("download");
    try {
      await onDownloadAvatar(student.player.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось скачать фото"));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Panel title="Фото ученика">
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!student.player.avatar || busyAction !== null}
          onClick={handleDownload}
          className="rounded-full disabled:cursor-default"
          aria-label="Открыть фото ученика"
        >
          <StudentAvatar
            name={student.player.fullName}
            avatar={student.player.avatar}
            size="lg"
            onImageError={() => void onAvatarExpired(student.player.id)}
          />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">{student.player.fullName}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {student.player.avatar ? "Фото используется в списках и карточке ученика" : "Фото пока не загружено"}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isLoading={busyAction === "upload"}
              onClick={() => inputRef.current?.click()}
            >
              <PhotoIcon className="h-4 w-4" />
              Загрузить
            </Button>
            {student.player.avatar ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  isLoading={busyAction === "download"}
                  onClick={handleDownload}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Скачать
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="softDanger"
                  isLoading={busyAction === "delete"}
                  onClick={handleDelete}
                >
                  <TrashIcon className="h-4 w-4" />
                  Удалить
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
};

const StudentDetailsModal: React.FC<{
  student: AdminStudentDetails | null;
  loading: boolean;
  onClose: () => void;
  onOpenContract: (contractId: string) => void;
  onAddPayment: (contractId: string) => void;
  onOpenGroup: (groupId: string) => void;
  onUploadAvatar: (playerId: string, file: File) => Promise<void>;
  onDeleteAvatar: (playerId: string) => Promise<void>;
  onDownloadAvatar: (playerId: string) => Promise<void>;
  onAvatarExpired: (playerId: string) => Promise<void>;
}> = ({
  student,
  loading,
  onClose,
  onOpenContract,
  onAddPayment,
  onOpenGroup,
  onUploadAvatar,
  onDeleteAvatar,
  onDownloadAvatar,
  onAvatarExpired,
}) => {
  const activeMembership =
    student?.memberships?.find((item) => item.status === "ACTIVE" || item.status === "UPCOMING") ?? null;
  const resolvedCurrentGroup = student
    ? activeMembership
      ? {
          id: activeMembership.group.id,
          name: activeMembership.group.name,
          coachName: student.currentGroup?.id === activeMembership.group.id ? student.currentGroup.coachName : null,
          scheduleLabel: student.currentGroup?.id === activeMembership.group.id ? student.currentGroup.scheduleLabel : null,
          nextSessionAt: student.currentGroup?.id === activeMembership.group.id ? student.currentGroup.nextSessionAt : null,
        }
      : student.memberships
      ? null
      : student.currentGroup
    : null;

  return (
    <ModalShell
    title={student?.player.fullName ?? "Карточка ученика"}
    description={student ? `${student.client.fullName} · ${student.client.phone}` : "Загрузка карточки ученика"}
    eyebrow="Ученик"
    onClose={onClose}
    maxWidthClassName="max-w-5xl"
    footer={
      student ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {student.currentContract ? (
              <Button type="button" onClick={() => onAddPayment(student.currentContract!.id)}>
                <CreditCardIcon className="h-4 w-4" />
                Добавить оплату
              </Button>
            ) : null}
            {student.currentContract ? (
              <Button type="button" variant="secondary" onClick={() => onOpenContract(student.currentContract!.id)}>
                <DocumentTextIcon className="h-4 w-4" />
                Открыть договор
              </Button>
            ) : null}
            {resolvedCurrentGroup ? (
              <Button type="button" variant="secondary" onClick={() => onOpenGroup(resolvedCurrentGroup.id)}>
                <UserGroupIcon className="h-4 w-4" />
                Открыть группу
              </Button>
            ) : null}
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      ) : null
    }
  >
    {loading || !student ? (
      <LoadingState label="Загрузка карточки..." />
    ) : (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px_1fr]">
          <StudentPhotoPanel
            student={student}
            onUploadAvatar={onUploadAvatar}
            onDeleteAvatar={onDeleteAvatar}
            onDownloadAvatar={onDownloadAvatar}
            onAvatarExpired={onAvatarExpired}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <SummaryTile label="Остаток" value={formatAmount(student.currentContract?.outstandingAmount, student.currentContract?.currency)} icon={<CreditCardIcon className="h-5 w-5" />} />
            <SummaryTile label="Оплачено" value={formatAmount(student.currentContract?.paidAmount, student.currentContract?.currency)} />
            <SummaryTile label="Договор до" value={formatDate(student.currentContract?.endDate)} icon={<DocumentTextIcon className="h-5 w-5" />} />
            <SummaryTile label="Посещаемость" value={student.attendanceSummary?.attendanceRate == null ? "—" : `${student.attendanceSummary.attendanceRate}%`} icon={<CalendarDaysIcon className="h-5 w-5" />} />
          </div>
        </div>

        {student.risks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {student.risks.map((item) => (
              <RiskBadge key={item.code} risk={item} />
            ))}
          </div>
        ) : null}

        <Panel title="Клиент">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-4">
            <MiniStat label="Имя" value={student.client.fullName} />
            <MiniStat label="Телефон" value={student.client.phone || "Не указан"} />
            <MiniStat label="Email" value={student.client.email || "Не указан"} />
            <MiniStat label="Статус" value={clientStatusLabel(student.client.status)} />
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Текущий договор">
            {student.currentContract ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="text-base font-semibold text-slate-900">{student.currentContract.contractNumber}</div>
                <div>{contractStatusLabel(student.currentContract.status)} · {formatDate(student.currentContract.startDate)} - {formatDate(student.currentContract.endDate)}</div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Сумма" value={formatAmount(student.currentContract.amount, student.currentContract.currency)} />
                  <MiniStat label="Оплачено" value={formatAmount(student.currentContract.paidAmount, student.currentContract.currency)} />
                  <MiniStat label="Остаток" value={formatAmount(student.currentContract.outstandingAmount, student.currentContract.currency)} />
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentBadgeClassName(student.currentContract.paymentStatus)}`}>
                  {paymentStatusLabel(student.currentContract.paymentStatus)}
                </span>
              </div>
            ) : (
              <EmptyState title="Договор не найден" description="У ученика нет текущего активного или ближайшего договора." />
            )}
          </Panel>

          <Panel title="Текущее участие">
            {resolvedCurrentGroup ? (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-slate-900">{resolvedCurrentGroup.name}</div>
                  {activeMembership ? (
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${membershipStatusClassName(activeMembership.status)}`}>
                      {membershipStatusLabel(activeMembership.status)}
                    </span>
                  ) : null}
                </div>
                <div>Тренер: {resolvedCurrentGroup.coachName || "Не указан"}</div>
                <div>Расписание: {resolvedCurrentGroup.scheduleLabel || "Не указано"}</div>
                <div>Следующее занятие: {formatDateTime(resolvedCurrentGroup.nextSessionAt)}</div>
                {activeMembership ? (
                  <div>В группе с: {formatDate(activeMembership.joinedAt)}</div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="Нет активного участия" description="Текущая группа определяется по активному membership, а не по договору." />
            )}
          </Panel>
        </div>

        <Panel title="История групп">
          {(student.memberships ?? []).length === 0 ? (
            <EmptyState title="История участия пока пуста" description="Здесь появятся переводы, исключения и текущее участие ученика в группах." />
          ) : (
            <div className="space-y-2">
              {(student.memberships ?? []).map((membership) => (
                <MembershipHistoryRow key={membership.membershipId} membership={membership} />
              ))}
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Последние платежи">
            {student.recentPayments.length === 0 ? (
              <EmptyState title="Платежей пока нет" />
            ) : (
              <div className="space-y-2">
                {student.recentPayments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{formatAmount(payment.amount, payment.currency)}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(payment.paidAt)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {paymentMethodLabel(payment.method)} · {paymentRecordStatusLabel(payment.status)}
                      {payment.comment ? ` · ${payment.comment}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Последние занятия">
            {student.recentAttendance.length === 0 ? (
              <EmptyState title="Посещаемости пока нет" />
            ) : (
              <div className="space-y-2">
                {student.recentAttendance.map((item) => (
                  <div key={item.sessionId} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{attendanceLabel(item.status)}</div>
                      <div className="text-xs text-slate-500">{formatDate(item.date)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.groupName}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    )}
  </ModalShell>
  );
};

const MembershipHistoryRow: React.FC<{ membership: AdminStudentMembershipHistoryItem }> = ({ membership }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="font-semibold text-slate-900">{membership.group.name}</div>
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${membershipStatusClassName(membership.status)}`}>
        {membershipStatusLabel(membership.status)}
      </span>
    </div>
    <div className="mt-1 text-xs text-slate-500">
      {formatDate(membership.joinedAt)} - {membership.leftAt ? formatDate(membership.leftAt) : "по настоящее время"}
    </div>
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
      {membership.joinReason ? <span>Вход: {membership.joinReason}</span> : null}
      {membership.leaveReason ? <span>Выход: {membership.leaveReason}</span> : null}
    </div>
    {membership.comment ? <div className="mt-2 text-xs text-slate-600">{membership.comment}</div> : null}
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "info" | "success" | "warning" | "danger";
}> = ({
  icon,
  label,
  value,
  tone = "info",
}) => {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
      ? "bg-orange-50 text-orange-700"
      : tone === "danger"
      ? "bg-rose-50 text-rose-700"
      : "bg-indigo-50 text-indigo-700";

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold leading-tight text-slate-950">{value}</div>
        <div className="mt-1 text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
};

const SummaryTile: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex items-center justify-between gap-3 text-slate-500">
      <div className="text-xs font-medium uppercase">{label}</div>
      {icon}
    </div>
    <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="text-[11px] font-medium uppercase text-slate-400">{label}</div>
    <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

const RiskBadge: React.FC<{ risk: StudentRisk }> = ({ risk }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskClassName(risk.severity)}`}>
    {riskLabel(risk)}
  </span>
);

export default StudentsPage;
