import React, { useEffect, useMemo, useState } from "react";
import { CoachApi, Coach } from "../сoaches/coach.api";
import { GroupApi, GroupApiModel } from "../groups/group.api";
import { Lead, ScheduleTrialPayload } from "./types";
import { LeadApi } from "./lead.api";

interface ScheduleTrialModalProps {
  lead: Lead;
  branchId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const DEFAULT_DURATION = 60;

const getToday = () => new Date().toISOString().slice(0, 10);

const ScheduleTrialModal: React.FC<ScheduleTrialModalProps> = ({
  lead,
  branchId,
  token,
  onClose,
  onSuccess,
}) => {
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [childIndex, setChildIndex] = useState(0);
  const [groupId, setGroupId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [trialDate, setTrialDate] = useState(getToday());
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const [groupsData, coachesPage] = await Promise.all([
          GroupApi.listByBranch(branchId, token),
          CoachApi.listByBranch(branchId, token, 0, 100),
        ]);

        if (!isMounted) return;

        setGroups(groupsData.filter((group) => group.status === "ACTIVE"));
        setCoaches(coachesPage.content.filter((coach) => coach.active));
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setOptionsError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить группы и тренеров"
        );
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [branchId, token]);

  const selectedChild = lead.children[childIndex] ?? null;

  const isValid = useMemo(() => {
    if (!selectedChild) return false;
    if (!trialDate || !startTime) return false;
    if (!Number.isFinite(duration) || duration <= 0) return false;
    return Boolean(groupId || coachId);
  }, [selectedChild, trialDate, startTime, duration, groupId, coachId]);

  const handleSubmit = async () => {
    if (!selectedChild || !isValid) return;

    const payload: ScheduleTrialPayload = {
      childName: selectedChild.childName,
      childAge: selectedChild.childAge,
      trialDate,
      startTime,
      duration,
      ...(groupId ? { groupId } : {}),
      ...(coachId ? { coachId } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };

    setSubmitting(true);
    setSubmitError(null);

    try {
      await LeadApi.scheduleTrial(lead.id, payload, token);
      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(
        err instanceof Error ? err.message : "Не удалось назначить пробное"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="heading-font text-xl font-semibold text-slate-900">
              Назначить пробное занятие
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {lead.parentName}. Выберите ребенка, дату и исполнителя.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {optionsLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : (
            <div className="space-y-5">
              {optionsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {optionsError}
                </div>
              ) : null}

              {lead.children.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  У лида нет детей. Сначала квалифицируйте лид или добавьте данные
                  ребенка.
                </div>
              ) : null}

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ребенок
                  </span>
                  <select
                    value={String(childIndex)}
                    onChange={(event) => setChildIndex(Number(event.target.value))}
                    disabled={lead.children.length === 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    {lead.children.map((child, index) => (
                      <option key={`${child.childName}-${index}`} value={index}>
                        {child.childName} ({child.childAge})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Группа
                  </span>
                  <select
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                  >
                    <option value="">Без группы</option>
                    {groups.map((group) => (
                      <option key={group.groupId} value={group.groupId}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Тренер
                  </span>
                  <select
                    value={coachId}
                    onChange={(event) => setCoachId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                  >
                    <option value="">Без тренера</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.firstName} {coach.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Если выбрана группа, тренер необязателен.
                  <br />
                  Если выбран тренер, группа необязательна.
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Дата
                  </span>
                  <input
                    type="date"
                    value={trialDate}
                    onChange={(event) => setTrialDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Время
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Длительность
                  </span>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                  />
                </label>
              </section>

              <label className="space-y-1 text-sm text-slate-600">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Комментарий
                </span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-admin-400"
                />
              </label>

              {!groupId && !coachId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Нужно выбрать либо группу, либо тренера.
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || optionsLoading || submitting || Boolean(optionsError)}
            className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-admin-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Сохранение..." : "Назначить пробное"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTrialModal;
