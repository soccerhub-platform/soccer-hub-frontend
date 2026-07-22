import React, { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/AuthContext";
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
} from "../../../shared/ui";
import { useAdminBranch } from "../BranchContext";
import LeadKanbanColumn from "./LeadKanbanColumn";
import {
  Lead,
  LeadAction,
  LeadKanbanColumns,
  LeadLossReason,
  LEAD_COLUMN_ORDER,
  LeadStatus,
} from "./types";
import LeadDrawer from "./LeadDrawer";
import { LeadApi } from "./lead.api";
import QualifyLeadModal from "./QualifyLeadModal";
import ScheduleTrialModal from "./ScheduleTrialModal";
import AdminCreateLeadModal from "./AdminCreateLeadModal";
import LeadLossModal from "./LeadLossModal";
import {
  getLeadActionEvent,
  getLeadLossStage,
  isConvertAction,
  isLossAction,
  isQualifyAction,
  isScheduleTrialAction,
} from "./lead.ui-actions";

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

const LeadKanbanPage: React.FC = () => {
  const { user } = useAuth();
  const { branchId, branchName } = useAdminBranch();
  const token = user?.accessToken;
  const navigate = useNavigate();

  const [columns, setColumns] = useState<LeadKanbanColumns>(createEmptyColumns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadInitialAction, setSelectedLeadInitialAction] =
    useState<LeadAction | null>(null);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [trialLead, setTrialLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rejectingLead, setRejectingLead] = useState<Lead | null>(null);
  const [rejectingAction, setRejectingAction] = useState<LeadAction | null>(null);
  const [lossReasons, setLossReasons] = useState<LeadLossReason[]>([]);
  const [lossReasonsLoading, setLossReasonsLoading] = useState(false);
  const [lossReasonsError, setLossReasonsError] = useState<string | null>(null);
  const [rejectSubmitLoading, setRejectSubmitLoading] = useState(false);
  const [actionState, setActionState] = useState<{
    leadId: string;
    actionType: string;
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

  const upsertLeadInColumns = (updatedLead: Lead) => {
    setColumns((current) => {
      const nextColumns = createEmptyColumns();

      LEAD_COLUMN_ORDER.forEach((status) => {
        nextColumns[status] = (current[status] ?? []).filter(
          (item) => item.id !== updatedLead.id
        );
      });

      const targetStatus = LEAD_COLUMN_ORDER.includes(updatedLead.status)
        ? updatedLead.status
        : null;

      if (targetStatus) {
        nextColumns[targetStatus] = [updatedLead, ...nextColumns[targetStatus]];
      }

      return nextColumns;
    });
  };

  const handleLeadAction = async (lead: Lead, action: LeadAction) => {
    if (!token) return;
    const isLeadAlreadyConverted = Boolean(
      lead.status === "WON" ||
        lead.clientId ||
        lead.playerId ||
        lead.contractId ||
        lead.contract?.contractId
    );

    if (isQualifyAction(action)) {
      setQualifyingLead(lead);
      return;
    }

    if (isScheduleTrialAction(action)) {
      setTrialLead(lead);
      return;
    }

    if (isConvertAction(action)) {
      setSelectedLeadId(lead.id);
      setSelectedLeadInitialAction(action);
      if (isLeadAlreadyConverted) {
        toast("Договор уже оформлен");
      }
      return;
    }

    if (action.type === "OPEN_CONTRACT") {
      const contractId = lead.contractId || lead.contract?.contractId;
      if (contractId) {
        navigate(`/admin/contracts/${encodeURIComponent(contractId)}/overview`);
      }
      return;
    }

    if (action.type === "ADD_PAYMENT") {
      const contractId = lead.contractId || lead.contract?.contractId;
      if (contractId) {
        navigate(
          `/admin/contracts/${encodeURIComponent(contractId)}/payments?drawer=payment`
        );
      }
      return;
    }

    if (isLossAction(action)) {
      setRejectingLead(lead);
      setRejectingAction(action);
      if (!lossReasonsLoading) {
        setLossReasonsLoading(true);
        setLossReasonsError(null);
        try {
          const reasons = await LeadApi.getLeadLossReasons(
            token,
            getLeadLossStage(action, lead.status)
          );
          setLossReasons(reasons);
        } catch (err) {
          console.error(err);
          setLossReasonsError("Не удалось загрузить причины потери");
        } finally {
          setLossReasonsLoading(false);
        }
      }
      return;
    }

    setActionState({ leadId: lead.id, actionType: action.type });
    setError(null);

    try {
      const response = await LeadApi.sendLeadEvent(
        lead.id,
        { event: getLeadActionEvent(action) },
        token
      );
      if (response?.lead) {
        upsertLeadInColumns(response.lead);
      } else {
        await refreshKanban();
      }
      toast.success("Статус лида обновлён");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось обновить лид");
    } finally {
      setActionState(null);
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (!branchId) {
    return (
      <PageShell>
        <EmptyState
          title="Сначала выберите филиал"
          description="Канбан лидов доступен после выбора рабочего филиала."
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="min-w-0 max-w-full">
      <PageHeader
        title="Канбан лидов"
        description="Воронка по текущему филиалу с быстрым обзором всех статусов."
        actions={
          <Button type="button" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4" />
            Новый лид
          </Button>
        }
      />

      {error ? <ErrorState message={error} onRetry={refreshKanban} /> : null}

      <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
        {loading ? (
          <div className="flex w-max min-w-max gap-4">
            {LEAD_COLUMN_ORDER.map((status) => (
              <div
                key={status}
                className="h-[calc(100vh-16rem)] w-[300px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
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
          initialAction={selectedLeadInitialAction}
          onInitialActionHandled={() => setSelectedLeadInitialAction(null)}
          onClose={() => {
            setSelectedLeadId(null);
            setSelectedLeadInitialAction(null);
          }}
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

      {showCreateModal ? (
        <AdminCreateLeadModal
          branchId={branchId}
          branchName={branchName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshKanban}
        />
      ) : null}

      {rejectingLead && rejectingAction ? (
        <LeadLossModal
          isOpen={Boolean(rejectingLead && rejectingAction)}
          lead={rejectingLead}
          event={getLeadActionEvent(rejectingAction)}
          reasons={lossReasons}
          loadingReasons={lossReasonsLoading}
          reasonsError={lossReasonsError}
          submitting={rejectSubmitLoading}
          onClose={() => {
            if (rejectSubmitLoading) return;
            setRejectingLead(null);
            setRejectingAction(null);
          }}
          onConfirm={async ({ lostReasonCode, lostComment }) => {
            if (!token || !rejectingLead || !rejectingAction) return;
            setRejectSubmitLoading(true);
            setError(null);
            try {
              const response = await LeadApi.sendLeadEvent(
                rejectingLead.id,
                {
                  event: getLeadActionEvent(rejectingAction),
                  lostReasonCode,
                  lostComment,
                },
                token
              );
              toast.success("Причина потери сохранена");
              setRejectingLead(null);
              setRejectingAction(null);
              if (response?.lead) {
                upsertLeadInColumns(response.lead);
              } else {
                await refreshKanban();
              }
            } catch (err) {
              console.error(err);
              setError(
                err instanceof Error
                  ? err.message
                  : "Не удалось сохранить причину потери"
              );
            } finally {
              setRejectSubmitLoading(false);
            }
          }}
        />
      ) : null}
    </PageShell>
  );
};

export default LeadKanbanPage;
