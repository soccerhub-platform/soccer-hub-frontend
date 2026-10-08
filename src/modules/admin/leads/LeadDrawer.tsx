import LeadWorkModal from "./LeadWorkModal";
import LeadDetailOverview from "./LeadDetailOverview";
import LeadPreferencesModal from "./LeadPreferencesModal";
import LeadStatusPill from "./LeadStatusPill";
import { sourceLabel, nextStep, isActiveLead, overdue, PRIORITY_LABELS } from "./lead.workspace";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Phone } from "lucide-react";
import QualifyLeadModal from "./QualifyLeadModal";
import { LeadAction, LeadActivity, LeadDetails, LeadLossReason } from "./types";
import { LeadApi } from "./lead.api";
import ScheduleTrialModal from "./ScheduleTrialModal";
import { TrialsApi } from "../trials/trials.api";
import type { TrialBookingListItem } from "../trials/trials.types";
import LeadActions from "./LeadActions";
import LeadTimeline from "./LeadTimeline";
import LeadLossModal from "./LeadLossModal";
import ConvertLeadModal from "./ConvertLeadModal";
import {
  buildLeadUiActions,
  getLeadActionEvent,
  getLeadLossStage,
  isConvertAction,
  isLossAction,
  isQualifyAction,
  isScheduleTrialAction,
  getConvertibleParticipants,
  getConvertedParticipants,
} from "./lead.ui-actions";
import { ToggleGroup, ToggleGroupItem } from "../../../shared/ui/shadcn/toggle-group";
import { Button, ErrorState, LoadingState, SectionCard } from "../../../shared/ui";
import {
  formatLeadDateTime,
  formatTrialTime,
  trialStatusLabel,
} from "./lead.format";

interface LeadDrawerProps {
  leadId: string;
  isOpen: boolean;
  branchId: string;
  token: string;
  initialAction?: LeadAction | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
  onInitialActionHandled?: () => void;
  embedded?: boolean;
}

type LeadDetailTab = "overview" | "trial" | "activity";

const formatTrialBookingTime = (trial: TrialBookingListItem) => {
  const trialDate = trial.sessionDate ?? trial.sessionStartsAt?.slice(0, 10);
  const startTime = trial.sessionStartsAt?.slice(11, 19);
  const endTime = trial.sessionEndsAt?.slice(11, 19);
  return formatTrialTime(trialDate ?? undefined, startTime, endTime);
};

