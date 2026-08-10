import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  CalendarDays,
  MessagesSquare,
  Clock3,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import QualifyLeadModal from "./QualifyLeadModal";
import { LeadAction, LeadActivity, LeadDetails, LeadLossReason } from "./types";
import { LeadApi } from "./lead.api";
import ScheduleTrialModal from "./ScheduleTrialModal";
import { GroupApi } from "../groups/group.api";
import { TrialsApi } from "../trials/trials.api";
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
import { Button, ErrorState, LoadingState, SectionCard, Tabs, TabsList, TabsTrigger } from "../../../shared/ui";
import {
  experienceLabel,
  formatBirthDate,
  formatLeadDateTime,
  formatPreferredDays,
  formatTrialTime,
  LEAD_STATUS_LABELS,
  participantGenderLabel,
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

type LeadDetailTab = "overview" | "communications" | "trial" | "tasks" | "activity";

const statusBadgeClassName = (status?: string) => {
  switch (status) {
    case "NEW":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "TRIAL_SCHEDULED":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "DECISION_PENDING":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "CONTRACT_PENDING":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "PAYMENT_PENDING":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "CONVERTED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "LOST":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getCurrentUserId = (token: string) => {
  try {
    const decoded = jwtDecode<{ sub?: string }>(token);
    return decoded.sub ?? null;
  } catch {
    return null;
  }
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQualifyModal, setShowQualifyModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
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
  const trialParticipant =
    lead?.trial &&
    lead.participants.find((participant) => participant.id === lead.trial?.participantId);
  const convertibleParticipants = lead
    ? getConvertibleParticipants(lead)
    : [];
  const convertedParticipants = lead
    ? getConvertedParticipants(lead)
    : [];
  const currentUserId = getCurrentUserId(token);

  useEffect(() => {
    let isMounted = true;

    const loadLead = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await LeadApi.getById(leadId, token);
        if (!isMounted) return;
        setLead(data);
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
        toast("Нет детей, готовых к оформлению");
      } else {
        setShowConvertModal(true);
      }
      onInitialActionHandled?.();
    }
  }, [initialAction, isOpen, lead, loading, onInitialActionHandled, convertibleParticipants.length]);

  useEffect(() => {
    let isMounted = true;

    const loadRelations = async () => {
      if (!lead?.trial) {
        setCoachName(null);
        setGroupName(null);
        return;
      }

      try {
        const [coach, group] = await Promise.all([
          lead.trial.coachId
            ? LeadApi.getCoachById(lead.trial.coachId, token)
            : Promise.resolve(null),
          lead.trial.groupId
            ? GroupApi.getById(lead.trial.groupId, token)
            : Promise.resolve(null),
        ]);

        if (!isMounted) return;
        setCoachName(
          coach ? `${coach.firstName} ${coach.lastName}`.trim() : null
        );
        setGroupName(group?.name ?? null);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setCoachName(null);
        setGroupName(null);
      }
    };

    loadRelations();

    return () => {
      isMounted = false;
    };
  }, [lead?.trial, token]);

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

  const isCurrentUserAssigned =
    !!lead?.assignedAdmin?.id && lead.assignedAdmin.id === currentUserId;
  const assignedAdminDisplayName = lead?.assignedAdmin?.name?.trim() || null;
  const rawActions = lead?.actions ?? [];
  const hasConvertedParticipants =
    convertedParticipants.length > 0 ||
    Boolean(conversionResult?.playerId);
  const conversionPlayerId =
    conversionResult?.playerId ||
    convertedParticipants[0]?.playerId ||
    "";
  const actions = lead
    ? buildLeadUiActions(lead, rawActions)
    : [];
  const canUseConvertRole = userHasRole(token, [
    "ADMIN",
    "SUPER_ADMIN",
    "DISPATCHER",
  ]);
  const canConvertByStatus = Boolean(
    lead && !["LOST", "CONVERTED"].includes(lead.status)
  );
  const canShowConvertButton =
    canUseConvertRole &&
    canConvertByStatus &&
    convertibleParticipants.length > 0;
  const assignedAdminInitials = assignedAdminDisplayName
    ? assignedAdminDisplayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "";

  const refreshLead = async () => {
    const [leadData, activitiesData] = await Promise.all([
      LeadApi.getById(leadId, token),
      LeadApi.getActivities(leadId, token),
    ]);
    setLead(leadData);
    setActivities(activitiesData);
    setActivitiesError(null);
  };

  const refreshActivities = async () => {
    const activitiesData = await LeadApi.getActivities(leadId, token);
    setActivities(activitiesData);
    setActivitiesError(null);
  };

  const handleAction = async (action: LeadAction) => {
    if (!lead) return;

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
        toast("Нет детей, готовых к оформлению");
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
      const response = await LeadApi.sendLeadEvent(
        lead.id,
        { event: getLeadActionEvent(action) },
        token
      );
      if (response?.lead) {
        setLead(response.lead);
        await refreshActivities();
      } else {
        await refreshLead();
      }
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
            ? "relative flex min-h-[calc(100vh-7rem)] w-full flex-col overflow-visible bg-transparent"
            : "fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] translate-x-0 flex-col border-l border-slate-200 bg-slate-50 transition-transform duration-300 ease-out"
        }
      >
        <div className="border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <button type="button" onClick={onClose} className="hover:text-[#0066cc]">Лиды</button>
                  <span>→</span>
                  <span>Лид #{leadId.slice(0, 8)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="ui-modal-title">
                    {loading ? "Загрузка..." : lead?.primaryContact.fullName ?? "Лид"}
                  </h2>
                  {lead ? (
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${statusBadgeClassName(lead.status)}`}>
                      {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {lead?.source ? `${lead.source} · ` : ""}{lead ? `Подана ${formatLeadDateTime(lead.createdAt)}` : "Полная карточка лида"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={embedded ? "Назад к лидам" : "Закрыть карточку лида"}
                className={embedded ? "text-sm font-medium text-slate-500 transition hover:text-[#0066cc]" : "rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"}
              >
                {embedded ? "← Назад к лидам" : "✕"}
              </button>
            </div>
            {lead ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="text-xs" onClick={() => window.open(`tel:${lead.primaryContact.phone}`, "_self")}>
                  <Phone className="h-3.5 w-3.5" /> Связаться
                </Button>
                {lead.status === "NEW" || lead.status === "IN_PROGRESS" ? (
                  <Button type="button" className="text-xs" onClick={() => setShowTrialModal(true)}>
                    <CalendarDays className="h-3.5 w-3.5" /> Назначить пробное
                  </Button>
                ) : null}
                {lead.status === "TRIAL_SCHEDULED" ? (
                  <Button type="button" className="text-xs" onClick={() => setActiveTab("trial")}>
                    <CalendarDays className="h-3.5 w-3.5" /> Открыть пробное
                  </Button>
                ) : null}
                {canShowConvertButton && lead.status === "DECISION_PENDING" ? <Button type="button" className="text-xs" onClick={() => setShowConvertModal(true)}>Оформить клиента</Button> : null}
                {lead.status === "CONVERTED" && (lead.clientId || conversionResult?.clientId) ? <Button type="button" className="text-xs" onClick={() => navigate(`/admin/clients/${encodeURIComponent(lead.clientId || conversionResult!.clientId)}/overview`)}>Открыть клиента</Button> : null}
              </div>
            ) : null}
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeadDetailTab)} className="px-5">
            <TabsList aria-label="Навигация лида" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="trial">Пробное</TabsTrigger>
              <TabsTrigger value="activity">Активность</TabsTrigger>
            </TabsList>
          </Tabs>
          {lead ? (
            <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#0066cc]">Следующее действие</div>
                <div className="mt-1 truncate ui-section-title">
                  {lead.status === "NEW" ? "Взять лид в работу" : lead.status === "IN_PROGRESS" ? "Назначить пробное занятие" : lead.status === "TRIAL_SCHEDULED" ? "Провести пробное занятие" : lead.status === "DECISION_PENDING" ? "Оформить клиента" : lead.status === "CONVERTED" ? "Клиент оформлен" : "Лид закрыт"}
                </div>
              </div>
              {lead.status === "IN_PROGRESS" ? <Button size="sm" type="button" onClick={() => setShowTrialModal(true)}>Назначить</Button> : null}
            </div>
          ) : null}
        </div>

        <div className={`flex-1 overflow-y-auto py-5 ${embedded ? "px-0" : "px-6"}`}>
          {loading ? (
            <LoadingState label="Загрузка карточки лида..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : lead ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
              {activeTab === "activity" ? (
                <SectionCard className="p-5"><LeadTimeline activities={activities} loading={activitiesLoading} error={activitiesError} /></SectionCard>
              ) : null}
              {activeTab === "trial" ? (
                <SectionCard className="p-5">
                  <div className="flex items-center gap-2 ui-section-title"><CalendarDays className="h-4 w-4 text-emerald-600" /> Пробное занятие</div>
                  <div className="mt-4 text-sm text-slate-600">{lead.trial ? `${formatTrialTime(lead.trial.trialDate, lead.trial.startTime, lead.trial.endTime)} · ${lead.trial.groupName || groupName || "Группа не указана"}` : "Пробное не назначено"}</div>
                  <Button type="button" className="mt-4" onClick={() => setShowTrialModal(true)}>Назначить пробное</Button>
                </SectionCard>
              ) : null}
              {activeTab === "overview" ? (
              <>
              <SectionCard className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClassName(
                      lead.status
                    )}`}
                  >
                    {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                    {formatLeadDateTime(lead.createdAt)}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0066cc]">
                    {lead.leadType === "ADULT" ? "Взрослый клуб" : "Детский клуб"}
                  </span>
                </div>
                <h3 className="mt-4 ui-card-title">
                  {lead.primaryContact.fullName}
                </h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{lead.primaryContact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{lead.primaryContact.email || "Email не указан"}</span>
                  </div>
                </div>
              </SectionCard>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <Users className="h-4 w-4" />
                  Ответственный
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {lead.assignedAdmin
                        ? isCurrentUserAssigned
                          ? "В"
                          : assignedAdminInitials || "?"
                        : <Badge className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Текущий ответственный
                      </div>
                      <div className="mt-1 break-all text-sm font-medium text-slate-800">
                        {lead.assignedAdmin
                          ? isCurrentUserAssigned
                            ? "👤 Вы"
                            : `👤 ${assignedAdminDisplayName || lead.assignedAdmin.id}`
                          : "Не назначен"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {!embedded && (canShowConvertButton || hasConvertedParticipants) ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Клиент
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    {hasConvertedParticipants ? (
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="font-medium text-emerald-700">
                          Клиент оформлен
                        </div>
                        <div className="text-slate-500">
                          Дальше можно создать договор или отдельно зачислить ученика в группу.
                        </div>
                        <div className="grid gap-2 pt-2 sm:grid-cols-2">
                          {(lead.clientId || conversionResult?.clientId) ? (
                            <Button
                              type="button"
                              className="text-xs"
                              onClick={() =>
                                navigate(
                                  `/admin/clients/${encodeURIComponent(
                                    lead.clientId || conversionResult!.clientId
                                  )}/overview`
                                )
                              }
                            >
                              Открыть клиента
                            </Button>
                          ) : null}
                          {conversionPlayerId ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/admin/students/${encodeURIComponent(conversionPlayerId)}/overview`
                                )
                              }
                            >
                              Открыть ученика
                            </Button>
                          ) : null}
                        </div>
                        {(lead.clientId || conversionResult?.clientId) && conversionPlayerId ? (
                          <div className="grid gap-2 pt-2 sm:grid-cols-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/admin/contracts?drawer=create-contract&clientId=${encodeURIComponent(lead.clientId || conversionResult!.clientId)}&playerId=${encodeURIComponent(conversionPlayerId)}`
                                )
                              }
                            >
                              Создать договор
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/admin/students/${encodeURIComponent(conversionPlayerId)}/overview?drawer=enroll`
                                )
                              }
                            >
                              Зачислить в группу
                            </Button>
                          </div>
                        ) : null}
                        {!lead.clientId && !conversionResult?.clientId ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Backend вернул статус клиента, но не передал ID клиента.
                          </div>
                        ) : null}
                        <div className="text-xs text-slate-400">
                          Статус лида: {LEAD_STATUS_LABELS[lead.status] ?? conversionResult?.status ?? "Клиент"}
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setShowConvertModal(true)}
                      >
                        Оформить клиента
                      </Button>
                    )}
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <Users className="h-4 w-4" />
                  Участники
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  {lead.participants.length > 0 ? (
                    <div className="space-y-2">
                      {lead.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
                        >
                          <div className="font-medium text-slate-800">
                            {participant.fullName}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Дата рождения: {formatBirthDate(participant.birthDate)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Пол: {participantGenderLabel(participant.gender, lead.leadType)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Уровень: {experienceLabel(participant.experience)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">Нет данных об участниках</div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <MessagesSquare className="h-4 w-4" />
                  Комментарий
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  {lead.comment || "Комментарий отсутствует"}
                </div>
              </section>

              {lead.status === "LOST" || Boolean(lead.lostReasonCode) ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <MessagesSquare className="h-4 w-4" />
                    Причина потери
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 text-sm text-slate-700">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Причина
                      </span>
                      <div className="mt-1">
                        {lead.lostReasonName || lead.lostReasonCode || "Не указано"}
                      </div>
                    </div>
                    {lead.lostComment ? (
                      <div className="mt-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Комментарий
                        </span>
                        <div className="mt-1 whitespace-pre-wrap">{lead.lostComment}</div>
                      </div>
                    ) : null}
                    {lead.lostAt ? (
                      <div className="mt-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Потерян
                        </span>
                        <div className="mt-1">{formatLeadDateTime(lead.lostAt)}</div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  Квалификация
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Предпочтительные дни
                      </div>
                      <div className="mt-1">
                        {formatPreferredDays(lead.preferredDays ?? lead.qualificationData?.preferredDays)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Опыт
                      </div>
                      <div className="mt-1">
                        {experienceLabel(lead.experience ?? lead.qualificationData?.experience)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Заметки
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">
                        {lead.notes ?? lead.qualificationData?.notes ?? "Не указано"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  Пробное занятие
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {lead.trial ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Участник
                        </div>
                        <div className="mt-1">
                          {trialParticipant
                            ? trialParticipant.fullName
                            : "Не указано"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Дата и время
                        </div>
                        <div className="mt-1">
                          {formatTrialTime(
                            lead.trial.trialDate,
                            lead.trial.startTime,
                            lead.trial.endTime
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Тренер
                        </div>
                        <div className="mt-1 break-all">
                          {lead.trial.coachName || lead.coachName || coachName || lead.trial.coachId || "Не указано"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Группа
                        </div>
                        <div className="mt-1 break-all">
                          {lead.trial.groupName || lead.groupName || groupName || lead.trial.groupId || "Не указано"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Статус
                        </div>
                        <div className="mt-1">{trialStatusLabel(lead.trial.status)}</div>
                      </div>
                      {lead.trial.comment ? (
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Комментарий
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {lead.trial.comment}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">Пробное не назначено</div>
                  )}
                </div>
              </section>

              <section className="space-y-3 lg:col-span-2">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  Активность
                </div>
                <LeadTimeline
                  activities={activities}
                  loading={activitiesLoading}
                  error={activitiesError}
                />
              </section>
              </>
              ) : null}
            </div>
          ) : null}
        </div>

        {!embedded && lead && actions.length > 0 ? (
          <div className="border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
            <LeadActions
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
            } finally {
              setConvertSubmitting(false);
            }
          }}
        />
      ) : null}
    </>
  );
};

const userHasRole = (token: string, allowed: string[]) => {
  try {
    const decoded = jwtDecode<{ roles?: string[]; authorities?: string[] }>(token);
    const roleList = [
      ...(Array.isArray(decoded.roles) ? decoded.roles : []),
      ...(Array.isArray(decoded.authorities) ? decoded.authorities : []),
    ];
    return roleList.some((role) => allowed.includes(role));
  } catch {
    return false;
  }
};

export default LeadDrawer;
