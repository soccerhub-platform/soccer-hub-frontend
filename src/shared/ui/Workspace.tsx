import React from "react";
import classNames from "classnames";
import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import MetricCard from "./MetricCard";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

export const WorkspaceBreadcrumbs: React.FC<{
  items: BreadcrumbItem[];
  actions?: React.ReactNode;
}> = ({ items, actions }) => (
  <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
    <nav aria-label="Навигационная цепочка" className="flex min-w-0 items-center gap-2 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" /> : null}
          {item.to ? (
            <NavLink to={item.to} className="truncate font-medium text-slate-600 transition hover:text-admin-600">
              {item.label}
            </NavLink>
          ) : (
            <span className="truncate font-semibold text-slate-950" aria-current="page">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export const WorkspaceHeader: React.FC<{
  id?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  alert?: React.ReactNode;
  actionsClassName?: string;
  className?: string;
}> = ({ id, children, actions, alert, actionsClassName, className }) => (
  <section id={id} className={classNames("rounded-2xl border border-black/8 bg-white p-5 sm:p-6", className)}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? (
        <div className={classNames("flex shrink-0 flex-wrap items-center gap-2 lg:justify-end", actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
    {alert ? <div className="mt-4">{alert}</div> : null}
  </section>
);

type WorkspaceTab = {
  key: string;
  label: string;
  to: string;
};

export const WorkspaceTabs: React.FC<{
  items: WorkspaceTab[];
  className?: string;
}> = ({ items, className }) => (
  <nav
    aria-label="Разделы рабочего пространства"
    className={classNames(
      "sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-black/8 bg-[#f5f5f7]/95 px-1 backdrop-blur-sm",
      className,
    )}
  >
    {items.map((item) => (
      <NavLink
        key={item.key}
        to={item.to}
        className={({ isActive }) =>
          classNames(
            "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition",
            isActive
              ? "border-blue-700 text-slate-950"
              : "border-transparent text-slate-600 hover:text-slate-800",
          )
        }
      >
        {item.label}
      </NavLink>
    ))}
  </nav>
);

export const WorkspaceMetric: React.FC<{
  icon: React.ReactNode;
  iconClassName?: string;
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  progress?: number;
  onClick?: () => void;
}> = ({ icon, iconClassName, label, value, note, progress, onClick }) => (
  <MetricCard
    icon={icon}
    iconClassName={iconClassName}
    title={label}
    value={value}
    note={note}
    progress={progress}
    onClick={onClick}
  />
);