const LeadDrawer: React.FC<LeadDrawerProps> = ({
  leadId,
  isOpen,
  branchId,
  token,
  initialAction = null,
  onClose,
  onUpdated,
  onInitialActionHandled,
  embedded = false,
}) => {
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [workMode, setWorkMode] = useState<"PLAN" | "CONTACT" | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [trialBooking, setTrialBooking] = useState<TrialBookingListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQualifyModal, setShowQualifyModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [loadingActionType, setLoadingActionType] = useState<string | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [rejectingAction, setRejectingAction] = useState<LeadAction | null>(null);
  const [lossReasons, setLossReasons] = useState<LeadLossReason[]>([]);
  const [lossReasonsLoading, setLossReasonsLoading] = useState(false);
  const [lossReasonsError, setLossReasonsError] = useState<string | null>(null);
  const [rejectSubmitLoading, setRejectSubmitLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>("overview");
  const [conversionResult, setConversionResult] = useState<{
    clientId: string;
    playerId: string;
    status: string;
  } | null>(null);
  const convertibleParticipants = lead
    ? getConvertibleParticipants(lead)
    : [];
  const convertedParticipants = lead
    ? getConvertedParticipants(lead)
    : [];

  useEffect(() => {
    let isMounted = true;

    const loadLead = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await LeadApi.getById(leadId, token);
        const booking = data.currentTrials?.find(t => t.status === "SCHEDULED") ?? data.currentTrials?.[0] ?? null;
        if (!isMounted) return;
        setLead(data);
        setTrialBooking(booking);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось загрузить лид");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLead();

    return () => {
      isMounted = false;
    };
  }, [leadId, token]);

  useEffect(() => {
    setActiveTab("overview");
  }, [leadId]);

  useEffect(() => {
    if (!isOpen || loading || !lead || !initialAction) return;

    if (isConvertAction(initialAction)) {
      if (convertibleParticipants.length === 0) {
        toast("Нет участников, готовых к оформлению");
      } else {
        setShowConvertModal(true);
      }
      onInitialActionHandled?.();
    }
  }, [initialAction, isOpen, lead, loading, onInitialActionHandled, convertibleParticipants.length]);



  useEffect(() => {
    let isMounted = true;

    const loadActivities = async () => {
      setActivitiesLoading(true);
      setActivitiesError(null);

      try {
        const data = await LeadApi.getActivities(leadId, token);
        if (!isMounted) return;
        setActivities(data);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setActivitiesError(
          err instanceof Error ? err.message : "Не удалось загрузить активность"
        );
      } finally {
        if (isMounted) {
          setActivitiesLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, [leadId, token]);

  if (!isOpen) {
    return null;
  }

  const rawActions = lead?.actions ?? [];
  const conversionPlayerId =
    conversionResult?.playerId ||
    convertedParticipants[0]?.playerId ||
    "";
  const actions = lead
    ? buildLeadUiActions(lead, rawActions)
    : [];
  const refreshLead = async () => {
    const [leadData, activitiesData] = await Promise.all([
      LeadApi.getById(leadId, token),
      LeadApi.getActivities(leadId, token),
    ]);
    const booking = leadData.currentTrials?.find(t => t.status === "SCHEDULED") ?? leadData.currentTrials?.[0] ?? null;
    setLead(leadData);
    setActivities(activitiesData);
    setTrialBooking(booking);
    setActivitiesError(null);
  };

  const refreshActivities = async () => {
    const activitiesData = await LeadApi.getActivities(leadId, token);
    setActivities(activitiesData);
    setActivitiesError(null);
  };

  const handleAction = async (action: LeadAction) => {
    if (!lead || !action.enabled) return;
    if (action.type === "CONTACT_LEAD" || action.type === "CONTACT") { setWorkMode("CONTACT"); return; }

    if (isQualifyAction(action)) {
      setShowQualifyModal(true);
      return;
    }

    if (isScheduleTrialAction(action)) {
      setShowTrialModal(true);
      return;
    }

    if (isConvertAction(action)) {
      if (convertibleParticipants.length === 0) {
        toast("Нет участников, готовых к оформлению");
        return;
      }
      setShowConvertModal(true);
      return;
    }

    if (action.type === "CREATE_CONTRACT") {
      if (!lead.clientId || !conversionPlayerId) {
        toast.error(
          "Для создания договора сначала должны быть оформлены клиент и ученик"
        );
        return;
      }

      navigate(
        `/admin/contracts?drawer=create-contract` +
          `&clientId=${encodeURIComponent(lead.clientId)}` +
          `&playerId=${encodeURIComponent(conversionPlayerId)}` +
          `&leadId=${encodeURIComponent(lead.id)}`
      );
      return;
    }

    if (action.type === "RECORD_PAYMENT") {
      if (!lead.clientId) {
        toast.error("У лида не указан клиент");
        return;
      }

      navigate(
        `/admin/clients/${encodeURIComponent(lead.clientId)}/payments`
      );
      return;
    }

    if (isLossAction(action)) {
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
      setLoadingActionType(action.type);
      setError(null);
      try {
        const trial = await TrialsApi.findByLead(lead.id);
        if (!trial) throw new Error("Пробное занятие не найдено");
        await TrialsApi.markAttendance(trial.id, "ATTENDED");

        await refreshLead();
        await onUpdated();
        toast.success("Посещение пробного отмечено");
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось отметить пробное");
      } finally {
        setLoadingActionType(null);
      }
      return;
    }

    setLoadingActionType(action.type);
    setError(null);

    try {
      await LeadApi.sendLeadEvent(
        lead.id,
        { event: getLeadActionEvent(action) },
        token
      );
      await refreshLead();
      await onUpdated();
      toast.success("Статус лида обновлён");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось обновить лид");
    } finally {
      setLoadingActionType(null);
    }
  };

  return (
    <>
      {!embedded ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={
          embedded
            ? "relative flex min-w-0 w-full flex-col gap-5"
            : "fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] translate-x-0 flex-col border-l border-slate-200 bg-slate-50 transition-transform duration-300 ease-out"
        }
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white pb-5">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                  <button type="button" onClick={onClose} className="hover:text-admin-600">Лиды</button>
                  <span>→</span>
                  <span>Лид #{leadId.slice(0, 8)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="wrap-break-word text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {loading ? "Загрузка..." : lead?.primaryContact.fullName ?? "Лид"}
                  </h2>
                  {lead ? (
                    <LeadStatusPill status={lead.status}/>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {lead?.source ? `${sourceLabel(lead.source)} · ` : ""}{lead ? `Подана ${formatLeadDateTime(lead.createdAt)}` : "Полная карточка лида"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={embedded ? "Назад к лидам" : "Закрыть карточку лида"}
                className={embedded ? "shrink-0 rounded-lg p-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-admin-600" : "rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"}
              >
                {embedded ? <><span aria-hidden="true">←</span><span className="hidden sm:inline"> Назад к лидам</span></> : "✕"}
              </button>
            </div>
            {lead ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {isActiveLead(lead) && <><Button type="button" variant="secondary" onClick={() => setWorkMode("CONTACT")}><Phone className="h-3.5 w-3.5" /> Записать контакт</Button>
                  <Button type="button" variant="secondary" onClick={() => setWorkMode("PLAN")}>План работы</Button>
</>}
                {trialBooking?.status === "SCHEDULED" && <Button type="button" variant="secondary" onClick={() => navigate(`/admin/trials/${trialBooking.id}`)}><CalendarDays className="h-3.5 w-3.5" /> Открыть пробное</Button>}
                {lead.status === "CONVERTED" && (lead.clientId || conversionResult?.clientId) ? <Button type="button" className="text-xs" onClick={() => navigate(`/admin/clients/${encodeURIComponent(lead.clientId || conversionResult!.clientId)}/overview`)}>Открыть клиента</Button> : null}
              </div>
            ) : null}
          </div>
          <div className="px-5"><ToggleGroup type="single" value={activeTab} onValueChange={(value) => { if (value) setActiveTab(value as LeadDetailTab); }} aria-label="Навигация лида" className="w-full justify-start overflow-x-auto">
              <ToggleGroupItem value="overview">Обзор</ToggleGroupItem>
              <ToggleGroupItem value="trial">Пробное</ToggleGroupItem>
              <ToggleGroupItem value="activity">Активность</ToggleGroupItem>
          </ToggleGroup></div>
          {lead ? (
            <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-admin-600">Следующее действие</div>
                <div className="mt-1 wrap-break-word ui-section-title">
                  <p>{nextStep(lead)}</p>
                  {isActiveLead(lead) && lead.work?.nextActionAt && <div className={`mt-1 text-sm ${overdue(lead) ? "text-red-700" : "text-slate-600"}`}>{overdue(lead) ? "Просрочено · " : "Срок · "}{new Date(lead.work.nextActionAt).toLocaleString("ru-RU")}</div>}
                  {isActiveLead(lead) && <div className="mt-1 text-xs text-slate-600">Приоритет: {PRIORITY_LABELS[lead.work?.priority ?? "NORMAL"]}</div>}
                </div>
              </div>
              {isActiveLead(lead) && lead.work?.nextAction && <Button size="sm" variant="secondary" isLoading={taskBusy} onClick={async () => {
                setTaskBusy(true);
                try { await LeadApi.updateWork(lead.id, { operation: "COMPLETE", version: lead.work?.version ?? 0, priority: lead.work?.priority ?? "NORMAL" }); await refreshLead(); toast.success("Действие выполнено"); }
                catch (reason) { toast.error(reason instanceof Error ? reason.message : "Не удалось завершить действие"); }
                finally { setTaskBusy(false); }
              }}>Выполнено</Button>}
            </div>
          ) : null}
        </div>

        <div className={`min-w-0 flex-1 ${embedded ? "" : "overflow-y-auto p-5"}`}>
          {loading ? (
            <LoadingState label="Загрузка карточки лида..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : lead ? (
            <div className="min-w-0">
              {activeTab === "activity" ? (
                <SectionCard className="p-5"><LeadTimeline activities={activities} loading={activitiesLoading} error={activitiesError} /></SectionCard>
              ) : null}
              {activeTab === "trial" ? (
                <SectionCard className="p-5">
                  <div className="flex items-center gap-2 ui-section-title"><CalendarDays className="h-4 w-4 text-emerald-600" /> Пробное занятие</div>
                  {(lead.currentTrials ?? []).length ? (lead.currentTrials ?? []).map(trial => <div key={trial.id} className="mt-4 rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium">{trial.studentName || "Участник"}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatTrialBookingTime(trial)} · {trial.groupName || "Группа не указана"} · {trialStatusLabel(trial.status)}</p>
                    <Button type="button" className="mt-3" onClick={() => navigate(`/admin/trials/${trial.id}`)}>Открыть пробное</Button>
                    <p className="mt-2 text-xs text-slate-600">Посещение, результат, перенос и отмена — в карточке пробного.</p>
                  </div>) : <p className="mt-4 text-sm text-slate-600">Пробное ещё не назначено.</p>}
                  {lead.status === "IN_PROGRESS" && <Button type="button" className="mt-4" onClick={() => setShowTrialModal(true)}>Назначить пробное</Button>}
                </SectionCard>
              ) : null}
              {activeTab === "overview" && <LeadDetailOverview lead={lead} activities={activities} activitiesLoading={activitiesLoading} activitiesError={activitiesError} onQualify={() => setShowQualifyModal(true)} onPreferences={() => setShowPreferences(true)} onActivity={() => setActiveTab("activity")} onTrial={id => { void navigate(`/admin/trials/${id}`); }} />}
            </div>
          ) : null}
        </div>

        {lead && actions.length > 0 ? (
          <div className="sticky bottom-0 rounded-xl border border-slate-200 bg-white px-5 py-3">
            <LeadActions
              layout={embedded ? "toolbar" : "stack"}
              actions={actions}
              loadingActionType={loadingActionType}
              className="pt-1"
              onAction={(action) => {
                void handleAction(action);
              }}
            />
          </div>
        ) : null}
      </aside>

      {workMode && lead && <LeadWorkModal lead={lead} mode={workMode} onClose={() => setWorkMode(null)} onSaved={async () => { await refreshLead(); await onUpdated(); }} />}
      {showPreferences && lead && <LeadPreferencesModal lead={lead} onClose={() => setShowPreferences(false)} onSaved={async result => { setLead(result); await refreshLead(); await onUpdated(); }} />}
      {showQualifyModal ? (
        <QualifyLeadModal
          leadId={leadId}
          token={token}
          initialLead={lead}
          onClose={() => setShowQualifyModal(false)}
          onSuccess={async () => {
            await onUpdated();
            setShowQualifyModal(false);
            await refreshLead();
          }}
        />
      ) : null}

        {showTrialModal && lead ? (
          <ScheduleTrialModal
            lead={lead}
            branchId={branchId}
            token={token}
            onClose={() => setShowTrialModal(false)}
            onSuccess={async (trialId) => {
            await onUpdated();
            setShowTrialModal(false);
            await refreshLead();
            if (trialId) navigate(`/admin/trials/${trialId}`);
          }}
        />
      ) : null}

      {lead && rejectingAction ? (
        <LeadLossModal
          isOpen={Boolean(lead && rejectingAction)}
          lead={lead}
          event={getLeadActionEvent(rejectingAction)}
          reasons={lossReasons}
          loadingReasons={lossReasonsLoading}
          reasonsError={lossReasonsError}
          submitting={rejectSubmitLoading}
          onClose={() => {
            if (rejectSubmitLoading) return;
            setRejectingAction(null);
          }}
          onConfirm={async ({ lostReasonCode, lostComment }) => {
            if (!rejectingAction) return;
            setRejectSubmitLoading(true);
            setError(null);
            try {
              const response = await LeadApi.sendLeadEvent(
                lead.id,
                {
                  event: getLeadActionEvent(rejectingAction),
                  lostReasonCode,
                  lostComment,
                },
                token
              );
              toast.success("Причина потери сохранена");
              setRejectingAction(null);
              await onUpdated();
              if (response?.lead) {
                setLead(response.lead);
                await refreshActivities();
              } else {
                await refreshLead();
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

      {lead ? (
        <ConvertLeadModal
          isOpen={showConvertModal}
          leadName={lead.primaryContact.fullName || "Лид"}
          leadPhone={lead.primaryContact.phone}
          leadStatus={lead.status}
          branchId={branchId}
          participants={lead.participants ?? []}
          leadType={lead.leadType}
          submitting={convertSubmitting}
          onClose={() => {
            if (convertSubmitting) return;
            setShowConvertModal(false);
          }}
          onSubmit={async (payload) => {
            setConvertSubmitting(true);
            setError(null);
            try {
              const result = await LeadApi.convertLeadToClient(lead.id, payload, token);
              setConversionResult(result);
              toast.success("Клиент оформлен");
              setShowConvertModal(false);
              await onUpdated();
              await refreshLead();
            } catch (err) {
              console.error(err);
              setError(
                err instanceof Error ? err.message : "Не удалось оформить клиента"
              );
              throw err;
            } finally {
              setConvertSubmitting(false);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default LeadDrawer;
