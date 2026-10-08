import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  TriangleAlert,
  Info,
  CircleUserRound,
} from "lucide-react";
import { getApiErrorMessage } from "../../../../shared/api";
import { useAuth } from "../../../../shared/AuthContext";
import {
  ToggleGroup,
  ToggleGroupItem,
  NativeSelect,
  Button,
  DatePicker,
  FormField,
  ModalShell,
  TimePicker,
  formControlClassName,
   } from "../../../../shared/ui";
import {
  DayScheduleSlot,
  ScheduleValidationConflict,
  ScheduleValidationResult,
  UpdateScheduleBatchCommand,
  ScheduleType,
  DayOfWeek,
} from "./schedule.types";
import { validCalendarDate } from "../../sessions.workspace";
import { DAYS } from "./schedule.utils";
import { CoachApi, type CoachAvailability } from "../../сoaches/coach.api";

interface CoachOption {
  id: string;
  name: string;
}

interface Props {
  coaches: CoachOption[];
  initialCoachId: string;
  initialType: ScheduleType;
  schedules: DayScheduleSlot[];
  startDate: string;
  endDate: string;
  onClose: () => void;
  onSave: (payload: UpdateScheduleBatchCommand) => Promise<ScheduleValidationResult>;
}

type EditableSlot = DayScheduleSlot & { enabled: boolean };

