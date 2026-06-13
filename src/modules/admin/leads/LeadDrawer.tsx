import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import {
  ArrowPathRoundedSquareIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import QualifyLeadModal from "./QualifyLeadModal";
import { LeadAction, LeadActivity, LeadDetails, LeadLossReason } from "./types";
import { LeadApi } from "./lead.api";
import ScheduleTrialModal from "./ScheduleTrialModal";
import { GroupApi } from "../groups/group.api";
import LeadActions from "./LeadActions";
import LeadTimeline from "./LeadTimeline";
import LeadLossModal from "./LeadLossModal";
import ConvertLeadModal from "./ConvertLeadModal";
import { Button, ErrorState, LoadingState, SectionCard } from "../../../shared/ui";
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
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

const statusBadgeClassName = (status?: string) => {
  switch (status) {
    case "NEW":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "CONTACTED":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "QUALIFIED":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "TRIAL_SCHEDULED":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "TRIAL_DONE":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "WAITING_PAYMENT":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "WON":
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
  onClose,
  onUpdated,
}) => {
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
  const [rejectingEvent, setRejectingEvent] = useState<
    "REJECT" | "LOST" | "NO_SHOW" | "POST_TRIAL_REJECT" | null
  >(null);
  const [lossReasons, setLossReasons] = useState<LeadLossReason[]>([]);
  const [lossReasonsLoading, setLossReasonsLoading] = useState(false);
  const [lossReasonsError, setLossReasonsError] = useState<string | null>(null);
  const [rejectSubmitLoading, setRejectSubmitLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Awaited<
    ReturnType<typeof GroupApi.listByBranch>
  >>([]);
  const [conversionResult, setConversionResult] = useState<{
    clientId: string;
    playerId: string;
    contractId: string;
    status: string;
  } | null>(null);
  const trialParticipant =
    lead?.trial &&
    lead.participants.find((participant) => participant.id === lead.trial?.participantId);
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
    let isMounted = true;

    const loadGroups = async () => {
      if (!branchId || !token) return;
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const list = await GroupApi.listByBranch(branchId, token);
        if (!isMounted) return;
        setGroups(
          list.filter(
            (item) =>
              item.status === "ACTIVE" &&
              (!lead?.leadType || !item.audienceType || item.audienceType === lead.leadType)
          )
        );
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setGroupsError("Не удалось загрузить группы");
        setGroups([]);
      } finally {
        if (isMounted) {
          setGroupsLoading(false);
        }
      }
    };

    void loadGroups();
    return () => {
      isMounted = false;
    };
  }, [branchId, lead?.leadType, token]);

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
  const isAlreadyConverted = Boolean(
    lead?.status === "WON" ||
      lead?.clientId ||
      lead?.playerId ||
      lead?.contractId ||
      conversionResult?.clientId
  );
  const actions = isAlreadyConverted
    ? rawActions.filter(
        (action) => action.type !== "CONVERT" && action.type !== "CONFIRM_PAYMENT"
      )
    : rawActions;
  const hasConvertAction = rawActions.some((action) => action.type === "CONVERT");
  const canUseConvertRole = userHasRole(token, [
    "ADMIN",
    "SUPER_ADMIN",
    "DISPATCHER",
  ]);
  const canConvertByStatus = Boolean(
    lead &&
      ["TRIAL_DONE", "QUALIFIED", "TRIAL_SCHEDULED", "WON"].includes(lead.status)
  );
  const canShowConvertButton =
    canUseConvertRole && canConvertByStatus && !hasConvertAction && !isAlreadyConverted;
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

  const handleAction = async (action: LeadAction) => {
    if (!lead) return;

    if (action.type === "QUALIFY") {
      setShowQualifyModal(true);
      return;
    }

    if (action.type === "SCHEDULE_TRIAL") {
      setShowTrialModal(true);
      return;
    }

    if (action.type === "CONVERT") {
      if (isAlreadyConverted) {
        toast("Лид уже конвертирован в клиента");
        return;
      }
      setShowConvertModal(true);
      return;
    }

    if (action.type === "CONFIRM_PAYMENT") {
      if (isAlreadyConverted) {
        toast("Лид уже конвертирован в клиента");
        return;
      }
      setShowConvertModal(true);
      toast("Сначала выполните конвертацию лида в клиента");
      return;
    }

    if (
      action.type === "REJECT" ||
      action.type === "LOST" ||
      action.type === "NO_SHOW" ||
      action.type === "POST_TRIAL_REJECT"
    ) {
      setRejectingEvent(action.type);
      if (!lossReasons.length && !lossReasonsLoading) {
        setLossReasonsLoading(true);
        setLossReasonsError(null);
        try {
          const reasons = await LeadApi.getLeadLossReasons(token);
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

    setLoadingActionType(action.type);
    setError(null);

    try {
      await LeadApi.sendLeadEvent(lead.id, { event: action.type }, token);
      await onUpdated();
      await refreshLead();
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
      <div
        className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] translate-x-0 flex-col border-l border-slate-200 bg-slate-50 shadow-[0_0_60px_-24px_rgba(15,23,42,0.45)] transition-transform duration-300 ease-out">
        <div className="border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="heading-font text-2xl font-semibold text-slate-900">
              {loading ? "Загрузка..." : lead?.primaryContact.fullName ?? "Лид"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Полная карточка лида</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
          >
            ✕
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <LoadingState label="Загрузка карточки лида..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : lead ? (
            <div className="space-y-5">
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
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                    {lead.leadType === "ADULT" ? "Взрослый клуб" : "Детский клуб"}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {lead.primaryContact.fullName}
                </h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-slate-400" />
                    <span>{lead.primaryContact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                    <span>{lead.primaryContact.email || "Email не указан"}</span>
                  </div>
                </div>
              </SectionCard>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <UserGroupIcon className="h-4 w-4" />
                  Ответственный
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {lead.assignedAdmin
                        ? isCurrentUserAssigned
                          ? "В"
                          : assignedAdminInitials || "?"
                        : <IdentificationIcon className="h-5 w-5 text-slate-400" />}
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

              {canShowConvertButton || isAlreadyConverted ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                    Конвертация
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    {isAlreadyConverted ? (
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="font-medium text-emerald-700">
                          Лид уже конвертирован
                        </div>
                        {lead.clientId || conversionResult?.clientId ? (
                          <div>Client ID: {lead.clientId || conversionResult?.clientId}</div>
                        ) : null}
                        {lead.playerId || conversionResult?.playerId ? (
                          <div>Player ID: {lead.playerId || conversionResult?.playerId}</div>
                        ) : null}
                        {lead.contractId || conversionResult?.contractId ? (
                          <div>
                            Contract ID: {lead.contractId || conversionResult?.contractId}
                          </div>
                        ) : null}
                        {!lead.clientId && !conversionResult?.clientId ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Backend вернул статус клиента, но не передал ID клиента.
                          </div>
                        ) : null}
                        <div>Статус: {lead.status || conversionResult?.status || "WON"}</div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setShowConvertModal(true)}
                      >
                        Конвертировать в клиента
                      </Button>
                    )}
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <UserGroupIcon className="h-4 w-4" />
                  Участники
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
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
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  Комментарий
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
                  {lead.comment || "Комментарий отсутствует"}
                </div>
              </section>

              {lead.status === "LOST" || Boolean(lead.lostReasonCode) ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    Причина потери
                  </div>
                  <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-slate-700 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
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
                  <CalendarDaysIcon className="h-4 w-4" />
                  Квалификация
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
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
                  <CalendarDaysIcon className="h-4 w-4" />
                  Пробное занятие
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
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
                          {coachName || lead.trial.coachId || "Не указано"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Группа
                        </div>
                        <div className="mt-1 break-all">
                          {groupName || lead.trial.groupId || "Не указано"}
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

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <ClockIcon className="h-4 w-4" />
                  Активность
                </div>
                <LeadTimeline
                  activities={activities}
                  loading={activitiesLoading}
                  error={activitiesError}
                />
              </section>
            </div>
          ) : null}
        </div>

        {lead && actions.length > 0 ? (
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
          onSuccess={async () => {
            await onUpdated();
            setShowTrialModal(false);
            await refreshLead();
          }}
        />
      ) : null}

      {lead && rejectingEvent ? (
        <LeadLossModal
          isOpen={Boolean(lead && rejectingEvent)}
          lead={lead}
          event={rejectingEvent}
          reasons={lossReasons}
          loadingReasons={lossReasonsLoading}
          reasonsError={lossReasonsError}
          submitting={rejectSubmitLoading}
          onClose={() => {
            if (rejectSubmitLoading) return;
            setRejectingEvent(null);
          }}
          onConfirm={async ({ lostReasonCode, lostComment }) => {
            setRejectSubmitLoading(true);
            setError(null);
            try {
              await LeadApi.sendLeadEvent(
                lead.id,
                { event: rejectingEvent, lostReasonCode, lostComment },
                token
              );
              toast.success("Причина потери сохранена");
              setRejectingEvent(null);
              await onUpdated();
              await refreshLead();
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
          participants={lead.participants ?? []}
          groups={groups}
          loadingGroups={groupsLoading}
          groupsError={groupsError}
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
              toast.success("Лид успешно конвертирован в клиента");
              setShowConvertModal(false);
              await onUpdated();
              await refreshLead();
            } catch (err) {
              console.error(err);
              setError(
                err instanceof Error ? err.message : "Не удалось конвертировать лид"
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
