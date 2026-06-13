import React, { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { buttonStyles } from "../../../shared/ui/buttonStyles";
import { Button, ModalShell } from "../../../shared/ui";
import {
  formatPhoneInput,
  isValidFormattedPhone,
  normalizePhoneForSubmit,
} from "../../../shared/phone";
import { LeadApi } from "./lead.api";
import {
  CreateLeadParticipantInput,
  ExperienceLevel,
  Gender,
  LeadType,
} from "./types";

interface AdminCreateLeadModalProps {
  branchId: string;
  branchName?: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const EMPTY_PARTICIPANT: CreateLeadParticipantInput = {
  fullName: "",
  birthDate: "",
  gender: "MALE",
  experience: "BEGINNER",
};

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 160;
const MAX_COMMENT_LENGTH = 1000;

const isValidEmail = (value: string) =>
  value.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const inputBaseClassName =
  "w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition focus:ring-4";

const typeButtonClassName = (selected: boolean) =>
  `rounded-full border px-3 py-2 text-sm font-medium transition ${
    selected
      ? "border-cyan-700 bg-cyan-700 text-white shadow-[0_10px_24px_-14px_rgba(14,116,144,0.8)]"
      : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"
  }`;

const AdminCreateLeadModal: React.FC<AdminCreateLeadModalProps> = ({
  branchId,
  branchName,
  onClose,
  onSuccess,
}) => {
  const [leadType, setLeadType] = useState<LeadType>("CHILDREN");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [adultBirthDate, setAdultBirthDate] = useState("");
  const [adultGender, setAdultGender] = useState<Gender>("MALE");
  const [adultExperience, setAdultExperience] = useState<ExperienceLevel>("BEGINNER");
  const [participants, setParticipants] = useState<CreateLeadParticipantInput[]>([
    { ...EMPTY_PARTICIPANT },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participantLabel = leadType === "ADULT" ? "Игрок" : "Ребенок";
  const participantsTitle = leadType === "ADULT" ? "Участники" : "Дети";
  const contactLabel =
    leadType === "ADULT" ? "Игрок / контактное лицо" : "Родитель / представитель";

  const validation = useMemo(() => {
    const fieldErrors = {
      primaryContactName: "",
      phone: "",
      email: "",
    };

    if (!primaryContactName.trim()) {
      fieldErrors.primaryContactName = "Укажите имя контактного лица";
    }

    if (!phone.trim()) {
      fieldErrors.phone = "Укажите телефон";
    } else if (!isValidFormattedPhone(phone)) {
      fieldErrors.phone = "Введите номер в формате +7 777 123 45 67";
    }

    if (!isValidEmail(email)) {
      fieldErrors.email = "Некорректный email";
    }

    const adultErrors =
      leadType === "ADULT"
        ? {
            birthDate: adultBirthDate ? "" : "Укажите дату рождения",
          }
        : null;

    const participantErrors = participants.map((participant) => {
      const hasName = participant.fullName.trim().length > 0;
      const hasBirthDate = participant.birthDate.trim().length > 0;

      return {
        fullName: hasName ? "" : `Укажите имя ${participantLabel.toLowerCase()}`,
        birthDate: hasBirthDate ? "" : "Укажите дату рождения",
      };
    });

    const hasParticipants =
      leadType === "ADULT"
        ? Boolean(primaryContactName.trim()) && Boolean(adultBirthDate)
        : participants.length > 0 &&
          participantErrors.every((participant) => !participant.fullName && !participant.birthDate);

    const isValid =
      Object.values(fieldErrors).every((value) => !value) &&
      hasParticipants;

    return { fieldErrors, adultErrors, participantErrors, isValid, hasParticipants };
  }, [
    adultBirthDate,
    email,
    leadType,
    participantLabel,
    participants,
    phone,
    primaryContactName,
  ]);

  const updateParticipant = (index: number, nextParticipant: CreateLeadParticipantInput) => {
    setParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? nextParticipant : participant
      )
    );
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;

    setLoading(true);
    setError(null);

    try {
      const payloadParticipants =
        leadType === "ADULT"
          ? [
              {
                fullName: primaryContactName.trim(),
                birthDate: adultBirthDate,
                gender: adultGender,
                experience: adultExperience,
              },
            ]
          : participants.map((participant) => ({
              fullName: participant.fullName.trim(),
              birthDate: participant.birthDate,
              gender: participant.gender,
              experience: participant.experience,
            }));

      await LeadApi.create({
        leadType,
        branchId,
        primaryContact: {
          fullName: primaryContactName.trim(),
          phone: normalizePhoneForSubmit(phone),
          email: email.trim() || undefined,
        },
        comment: comment.trim() || undefined,
        participants: payloadParticipants,
      });
      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось создать лид");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Новый лид"
      description={`Создание лида в филиале ${branchName?.trim() || "по текущему выбору"}.`}
      eyebrow="CRM"
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      heightClassName="max-h-[92vh]"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!validation.isValid}
            isLoading={loading}
          >
            Создать лид
          </Button>
        </div>
      }
    >
      <section className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Тип лида
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLeadType("CHILDREN")}
            className={typeButtonClassName(leadType === "CHILDREN")}
          >
            Детский клуб
          </button>
          <button
            type="button"
            onClick={() => setLeadType("ADULT")}
            className={typeButtonClassName(leadType === "ADULT")}
          >
            Взрослый клуб
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {contactLabel}
            <span className="ml-1 text-rose-500">*</span>
          </span>
          <input
            type="text"
            value={primaryContactName}
            onChange={(event) => setPrimaryContactName(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="name"
            className={`${inputBaseClassName} ${
              validation.fieldErrors.primaryContactName
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
            }`}
          />
          {validation.fieldErrors.primaryContactName ? (
            <p className="text-xs text-rose-600">
              {validation.fieldErrors.primaryContactName}
            </p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Телефон
            <span className="ml-1 text-rose-500">*</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            placeholder="+7 777 123 45 67"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            className={`${inputBaseClassName} ${
              validation.fieldErrors.phone
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
            }`}
          />
          {validation.fieldErrors.phone ? (
            <p className="text-xs text-rose-600">{validation.fieldErrors.phone}</p>
          ) : null}
        </label>

        <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={MAX_EMAIL_LENGTH}
            className={`${inputBaseClassName} ${
              validation.fieldErrors.email
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
            }`}
          />
          {validation.fieldErrors.email ? (
            <p className="text-xs text-rose-600">{validation.fieldErrors.email}</p>
          ) : null}
        </label>

        {leadType === "ADULT" ? (
          <>
            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Дата рождения
                <span className="ml-1 text-rose-500">*</span>
              </span>
              <input
                type="date"
                value={adultBirthDate}
                onChange={(event) => setAdultBirthDate(event.target.value)}
                className={`${inputBaseClassName} ${
                  validation.adultErrors?.birthDate
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                }`}
              />
              {validation.adultErrors?.birthDate ? (
                <p className="text-xs text-rose-600">{validation.adultErrors.birthDate}</p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Пол
              </span>
              <select
                value={adultGender}
                onChange={(event) => setAdultGender(event.target.value as Gender)}
                className={`${inputBaseClassName} border-slate-200 focus:border-cyan-700 focus:ring-cyan-100`}
              >
                <option value="MALE">Мужчина</option>
                <option value="FEMALE">Женщина</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Уровень
              </span>
              <select
                value={adultExperience}
                onChange={(event) => setAdultExperience(event.target.value as ExperienceLevel)}
                className={`${inputBaseClassName} border-slate-200 focus:border-cyan-700 focus:ring-cyan-100`}
              >
                <option value="BEGINNER">Начинающий</option>
                <option value="INTERMEDIATE">Средний</option>
                <option value="ADVANCED">Продвинутый</option>
              </select>
            </label>
          </>
        ) : null}
      </div>

      <label className="mt-4 block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Комментарий
        </span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          maxLength={MAX_COMMENT_LENGTH}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        />
        <div className="text-right text-xs text-slate-400">
          {comment.length}/{MAX_COMMENT_LENGTH}
        </div>
      </label>

      {leadType === "CHILDREN" ? (
      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {participantsTitle}
          </h4>
          <button
            type="button"
            onClick={() => setParticipants((prev) => [...prev, { ...EMPTY_PARTICIPANT }])}
            className={buttonStyles("soft", "sm", "rounded-full")}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Добавить {participantLabel.toLowerCase()}
          </button>
        </div>

        <div className="space-y-3">
          {participants.map((participant, index) => (
            <div
              key={`participant-${index}`}
              className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
            >
              <label className="space-y-1 text-sm text-slate-600">
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
                  className={`${inputBaseClassName} ${
                    validation.participantErrors[index]?.fullName
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                      : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                  }`}
                />
                {validation.participantErrors[index]?.fullName ? (
                  <p className="text-xs text-rose-600">
                    {validation.participantErrors[index].fullName}
                  </p>
                ) : null}
              </label>

              <label className="space-y-1 text-sm text-slate-600">
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
                  className={`${inputBaseClassName} ${
                    validation.participantErrors[index]?.birthDate
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                      : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                  }`}
                />
                {validation.participantErrors[index]?.birthDate ? (
                  <p className="text-xs text-rose-600">
                    {validation.participantErrors[index].birthDate}
                  </p>
                ) : null}
              </label>

              <label className="space-y-1 text-sm text-slate-600">
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
                  className={`${inputBaseClassName} border-slate-200 focus:border-cyan-700 focus:ring-cyan-100`}
                >
                  <option value="MALE">Мальчик</option>
                  <option value="FEMALE">Девочка</option>
                </select>
              </label>

              <div className="grid grid-cols-[1fr_44px] gap-3">
                <label className="space-y-1 text-sm text-slate-600">
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
                    className={`${inputBaseClassName} border-slate-200 focus:border-cyan-700 focus:ring-cyan-100`}
                  >
                    <option value="BEGINNER">Начинающий</option>
                    <option value="INTERMEDIATE">Средний</option>
                    <option value="ADVANCED">Продвинутый</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setParticipants((prev) =>
                        prev.filter((_, participantIndex) => participantIndex !== index)
                      )
                    }
                    disabled={participants.length === 1}
                    className={buttonStyles(
                      "softDanger",
                      "md",
                      "h-[46px] w-full rounded-xl px-0 text-slate-500 hover:text-rose-600 disabled:opacity-50"
                    )}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!validation.hasParticipants ? (
          <p className="text-xs text-rose-600">
            Добавьте минимум одного участника с именем и датой рождения.
          </p>
        ) : null}
      </section>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Для взрослого клуба участник будет создан автоматически из данных игрока и контактного лица.
        </div>
      )}

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </ModalShell>
  );
};

export default AdminCreateLeadModal;