const EditScheduleModal: React.FC<Props> = ({
  coaches,
  initialCoachId,
  initialType,
  schedules,
  startDate,
  endDate,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const isEditing = schedules.length > 0;
  const [coachId, setCoachId] = useState(initialCoachId);
  const [type, setType] = useState<ScheduleType>(initialType);
  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(endDate);
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleValidationConflict[]>([]);
  const [coachAvailability, setCoachAvailability] = useState<CoachAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [slots, setSlots] = useState<EditableSlot[]>(
    DAYS.map((day) => {
      const existing = schedules.find((schedule) => schedule.dayOfWeek === day.key);
      return {
        dayOfWeek: day.key,
        startTime: existing?.startTime?.slice(0, 5) ?? "09:00",
        endTime: existing?.endTime?.slice(0, 5) ?? "10:00",
        enabled: Boolean(existing),
      };
    })
  );

  const enabledSlots = slots.filter((slot) => slot.enabled);
  const selectedCoach = coaches.find((coach) => coach.id === coachId);
  const hasCoachConflict = conflicts.some((conflict) => conflict.code === "COACH_SCHEDULE_CONFLICT");
  const errors = useMemo(() => {
    const result: string[] = [];
    if (!coachId) result.push("Выберите тренера");
    if (!validCalendarDate(from) || !validCalendarDate(to)) result.push("Укажите даты начала и окончания периода");
    if (from && to && from > to) result.push("Дата окончания не может быть раньше даты начала");
    if (enabledSlots.length === 0) result.push("Выберите хотя бы один день недели");
    enabledSlots.forEach((slot) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) || slot.startTime >= slot.endTime) {
        result.push(`${dayLabel(slot.dayOfWeek)}: время окончания должно быть позже начала`);
      }
    });
    return result;
  }, [coachId, enabledSlots, from, to]);

  useEffect(() => {
    if (!coachId || !token) {
      setCoachAvailability(null);
      setAvailabilityError(false);
      return;
    }
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError(false);
    CoachApi.getAvailability(coachId, token)
      .then((availability) => {
        if (active) setCoachAvailability(availability);
      })
      .catch(() => {
        if (active) {
          setCoachAvailability(null);
          setAvailabilityError(true);
        }
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [coachId, token]);

  const clearServerFeedback = () => {
    setApiError(null);
    setConflicts([]);
  };

  const updateSlot = (index: number, patch: Partial<EditableSlot>) => {
    clearServerFeedback();
    setSlots((current) => current.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...patch } : slot
    )));
  };

  const save = async () => {
    if (saving) return;
    setAttemptedSubmit(true);
    if (errors.length > 0) return;

    setSaving(true);
    clearServerFeedback();
    try {
      const result = await onSave({
        coachId,
        type,
        startDate: from,
        endDate: to,
        slots: enabledSlots.map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        })),
      });
      if (!result.valid) {
        setConflicts(result.conflicts ?? []);
        setApiError("Расписание пересекается с существующими занятиями. Проверьте отмеченные параметры.");
        return;
      }
      onClose();
    } catch (error: unknown) {
      setApiError(getApiErrorMessage(error, "Не удалось сохранить период расписания"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEditing ? "Редактировать период" : "Добавить период"}
      description={isEditing
        ? "Измените правила, по которым создаются будущие занятия группы."
        : "Настройте регулярные дни, время и ответственного тренера."}
      placement="right"
      maxWidthClassName="max-w-2xl"
      bodyClassName="p-0"
      closeDisabled={saving}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button>
          <Button type="button" isLoading={saving} onClick={save}>
            {!saving ? <Check className="h-4 w-4" /> : null}
            {isEditing ? "Сохранить изменения" : "Создать период"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 px-5 py-5">
        <section>
          <SectionHeading
            icon={<CalendarDays />}
            title="Основные параметры"
            description="Период определяет, когда и по каким правилам создаются занятия."
          />

          <div className="mt-4 space-y-4">
            <fieldset disabled={saving} className="flex flex-col gap-2"><legend className="mb-2 text-xs font-medium text-slate-600">Тип периода</legend>
              <ToggleGroup type="single" variant="outline" value={type} aria-label="Тип периода" onValueChange={value=>{if(value){setType(value as ScheduleType);clearServerFeedback();}}}>
                <ToggleGroupItem value="REGULAR">Регулярный</ToggleGroupItem><ToggleGroupItem value="TEMPORARY">Временный</ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-slate-600">{type==="REGULAR"?"Основное расписание группы":"Дополнительное расписание на ограниченный срок"}</p>
            </fieldset>

            <FormField
              label="Ответственный тренер"
              hint={selectedCoach ? "Пересечения и рабочая доступность проверятся перед сохранением." : "Выберите тренера, назначенного в группу."}
              error={attemptedSubmit && !coachId ? "Выберите тренера" : undefined}
            >
              <div className="relative">
                <CircleUserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <NativeSelect
                  value={coachId}
                  onChange={(event) => {
                    setCoachId(event.target.value);
                    clearServerFeedback();
                  }}
                  className={`${formControlClassName} appearance-none pl-9 ${hasCoachConflict ? "border-rose-300 bg-rose-50" : ""}`}
                >
                  <option value="">Выберите тренера</option>
                  {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
                </NativeSelect>
              </div>
            </FormField>

            {coachId ? (
              <CoachAvailabilitySummary
                availability={coachAvailability}
                loading={availabilityLoading}
                error={availabilityError}
              />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Дата начала"
                hint="С этой даты начнут создаваться занятия."
                error={attemptedSubmit && !from ? "Укажите дату начала" : undefined}
              >
                <DatePicker
                  value={from}
                  max={to || undefined}
                  onValueChange={(value) => {
                    setFrom(value);
                    clearServerFeedback();
                  }}
                />
              </FormField>
              <FormField
                label="Дата окончания"
                hint="Последний день действия этого расписания."
                error={attemptedSubmit && (!to || (from && to < from))
                  ? (!to ? "Укажите дату окончания" : "Дата раньше начала")
                  : undefined}
              >
                <DatePicker
                  value={to}
                  min={from || undefined}
                  onValueChange={(value) => {
                    setTo(value);
                    clearServerFeedback();
                  }}
                />
              </FormField>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <div className="flex items-start justify-between gap-3">
            <SectionHeading
              icon={<Clock3 />}
              title="Дни и время"
              description="Отметьте дни, в которые группа занимается регулярно."
            />
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {enabledSlots.length} {sessionsLabel(enabledSlots.length)}
            </span>
          </div>


          <fieldset disabled={saving} className="mt-4 flex min-w-0 flex-col gap-3">
            <legend className="sr-only">Дни занятий</legend>
            <ToggleGroup type="multiple" variant="outline" value={enabledSlots.map(s=>s.dayOfWeek)} aria-label="Дни занятий" onValueChange={values=>{clearServerFeedback();setSlots(current=>current.map(slot=>({...slot,enabled:values.includes(slot.dayOfWeek)})));}}>
              {slots.map((slot,index)=><ToggleGroupItem key={slot.dayOfWeek} value={slot.dayOfWeek}>{DAYS[index].short}</ToggleGroupItem>)}
            </ToggleGroup>
            {slots.map((slot,index)=>slot.enabled && <div key={slot.dayOfWeek} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
              <span className="text-sm font-medium">{DAYS[index].label}</span>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Начало"><TimePicker aria-label={`Начало: ${DAYS[index].label}`} value={slot.startTime} onValueChange={startTime=>updateSlot(index,{startTime})} aria-invalid={!slot.startTime || slot.startTime>=slot.endTime}/></FormField>
                <FormField label="Окончание"><TimePicker aria-label={`Окончание: ${DAYS[index].label}`} value={slot.endTime} onValueChange={endTime=>updateSlot(index,{endTime})} aria-invalid={!slot.endTime || slot.startTime>=slot.endTime}/></FormField>
              </div>
            </div>)}
          </fieldset>

          {attemptedSubmit && enabledSlots.length === 0 ? (
            <p className="mt-2 text-xs font-medium text-rose-600">Выберите хотя бы один день недели.</p>
          ) : null}
          {attemptedSubmit && enabledSlots.some((slot) => slot.startTime >= slot.endTime) ? (
            <p className="mt-2 text-xs font-medium text-rose-600">Проверьте время в отмеченных днях.</p>
          ) : null}
        </section>

        <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-[#0066cc]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            При сохранении система проверит пересечения тренера и группы. Изменения применятся к будущим занятиям этого периода.
          </p>
        </div>

        {attemptedSubmit && errors.length > 0 ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
              <TriangleAlert className="h-4 w-4" />
              Проверьте параметры периода
            </div>
            <ul className="mt-2 space-y-1 text-xs text-rose-700">
              {errors.map((error) => <li key={error}>• {error}</li>)}
            </ul>
          </div>
        ) : null}

        {apiError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {apiError}
          </div>
        ) : null}

        {conflicts.length > 0 ? (
          <section className="space-y-2">
            <div className="ui-section-title">Найденные конфликты</div>
            {conflicts.map((conflict, index) => (
              <ConflictCard key={`${conflict.code}-${conflict.conflictingScheduleId ?? index}`} conflict={conflict} />
            ))}
          </section>
        ) : null}
      </div>
    </ModalShell>
  );
};

const SectionHeading: React.FC<{
  icon: React.ReactElement;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#0066cc]">
      {React.cloneElement(icon, { className: "h-4 w-4" })}
    </span>
    <div>
      <h4 className="ui-section-title">{title}</h4>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  </div>
);

const CoachAvailabilitySummary: React.FC<{
  availability: CoachAvailability | null;
  loading: boolean;
  error: boolean;
}> = ({ availability, loading, error }) => {
  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Загружаем рабочую доступность тренера...</div>;
  }
  if (error) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">Не удалось загрузить доступность. Итоговая проверка всё равно выполнится при сохранении.</div>;
  }
  if (!availability?.configured) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">Рабочая доступность не настроена. Ограничение по дням и времени не применяется.</div>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
      <span className="inline-flex items-center gap-1.5 font-semibold"><CalendarDays className="h-4 w-4" />{formatAvailabilityDays(availability.days)}</span>
      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{availability.timeFrom.slice(0, 5)}–{availability.timeTo.slice(0, 5)}</span>
      <span className="text-emerald-800">{availability.timezone}</span>
    </div>
  );
};

