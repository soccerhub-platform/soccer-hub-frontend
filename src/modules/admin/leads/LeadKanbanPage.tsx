import React, { useEffect, useState } from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import LeadKanbanColumn from "./LeadKanbanColumn";
import {
  Lead,
  LeadEvent,
  LeadKanbanColumns,
  LEAD_COLUMN_ORDER,
  LeadQuickAction,
  LeadStatus,
} from "./types";
import LeadDrawer from "./LeadDrawer";
import { LeadApi } from "./lead.api";
import QualifyLeadModal from "./QualifyLeadModal";
import ScheduleTrialModal from "./ScheduleTrialModal";

const COLUMN_TITLES: Record<LeadStatus, string> = {
  NEW: "Новые",
  CONTACTED: "Связались",
  QUALIFIED: "Квалифицирован",
  TRIAL_SCHEDULED: "Пробное назначено",
  TRIAL_DONE: "Пробное прошло",
  WAITING_PAYMENT: "Ожидает оплату",
  WON: "Клиент",
  LOST: "Отказ",
};

const COLUMN_COLORS: Record<
  LeadStatus,
  {
    column: string;
    header: string;
    badge: string;
  }
> = {
  NEW: {
    column: "bg-slate-50/90 border-slate-200",
    header: "bg-slate-100/90 text-slate-700 border-slate-200",
    badge: "bg-slate-200 text-slate-700",
  },
  CONTACTED: {
    column: "bg-blue-50/90 border-blue-200",
    header: "bg-blue-100/90 text-blue-700 border-blue-200",
    badge: "bg-blue-200 text-blue-700",
  },
  QUALIFIED: {
    column: "bg-violet-50/90 border-violet-200",
    header: "bg-violet-100/90 text-violet-700 border-violet-200",
    badge: "bg-violet-200 text-violet-700",
  },
  TRIAL_SCHEDULED: {
    column: "bg-amber-50/90 border-amber-200",
    header: "bg-amber-100/90 text-amber-700 border-amber-200",
    badge: "bg-amber-200 text-amber-700",
  },
  TRIAL_DONE: {
    column: "bg-orange-50/90 border-orange-200",
    header: "bg-orange-100/90 text-orange-700 border-orange-200",
    badge: "bg-orange-200 text-orange-700",
  },
  WAITING_PAYMENT: {
    column: "bg-cyan-50/90 border-cyan-200",
    header: "bg-cyan-100/90 text-cyan-700 border-cyan-200",
    badge: "bg-cyan-200 text-cyan-700",
  },
  WON: {
    column: "bg-emerald-50/90 border-emerald-200",
    header: "bg-emerald-100/90 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-200 text-emerald-700",
  },
  LOST: {
    column: "bg-rose-50/90 border-rose-200",
    header: "bg-rose-100/90 text-rose-700 border-rose-200",
    badge: "bg-rose-200 text-rose-700",
  },
};

const createEmptyColumns = (): LeadKanbanColumns =>
  LEAD_COLUMN_ORDER.reduce<LeadKanbanColumns>((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});

const SIMPLE_EVENTS: Partial<Record<LeadQuickAction, LeadEvent>> = {
  CONTACTED: "CONTACT",
  REJECT: "REJECT",
  REQUEST_PAYMENT: "REQUEST_PAYMENT",
  CONFIRM_PAYMENT: "CONFIRM_PAYMENT",
};

const COMPLEX_ACTIONS: LeadQuickAction[] = ["QUALIFY", "SCHEDULE_TRIAL"];

