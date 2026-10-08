import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "../../../shared/ui";
import LeadCard from "./LeadCard";
import { Lead, LeadAction } from "./types";

interface LeadKanbanColumnProps {
  title: string;
  leads: Lead[];
  theme: {
    column: string;
    header: string;
    badge: string;
  };
  onLeadClick: (leadId: string) => void;
  onLeadAction: (lead: Lead, action: LeadAction) => void;
  actionState: {
    leadId: string;
    actionType: string;
  } | null;
}

const LeadKanbanColumn: React.FC<LeadKanbanColumnProps> = ({
  title,
  leads,
  theme,
  onLeadClick,
  onLeadAction,
  actionState,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [limit, setLimit] = useState(30);
  if (collapsed) return <section className="w-12 shrink-0 rounded-xl border border-slate-200 bg-white">
    <button className="flex h-full min-h-72 w-full items-center gap-3 p-3 text-xs font-medium text-slate-600 [writing-mode:vertical-rl]" onClick={() => setCollapsed(false)} aria-expanded={false} aria-label={`Развернуть: ${title}`}><ChevronRight className="h-3.5 w-3.5"/>{title} · {leads.length}</button>
  </section>;
  return (
    <section
      className="flex max-h-[70dvh] min-h-[400px] w-[280px] min-w-[280px] shrink-0 flex-col"
    >
      <header
        className="mb-3 px-1 py-1"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-slate-700">
            {title}
          </h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
            {leads.length}
          </span>
          <button className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-200" onClick={() => setCollapsed(true)} aria-expanded aria-label={`Свернуть: ${title}`}><ChevronDown className="h-3.5 w-3.5"/></button>
        </div>
      </header>

      <div className="min-w-0 flex-1 overflow-y-auto pb-2 pr-1">
        {leads.length > 0 ? (
          <div className="space-y-3">
            {leads.slice(0,limit).map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead.id)}
                onAction={onLeadAction}
                loadingActionType={
                  actionState?.leadId === lead.id ? actionState.actionType : null
                }
              />
            ))}
            {limit < leads.length && <Button variant="secondary" size="sm" className="w-full" onClick={() => setLimit(n => n + 30)}>Ещё {leads.length-limit}</Button>}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
            Нет лидов
          </div>
        )}
      </div>
    </section>
  );
};

export default LeadKanbanColumn;
