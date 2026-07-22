import React from "react";
import classNames from "classnames";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { NavLink } from "react-router-dom";

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
          {index > 0 ? <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" /> : null}
          {item.to ? (
            <NavLink to={item.to} className="truncate font-medium text-slate-500 transition hover:text-admin-700">
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
  <section id={id} className={classNames("rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
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
      "sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-1 backdrop-blur",
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
              ? "border-admin-700 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800",
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
}> = ({ icon, iconClassName, label, value, note, progress, onClick }) => {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className={classNames("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-admin-50 text-admin-700 [&>svg]:h-5 [&>svg]:w-5", iconClassName)}>
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xl font-semibold text-slate-950">{value}</span>
          <span className="mt-0.5 block text-sm text-slate-500">{label}</span>
        </span>
      </div>
      {progress !== undefined ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
        </div>
      ) : null}
      {note ? <div className="mt-3 truncate text-xs font-medium text-admin-700">{note}</div> : null}
    </>
  );

  const classes = "min-h-28 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${classes} transition hover:border-admin-200 hover:shadow`}>
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
};
