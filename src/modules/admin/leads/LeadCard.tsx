import React from "react";
import { CalendarDays, Clock3, Flag } from "lucide-react";
import { Button } from "../../../shared/ui";
import { Lead, LeadAction } from "./types";
import { buildLeadUiActions } from "./lead.ui-actions";
import { dueLabel, initials } from "./LeadList";
import { isActiveLead, nextStep, overdue, PRIORITY_LABELS } from "./lead.workspace";
interface LeadCardProps {
  lead: Lead; onClick?: () => void; onAction?: (lead: Lead, action: LeadAction) => void;
  loadingActionType?: string | null;
}
export default function LeadCard({lead, onClick, onAction, loadingActionType}: LeadCardProps) {
  const primary = buildLeadUiActions(lead, lead.actions ?? []).find(a => a.primary);
  const trial = lead.currentTrials?.find(t => t.status === "SCHEDULED");
  return <article data-lead-id={lead.id} data-lead-status={lead.status} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300">
    <button onClick={onClick} className="grid w-full gap-3 p-3.5 text-left focus-visible:outline-blue-600">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="break-words text-[13px] font-semibold text-slate-900">{lead.primaryContact.fullName}</h3><p className="mt-1 text-[11px] text-slate-500">{lead.primaryContact.phone}</p></div>
        {lead.work?.priority && lead.work.priority !== "NORMAL" && isActiveLead(lead) && <Flag aria-label={PRIORITY_LABELS[lead.work.priority]} className={`h-3.5 w-3.5 shrink-0 ${lead.work.priority === "URGENT" ? "text-rose-700" : "text-amber-700"}`}/>}
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-slate-600">{lead.participants.map(p => p.fullName).join(", ") || "Участник не указан"}</p>
      <div className="rounded-lg bg-slate-50 px-2.5 py-2"><p className="line-clamp-2 text-[11px] leading-4 text-slate-600">{nextStep(lead)}</p>
        {lead.work?.nextActionAt && isActiveLead(lead) && <p className={`mt-1.5 flex items-center gap-1 text-[10px] ${overdue(lead) ? "font-medium text-rose-700" : "text-slate-500"}`}><Clock3 className="h-3 w-3"/>{overdue(lead) ? "Просрочено · " : ""}{dueLabel(lead)}</p>}
      </div>
      {trial && <p className="flex items-center gap-1.5 text-[11px] text-slate-600"><CalendarDays className="h-3.5 w-3.5"/>{trial.sessionDate} · {trial.sessionStartsAt?.slice(11,16)}</p>}
      <div className="flex items-center justify-between text-[10px] text-slate-500"><span>{lead.leadType === "ADULT" ? "Взрослый" : "Детский"}</span><span className="max-w-[140px] truncate" title={lead.assignedAdmin?.name || ""}>{lead.assignedAdmin?.name ? initials(lead.assignedAdmin.name) : "Не назначен"}</span></div>
    </button>
    {primary && <div className="border-t border-slate-100 p-2"><Button className="h-auto min-h-8 w-full whitespace-normal py-1.5 text-xs" variant="secondary" disabled={!primary.enabled || Boolean(loadingActionType)} onClick={() => onAction?.(lead, primary)}>{loadingActionType ? "Сохранение…" : primary.label}</Button></div>}
  </article>;
}
