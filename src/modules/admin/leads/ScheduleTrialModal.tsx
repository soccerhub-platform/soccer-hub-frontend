import React, { useEffect, useMemo, useState } from "react";
import { CoachApi, Coach } from "../сoaches/coach.api";
import { GroupApi, GroupApiModel } from "../groups/group.api";
import { AvailableSlot, Lead, ScheduleTrialPayload } from "./types";
import { LeadApi } from "./lead.api";

interface ScheduleTrialModalProps {
  lead: Lead;
  branchId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const fieldClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-admin-400 focus:ring-4 focus:ring-admin-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const sectionClassName =
  "rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)]";

const getToday = () => new Date().toISOString().slice(0, 10);

const formatSlotLabel = (slot: AvailableSlot) => {
  if (slot.endTime) {
    return `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`;
  }

  return slot.startTime.slice(0, 5);
};

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
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
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
  const selectedChildId = selectedChild?.id ?? null;

  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);

    if (!trialDate || (!groupId && !coachId)) {
      return;
    }

    let isMounted = true;

    const loadSlots = async () => {
      setSlotsLoading(true);
      setSlotsError(null);

      try {
        const data = groupId
          ? await LeadApi.getAvailableGroupSlots(groupId, trialDate, token)
          : await LeadApi.getAvailableCoachSlots(coachId, trialDate, token);

        if (!isMounted) return;
        setSlots(data);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setSlotsError(
          err instanceof Error ? err.message : "Не удалось загрузить доступные слоты"
        );
      } finally {
        if (isMounted) {
          setSlotsLoading(false);
        }
      }
    };

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, [trialDate, groupId, coachId, token]);

  const isValid = useMemo(() => {
    if (!selectedChild) return false;
    if (!selectedChildId) return false;
    if (!trialDate) return false;
    if (!selectedSlot) return false;
    return Boolean(groupId || coachId);
  }, [selectedChild, selectedChildId, trialDate, selectedSlot, groupId, coachId]);

  const handleSubmit = async () => {
    if (!selectedChildId || !selectedSlot || !isValid) return;

    const payload: ScheduleTrialPayload = {
      childId: selectedChildId,
      slot: {
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
      },
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex h-[min(92vh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_24%)] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)] sm:rounded-[32px]">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-admin-100 bg-admin-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-admin-700">
                Trial Scheduling
              </div>
              <h3 className="heading-font text-2xl font-semibold text-slate-900">
                Назначить пробное занятие
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {lead.parentName}. Выберите ребенка, исполнителя и свободный слот.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 hidden grid-cols-3 gap-3 sm:grid">
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Шаг 1
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">
                Ребенок и исполнитель
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Шаг 2
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">Дата</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Шаг 3
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">
                Свободный слот
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_8%,#ffffff_22%)] px-4 py-4 sm:px-6 sm:py-6">
          {optionsLoading ? (
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-[28px] bg-slate-100" />
              <div className="h-24 animate-pulse rounded-[28px] bg-slate-100" />
              <div className="h-40 animate-pulse rounded-[28px] bg-slate-100" />
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

              <section className={sectionClassName}>
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                    Шаг 1
                  </div>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">
                    Кого и с кем записываем
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm text-slate-600">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Ребенок
                    </span>
                    <select
                      value={String(childIndex)}
                      onChange={(event) => setChildIndex(Number(event.target.value))}
                      disabled={lead.children.length === 0}
                      className={fieldClassName}
                    >
                      {lead.children.map((child, index) => (
                        <option key={`${child.childName}-${index}`} value={index}>
                          {child.childName} ({child.childAge})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Выберите либо группу, либо тренера.
                    <br />
                    Второе поле остается необязательным.
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm text-slate-600">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Группа
                    </span>
                    <select
                      value={groupId}
                      onChange={(event) => {
                        setGroupId(event.target.value);
                        if (event.target.value) {
                          setCoachId("");
                        }
                      }}
                      className={fieldClassName}
                    >
                      <option value="">Выбрать группу</option>
                      {groups.map((group) => (
                        <option key={group.groupId} value={group.groupId}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm text-slate-600">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Тренер
                    </span>
                    <select
                      value={coachId}
                      onChange={(event) => {
                        setCoachId(event.target.value);
                        if (event.target.value) {
                          setGroupId("");
                        }
                      }}
                      className={fieldClassName}
                    >
                      <option value="">Выбрать тренера</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className={sectionClassName}>
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                    Шаг 2
                  </div>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">
                    Когда провести занятие
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                  <label className="space-y-1.5 text-sm text-slate-600">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Дата
                    </span>
                    <input
                      type="date"
                      value={trialDate}
                      onChange={(event) => setTrialDate(event.target.value)}
                      className={fieldClassName}
                    />
                  </label>

                  <div className="rounded-2xl border border-admin-100 bg-admin-50/70 px-4 py-3 text-sm text-admin-900">
                    После выбора даты система загрузит только свободные слоты по
                    выбранной группе или тренеру. Ручной ввод времени отключен, чтобы
                    избежать конфликтов расписания.
                  </div>
                </div>
              </section>

              <section className={sectionClassName}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                      Шаг 3
                    </div>
                    <h4 className="mt-1 text-base font-semibold text-slate-900">
                      Выберите свободный слот
                    </h4>
                  </div>
                  {selectedSlot ? (
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Выбрано: {formatSlotLabel(selectedSlot)}
                    </div>
                  ) : null}
                </div>

                {slotsLoading ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-12 animate-pulse rounded-2xl bg-slate-100"
                      />
                    ))}
                  </div>
                ) : slotsError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {slotsError}
                  </div>
                ) : !groupId && !coachId ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    Сначала выберите группу или тренера.
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    На выбранную дату свободных слотов нет.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {slots.map((slot) => {
                      const isSelected =
                        selectedSlot?.date === slot.date &&
                        selectedSlot?.startTime === slot.startTime;

                      return (
                        <button
                          key={`${slot.date}-${slot.startTime}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                            isSelected
                              ? "border-admin-700 bg-admin-600 text-white shadow-[0_12px_28px_-16px_rgba(14,116,144,0.65)]"
                              : "border-slate-200 bg-white text-slate-700 hover:border-admin-200 hover:bg-admin-50 hover:text-admin-800"
                          }`}
                        >
                          {formatSlotLabel(slot)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className={sectionClassName}>
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                    Комментарий
                  </div>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">
                    Дополнительная информация
                  </h4>
                </div>

                <label className="space-y-1.5 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Комментарий
                  </span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    className={`${fieldClassName} min-h-[120px] resize-none`}
                    placeholder="Например: родителю удобно после школы, нужен пробный с акцентом на адаптацию."
                  />
                </label>
              </section>

              {!groupId && !coachId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Нужно выбрать либо группу, либо тренера.
                </div>
              ) : null}

              {!selectedChildId && selectedChild ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Бэк еще не возвращает `childId` в `lead.children`, поэтому пробное
                  занятие нельзя сохранить корректно.
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

        <div className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {selectedSlot
              ? `Слот выбран: ${formatSlotLabel(selectedSlot)}`
              : "Выберите свободный слот для сохранения"}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || optionsLoading || submitting || Boolean(optionsError)}
              className="rounded-2xl bg-admin-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-admin-700 disabled:cursor-not-allowed disabled:bg-admin-300"
            >
              {submitting ? "Сохранение..." : "Назначить пробное"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTrialModal;
