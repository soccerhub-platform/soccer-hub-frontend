import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  UserCircleIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../../shared/api";
import { useAuth } from "../../../../shared/AuthContext";
import { Button } from "../../../../shared/ui";
import { GroupActivityItem, GroupApi } from "../group.api";

interface Props {
  groupId: string;
  limit?: number;
}

const getPayloadString = (
  payload: Record<string, unknown> | null | undefined,
  keys: string[]
) => {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
};

const enumLabel = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: "Активно",
    PAUSED: "На паузе",
    STOPPED: "Остановлена",
    ARCHIVED: "В архиве",
    MAIN: "Главный тренер",
    ASSISTANT: "Ассистент",
    COACH_UNAVAILABLE: "Тренер недоступен",
    LOCATION_UNAVAILABLE: "Площадка недоступна",
    WEATHER: "Погода",
    HOLIDAY: "Праздник",
    ADMIN_DECISION: "Решение администратора",
    SCHEDULE_CHANGE: "Смена расписания",
    PARENT_REQUEST: "Запрос родителя",
    MEDICAL: "Медицинская причина",
    OTHER: "Другое",
    IN: "В группу",
    OUT: "Из группы",
  };
  return labels[normalized] ?? value;
};

const payloadLabel = (
  payload: Record<string, unknown> | null | undefined,
  keys: string[]
) => enumLabel(getPayloadString(payload, keys));

const getActivityType = (activity: GroupActivityItem) =>
  (activity.activityType ?? activity.type ?? "").toUpperCase();

const formatDateTime = (value?: string | null) => {
  if (!value) return "Время не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const formatSessionDateTime = (value?: string | null) => {
  if (!value) return null;
  const [datePart, timePart = ""] = value.split("T");
  const date = formatDate(datePart);
  const time = timePart.slice(0, 5);
  if (!date) return value;
  return time ? `${date}, ${time}` : date;
};

const getActorName = (activity: GroupActivityItem) =>
  activity.actor?.fullName ??
  activity.actor?.name ??
  activity.actorName ??
  activity.actor?.email ??
  "Система";

const getActivityMeta = (type: string) => {
  if (type.includes("STUDENT_ADDED") || type.includes("COACH_ASSIGNED")) {
    return {
      icon: CheckCircleIcon,
      dotClassName: "bg-emerald-500",
      iconClassName: "text-emerald-600",
    };
  }

  if (type.includes("REMOVED") || type.includes("CANCELLED") || type.includes("UNASSIGNED")) {
    return {
      icon: XCircleIcon,
      dotClassName: "bg-rose-500",
      iconClassName: "text-rose-600",
    };
  }

  if (type.includes("SESSION") || type.includes("ATTENDANCE")) {
    return {
      icon: CalendarDaysIcon,
      dotClassName: "bg-cyan-600",
      iconClassName: "text-cyan-700",
    };
  }

  if (type.includes("GROUP")) {
    return {
      icon: PencilSquareIcon,
      dotClassName: "bg-amber-500",
      iconClassName: "text-amber-600",
    };
  }

  if (type.includes("STUDENT")) {
    return {
      icon: UserGroupIcon,
      dotClassName: "bg-blue-500",
      iconClassName: "text-blue-600",
    };
  }

  return {
    icon: ClockIcon,
    dotClassName: "bg-slate-400",
    iconClassName: "text-slate-500",
  };
};

