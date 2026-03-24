import React from "react";
import {
  ChatBubbleLeftEllipsisIcon,
  EllipsisHorizontalIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Lead, LeadQuickAction } from "./types";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onAction?: (lead: Lead, action: LeadQuickAction) => void;
  isActionLoading?: boolean;
  loadingAction?: LeadQuickAction | null;
}

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onClick,
  onAction,
  isActionLoading = false,
  loadingAction = null,
}) => {
  const primaryChild = lead.children[0];
  const extraChildren = Math.max(0, lead.children.length - 1);
  const primaryAction =
    lead.status === "NEW"
      ? { key: "CONTACTED" as const, label: "Связались" }
      : lead.status === "CONTACTED"
      ? { key: "QUALIFY" as const, label: "Квалифицировать" }
      : lead.status === "QUALIFIED"
      ? { key: "SCHEDULE_TRIAL" as const, label: "Назначить пробное" }
      : lead.status === "TRIAL_DONE"
      ? { key: "REQUEST_PAYMENT" as const, label: "Отправить на оплату" }
      : lead.status === "WAITING_PAYMENT"
      ? { key: "CONFIRM_PAYMENT" as const, label: "Подтвердить оплату" }
      : null;
  const showReject = ["NEW", "CONTACTED", "QUALIFIED"].includes(lead.status);

  const handleActionClick =
    (action: LeadQuickAction) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onAction?.(lead, action);
    };

  return (
    <article
      className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      data-lead-id={lead.id}
      data-lead-status={lead.status}
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-pointer text-left"
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {lead.parentName}
            </h3>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{lead.phone}</span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            {formatCreatedAt(lead.createdAt)}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex min-w-0 items-start gap-2 text-xs text-slate-600">
            <UserIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              {primaryChild ? (
                <div className="space-y-1">
                  <div className="break-words leading-4">
                    {primaryChild.childName} ({primaryChild.childAge})
                  </div>
                  {extraChildren > 0 ? (
                    <div className="text-[11px] font-medium text-slate-400">
                      Еще детей: +{extraChildren}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="leading-4 text-slate-400">
                  Нет данных о ребенке
                </div>
              )}
            </div>
          </div>

          {lead.comment ? (
            <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="mb-1 flex min-w-0 items-center gap-1.5 font-medium text-slate-500">
                <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5 shrink-0" />
                Комментарий
              </div>
              <p className="line-clamp-3 break-words whitespace-pre-wrap">
                {lead.comment}
              </p>
            </div>
          ) : null}
        </div>
      </button>

      {(primaryAction || showReject) && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          {primaryAction ? (
            <button
              type="button"
              onClick={handleActionClick(primaryAction.key)}
              disabled={isActionLoading}
              className="rounded-lg bg-admin-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-admin-700 disabled:cursor-not-allowed disabled:bg-admin-300"
            >
              {isActionLoading && loadingAction === primaryAction.key
                ? "Сохранение..."
                : primaryAction.label}
            </button>
          ) : null}

          {showReject ? (
            <button
              type="button"
              onClick={handleActionClick("REJECT")}
              disabled={isActionLoading}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {isActionLoading && loadingAction === "REJECT"
                ? "Сохранение..."
                : "Отказ"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="ml-auto rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label="Дополнительные действия"
          >
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </article>
  );
};

export default LeadCard;
