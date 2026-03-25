import React, { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { LeadChild, LeadDetails, QualifyLeadPayload } from "./types";
import { LeadApi } from "./lead.api";
import { experienceLabel } from "./lead.format";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

interface QualifyLeadModalProps {
  leadId: string;
  token: string;
  initialLead: LeadDetails | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type ChildGender = "MALE" | "FEMALE";
type ChildExperience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type TimePreference = "MORNING" | "DAY" | "EVENING" | "";

interface QualificationChildForm extends LeadChild {
  gender: ChildGender;
  experience: ChildExperience;
}

const DAY_OPTIONS = [
  { value: "MON", label: "Пн" },
  { value: "TUE", label: "Вт" },
  { value: "WED", label: "Ср" },
  { value: "THU", label: "Чт" },
  { value: "FRI", label: "Пт" },
  { value: "SAT", label: "Сб" },
  { value: "SUN", label: "Вс" },
] as const;

const TIME_OPTIONS = [
  { value: "MORNING", label: "Утро" },
  { value: "DAY", label: "День" },
  { value: "EVENING", label: "Вечер" },
] as const;

const EMPTY_CHILD = (): QualificationChildForm => ({
  id: "",
  childName: "",
  childAge: 0,
  gender: "MALE",
  experience: "BEGINNER",
});

const fieldClassName =
  "w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100";

const cardClassName =
  "rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)]";

const parsePreferredDays = (value?: string | null) => {
  if (!value) {
    return { days: [] as string[], timePreference: "" as TimePreference };
  }

  const normalized = value.toUpperCase();
  const days = DAY_OPTIONS.filter((day) => normalized.includes(day.value)).map(
    (day) => day.value
  );

  const timePreference = TIME_OPTIONS.find((option) =>
    normalized.includes(option.value)
  )?.value as TimePreference | undefined;

  return {
    days,
    timePreference: timePreference ?? "",
  };
};

const formatPreferredDays = (days: string[], timePreference: TimePreference) => {
  const dayPart = days.join(",");
  return [dayPart, timePreference].filter(Boolean).join(";");
};

const buildChildren = (lead: LeadDetails | null): QualificationChildForm[] => {
  if (lead?.children?.length) {
    return lead.children.map((child) => ({
      ...child,
      gender: "MALE",
      experience: "BEGINNER",
    }));
  }

  if (lead?.qualificationData?.children?.length) {
    return lead.qualificationData.children.map((child) => ({
      id: "",
      childName: child.childName,
      childAge: child.childAge,
      gender: "MALE",
      experience: "BEGINNER",
    }));
  }

  return [EMPTY_CHILD()];
};

const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({
  leadId,
  token,
  initialLead,
  onClose,
  onSuccess,
}) => {
  const preferredDaysState = parsePreferredDays(
    initialLead?.qualificationData?.preferredDays
  );

  const [children, setChildren] = useState<QualificationChildForm[]>(
    buildChildren(initialLead)
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(preferredDaysState.days);
  const [timePreference, setTimePreference] = useState<TimePreference>(
    preferredDaysState.timePreference
  );
  const [experience, setExperience] = useState(
    initialLead?.qualificationData?.experience ?? "BEGINNER"
  );
  const [notes, setNotes] = useState(
    initialLead?.qualificationData?.notes ?? initialLead?.comment ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => {
    const childErrors = children.map((child) => ({
      childName: child.childName.trim() ? "" : "Укажите имя ребенка",
      childAge:
        Number.isFinite(child.childAge) && child.childAge > 0
          ? ""
          : "Укажите корректный возраст",
    }));

    const hasValidChildren =
      children.length > 0 &&
        childErrors.every((child) => !child.childName && !child.childAge);

    const isValid =
      hasValidChildren && selectedDays.length > 0 && Boolean(timePreference);

    return {
      childErrors,
      isValid,
      hasChildren: children.length > 0,
    };
  }, [children, selectedDays, timePreference]);

  const updateChild = (index: number, nextChild: QualificationChildForm) => {
    setChildren((prev) =>
      prev.map((child, childIndex) =>
        childIndex === index ? nextChild : child
      )
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;

    const payload: QualifyLeadPayload = {
      children: children.map((child) => ({
        childName: child.childName.trim(),
        childAge: child.childAge,
        gender: child.gender,
        experience: child.experience,
      })),
      preferredDays: formatPreferredDays(selectedDays, timePreference),
      experience: experience as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
      notes: notes.trim(),
    };

    setLoading(true);
    setError(null);

    try {
      await LeadApi.qualify(leadId, payload, token);
      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось квалифицировать лид");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-stone-200 bg-[linear-gradient(180deg,#fcfcfb_0%,#f8fafc_100%)] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
        <div className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.08),_transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-admin-100 bg-admin-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-admin-700">
                Квалификация
              </div>
              <h3 className="heading-font text-2xl font-semibold text-slate-900">
                Квалифицировать лид
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Заполните структуру семьи, предпочтения и уровень подготовки.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={buttonStyles("ghost", "sm", "rounded-full p-2 text-slate-400")}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_18%)] px-4 py-4 sm:px-6 sm:py-6">
          <div className="space-y-5">
            <section className={cardClassName}>
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                Родитель
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Имя
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {initialLead?.parentName || "Не указано"}
                  </div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Телефон
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {initialLead?.phone || "Не указано"}
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClassName}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                    Дети
                  </div>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">
                    Добавьте детей для квалификации
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => [...prev, EMPTY_CHILD()])}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-900 transition hover:bg-cyan-100"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Добавить ребенка
                </button>
              </div>

              <div className="space-y-4">
                {children.map((child, index) => (
                  <div
                    key={`child-${index}`}
                    className="rounded-3xl border border-stone-200 bg-[linear-gradient(180deg,#fafaf9_0%,#f8fafc_100%)] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Ребенок {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setChildren((prev) =>
                            prev.filter((_, childIndex) => childIndex !== index)
                          )
                        }
                        className={buttonStyles("softDanger", "sm", "rounded-full")}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Удалить
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Имя ребенка
                        </span>
                        <input
                          type="text"
                          value={child.childName}
                          onChange={(event) =>
                            updateChild(index, {
                              ...child,
                              childName: event.target.value,
                            })
                          }
                          className={`${fieldClassName} ${
                            validation.childErrors[index]?.childName
                              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                              : ""
                          }`}
                        />
                        {validation.childErrors[index]?.childName ? (
                          <p className="text-xs text-rose-600">
                            {validation.childErrors[index].childName}
                          </p>
                        ) : null}
                      </label>

                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Возраст
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={child.childAge || ""}
                          onChange={(event) =>
                            updateChild(index, {
                              ...child,
                              childAge: Number(event.target.value),
                            })
                          }
                          className={`${fieldClassName} ${
                            validation.childErrors[index]?.childAge
                              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                              : ""
                          }`}
                        />
                        {validation.childErrors[index]?.childAge ? (
                          <p className="text-xs text-rose-600">
                            {validation.childErrors[index].childAge}
                          </p>
                        ) : null}
                      </label>

                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Пол
                        </span>
                        <select
                          value={child.gender}
                          onChange={(event) =>
                            updateChild(index, {
                              ...child,
                              gender: event.target.value as ChildGender,
                            })
                          }
                          className={fieldClassName}
                        >
                          <option value="MALE">Мальчик</option>
                          <option value="FEMALE">Девочка</option>
                        </select>
                      </label>

                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Уровень ребенка
                        </span>
                        <select
                          value={child.experience}
                          onChange={(event) =>
                            updateChild(index, {
                              ...child,
                              experience: event.target.value as ChildExperience,
                            })
                          }
                          className={fieldClassName}
                        >
                          <option value="BEGINNER">{experienceLabel("BEGINNER")}</option>
                          <option value="INTERMEDIATE">{experienceLabel("INTERMEDIATE")} уровень</option>
                          <option value="ADVANCED">{experienceLabel("ADVANCED")}</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {!validation.hasChildren ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Добавьте хотя бы одного ребенка.
                </div>
              ) : null}
            </section>

            <section className={cardClassName}>
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                  Предпочтения
                </div>
                <h4 className="mt-1 text-base font-semibold text-slate-900">
                  Когда удобно посещать занятия
                </h4>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Дни недели
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((day) => {
                      const isSelected = selectedDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border-admin-700 bg-admin-600 text-white shadow-[0_8px_22px_-14px_rgba(8,145,178,0.8)]"
                              : "border-stone-200 bg-white text-slate-700 hover:border-admin-200 hover:bg-admin-50"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Предпочтительное время
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TIME_OPTIONS.map((option) => {
                      const isSelected = timePreference === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTimePreference(option.value)}
                          className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border-admin-700 bg-admin-600 text-white shadow-[0_8px_22px_-14px_rgba(8,145,178,0.8)]"
                              : "border-stone-200 bg-white text-slate-700 hover:border-admin-200 hover:bg-admin-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClassName}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Общий уровень
                  </span>
                  <select
                    value={experience}
                    onChange={(event) => setExperience(event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="BEGINNER">Начинающий</option>
                    <option value="INTERMEDIATE">Средний уровень</option>
                    <option value="ADVANCED">Продвинутый</option>
                  </select>
                </label>

                <label className="space-y-1.5 text-sm text-slate-600 md:col-span-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Заметки
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={5}
                    className={`${fieldClassName} min-h-[132px] resize-none md:min-h-[120px]`}
                    placeholder="Например: хочет попробовать до начала сезона, важна адаптация в группе."
                  />
                </label>
              </div>
            </section>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-stone-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {validation.isValid
                ? "Форма заполнена корректно"
                : "Заполните детей и выберите дни и время"}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={buttonStyles("secondary", "md", "rounded-2xl")}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!validation.isValid || loading}
                className={buttonStyles("primary", "md", "rounded-2xl px-5")}
              >
                {loading ? "Сохранение..." : "Квалифицировать лид"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualifyLeadModal;