const ConflictCard: React.FC<{ conflict: ScheduleValidationConflict }> = ({ conflict }) => {
  const availabilityWindow = conflict.code === "COACH_OUTSIDE_WORKING_HOURS"
    && (conflict.overlapStart || conflict.overlapEnd)
    ? `Доступен: ${formatTimeRange(conflict.overlapStart, conflict.overlapEnd)}`
    : null;
  const details = [
    conflict.dayOfWeek ? dayLabel(conflict.dayOfWeek) : null,
    formatTimeRange(conflict.startTime, conflict.endTime),
    availabilityWindow,
    conflict.conflictingGroupName ? `Группа: ${conflict.conflictingGroupName}` : null,
    conflict.conflictingPeriodStart || conflict.conflictingPeriodEnd
      ? `Период: ${[conflict.conflictingPeriodStart, conflict.conflictingPeriodEnd].filter(Boolean).join(" – ")}`
      : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-900">
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">{conflictTitle(conflict)}</div>
          {details.length ? <div className="mt-1 text-xs leading-5 text-rose-700">{details.join(" · ")}</div> : null}
          {conflict.message ? <div className="mt-1 text-xs leading-5 text-rose-700">{conflict.message}</div> : null}
        </div>
      </div>
    </div>
  );
};

const dayLabel = (value: DayOfWeek) => DAYS.find((day) => day.key === value)?.label ?? value;

const availabilityDayLabels: Record<string, string> = {
  MON: "Пн",
  TUE: "Вт",
  WED: "Ср",
  THU: "Чт",
  FRI: "Пт",
  SAT: "Сб",
  SUN: "Вс",
};

const formatAvailabilityDays = (days: string[]) => days
  .map((day) => availabilityDayLabels[day.toUpperCase()] ?? day)
  .join(", ");

const sessionsLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "занятие в неделю";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "занятия в неделю";
  return "занятий в неделю";
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return null;
  return [start?.slice(0, 5), end?.slice(0, 5)].filter(Boolean).join("–");
};

const conflictTitle = (conflict: ScheduleValidationConflict) => {
  switch (conflict.code) {
    case "COACH_SCHEDULE_CONFLICT": return "Тренер занят в это время";
    case "COACH_UNAVAILABLE_DAY": return "Тренер не работает в этот день";
    case "COACH_OUTSIDE_WORKING_HOURS": return "Время вне доступности тренера";
    case "GROUP_SCHEDULE_CONFLICT": return "У группы уже есть занятие";
    case "OVERLAPPING_INPUT_SLOTS": return "Время внутри формы пересекается";
    case "INVALID_DATE_RANGE": return "Некорректный диапазон дат";
    case "INVALID_TIME_RANGE": return "Некорректное время занятия";
    case "EMPTY_SLOTS": return "Не выбраны дни занятий";
    default: return "Конфликт расписания";
  }
};

export default EditScheduleModal;
