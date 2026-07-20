import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { NavLink, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  PhotoIcon,
  TrashIcon,
  UserIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage, resolveApiUrl } from "../../../shared/api";
import type { MediaAsset } from "../../../shared/media.types";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ModalShell,
  PageShell,
  SectionCard,
  formControlClassName,
} from "../../../shared/ui";
import { StudentApi } from "./student.api";
import StudentMembershipDrawers from "./StudentMembershipDrawers";
import StudentAttendanceTab from "./StudentAttendanceTab";
import StudentContractsTab from "./StudentContractsTab";
import type {
  AdminStudentDetails,
  AdminStudentAttendanceResponse,
  AdminStudentMembershipHistoryItem,
  StudentRisk,
} from "./student.types";

const sections = [
  { key: "overview", label: "Обзор" },
  { key: "groups", label: "Группы" },
  { key: "attendance", label: "Посещаемость" },
  { key: "contracts", label: "Договоры" },
  { key: "activity", label: "Активность" },
] as const;

type StudentSection = (typeof sections)[number]["key"];

const isStudentSection = (value?: string): value is StudentSection =>
  sections.some((item) => item.key === value);

const formatDate = (value?: string | null) => {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
};

const formatAmount = (value?: number | null, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU").format(Number(value ?? 0))} ${currency}`;

const toLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const lastThirtyDays = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toLocalDate(from), to: toLocalDate(to) };
};

const getAvatarUrl = (avatar?: MediaAsset | null) =>
  avatar?.mediumUrl || avatar?.originalUrl || avatar?.thumbUrl || undefined;

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "У";

const membershipLabel = (status: string) => {
  const labels: Record<string, string> = {
    ACTIVE: "Активно",
    UPCOMING: "Скоро начнётся",
    TRANSFERRED: "Переведён",
    COMPLETED: "Завершено",
    REMOVED: "Исключён",
  };
  return labels[status] ?? status;
};

const membershipClassName = (status: string) => {
  if (status === "ACTIVE") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "UPCOMING") return "border-cyan-100 bg-cyan-50 text-cyan-700";
  if (status === "REMOVED") return "border-rose-100 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const attendanceLabel = (status: AdminStudentDetails["recentAttendance"][number]["status"]) => {
  const labels = {
    PRESENT: "Присутствовал",
    ABSENT: "Отсутствовал",
    LATE: "Опоздал",
    EXCUSED: "Уважительная причина",
  };
  return labels[status];
};

const attendanceClassName = (status: AdminStudentDetails["recentAttendance"][number]["status"]) => {
  if (status === "PRESENT") return "bg-emerald-500";
  if (status === "LATE" || status === "EXCUSED") return "bg-amber-500";
  return "bg-rose-500";
};

const riskIconClassName = (risk: StudentRisk) =>
  risk.severity === "CRITICAL"
    ? "bg-rose-50 text-rose-700"
    : risk.severity === "WARNING"
    ? "bg-amber-50 text-amber-700"
    : "bg-cyan-50 text-cyan-700";

interface StudentActivityItem {
  id: string;
  date: string;
  title: string;
  description: string;
  tone: string;
  to?: string;
}

const StudentAvatar: React.FC<{
  name: string;
  avatar?: MediaAsset | null;
  onError?: () => void;
}> = ({ name, avatar, onError }) => {
  const [failed, setFailed] = useState(false);
  const url = getAvatarUrl(avatar);

  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={resolveApiUrl(url)}
        alt={name}
        className="h-28 w-28 shrink-0 rounded-lg border border-slate-200 object-cover sm:h-32 sm:w-32"
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
    );
  }

  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-admin-100 bg-admin-50 text-xl font-semibold text-admin-800 sm:h-32 sm:w-32">
      {getInitials(name)}
    </div>
  );
};

