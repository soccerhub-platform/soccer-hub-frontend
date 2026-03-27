import React from "react";
import {
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  PhoneIcon,
  UserIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Lead, LeadAction } from "./types";
import LeadActions from "./LeadActions";
import {
  formatLeadCardDate,
  formatTrialPreview,
  trialStatusClassName,
  trialStatusLabel,
} from "./lead.format";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onAction?: (lead: Lead, action: LeadAction) => void;
  loadingActionType?: string | null;
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onClick,
  onAction,
  loadingActionType = null,
}) => {
  const actions = lead.actions ?? [];
  const primaryChild = lead.children[0];
  const extraChildren = Math.max(0, lead.children.length - 1);
  const trialPreview = formatTrialPreview(
    lead.trial?.trialDate,
    lead.trial?.startTime
  );

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
            {formatLeadCardDate(lead.createdAt)}
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

          {trialPreview ? (
            <div
              className={`rounded-lg border px-3 py-2 text-xs font-medium ${trialStatusClassName(
                lead.trial?.status
              )}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>Пробное: {trialPreview}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {lead.trial?.status === "COMPLETED" ? (
                    <CheckCircleIcon className="h-3 w-3" />
                  ) : lead.trial?.status === "CANCELED" ? (
                    <XCircleIcon className="h-3 w-3" />
                  ) : null}
                  {trialStatusLabel(lead.trial?.status)}
                </span>
              </div>
            </div>
          ) : null}

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

      {actions.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div onClick={(event) => event.stopPropagation()}>
            <LeadActions
              actions={actions}
              onAction={(action) => onAction?.(lead, action)}
              loadingActionType={loadingActionType}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
};

export default LeadCard;
