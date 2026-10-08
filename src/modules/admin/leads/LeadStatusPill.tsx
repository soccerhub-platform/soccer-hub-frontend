import React from "react";
import { Badge } from "../../../shared/ui/shadcn/Badge";
import type { LeadStatus } from "./types";
import { STATUS_LABELS } from "./lead.workspace";
export const STAGE_DOTS: Record<LeadStatus, string> = {
  NEW: "bg-slate-400", IN_PROGRESS: "bg-blue-500", TRIAL_SCHEDULED: "bg-amber-500",
  DECISION_PENDING: "bg-violet-500", CONTRACT_PENDING: "bg-cyan-600", PAYMENT_PENDING: "bg-orange-500",
  CONVERTED: "bg-emerald-600", LOST: "bg-rose-500",
};
export default function LeadStatusPill({ status }: { status: LeadStatus }) {
  return <Badge variant="secondary" className="max-w-full gap-1.5 rounded-md border-transparent bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
    <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${STAGE_DOTS[status]}`} />
    <span className="truncate">{STATUS_LABELS[status]}</span>
  </Badge>;
}