const LeadKanbanPage: React.FC = () => {
  const { user } = useAuth();
  const { branchId } = useAdminBranch();
  const token = user?.accessToken;

  const [columns, setColumns] = useState<LeadKanbanColumns>(createEmptyColumns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [trialLead, setTrialLead] = useState<Lead | null>(null);
  const [actionState, setActionState] = useState<{
    leadId: string;
    action: LeadQuickAction;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadKanban = async () => {
      if (!token || !branchId) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const incoming = await LeadApi.getKanban(branchId, token);
        if (!isMounted) return;

        const nextColumns = createEmptyColumns();

        Object.entries(incoming).forEach(([status, leads]) => {
          nextColumns[status] = Array.isArray(leads) ? leads : [];
        });

        setColumns(nextColumns);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Не удалось загрузить канбан лидов");
        setColumns(createEmptyColumns());
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadKanban();

    return () => {
      isMounted = false;
    };
  }, [token, branchId]);

  const refreshKanban = async () => {
    if (!token || !branchId) return;

    setError(null);

    try {
      const incoming = await LeadApi.getKanban(branchId, token);
      const nextColumns = createEmptyColumns();

      Object.entries(incoming).forEach(([status, leads]) => {
        nextColumns[status] = Array.isArray(leads) ? leads : [];
      });

      setColumns(nextColumns);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить канбан лидов");
    }
  };

  const handleLeadAction = async (lead: Lead, action: LeadQuickAction) => {
    if (!token) return;

    if (COMPLEX_ACTIONS.includes(action)) {
      if (action === "QUALIFY") {
        setQualifyingLead(lead);
      }

      if (action === "SCHEDULE_TRIAL") {
        setTrialLead(lead);
      }

      return;
    }

    const event = SIMPLE_EVENTS[action];
    if (!event) {
      setError("Для этого действия не настроено событие.");
      return;
    }

    setActionState({ leadId: lead.id, action });
    setError(null);

    try {
      await LeadApi.sendLeadEvent(lead.id, event, token);
      await refreshKanban();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось обновить лид");
    } finally {
      setActionState(null);
    }
  };

  if (!token) {
    return <div className="text-sm text-red-500">Нет авторизации</div>;
  }

  if (!branchId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 shadow-sm">
        Сначала выберите филиал
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-admin-700">
            <Squares2X2Icon className="h-5 w-5" />
            <h1 className="heading-font text-2xl font-semibold text-slate-900">
              Канбан лидов
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Воронка по текущему филиалу с быстрым обзором всех статусов.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
        {loading ? (
          <div className="flex w-max min-w-max gap-4">
            {LEAD_COLUMN_ORDER.map((status) => (
              <div
                key={status}
                className="h-[calc(100vh-16rem)] w-[300px] shrink-0 rounded-2xl border border-slate-200 bg-white/70 p-3"
              >
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                <div className="mt-3 space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`${status}-${index}`}
                      className="h-28 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-max min-w-max gap-4">
            {LEAD_COLUMN_ORDER.map((status) => (
              <LeadKanbanColumn
                key={status}
                title={COLUMN_TITLES[status]}
                leads={columns[status] ?? []}
                theme={COLUMN_COLORS[status]}
                onLeadClick={setSelectedLeadId}
                onLeadAction={handleLeadAction}
                actionState={actionState}
              />
            ))}
          </div>
        )}
      </div>

      {selectedLeadId ? (
        <LeadDrawer
          leadId={selectedLeadId}
          isOpen={Boolean(selectedLeadId)}
          branchId={branchId}
          token={token}
          onClose={() => setSelectedLeadId(null)}
          onUpdated={refreshKanban}
        />
      ) : null}

      {qualifyingLead ? (
        <QualifyLeadModal
          leadId={qualifyingLead.id}
          token={token}
          initialLead={qualifyingLead}
          onClose={() => setQualifyingLead(null)}
          onSuccess={async () => {
            await refreshKanban();
            setQualifyingLead(null);
          }}
        />
      ) : null}

      {trialLead ? (
        <ScheduleTrialModal
          lead={trialLead}
          branchId={branchId}
          token={token}
          onClose={() => setTrialLead(null)}
          onSuccess={async () => {
            await refreshKanban();
            setTrialLead(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default LeadKanbanPage;
