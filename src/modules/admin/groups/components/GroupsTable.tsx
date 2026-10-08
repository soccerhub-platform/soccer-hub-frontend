import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  TriangleAlert,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { GroupOverviewItem } from "../group.api";
import GroupAvatar from "./GroupAvatar";
import { InteractiveTableRow, StatusBadge as UiStatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type StatusTone } from "../../../../shared/ui";

interface Props {
  groups: GroupOverviewItem[];
}

const GroupsTable: React.FC<Props> = ({ groups }) => {
  const navigate = useNavigate();

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        Группы не найдены
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead><ColumnTitle icon={<Users className="h-3.5 w-3.5" />} label="Группа" /></TableHead>
            <TableHead><ColumnTitle icon={<UsersRound className="h-3.5 w-3.5" />} label="Состав" /></TableHead>
            <TableHead><ColumnTitle icon={<Users className="h-3.5 w-3.5" />} label="Тренеры" /></TableHead>
            <TableHead><ColumnTitle icon={<CalendarDays className="h-3.5 w-3.5" />} label="Следующее занятие" /></TableHead>
            <TableHead><ColumnTitle icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Состояние" /></TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
        {groups.map((group) => (
          <GroupRow
            key={group.groupId}
            group={group}
            onOpen={() => navigate(`/admin/groups/${group.groupId}/overview`)}
            onOpenStudents={(event) => {
              event.stopPropagation();
              navigate(`/admin/groups/${group.groupId}/students`);
            }}
            onOpenCoaches={(event) => {
              event.stopPropagation();
              navigate(`/admin/groups/${group.groupId}/coaches`);
            }}
            onOpenSchedule={(event) => {
              event.stopPropagation();
              navigate(`/admin/groups/${group.groupId}/schedule`);
            }}
          />
        ))}
        </TableBody>
      </Table>
    </section>
  );
};

const GroupRow: React.FC<{
  group: GroupOverviewItem;
  onOpen: () => void;
  onOpenStudents: React.MouseEventHandler<HTMLButtonElement>;
  onOpenCoaches: React.MouseEventHandler<HTMLButtonElement>;
  onOpenSchedule: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ group, onOpen, onOpenStudents, onOpenCoaches, onOpenSchedule }) => {
  const capacityPercent =
    group.capacity > 0
      ? Math.round((group.studentsCount / group.capacity) * 100)
      : 0;
  const progressWidth = Math.min(100, capacityPercent);
  const isRisky = group.health !== "OK";

  return (
    <InteractiveTableRow
      onOpen={onOpen}
      className="group cursor-pointer"
    >
      <TableCell><div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <GroupAvatar name={group.name} avatar={group.avatar} />
          {isRisky ? (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-amber-700">
              <TriangleAlert className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate ui-card-title">{group.name}</h3>
            <StatusBadge status={group.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatAudience(group)}</span>
            <span>{humanizeLevel(group.level)}</span>
          </div>
        </div>
      </div></TableCell>

      <TableCell><button
        type="button"
        onClick={onOpenStudents}
        className="text-left transition hover:text-admin-600 lg:block"
      >
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-admin-600">
            <UsersRound className="h-4 w-4" />
          </span>
          <span className="lg:hidden">Состав</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 lg:block">
          <span className="ui-section-title">
            {group.studentsCount} / {group.capacity}
          </span>
          <span className="text-xs text-slate-500 lg:ml-1">учеников</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full ${capacityPercent > 100 ? "bg-rose-500" : "bg-admin-600"}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </button></TableCell>

      <TableCell><button
        type="button"
        onClick={onOpenCoaches}
        className="flex items-center justify-between gap-3 text-left transition hover:text-admin-600 lg:block"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Users className="h-4 w-4" />
          </span>
          <span className="lg:hidden">Тренеры</span>
        </div>
        <div className="ui-section-title">{formatCoaches(group.coachesCount)}</div>
      </button></TableCell>

      <TableCell><button
        type="button"
        onClick={onOpenSchedule}
        className="flex items-start justify-between gap-3 text-left transition hover:text-admin-600 lg:block"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="lg:hidden">Следующее</span>
        </div>
        <div className="ui-section-title">{formatNextSession(group.nextSessionAt)}</div>
      </button></TableCell>

      <TableCell><HealthBadge health={group.health} /></TableCell>

      <TableCell><div className="flex justify-end">
        <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-admin-600" />
      </div></TableCell>
    </InteractiveTableRow>
  );
};

const ColumnTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-slate-400">{icon}</span>
    <span>{label}</span>
  </div>
);

function formatAudience(group: GroupOverviewItem) {
  if (group.audienceType === "ADULT") return "Взрослая группа";
  if (typeof group.ageFrom === "number" && typeof group.ageTo === "number") {
    return `${group.ageFrom}-${group.ageTo} лет`;
  }
  return "Возраст не указан";
}

function formatNextSession(value: string | null) {
  if (!value) return "Не запланировано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCoaches(value: number) {
  if (value === 1) return "1 тренер";
  if (value > 1 && value < 5) return `${value} тренера`;
  return `${value} тренеров`;
}

function humanizeLevel(level: string) {
  const map: Record<string, string> = {
    BEGINNER: "Начальный",
    INTERMEDIATE: "Средний",
    ADVANCED: "Продвинутый",
    PRO: "PRO",
  };

  return map[level] ?? level;
}

const StatusBadge = ({ status }: { status: GroupOverviewItem["status"] }) => {
  const map = {
    ACTIVE: { label: "Активна", tone: "success" },
    PAUSED: { label: "На паузе", tone: "warning" },
    STOPPED: { label: "Остановлена", tone: "danger" },
  };

  const cfg = map[status];

  return <UiStatusBadge tone={cfg.tone as StatusTone}>{cfg.label}</UiStatusBadge>;
};

const HealthBadge = ({ health }: { health: GroupOverviewItem["health"] }) => {
  const map = {
    OK: {
      label: "Всё в порядке",
      icon: <CheckCircle className="h-4 w-4" />,
      tone: "success",
    },
    NO_COACH: {
      label: "Нет тренера",
      icon: <TriangleAlert className="h-4 w-4" />,
      tone: "warning",
    },
    NO_SCHEDULE: {
      label: "Нет расписания",
      icon: <TriangleAlert className="h-4 w-4" />,
      tone: "warning",
    },
    OVER_CAPACITY: {
      label: "Переполнена",
      icon: <TriangleAlert className="h-4 w-4" />,
      tone: "danger",
    },
    PAUSED: {
      label: "На паузе",
      icon: <TriangleAlert className="h-4 w-4" />,
      tone: "warning",
    },
    STOPPED: {
      label: "Остановлена",
      icon: <TriangleAlert className="h-4 w-4" />,
      tone: "danger",
    },
  } as const;
  const cfg =
    map[health] ??
    {
      label: health,
      icon: <TriangleAlert className="h-4 w-4" />,
      tone: "neutral",
    };
  return (
    <UiStatusBadge tone={cfg.tone as StatusTone} className="w-fit gap-1.5">
      {cfg.icon}
      {cfg.label}
    </UiStatusBadge>
  );
};

export default GroupsTable;
