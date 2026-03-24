import React, { useEffect, useState } from "react";
import { CalendarDaysIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import QualifyLeadModal from "./QualifyLeadModal";
import { LeadDetails } from "./types";
import { LeadApi } from "./lead.api";

interface LeadDrawerProps {
  leadId: string;
  token: string;
  onClose: () => void;
  onQualified: () => Promise<void> | void;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONTACTED: "Связались",
  QUALIFIED: "Квалифицирован",
  TRIAL_SCHEDULED: "Пробная назначена",
  TRIAL_DONE: "Пробная проведена",
  WAITING_PAYMENT: "Ждут оплату",
  WON: "Успешный",
  LOST: "Потерянный",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const canQualify = (status?: string) => status === "NEW" || status === "CONTACTED";

const LeadDrawer: React.FC<LeadDrawerProps> = ({
  leadId,
  token,
  onClose,
  onQualified,
}) => {
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQualifyModal, setShowQualifyModal] = useState(false);

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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="heading-font text-2xl font-semibold text-slate-900">
              {loading ? "Загрузка..." : lead?.parentName ?? "Лид"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Полная карточка лида</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : lead ? (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-admin-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-admin-700">
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                    {formatDateTime(lead.createdAt)}
                  </span>
                </div>
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
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  {lead.children.length > 0 ? (
                    <div className="space-y-2">
                      {lead.children.map((child) => (
                        <div
                          key={`${lead.id}-${child.childName}`}
                          className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                          {child.childName} ({child.childAge})
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
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  {lead.comment || "Комментарий отсутствует"}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Qualification
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        preferredDays
                      </div>
                      <div className="mt-1">{lead.preferredDays || "Не указано"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        experience
                      </div>
                      <div className="mt-1">{lead.experience || "Не указано"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        notes
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">
                        {lead.notes || "Не указано"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {lead && canQualify(lead.status) ? (
          <div className="border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => setShowQualifyModal(true)}
              className="w-full rounded-2xl bg-admin-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-admin-700"
            >
              Квалифицировать
            </button>
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
            await onQualified();
            onClose();
          }}
        />
      ) : null}
    </>
  );
};

export default LeadDrawer;
