import React from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import Button from "./Button";

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title = "Данных пока нет", description, action }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
    <InboxIcon className="mx-auto h-8 w-8 text-slate-300" />
    <div className="mt-3 text-sm font-semibold text-slate-800">{title}</div>
    {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = "Не удалось загрузить данные", message, onRetry }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
    <div className="flex items-start gap-3">
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-rose-800">{title}</div>
        <div className="mt-1 text-sm text-rose-700">{message}</div>
        {onRetry ? (
          <Button type="button" variant="softDanger" size="sm" className="mt-3" onClick={onRetry}>
            Повторить
          </Button>
        ) : null}
      </div>
    </div>
  </div>
);

export const LoadingState: React.FC<{ label?: string }> = ({ label = "Загрузка..." }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <ArrowPathIcon className="h-4 w-4 animate-spin" />
      {label}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
    </div>
  </div>
);
