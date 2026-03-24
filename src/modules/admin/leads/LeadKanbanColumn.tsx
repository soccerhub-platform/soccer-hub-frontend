import React from "react";
import LeadCard from "./LeadCard";
import { Lead, LeadQuickAction } from "./types";

interface LeadKanbanColumnProps {
  title: string;
  leads: Lead[];
  theme: {
    column: string;
    header: string;
    badge: string;
  };
  onLeadClick: (leadId: string) => void;
  onLeadAction: (lead: Lead, action: LeadQuickAction) => void;
  actionState: {
    leadId: string;
    action: LeadQuickAction;
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
  return (
    <section
      className={`flex h-[calc(100vh-16rem)] w-[300px] min-w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border backdrop-blur-sm ${theme.column}`}
    >
      <header
        className={`sticky top-0 z-10 rounded-t-2xl border-b px-4 py-3 backdrop-blur-sm ${theme.header}`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide">
            {title} ({leads.length})
          </h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
            {leads.length}
          </span>
        </div>
      </header>

      <div className="min-w-0 flex-1 overflow-y-auto px-3 py-3">
        {leads.length > 0 ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead.id)}
                onAction={onLeadAction}
                isActionLoading={actionState?.leadId === lead.id}
                loadingAction={
                  actionState?.leadId === lead.id ? actionState.action : null
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/70 bg-white/40 px-4 text-center text-sm text-slate-500">
            Нет лидов
          </div>
        )}
      </div>
    </section>
  );
};

export default LeadKanbanColumn;
