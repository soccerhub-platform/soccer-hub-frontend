import React, { useEffect, useState } from "react";
import {
  ChartBarIcon,
  ClockIcon,
  FunnelIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
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
  LeadColumnStatus,
  LeadStatus,
} from "./types";
import { LeadApi } from "./lead.api";
import QualifyLeadModal from "./QualifyLeadModal";
import ScheduleTrialModal from "./ScheduleTrialModal";
import AdminCreateLeadModal from "./AdminCreateLeadModal";
import LeadLossModal from "./LeadLossModal";
import { TrialsApi } from "../trials/trials.api";
import {
  getLeadActionEvent,
  getLeadLossStage,
  isConvertAction,
  isLossAction,
  isQualifyAction,
  isScheduleTrialAction,
} from "./lead.ui-actions";

const COLUMN_TITLES: Record<LeadColumnStatus, string> = {
  NEW: "Новые",
  IN_PROGRESS: "В работе",
  TRIAL_SCHEDULED: "Пробное назначено",
  DECISION_PENDING: "Ожидают решения",
};

const COLUMN_COLORS: Record<
  LeadColumnStatus,
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
  IN_PROGRESS: {
    column: "bg-blue-50/90 border-blue-200",
    header: "bg-blue-100/90 text-blue-700 border-blue-200",
    badge: "bg-blue-200 text-blue-700",
  },
  TRIAL_SCHEDULED: {
    column: "bg-amber-50/90 border-amber-200",
    header: "bg-amber-100/90 text-amber-700 border-amber-200",
    badge: "bg-amber-200 text-amber-700",
  },
  DECISION_PENDING: {
    column: "bg-violet-50/90 border-violet-200",
    header: "bg-violet-100/90 text-violet-700 border-violet-200",
    badge: "bg-violet-200 text-violet-700",
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

      const targetStatus = LEAD_COLUMN_ORDER.includes(updatedLead.status as LeadColumnStatus)
        ? updatedLead.status as LeadColumnStatus
        : null;

      if (targetStatus) {
        nextColumns[targetStatus] = [updatedLead, ...nextColumns[targetStatus]];
      }

      return nextColumns;
    });
  };

  const allLeads = LEAD_COLUMN_ORDER.flatMap((status) => columns[status] ?? []);
  const activeLeadCount = allLeads.filter((lead) => lead.status !== "CONVERTED" && lead.status !== "LOST").length;
  const overdueTrialCount = allLeads.filter(
    (lead) => lead.status === "TRIAL_SCHEDULED" && lead.trial?.status === "SCHEDULED" && lead.trial.trialDate < new Date().toISOString().slice(0, 10)
  ).length;
  const trialCount = columns.TRIAL_SCHEDULED?.length ?? 0;
  const convertedCount = allLeads.filter((lead) => lead.status === "CONVERTED").length;
  const conversionRate = allLeads.length
    ? Math.round((convertedCount / allLeads.length) * 100)
    : 0;

  const handleLeadAction = async (lead: Lead, action: LeadAction) => {
    if (!token) return;
    const isLeadAlreadyConverted = Boolean(
      lead.status === "CONVERTED" ||
        lead.clientId ||
        lead.playerId
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
      if (isLeadAlreadyConverted) {
        toast("Клиент уже оформлен");
      } else {
        navigate(`/admin/leads/${encodeURIComponent(lead.id)}`);
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

    if (action.type === "MARK_TRIAL_DONE") {
      setActionState({ leadId: lead.id, actionType: action.type });
      setError(null);
      try {
        const trial = await TrialsApi.findByLead(lead.id);
        if (!trial) throw new Error("Пробное занятие не найдено");
        await TrialsApi.markAttendance(trial.id, "ATTENDED");

        await refreshKanban();
        toast.success("Посещение пробного отмечено");
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось отметить пробное");
      } finally {
        setActionState(null);
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
    <PageShell className="min-w-0 max-w-[1540px] gap-4">
      <PageHeader
        title="Лиды"
        description="Потенциальные клиенты и заявки"
        actions={
          <>
            <Button type="button" variant="secondary" className="gap-2">
              <FunnelIcon className="h-4 w-4" />
              Фильтры
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">2</span>
            </Button>
            <Button type="button" onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4" />
              Новый лид
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Новые", value: columns.NEW?.length ?? 0, hint: "+6 за неделю", tone: "text-violet-600", icon: FunnelIcon },
          { label: "Требуют действия", value: activeLeadCount, hint: overdueTrialCount ? `Просрочено: ${overdueTrialCount}` : "Всё под контролем", tone: "text-orange-600", icon: ClockIcon },
          { label: "Пробные сегодня", value: trialCount, hint: "+2 подтверждено", tone: "text-blue-600", icon: UserGroupIcon },
          { label: "Конверсия (мес)", value: `${conversionRate}%`, hint: `${convertedCount} из ${allLeads.length} лидов`, tone: "text-violet-600", icon: ChartBarIcon },
        ].map(({ label, value, hint, tone, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-28px_rgba(15,23,42,0.55)]">
            <div>
              <div className="text-xs font-medium text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
              <div className={`mt-1 text-[11px] font-medium ${tone}`}>{hint}</div>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {error ? <ErrorState message={error} onRetry={refreshKanban} /> : null}

      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_44px_-36px_rgba(15,23,42,0.55)]">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="text-sm font-semibold text-slate-900">Активная воронка</div>
            <div className="text-xs text-slate-400">{activeLeadCount} лидов</div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto pb-2">
            {loading ? (
              <div className="flex w-max min-w-max gap-4">
                {LEAD_COLUMN_ORDER.map((status) => (
                  <div key={status} className="h-[calc(100vh-20rem)] w-[280px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    <div className="mt-3 space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={`${status}-${index}`} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex w-max min-w-max gap-3">
                {LEAD_COLUMN_ORDER.map((status) => (
                  <LeadKanbanColumn key={status} title={COLUMN_TITLES[status]} leads={columns[status] ?? []} theme={COLUMN_COLORS[status]} onLeadClick={(leadId) => navigate(`/admin/leads/${encodeURIComponent(leadId)}`)} onLeadAction={handleLeadAction} actionState={actionState} />
                ))}
              </div>
            )}
          </div>
      </div>

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
            onSuccess={async (trialId) => {
            await refreshKanban();
            setTrialLead(null);
            if (trialId) navigate(`/admin/trials/${trialId}/overview`);
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