const buildActivityText = (activity: GroupActivityItem) => {
  const type = getActivityType(activity);
  const payload = activity.payload ?? {};
  const playerName = getPayloadString(payload, ["playerName", "studentName", "childName", "fullName"]);
  const coachName = getPayloadString(payload, ["coachName", "newCoachName", "substituteCoachName"]);
  const sourceGroup = getPayloadString(payload, ["sourceGroupName", "fromGroupName", "fromGroup"]);
  const targetGroup = getPayloadString(payload, ["targetGroupName", "toGroupName", "toGroup"]);
  const reason = payloadLabel(payload, ["reason", "reasonCode", "leaveReason"]);

  switch (type) {
    case "STUDENT_ADDED":
      return {
        title: `${playerName ?? "Ученик"} добавлен в группу`,
        detail: getPayloadString(payload, ["joinedAt"])
          ? `Дата вступления: ${formatDate(getPayloadString(payload, ["joinedAt"]))}`
          : null,
      };
    case "STUDENT_TRANSFERRED": {
      const direction = getPayloadString(payload, ["direction"]);
      const title =
        direction === "OUT"
          ? `${playerName ?? "Ученик"} переведён из группы`
          : direction === "IN"
          ? `${playerName ?? "Ученик"} переведён в группу`
          : `${playerName ?? "Ученик"} переведён`;
      return {
        title,
        detail:
          sourceGroup && targetGroup
            ? `${sourceGroup} → ${targetGroup}`
            : getPayloadString(payload, ["transferDate"])
            ? `Дата перевода: ${formatDate(getPayloadString(payload, ["transferDate"]))}`
            : null,
      };
    }
    case "STUDENT_REMOVED":
      return {
        title: `${playerName ?? "Ученик"} исключён из группы`,
        detail: reason ? `Причина: ${reason}` : null,
      };
    case "SESSION_CANCELLED":
      return {
        title: "Занятие отменено",
        detail: reason ? `Причина: ${reason}` : null,
      };
    case "SESSION_RESCHEDULED": {
      const previousStartsAt = getPayloadString(payload, ["previousStartsAt", "oldStartsAt", "fromStartsAt"]);
      const newStartsAt = getPayloadString(payload, ["newStartsAt", "startsAt", "toStartsAt"]);
      return {
        title: "Занятие перенесено",
        detail:
          previousStartsAt || newStartsAt
            ? `${formatSessionDateTime(previousStartsAt) ?? "Старое время"} → ${formatSessionDateTime(newStartsAt) ?? "Новое время"}`
            : null,
      };
    }
    case "SESSION_COACH_SUBSTITUTED":
      return {
        title: "Тренер занятия заменён",
        detail: coachName ? `Новый тренер: ${coachName}` : null,
      };
    case "ATTENDANCE_UPDATED": {
      const marked = payload.marked ?? payload.markedCount;
      const total = payload.total ?? payload.totalParticipants;
      return {
        title: "Посещаемость обновлена",
        detail:
          typeof marked === "number" && typeof total === "number"
            ? `Отмечено ${marked} из ${total}`
            : null,
      };
    }
    case "GROUP_UPDATED":
      return {
        title: "Данные группы обновлены",
        detail: null,
      };
    case "GROUP_STATUS_CHANGED": {
      const from = payloadLabel(payload, ["fromStatus", "previousStatus"]);
      const to = payloadLabel(payload, ["toStatus", "newStatus", "status"]);
      return {
        title: "Статус группы изменён",
        detail: from && to ? `${from} → ${to}` : to,
      };
    }
    case "COACH_ASSIGNED":
      return {
        title: `${coachName ?? "Тренер"} назначен в группу`,
        detail: payloadLabel(payload, ["role"]) ?? null,
      };
    case "COACH_UNASSIGNED":
      return {
        title: `${coachName ?? "Тренер"} снят с группы`,
        detail: null,
      };
    case "COACH_ROLE_CHANGED": {
      const previousRole = payloadLabel(payload, ["previousRole", "oldRole", "fromRole"]);
      const newRole = payloadLabel(payload, ["newRole", "role", "toRole"]);
      return {
        title: "Роль тренера изменена",
        detail: coachName
          ? `${coachName}${previousRole && newRole ? ` · ${previousRole} → ${newRole}` : newRole ? ` · ${newRole}` : ""}`
          : previousRole && newRole
          ? `${previousRole} → ${newRole}`
          : newRole,
      };
    }
    default:
      return {
        title: "Событие группы",
        detail: null,
      };
  }
};

const getActivityTarget = (groupId: string, activity: GroupActivityItem) => {
  const type = getActivityType(activity);
  const payload = activity.payload ?? {};
  const playerId = getPayloadString(payload, ["playerId", "studentId"]);
  const sessionId = getPayloadString(payload, ["sessionId", "trainingSessionId"]);
  const coachId = getPayloadString(payload, ["coachId", "newCoachId", "substituteCoachId"]);

  if (type === "ATTENDANCE_UPDATED" && sessionId) {
    return `/admin/groups/${groupId}/sessions/${sessionId}/attendance`;
  }

  if (type.includes("SESSION") && sessionId) {
    return `/admin/groups/${groupId}/sessions/${sessionId}`;
  }

  if (type.includes("STUDENT") && playerId) {
    return `/admin/students/${playerId}`;
  }

  if (type.includes("COACH") && coachId) {
    return `/admin/coaches/${coachId}`;
  }

  return null;
};

const GroupActivityTimeline: React.FC<Props> = ({ groupId, limit = 5 }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();

  const [items, setItems] = useState<GroupActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = async () => {
    if (!token || !groupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await GroupApi.getActivity(groupId, { page: 0, size: limit }, token);
      setItems(data.content ?? []);
    } catch (e) {
      console.error("Failed to load group activity", e);
      setError(getApiErrorMessage(e, "Не удалось загрузить активность"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, [groupId, limit, token]);

  const renderedItems = useMemo(() => items.slice(0, limit), [items, limit]);

  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse bg-slate-50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-rose-700">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={loadActivity}>
          <ArrowPathIcon className="h-4 w-4" />
          Повторить
        </Button>
      </div>
    );
  }

  if (!renderedItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        По группе пока нет действий.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {renderedItems.map((activity, index) => {
        const type = getActivityType(activity);
        const meta = getActivityMeta(type);
        const Icon = meta.icon;
        const text = buildActivityText(activity);
        const target = getActivityTarget(groupId, activity);
        const occurredAt = activity.occurredAt ?? activity.createdAt;

        const content = (
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 ring-1 ring-slate-200">
              <Icon className={`h-3.5 w-3.5 ${meta.iconClassName}`} />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-medium text-slate-900">{text.title}</div>
              {text.detail ? <div className="mt-0.5 truncate text-xs text-slate-500">{text.detail}</div> : null}
            </div>
            <div className="hidden shrink-0 items-center gap-4 text-xs text-slate-500 sm:flex">
                <span className="inline-flex items-center gap-1">
                  <UserCircleIcon className="h-3.5 w-3.5" />
                  {getActorName(activity)}
                </span>
                <span>{formatDateTime(occurredAt)}</span>
            </div>
          </>
        );

        if (target) {
          return (
            <button
              key={activity.id ?? `${type}-${index}`}
              type="button"
              onClick={() => navigate(target)}
              className="flex w-full items-center gap-3 px-1 py-2.5 transition hover:bg-slate-50"
            >
              {content}
            </button>
          );
        }

        return (
          <div key={activity.id ?? `${type}-${index}`} className="flex items-center gap-3 px-1 py-2.5">
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default GroupActivityTimeline;
