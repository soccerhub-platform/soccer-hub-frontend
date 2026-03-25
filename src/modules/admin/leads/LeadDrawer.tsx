import React, { useEffect, useState } from "react";
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import QualifyLeadModal from "./QualifyLeadModal";
import { LeadDetails } from "./types";
import { LeadApi } from "./lead.api";
import ScheduleTrialModal from "./ScheduleTrialModal";
import { GroupApi } from "../groups/group.api";
import {
  childGenderLabel,
  experienceLabel,
  formatLeadDateTime,
  formatPreferredDays,
  formatTrialTime,
  LEAD_STATUS_LABELS,
  trialStatusLabel,
} from "./lead.format";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

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

const canQualify = (status?: string) =>
  status === "NEW" || status === "CONTACTED";

const canScheduleTrial = (status?: string) => status === "QUALIFIED";

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
  const trialChild =
    lead?.trial && lead.children.find((child) => child.id === lead.trial?.childId);

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

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-300"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[460px] translate-x-0 flex-col border-l border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_0_60px_-20px_rgba(15,23,42,0.45)] transition-transform duration-300 ease-out">
        <div className="border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="heading-font text-2xl font-semibold text-slate-900">
              {loading ? "Загрузка..." : lead?.parentName ?? "Лид"}
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
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : lead ? (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
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
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {lead.parentName}
                </h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-slate-400" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                    <span>{lead.email || "Email не указан"}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <UserGroupIcon className="h-4 w-4" />
                  Дети
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
                  {lead.children.length > 0 ? (
                    <div className="space-y-2">
                      {lead.children.map((child) => (
                        <div
                          key={child.id}
                          className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
                        >
                          <div className="font-medium text-slate-800">
                            {child.childName} ({child.childAge})
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Пол: {childGenderLabel(child.gender)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Уровень: {experienceLabel(child.experience)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">Нет данных о детях</div>
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
                        {formatPreferredDays(lead.qualificationData?.preferredDays)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Опыт
                      </div>
                      <div className="mt-1">
                        {experienceLabel(lead.qualificationData?.experience)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Заметки
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">
                        {lead.qualificationData?.notes || "Не указано"}
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
                          Ребенок
                        </div>
                        <div className="mt-1">
                          {trialChild
                            ? `${trialChild.childName} (${trialChild.childAge})`
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
            </div>
          ) : null}
        </div>

        {lead && (canQualify(lead.status) || canScheduleTrial(lead.status)) ? (
          <div className="border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div className="flex gap-3">
              {canQualify(lead.status) ? (
                <button
                  type="button"
                  onClick={() => setShowQualifyModal(true)}
                  className={buttonStyles("primary", "md", "flex-1 rounded-2xl")}
                >
                  Квалифицировать
                </button>
              ) : null}
              {canScheduleTrial(lead.status) ? (
                <button
                  type="button"
                  onClick={() => setShowTrialModal(true)}
                  className={buttonStyles("soft", "md", "flex-1 rounded-2xl")}
                >
                  Назначить пробное
                </button>
              ) : null}
            </div>
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
            const data = await LeadApi.getById(leadId, token);
            setLead(data);
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
            const data = await LeadApi.getById(leadId, token);
            setLead(data);
          }}
        />
      ) : null}
    </>
  );
};

export default LeadDrawer;
