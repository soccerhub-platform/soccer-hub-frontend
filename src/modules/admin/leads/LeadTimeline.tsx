import React from "react";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { LeadActivity } from "./types";

interface LeadTimelineProps {
  activities: LeadActivity[];
  loading?: boolean;
  error?: string | null;
}

const formatActivityTime = (activity: LeadActivity) => {
  const raw = activity.createdAt || activity.occurredAt || activity.time;
  if (!raw) return "Время не указано";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getActivityMeta = (type: string) => {
  const normalized = type.toUpperCase();

  if (normalized.includes("CREATE")) {
    return {
      icon: CheckCircleIcon,
      iconClassName: "text-emerald-600",
      dotClassName: "bg-emerald-500",
    };
  }

  if (normalized.includes("TRIAL") || normalized.includes("SCHEDULE")) {
    return {
      icon: CalendarDaysIcon,
      iconClassName: "text-amber-600",
      dotClassName: "bg-amber-500",
    };
  }

  if (normalized.includes("PAYMENT")) {
    return {
      icon: BanknotesIcon,
      iconClassName: "text-cyan-700",
      dotClassName: "bg-cyan-600",
    };
  }

  if (normalized.includes("REJECT") || normalized.includes("LOST") || normalized.includes("CANCEL")) {
    return {
      icon: XCircleIcon,
      iconClassName: "text-rose-600",
      dotClassName: "bg-rose-500",
    };
  }

  return {
    icon: ClockIcon,
    iconClassName: "text-slate-500",
    dotClassName: "bg-slate-400",
  };
};

const LeadTimeline: React.FC<LeadTimelineProps> = ({
  activities,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        Активность пока отсутствует
      </div>
    );
  }

  return (
    <div className="relative space-y-4 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-slate-200">
      {activities.map((activity, index) => {
        const meta = getActivityMeta(activity.type);
        const Icon = meta.icon;

        return (
          <div key={activity.id ?? `${activity.type}-${index}`} className="relative flex gap-3">
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
              <div className={`absolute h-2.5 w-2.5 rounded-full ${meta.dotClassName}`} />
              <Icon className={`h-4 w-4 ${meta.iconClassName}`} />
            </div>

            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {activity.description}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <UserCircleIcon className="h-3.5 w-3.5" />
                  {activity.actorName || "Система"}
                </span>
                <span>{formatActivityTime(activity)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadTimeline;
