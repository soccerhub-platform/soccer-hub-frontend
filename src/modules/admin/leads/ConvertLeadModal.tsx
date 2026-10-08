import LeadModalShell from "./LeadModalShell";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DatePicker,
  SearchableSelect,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
} from "../../../shared/ui";
import { ClientApi } from "../clients/client.api";
import type { ClientListItem } from "../clients/client.types";
import type {
  ConvertLeadRequest,
  LeadParticipant,
  LeadStatus,
} from "./types";
import { formatBirthDate } from "./lead.format";
import { addBusinessDays, birthDateError, businessDate } from "./lead.workspace";

interface ConvertLeadModalProps {
  isOpen: boolean;
  leadName: string;
  leadPhone?: string | null;
  leadType?: string | null;
  leadStatus: LeadStatus;
  branchId: string;
  participants: LeadParticipant[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ConvertLeadRequest) => Promise<void> | void;
}

type ClientMode = "NEW" | "EXISTING";

const participantLabel = (participant: LeadParticipant) =>
  [
    participant.fullName,
    participant.birthDate
      ? formatBirthDate(participant.birthDate)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  leadName,
  leadPhone,
  leadType,
  leadStatus,
  branchId,
  participants,
  submitting,
  onClose,
  onSubmit,
}) => {
  const isAdult = leadType === "ADULT";

  const eligibleParticipants = useMemo(
    () => participants.filter((participant) => !participant.playerId),
    [participants]
  );

  const conversionMode =
    leadStatus === "DECISION_PENDING"
      ? "AFTER_TRIAL"
      : leadStatus === "IN_PROGRESS"
        ? "WITHOUT_TRIAL"
        : null;

  const [participantId, setParticipantId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<ConvertLeadRequest["relationshipType"]>(
      isAdult ? "SELF" : "MOTHER"
    );

  const [clientMode, setClientMode] =
    useState<ClientMode>("NEW");
  const [existingClientId, setExistingClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const first =
      eligibleParticipants.length === 1
        ? eligibleParticipants[0]
        : null;

    setParticipantId(first?.id ?? "");
    setBirthDate(first?.birthDate ?? "");
    setRelationshipType(isAdult ? "SELF" : "MOTHER");
    setClientMode("NEW");
    setExistingClientId("");
    setClientSearch(leadPhone ?? "");
    setClients([]);
    setClientsError(null);
    setAttempted(false);
    setSubmitError(null);
  }, [
    eligibleParticipants,
    isAdult,
    isOpen,
    leadPhone,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      isAdult ||
      clientMode !== "EXISTING"
    ) {
      return;
    }

    let active = true;

    const timeoutId = window.setTimeout(async () => {
      setClientsLoading(true);
      setClientsError(null);

      try {
        const response = await ClientApi.list({
          branchId,
          search: clientSearch,
          page: 0,
          size: 20,
          sort: "fullName,asc",
        });

        if (active) {
          setClients(response.content ?? []);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setClients([]);
          setClientsError("Не удалось загрузить клиентов");
        }
      } finally {
        if (active) {
          setClientsLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    branchId,
    clientMode,
    clientSearch,
    isAdult,
    isOpen,
  ]);

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.fullName,
        description:
          [client.phone, client.email]
            .filter(Boolean)
            .join(" · ") || "Контакты не указаны",
        keywords: [
          client.fullName,
          client.phone,
          client.email,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [clients]
  );

  if (!isOpen) return null;

  const invalid =
    !conversionMode ||
    eligibleParticipants.length === 0 ||
    !participantId ||
    Boolean(birthDateError(birthDate)) ||
    (clientMode === "EXISTING" && !existingClientId);

  return (
    <LeadModalShell
      title={isAdult ? "Оформить ученика" : "Оформить участника"}
      description={`Создайте ученика для ${leadName} и перейдите к оформлению договора.`}
      eyebrow={
        conversionMode === "AFTER_TRIAL"
          ? "После пробного"
          : "Без пробного"
      }
      onClose={onClose}
      closeDisabled={submitting}
      placement="right"
      maxWidthClassName="max-w-[520px]"
      heightClassName="h-dvh"
      bodyClassName="bg-slate-50 px-4 py-4 sm:px-5"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </Button>

          <Button
            type="button"
            disabled={submitting || !conversionMode || eligibleParticipants.length === 0}
            onClick={async () => {
              setAttempted(true);
              setSubmitError(null);
              if (submitting || invalid || !conversionMode) return;
              try { await onSubmit({
                participantId,
                participantBirthDate: birthDate,
                relationshipType,
                existingClientId:
                  clientMode === "EXISTING"
                    ? existingClientId
                    : null,
                conversionMode,
                replacePrimaryContact: false,
                replacePrimaryPayer: false,
              }); } catch (reason) {
                setSubmitError(reason instanceof Error ? reason.message : "Не удалось оформить участника. Проверьте данные и повторите.");
              }
            }}
          >
            {submitting
              ? "Оформляем..."
              : "Оформить участника"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {submitError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{submitError}</p>}
        <Alert>
          <AlertTitle>
            Что произойдёт после подтверждения
          </AlertTitle>
          <AlertDescription>
            Будут созданы или связаны клиент, ученик и их
            отношение. Лид перейдёт в статус «Оформление
            договора». Договор и оплата создаются отдельно.
          </AlertDescription>
        </Alert>

        {!isAdult ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Родитель ребёнка
            </span>

            <ToggleGroup
              type="single"
              aria-label="Способ оформления клиента"
              value={clientMode}
              onValueChange={(value) => {
                if (!value) return;

                const nextMode = value as ClientMode;
                setClientMode(nextMode);
                setExistingClientId("");

                if (nextMode === "EXISTING") {
                  setClientSearch(leadPhone ?? "");
                }
              }}
              variant="outline"
              className="grid gap-2 sm:grid-cols-2"
              disabled={submitting}
            >
              <ToggleGroupItem value="NEW">
                Новый клиент
              </ToggleGroupItem>
              <ToggleGroupItem value="EXISTING">
                Существующий клиент
              </ToggleGroupItem>
            </ToggleGroup>

            <span className="text-xs text-slate-600">
              Для второго ребёнка выберите уже созданного
              родителя, чтобы не создавать дубликат.
            </span>
          </div>
        ) : null}

        {!isAdult && clientMode === "EXISTING" ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Существующий клиент
            </span>

            <SearchableSelect
              value={existingClientId}
              onValueChange={setExistingClientId}
              options={clientOptions}
              placeholder="Выберите клиента"
              searchPlaceholder="Имя, телефон или email"
              emptyText={
                clientsError ??
                "Подходящие клиенты не найдены"
              }
              loading={clientsLoading}
              disabled={submitting}
              onSearchChange={setClientSearch}
            />

            {attempted && !existingClientId ? (
              <p className="text-xs text-rose-600">
                Выберите существующего клиента
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Ученик <span className="text-rose-500">*</span>
            </span>

            <Select
              value={participantId}
              onValueChange={(nextId) => {
                setParticipantId(nextId);
                setBirthDate(
                  eligibleParticipants.find(
                    (item) => item.id === nextId
                  )?.birthDate ?? ""
                );
              }}
              disabled={submitting}
            >
              <SelectTrigger aria-label="Ученик">
                <SelectValue placeholder="Выберите ученика" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {eligibleParticipants.map(
                    (participant, index) => (
                      <SelectItem
                        key={participant.id || index}
                        value={
                          participant.id ||
                          `participant-${index}`
                        }
                      >
                        {participantLabel(participant)}
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>

            {attempted && !participantId ? (
              <p className="text-xs text-rose-600">
                Выберите ученика
              </p>
            ) : null}

            {eligibleParticipants.length === 0 ? (
              <p className="text-xs text-amber-700">
                Этот ребёнок уже связан с учеником.
              </p>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Дата рождения{" "}
              <span className="text-rose-500">*</span>
            </span>

            <DatePicker
              placeholder="Дата рождения"
              value={birthDate}
              max={addBusinessDays(businessDate(), -1)}
              aria-invalid={attempted && Boolean(birthDateError(birthDate))}
              onValueChange={setBirthDate}
              disabled={submitting}
            />

            {attempted && birthDateError(birthDate) ? (
              <p className="text-xs text-rose-600">
                {birthDateError(birthDate)}
              </p>
            ) : null}
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Кем клиент приходится ученику
          </span>

          <ToggleGroup
            type="single"
            value={relationshipType}
            onValueChange={(value) => {
              if (value) {
                setRelationshipType(
                  value as ConvertLeadRequest["relationshipType"]
                );
              }
            }}
            variant="outline"
            aria-label="Кем клиент приходится ученику"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            disabled={submitting}
          >
            {(isAdult
              ? [{ value: "SELF", label: "Сам ученик" }]
              : [
                  { value: "MOTHER", label: "Мама" },
                  { value: "FATHER", label: "Папа" },
                  { value: "GUARDIAN", label: "Опекун" },
                  { value: "OTHER", label: "Другое" },
                ]
            ).map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </LeadModalShell>
  );
};

export default ConvertLeadModal;
