import React from "react";
import classNames from "classnames";
import { cn } from "./utils";

type MetricTone = "neutral" | "info" | "success" | "warning" | "danger" | "violet";

type MetricCardProps = {
  title: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
  iconClassName?: string;
  tone?: MetricTone;
  progress?: number;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "standard" | "compact";
};

const toneClassNames: Record<MetricTone, { icon: string; value: string; delta: string }> = {
  neutral: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-950",
    delta: "text-slate-500",
  },
  info: {
    icon: "bg-blue-50 text-admin-600",
    value: "text-slate-950",
    delta: "text-admin-600",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-700",
    value: "text-slate-950",
    delta: "text-emerald-700",
  },
  warning: {
    icon: "bg-amber-50 text-amber-700",
    value: "text-slate-950",
    delta: "text-amber-700",
  },
  danger: {
    icon: "bg-rose-50 text-rose-700",
    value: "text-slate-950",
    delta: "text-rose-700",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    value: "text-slate-950",
    delta: "text-violet-700",
  },
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  note,
  delta,
  icon,
  iconClassName,
  tone = "info",
  progress,
  loading,
  onClick,
  className,
  variant = "standard",
}) => {
  const toneClasses = toneClassNames[tone];
  const content = (
    <>
      {icon ? (
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg [&>svg]:h-6 [&>svg]:w-6", toneClasses.icon, iconClassName)}>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-5 text-slate-600">{title}</span>
        <span className={classNames("mt-1 block truncate ui-metric-value", toneClasses.value)}>
          {loading ? "—" : value}
        </span>
        {note || delta ? (
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-slate-500">
            {delta ? <span className={classNames("font-semibold", toneClasses.delta)}>{delta}</span> : null}
            {note ? <span className="truncate">{note}</span> : null}
          </span>
        ) : null}
        {progress !== undefined ? (
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-admin-600" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
          </span>
        ) : null}
      </span>
    </>
  );

  const baseClassName = classNames(
    "flex items-center rounded-2xl border border-black/8 bg-white",
    variant === "compact" ? "min-h-0 gap-3 p-3" : "min-h-[104px] gap-4 p-4",
    onClick ? "text-left transition hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-blue-100" : null,
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClassName}>
        {content}
      </button>
    );
  }

  return <div className={baseClassName}>{content}</div>;
};

export default MetricCard;