const MembershipRow: React.FC<{
  membership: AdminStudentMembershipHistoryItem;
  onOpen: () => void;
  onTransfer?: () => void;
  onRemove?: () => void;
}> = ({ membership, onOpen, onTransfer, onRemove }) => (
  <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {getAvatarUrl(membership.group.avatar) ? (
        <img
          src={resolveApiUrl(getAvatarUrl(membership.group.avatar)!)}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
          {getInitials(membership.group.name)}
        </span>
      )}
      <div className="min-w-0">
        <button type="button" onClick={onOpen} className="truncate text-left text-sm font-semibold text-slate-950 transition hover:text-admin-700">
          {membership.group.name}
        </button>
        <div className="mt-1 text-xs text-slate-500">
          {formatDate(membership.joinedAt)} — {membership.leftAt ? formatDate(membership.leftAt) : "по настоящее время"}
        </div>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${membershipClassName(membership.status)}`}>
        {membershipLabel(membership.status)}
      </span>
      {onTransfer ? <Button type="button" size="sm" variant="ghost" rounded="rounded-lg" onClick={onTransfer}><ArrowsRightLeftIcon className="h-4 w-4" /> Перевести</Button> : null}
      {onRemove ? <Button type="button" size="sm" variant="ghost" rounded="rounded-lg" className="text-rose-700 hover:bg-rose-50 hover:text-rose-900" onClick={onRemove}><TrashIcon className="h-4 w-4" /> Исключить</Button> : null}
      <button type="button" onClick={onOpen} aria-label={`Открыть группу ${membership.group.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-admin-700">
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const ActivityTimeline: React.FC<{
  items: StudentActivityItem[];
  onNavigate: (to: string) => void;
}> = ({ items, onNavigate }) => (
  <div className="divide-y divide-slate-100">
    {items.map((item) => {
      const content = (
        <>
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
          </span>
          <span className="shrink-0 text-xs text-slate-400">{formatDate(item.date)}</span>
          {item.to ? <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
        </>
      );
      return item.to ? (
        <button key={item.id} type="button" onClick={() => onNavigate(item.to!)} className="flex w-full gap-3 py-3 text-left transition hover:bg-slate-50 first:pt-0 last:pb-0">
          {content}
        </button>
      ) : (
        <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">{content}</div>
      );
    })}
  </div>
);

const attendanceBarClassName = (status: AdminStudentAttendanceResponse["items"][number]["attendanceStatus"]) => {
  if (status === "PRESENT") return "h-[78%] bg-emerald-400";
  if (status === "LATE") return "h-[48%] bg-orange-400";
  if (status === "ABSENT") return "h-[28%] bg-rose-400";
  if (status === "EXCUSED") return "h-[42%] bg-amber-300";
  return "h-[58%] bg-slate-200";
};

const FinancialOverview: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="text-[10px] text-slate-500">{label}</div>
    <div className="mt-1 truncate text-xs font-semibold text-slate-950">{value}</div>
  </div>
);

const StudentDetailsPage: React.FC = () => {
  const { playerId, section } = useParams<{ playerId: string; section: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [student, setStudent] = useState<AdminStudentDetails | null>(null);
  const [overviewAttendance, setOverviewAttendance] = useState<AdminStudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", birthDate: "", position: "" });

  const loadStudent = async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      const attendanceRange = lastThirtyDays();
      const [details, memberships, attendance] = await Promise.all([
        StudentApi.get(playerId),
        StudentApi.getMemberships(playerId).catch(() => null),
        StudentApi.getAttendance(playerId, attendanceRange).catch(() => null),
      ]);
      setStudent({ ...details, memberships: memberships?.items ?? [] });
      setOverviewAttendance(attendance);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось загрузить данные ученика"));
      setStudent(null);
      setOverviewAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudent();
  }, [playerId]);

  useEffect(() => {
    if (!student) return;
    const nameParts = student.player.fullName.trim().split(/\s+/);
    setEditForm({
      firstName: student.player.firstName ?? nameParts[0] ?? "",
      lastName: student.player.lastName ?? nameParts.slice(1).join(" "),
      birthDate: student.player.birthDate ?? "",
      position: student.player.position ?? "",
    });
  }, [student]);

  const activeSection = isStudentSection(section) ? section : null;
  const sectionPath = (next: StudentSection) => `/admin/students/${playerId}/${next}`;
  const memberships = student?.memberships ?? [];
  const currentMemberships = memberships.filter((item) => item.status === "ACTIVE" || item.status === "UPCOMING");
  const historicalMemberships = memberships.filter((item) => item.status !== "ACTIVE" && item.status !== "UPCOMING");
  const contract = student?.currentContract;
  const nextSessionAt = student?.currentGroup?.nextSessionAt;
  const nextSessionId = student?.currentGroup?.nextSessionId;
  const activeDrawer = searchParams.get("drawer");
  const drawerOpen = activeDrawer === "student-photo";
  const editDrawerOpen = activeDrawer === "edit-student";
  const deleteConfirmOpen = drawerOpen && searchParams.get("confirm") === "delete-avatar";
  const canEditStudent = student?.capabilities?.canEdit ?? true;
  const canManageAvatar = student?.capabilities?.canManageAvatar ?? true;

  const openDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "student-photo");
    setSearchParams(next);
  };

  const openEditDrawer = () => {
    if (student) {
      const nameParts = student.player.fullName.trim().split(/\s+/);
      setEditForm({
        firstName: student.player.firstName ?? nameParts[0] ?? "",
        lastName: student.player.lastName ?? nameParts.slice(1).join(" "),
        birthDate: student.player.birthDate ?? "",
        position: student.player.position ?? "",
      });
    }
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "edit-student");
    next.delete("confirm");
    setEditError(null);
    setSearchParams(next);
  };

  const openMembershipDrawer = (drawer: "add-to-group" | "transfer-membership" | "remove-membership", membershipId?: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", drawer);
    next.delete("confirm");
    if (membershipId) next.set("membershipId", membershipId);
    else next.delete("membershipId");
    setSearchParams(next);
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("drawer");
    next.delete("confirm");
    setSearchParams(next, { replace: true });
  };

  const uploadAvatar = async (file?: File) => {
    if (!playerId || !file) return;
    setAvatarSaving(true);
    try {
      await StudentApi.uploadAvatar(playerId, file);
      await loadStudent();
      toast.success("Фото ученика обновлено");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось загрузить фото"));
    } finally {
      setAvatarSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteAvatar = async () => {
    if (!playerId) return;
    setAvatarSaving(true);
    try {
      await StudentApi.deleteAvatar(playerId);
      await loadStudent();
      closeDrawer();
      toast.success("Фото ученика удалено");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось удалить фото"));
    } finally {
      setAvatarSaving(false);
    }
  };

  const saveStudent = async () => {
    if (!playerId) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setEditError("Укажите имя и фамилию ученика");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await StudentApi.update(playerId, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        birthDate: editForm.birthDate || null,
        position: editForm.position.trim() || null,
      });
      setStudent((current) => ({ ...updated, memberships: current?.memberships ?? [] }));
      closeDrawer();
      toast.success("Данные ученика обновлены");
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Не удалось обновить данные ученика"));
    } finally {
      setEditSaving(false);
    }
  };

  const activityItems = useMemo<StudentActivityItem[]>(() => {
    if (!student) return [];
    return [
      ...student.recentAttendance.map((item) => ({
        id: `attendance-${item.sessionId}`,
        date: item.date,
        title: attendanceLabel(item.status),
        description: `${item.groupName} · занятие`,
        tone: attendanceClassName(item.status),
        to: undefined,
      })),
      ...student.recentPayments.map((item) => ({
        id: `payment-${item.id}`,
        date: item.paidAt,
        title: `Платёж ${formatAmount(item.amount, item.currency)}`,
        description: item.comment || "Оплата по договору",
        tone: "bg-cyan-500",
        to: contract ? `/admin/contracts?contractId=${encodeURIComponent(contract.id)}&mode=view` : sectionPath("contracts"),
      })),
      ...memberships.map((item) => ({
        id: `membership-${item.membershipId}`,
        date: item.joinedAt,
        title: `${membershipLabel(item.status)} · ${item.group.name}`,
        description: item.comment || item.joinReason || "Изменение участия в группе",
        tone: "bg-slate-400",
        to: `/admin/groups/${item.group.id}/overview`,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, activeSection === "activity" ? 20 : 6);
  }, [activeSection, contract, memberships, student]);

  if (section && !activeSection) return <Navigate to={sectionPath("overview")} replace />;

  if (loading) {
    return <PageShell><LoadingState label="Загрузка ученика..." /></PageShell>;
  }

  if (error) {
    return <PageShell><ErrorState message={error} onRetry={loadStudent} /></PageShell>;
  }

  if (!student) {
    return <PageShell><ErrorState message="Ученик не найден" /></PageShell>;
  }

  const phoneHref = student.client.phone ? `tel:${student.client.phone.replace(/[^+\d]/g, "")}` : undefined;
  const statusActive = currentMemberships.length > 0 || contract?.status === "ACTIVE";
  const attendanceItems = overviewAttendance?.items ?? [];
  const attendanceSummary = overviewAttendance?.summary ?? student.attendanceSummary;
  const openRisk = (risk: StudentRisk) => {
    if (risk.code === "NO_GROUP") {
      openMembershipDrawer("add-to-group");
      return;
    }
    if (risk.code === "LOW_ATTENDANCE") {
      navigate(sectionPath("attendance"));
      return;
    }
    navigate(sectionPath("contracts"));
  };

  return (
    <PageShell className="max-w-none space-y-5 px-0 pb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => navigate("/admin/students")} className="font-medium text-slate-500 transition hover:text-admin-700">Ученики</button>
          <ChevronRightIcon className="h-4 w-4 text-slate-300" />
          <span className="font-semibold text-slate-950">{student.player.fullName}</span>
        </div>
        <Button type="button" variant="secondary" rounded="rounded-md" onClick={() => void loadStudent()}>
          <ArrowPathIcon className="h-4 w-4" /> Обновить данные
        </Button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px] xl:divide-x xl:divide-slate-200">
          <div className="flex min-w-0 gap-4 xl:pr-5">
            <button
              type="button"
              onClick={canManageAvatar ? openDrawer : undefined}
              disabled={!canManageAvatar}
              className={`group relative shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-200 ${canManageAvatar ? "cursor-pointer" : "cursor-default"}`}
              aria-label="Изменить фото ученика"
            >
              <StudentAvatar name={student.player.fullName} avatar={student.player.avatar} onError={() => void loadStudent()} />
              {canManageAvatar ? <span className="absolute inset-x-1 bottom-1 rounded-lg bg-slate-950/75 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">Изменить</span> : null}
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="w-full break-words text-2xl font-semibold leading-tight text-slate-950 sm:w-auto sm:text-[28px]">{student.player.fullName}</h1>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusActive ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {statusActive ? "Активный ученик" : "Без активного участия"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                <span>{student.player.age == null ? "Возраст не указан" : `${student.player.age} лет`}</span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(student.player.birthDate)}</span>
                {student.player.position ? <><span aria-hidden="true">·</span><span>{student.player.position}</span></> : null}
                <span aria-hidden="true">·</span>
                <span>{currentMemberships.length} активных групп</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-700"><UserIcon className="h-4 w-4 text-slate-400" />{student.client.fullName}</span>
                {phoneHref ? <a href={phoneHref} className="inline-flex items-center gap-2 font-medium text-admin-700 hover:text-admin-900"><PhoneIcon className="h-4 w-4" />{student.client.phone}</a> : null}
              </div>
              {student.client.email ? <div className="mt-2 truncate text-sm text-slate-500">Email: <span className="font-medium text-slate-700">{student.client.email}</span></div> : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 xl:border-t-0 xl:pl-5 xl:pt-0">
            {canEditStudent ? <Button type="button" rounded="rounded-md" onClick={openEditDrawer}>
              <UserIcon className="h-4 w-4" /> Редактировать ученика
            </Button> : null}
            <Button type="button" rounded="rounded-md" variant="secondary" onClick={() => openMembershipDrawer("add-to-group")}>
              <UserPlusIcon className="h-4 w-4" /> Добавить в группу
            </Button>
            {contract ? (
              <Button type="button" rounded="rounded-md" variant="secondary" onClick={() => navigate(`/admin/contracts?contractId=${encodeURIComponent(contract.id)}&mode=view`)}>
                <DocumentTextIcon className="h-4 w-4" /> Открыть договор
              </Button>
            ) : <Button type="button" rounded="rounded-md" variant="secondary" onClick={() => navigate("/admin/contracts")}><DocumentTextIcon className="h-4 w-4" /> Создать договор</Button>}
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-10 flex gap-6 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-1 backdrop-blur">
        {sections.map((item) => (
          <NavLink key={item.key} to={sectionPath(item.key)} className={({ isActive }) => `shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${isActive ? "border-admin-700 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {activeSection === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-12">
            <section className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-4">
              <h2 className="text-sm font-semibold text-slate-950">Текущие группы</h2>
              <div className="mt-3 space-y-2">
                {currentMemberships.slice(0, 3).map((item) => (
                  <div key={item.membershipId} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center gap-3">
                      {getAvatarUrl(item.group.avatar) ? <img src={resolveApiUrl(getAvatarUrl(item.group.avatar)!)} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-admin-50 text-xs font-semibold text-admin-700">{getInitials(item.group.name)}</span>}
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-950">{item.group.name}</div><div className="mt-0.5 truncate text-xs text-slate-500">{student.currentGroup?.id === item.group.id ? student.currentGroup.coachName || "Тренер не указан" : "Активное участие"}</div></div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Активно</span>
                    </div>
                    <div className="mt-3 flex justify-end"><Button size="sm" variant="secondary" rounded="rounded-md" onClick={() => navigate(`/admin/groups/${item.group.id}/overview`)}>Открыть группу</Button></div>
                  </div>
                ))}
                {currentMemberships.length === 0 ? <EmptyState title="Нет активных групп" /> : null}
              </div>
              <NavLink to={sectionPath("groups")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-admin-700">История участия в группах <ChevronRightIcon className="h-4 w-4" /></NavLink>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-3">
              <h2 className="text-sm font-semibold text-slate-950">Следующее занятие</h2>
              {nextSessionAt && student.currentGroup ? (
                <div className="mt-5 flex h-[calc(100%-2.25rem)] flex-col">
                  <div className="flex items-center gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-center"><span><span className="block text-xs capitalize text-slate-500">{new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(new Date(nextSessionAt))}</span><span className="mt-1 block text-3xl font-semibold text-slate-950">{new Date(nextSessionAt).getDate()}</span></span></div>
                    <div className="min-w-0"><div className="font-semibold text-slate-950">{formatTime(nextSessionAt)}</div><div className="mt-1 truncate text-sm font-semibold text-slate-800">{student.currentGroup.name}</div><div className="mt-2 text-xs text-slate-500">Тренер: {student.currentGroup.coachName || "не указан"}</div></div>
                  </div>
                  <Button
                    className="mt-auto"
                    size="sm"
                    variant="secondary"
                    rounded="rounded-md"
                    onClick={() => {
                      if (nextSessionId) {
                        navigate(`/admin/groups/${student.currentGroup!.id}/sessions/${nextSessionId}`);
                        return;
                      }
                      navigate(`/admin/groups/${student.currentGroup!.id}/schedule`);
                    }}
                  >
                    Открыть занятие
                  </Button>
                </div>
              ) : <EmptyState title="Занятие не запланировано" />}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-2">
              <h2 className="text-sm font-semibold text-slate-950">Требует внимания</h2>
              <div className="mt-3 space-y-2">
                {student.risks.slice(0, 4).map((risk) => <button key={risk.code} type="button" onClick={() => openRisk(risk)} className="flex w-full items-start gap-2 rounded-md border border-slate-200 p-2.5 text-left transition hover:border-amber-200 hover:bg-amber-50"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${riskIconClassName(risk)}`}><ExclamationTriangleIcon className="h-4 w-4" /></span><span className="text-xs font-medium leading-5 text-slate-700">{risk.label}</span></button>)}
                {student.risks.length === 0 ? <div className="flex items-center gap-2 py-3 text-xs text-emerald-700"><CheckCircleIcon className="h-5 w-5" /> Всё в порядке</div> : null}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-3 xl:row-span-2">
              <h2 className="text-sm font-semibold text-slate-950">Последняя активность</h2>
              <div className="mt-3">{activityItems.length ? <ActivityTimeline items={activityItems} onNavigate={navigate} /> : <EmptyState title="Событий пока нет" />}</div>
              <NavLink to={sectionPath("activity")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-admin-700">Вся активность <ChevronRightIcon className="h-4 w-4" /></NavLink>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-5">
              <h2 className="text-sm font-semibold text-slate-950">Посещаемость за последние 30 дней</h2>
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div><div className="text-2xl font-semibold text-slate-950">{attendanceSummary?.attendanceRate ?? 0}%</div><div className="text-[11px] text-slate-500">Средняя</div></div>
                <div><div className="text-base font-semibold text-slate-950">{overviewAttendance?.summary.presentCount ?? student.attendanceSummary?.presentCount ?? 0}</div><div className="text-[11px] text-slate-500">Посещено</div></div>
                <div><div className="text-base font-semibold text-slate-950">{overviewAttendance?.summary.lateCount ?? student.attendanceSummary?.lateCount ?? 0}</div><div className="text-[11px] text-slate-500">Опозданий</div></div>
                <div><div className="text-base font-semibold text-slate-950">{overviewAttendance?.summary.absentCount ?? student.attendanceSummary?.absentCount ?? 0}</div><div className="text-[11px] text-slate-500">Пропущено</div></div>
              </div>
              <div className="mt-4 flex h-20 items-end gap-1.5 overflow-hidden">
                {attendanceItems.slice(-24).map((item) => <div key={item.sessionId} title={`${formatDate(item.sessionDate)} · ${item.attendanceStatus}`} className="flex h-full min-w-1 flex-1 items-end"><span className={`block w-full rounded-sm ${attendanceBarClassName(item.attendanceStatus)}`} /></div>)}
                {attendanceItems.length === 0 ? <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Нет занятий за период</div> : null}
              </div>
              <NavLink to={sectionPath("attendance")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-admin-700">Открыть полную посещаемость <ChevronRightIcon className="h-4 w-4" /></NavLink>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 xl:col-span-4">
              <h2 className="text-sm font-semibold text-slate-950">Договор</h2>
              {contract ? <div className="mt-3 rounded-md border border-slate-200 p-3"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-950">{contract.contractNumber}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Активен</span></div><div className="mt-1 text-xs text-slate-500">{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</div><div className="mt-4 grid grid-cols-3 gap-3"><FinancialOverview label="Сумма" value={formatAmount(contract.amount, contract.currency)} /><FinancialOverview label="Оплачено" value={formatAmount(contract.paidAmount, contract.currency)} /><FinancialOverview label="Остаток" value={formatAmount(contract.outstandingAmount, contract.currency)} /></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${contract.amount ? Math.min(100, Math.round((contract.paidAmount / contract.amount) * 100)) : 0}%` }} /></div><Button className="mt-3" size="sm" variant="secondary" rounded="rounded-md" onClick={() => navigate(`/admin/contracts?contractId=${encodeURIComponent(contract.id)}&mode=view`)}>Открыть договор</Button></div> : <EmptyState title="Нет активного договора" />}
              <NavLink to={sectionPath("contracts")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-admin-700">Все договоры <ChevronRightIcon className="h-4 w-4" /></NavLink>
            </section>
          </div>
        </div>
      ) : null}

      {activeSection === "groups" ? (
        <div className="space-y-4">
          <SectionCard title="Текущие группы">
            <div className="mb-4 flex justify-end"><Button type="button" size="sm" rounded="rounded-md" onClick={() => openMembershipDrawer("add-to-group")}><UserPlusIcon className="h-4 w-4" /> Добавить в группу</Button></div>
            {currentMemberships.length ? <div className="divide-y divide-slate-100">{currentMemberships.map((item) => {
              const canTransfer = item.capabilities?.canTransfer === true;
              const canRemove = item.capabilities?.canRemove === true;
              return <MembershipRow key={item.membershipId} membership={item} onOpen={() => navigate(`/admin/groups/${item.group.id}/overview`)} onTransfer={canTransfer ? () => openMembershipDrawer("transfer-membership", item.membershipId) : undefined} onRemove={canRemove ? () => openMembershipDrawer("remove-membership", item.membershipId) : undefined} />;
            })}</div> : <EmptyState title="Нет активных групп" />}
          </SectionCard>
          <SectionCard title="История участия">
            {historicalMemberships.length ? <div className="divide-y divide-slate-100">{historicalMemberships.map((item) => <MembershipRow key={item.membershipId} membership={item} onOpen={() => navigate(`/admin/groups/${item.group.id}/overview`)} />)}</div> : <EmptyState title="История пока пуста" />}
          </SectionCard>
        </div>
      ) : null}

      {activeSection === "attendance" ? (
        <StudentAttendanceTab playerId={student.player.id} memberships={memberships} />
      ) : null}

      {activeSection === "contracts" ? (
        <StudentContractsTab playerId={student.player.id} />
      ) : null}

      {activeSection === "activity" ? (
        <SectionCard title="Активность ученика">
          {activityItems.length ? <ActivityTimeline items={activityItems} onNavigate={navigate} /> : <EmptyState title="Активность пока пуста" />}
        </SectionCard>
      ) : null}

      {editDrawerOpen ? (
        <ModalShell
          title="Редактировать ученика"
          description="Основная информация профиля ученика"
          eyebrow="Ученик"
          placement="right"
          maxWidthClassName="max-w-lg"
          onClose={closeDrawer}
          closeDisabled={editSaving}
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" rounded="rounded-md" onClick={closeDrawer} disabled={editSaving}>Отмена</Button><Button rounded="rounded-md" onClick={() => void saveStudent()} isLoading={editSaving} disabled={!editForm.firstName.trim() || !editForm.lastName.trim()}>Сохранить</Button></div>}
        >
          <div className="space-y-6">
            {editError ? <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />{editError}</div> : null}

            <section>
              <div className="mb-3 text-xs font-semibold uppercase text-slate-500">Фото профиля</div>
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <StudentAvatar name={student.player.fullName} avatar={student.player.avatar} />
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-950">{student.player.fullName}</div><div className="mt-1 text-xs text-slate-500">Фото управляется отдельно от персональных данных.</div></div>
                {canManageAvatar ? <Button size="sm" variant="secondary" rounded="rounded-md" onClick={openDrawer}><PhotoIcon className="h-4 w-4" /> Изменить</Button> : null}
              </div>
            </section>

            <section className="space-y-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Основная информация</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Имя</span><input value={editForm.firstName} maxLength={100} onChange={(event) => setEditForm((current) => ({ ...current, firstName: event.target.value }))} className={formControlClassName} autoFocus /></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Фамилия</span><input value={editForm.lastName} maxLength={100} onChange={(event) => setEditForm((current) => ({ ...current, lastName: event.target.value }))} className={formControlClassName} /></label>
              </div>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Дата рождения</span><input type="date" value={editForm.birthDate} max={toLocalDate(new Date())} onChange={(event) => setEditForm((current) => ({ ...current, birthDate: event.target.value }))} className={formControlClassName} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Позиция</span><input value={editForm.position} maxLength={100} onChange={(event) => setEditForm((current) => ({ ...current, position: event.target.value }))} className={formControlClassName} placeholder="Например, вратарь или нападающий" /></label>
            </section>

            <section className="border-t border-slate-200 pt-5">
              <div className="text-xs font-semibold uppercase text-slate-500">Родитель</div>
              <div className="mt-3 text-sm font-semibold text-slate-950">{student.client.fullName}</div>
              <div className="mt-1 text-sm text-slate-500">{student.client.phone}{student.client.email ? ` · ${student.client.email}` : ""}</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Контакты принадлежат профилю родителя и не изменяются вместе с данными ученика.</p>
            </section>
          </div>
        </ModalShell>
      ) : null}

      {drawerOpen ? (
        <ModalShell title="Фото ученика" description="Обновите фотографию профиля" eyebrow="Ученик" placement="right" maxWidthClassName="max-w-lg" onClose={closeDrawer} closeDisabled={avatarSaving} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={closeDrawer} disabled={avatarSaving}>Закрыть</Button><Button onClick={() => fileInputRef.current?.click()} isLoading={avatarSaving}><PhotoIcon className="h-4 w-4" /> Загрузить фото</Button></div>}>
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><StudentAvatar name={student.player.fullName} avatar={student.player.avatar} /><div><div className="text-sm font-semibold text-slate-950">{student.player.fullName}</div><div className="mt-1 text-xs leading-5 text-slate-500">Используйте портретное фото с хорошо различимым лицом.</div></div></div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
            {student.player.avatar ? <button type="button" disabled={avatarSaving} onClick={() => { const next = new URLSearchParams(searchParams); next.set("drawer", "student-photo"); next.set("confirm", "delete-avatar"); setSearchParams(next); }} className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-900"><TrashIcon className="h-4 w-4" /> Удалить текущее фото</button> : null}
            {deleteConfirmOpen ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="text-sm font-semibold text-rose-900">Удалить фотографию?</div><p className="mt-1 text-xs leading-5 text-rose-700">Вместо фотографии будут показаны инициалы ученика.</p><div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("confirm"); setSearchParams(next, { replace: true }); }} disabled={avatarSaving}>Отмена</Button><Button variant="danger" onClick={() => void deleteAvatar()} isLoading={avatarSaving}>Удалить</Button></div></div> : null}
          </div>
        </ModalShell>
      ) : null}
      <StudentMembershipDrawers playerId={student.player.id} playerName={student.player.fullName} memberships={memberships} onChanged={loadStudent} />
    </PageShell>
  );
};

export default StudentDetailsPage;
