import React, { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  ExperienceLevel,
  Gender,
  LeadDetails,
  LeadParticipant,
  QualifyLeadPayload,
  TimePreference,
} from "./types";
import { LeadApi } from "./lead.api";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

interface QualifyLeadModalProps {
  leadId: string;
  token: string;
  initialLead: LeadDetails | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

interface QualificationParticipantForm extends LeadParticipant {
  gender: Gender;
  experience: ExperienceLevel;
  birthDate: string;
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

const TIME_OPTIONS: Array<{ value: TimePreference; label: string }> = [
  { value: "MORNING", label: "Утро" },
  { value: "AFTERNOON", label: "День" },
  { value: "EVENING", label: "Вечер" },
];

const EMPTY_PARTICIPANT = (): QualificationParticipantForm => ({
  id: "",
  fullName: "",
  birthDate: "",
  gender: "MALE",
  experience: "BEGINNER",
});

const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 1000;

const fieldClassName =
  "w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100";

const cardClassName =
  "rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)]";

const parsePreferredDays = (value?: string | null) => {
  if (!value) {
    return { days: [] as string[], timePreference: null as TimePreference | null };
  }

  const parts = value
    .split(";")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  const rawDays = parts[0]?.split(",").filter(Boolean) ?? [];
  const rawTime = parts[1] ?? null;
  const normalizedTime =
    rawTime === "DAY" ? "AFTERNOON" : (rawTime as TimePreference | null);

  return {
    days: rawDays,
    timePreference:
      normalizedTime && TIME_OPTIONS.some((option) => option.value === normalizedTime)
        ? normalizedTime
        : null,
  };
};

const buildParticipants = (lead: LeadDetails | null): QualificationParticipantForm[] => {
  if (lead?.participants?.length) {
    return lead.participants.map((participant) => ({
      ...participant,
      birthDate: participant.birthDate ?? "",
      gender: participant.gender ?? "MALE",
      experience: participant.experience ?? "BEGINNER",
    }));
  }

  if (lead?.qualificationData?.participants?.length) {
    return lead.qualificationData.participants.map((participant) => ({
      id: "",
      fullName: participant.fullName,
      birthDate: participant.birthDate ?? "",
      gender: participant.gender ?? "MALE",
      experience: participant.experience ?? "BEGINNER",
    }));
  }

  return [EMPTY_PARTICIPANT()];
};

const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({
  leadId,
  token,
  initialLead,
  onClose,
  onSuccess,
}) => {
  const preferredDaysState = parsePreferredDays(
    initialLead?.preferredDays ??
      initialLead?.qualificationData?.preferredDays
  );

  const [participants, setParticipants] = useState<QualificationParticipantForm[]>(
    buildParticipants(initialLead)
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(preferredDaysState.days);
  const [timePreference, setTimePreference] = useState<TimePreference | null>(
    initialLead?.timePreference ??
      initialLead?.qualificationData?.timePreference ??
      preferredDaysState.timePreference
  );
  const [experience, setExperience] = useState<ExperienceLevel>(
    initialLead?.experience ??
      (initialLead?.qualificationData?.experience as ExperienceLevel) ??
      "BEGINNER"
  );
  const [notes, setNotes] = useState(
    initialLead?.notes ??
      initialLead?.qualificationData?.notes ??
      initialLead?.comment ??
      ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadType = initialLead?.leadType ?? "CHILDREN";
  const participantLabel = leadType === "ADULT" ? "Игрок" : "Ребенок";
  const participantsTitle = leadType === "ADULT" ? "Участники" : "Дети";

  const validation = useMemo(() => {
    const participantErrors = participants.map((participant) => ({
      fullName: participant.fullName.trim() ? "" : `Укажите имя ${participantLabel.toLowerCase()}`,
      birthDate: participant.birthDate ? "" : "Укажите дату рождения",
    }));

    const hasValidParticipants =
      participants.length > 0 &&
      participantErrors.every((participant) => !participant.fullName && !participant.birthDate);

    return {
      participantErrors,
      isValid: hasValidParticipants && selectedDays.length > 0 && Boolean(timePreference),
      hasParticipants: participants.length > 0,
    };
  }, [participantLabel, participants, selectedDays, timePreference]);

  const updateParticipant = (
    index: number,
    nextParticipant: QualificationParticipantForm
  ) => {
    setParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? nextParticipant : participant
      )
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!validation.isValid || !timePreference) return;

    const payload: QualifyLeadPayload = {
      participants: participants.map((participant) => ({
        fullName: participant.fullName.trim(),
        birthDate: participant.birthDate,
        gender: participant.gender,
        experience: participant.experience,
      })),
      preferredDays: selectedDays.join(","),
      timePreference,
      experience,
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                Квалификация
              </div>
              <h3 className="heading-font text-xl font-semibold text-slate-900">
                Квалифицировать лид
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Заполните состав участников, предпочтения и уровень подготовки.
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
          <div className="space-y-5">
            <section className={cardClassName}>
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                Контакт
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Имя
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {initialLead?.primaryContact?.fullName || "Не указано"}
                  </div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Телефон
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {initialLead?.primaryContact?.phone || "Не указано"}
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClassName}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-600">
                    {participantsTitle}
                  </div>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">
                    Добавьте участников для квалификации
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setParticipants((prev) => [...prev, EMPTY_PARTICIPANT()])}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-900 transition hover:bg-cyan-100"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Добавить {participantLabel.toLowerCase()}
                </button>
              </div>

              <div className="space-y-4">
                {participants.map((participant, index) => (
                  <div
                    key={`participant-${index}`}
                    className="rounded-3xl border border-stone-200 bg-[linear-gradient(180deg,#fafaf9_0%,#f8fafc_100%)] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {participantLabel} {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setParticipants((prev) =>
                            prev.filter((_, participantIndex) => participantIndex !== index)
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
                          Имя {participantLabel.toLowerCase()}
                        </span>
                        <input
                          type="text"
                          value={participant.fullName}
                          onChange={(event) =>
                            updateParticipant(index, {
                              ...participant,
                              fullName: event.target.value,
                            })
                          }
                          maxLength={MAX_NAME_LENGTH}
                          autoComplete="off"
                          className={`${fieldClassName} ${
                            validation.participantErrors[index]?.fullName
                              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                              : ""
                          }`}
                        />
                        {validation.participantErrors[index]?.fullName ? (
                          <p className="text-xs text-rose-600">
                            {validation.participantErrors[index].fullName}
                          </p>
                        ) : null}
                      </label>

                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Дата рождения
                        </span>
                        <input
                          type="date"
                          value={participant.birthDate}
                          onChange={(event) =>
                            updateParticipant(index, {
                              ...participant,
                              birthDate: event.target.value,
                            })
                          }
                          className={`${fieldClassName} ${
                            validation.participantErrors[index]?.birthDate
                              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                              : ""
                          }`}
                        />
                        {validation.participantErrors[index]?.birthDate ? (
                          <p className="text-xs text-rose-600">
                            {validation.participantErrors[index].birthDate}
                          </p>
                        ) : null}
                      </label>

                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Пол
                        </span>
                        <select
                          value={participant.gender}
                          onChange={(event) =>
                            updateParticipant(index, {
                              ...participant,
                              gender: event.target.value as Gender,
                            })
                          }
                          className={fieldClassName}
                        >
                          <option value="MALE">{leadType === "ADULT" ? "Мужчина" : "Мальчик"}</option>
                          <option value="FEMALE">{leadType === "ADULT" ? "Женщина" : "Девочка"}</option>
                        </select>
                      </label>

                      <label className="space-y-1.5 text-sm text-slate-600">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Уровень
                        </span>
                        <select
                          value={participant.experience}
                          onChange={(event) =>
                            updateParticipant(index, {
                              ...participant,
                              experience: event.target.value as ExperienceLevel,
                            })
                          }
                          className={fieldClassName}
                        >
                          <option value="BEGINNER">Начинающий</option>
                          <option value="INTERMEDIATE">Средний уровень</option>
                          <option value="ADVANCED">Продвинутый</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {!validation.hasParticipants ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Добавьте хотя бы одного участника.
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
                  {selectedDays.length === 0 ? (
                    <p className="mt-2 text-xs text-rose-600">
                      Выберите хотя бы один день.
                    </p>
                  ) : null}
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
                  {!timePreference ? (
                    <p className="mt-2 text-xs text-rose-600">
                      Выберите предпочтительное время.
                    </p>
                  ) : null}
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
                    onChange={(event) => setExperience(event.target.value as ExperienceLevel)}
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
                    maxLength={MAX_NOTES_LENGTH}
                    className={`${fieldClassName} min-h-[132px] resize-none md:min-h-[120px]`}
                    placeholder="Например: хочет попробовать до начала сезона, важна адаптация в группе."
                  />
                  <div className="text-right text-xs text-slate-400">
                    {notes.length}/{MAX_NOTES_LENGTH}
                  </div>
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

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {validation.isValid
                ? "Форма заполнена корректно"
                : "Заполните участников и выберите дни и время"}
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
