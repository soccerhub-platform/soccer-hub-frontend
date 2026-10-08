import LeadModalShell from "./LeadModalShell";
import React, { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { NativeSelect, Button, DatePicker, Input, Textarea, ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import { formatPhoneInput, isValidFormattedPhone, normalizePhoneForSubmit } from "../../../shared/phone";
import { LeadApi } from "./lead.api";
import { CreateLeadParticipantInput, ExperienceLevel, Gender, LeadType } from "./types";
import { addBusinessDays, birthDateError, businessDate } from "./lead.workspace";

interface AdminCreateLeadModalProps {
  branchId: string;
  branchName?: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type Step = "contact" | "student" | "review";

const EMPTY_PARTICIPANT: CreateLeadParticipantInput = { fullName: "", birthDate: "", gender: "MALE", experience: "BEGINNER" };
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 160;
const MAX_COMMENT_LENGTH = 1000;
const steps: Array<{ id: Step; label: string; hint: string }> = [
  { id: "contact", label: "Контакт", hint: "Кто оставил заявку" },
  { id: "student", label: "Ученик", hint: "Кого записываем" },
  { id: "review", label: "Проверка", hint: "Проверьте данные" },
];

const AdminCreateLeadModal: React.FC<AdminCreateLeadModalProps> = ({ branchId, branchName, onClose, onSuccess }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [leadType, setLeadType] = useState<LeadType>("CHILDREN");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [adultBirthDate, setAdultBirthDate] = useState("");
  const [adultGender, setAdultGender] = useState<Gender>("MALE");
  const [adultExperience, setAdultExperience] = useState<ExperienceLevel>("BEGINNER");
  const [participants, setParticipants] = useState<CreateLeadParticipantInput[]>([{ ...EMPTY_PARTICIPANT }]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = steps[stepIndex];
  const contactLabel = leadType === "ADULT" ? "Игрок / контактное лицо" : "Родитель / представитель";

  const validation = useMemo(() => {
    const contactError = !primaryContactName.trim() ? "Укажите имя контактного лица" : !phone.trim() ? "Укажите телефон" : !isValidFormattedPhone(phone) ? "Введите номер в формате +7 777 123 45 67" : !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Некорректный email";
    const participantErrors = participants.map((participant) => ({
      fullName: participant.fullName.trim() ? "" : "Укажите имя ученика",
      birthDate: birthDateError(participant.birthDate),
    }));
    const studentError = leadType === "ADULT" ? birthDateError(adultBirthDate) : participantErrors.some((item) => item.fullName || item.birthDate) ? "Проверьте имена и даты рождения участников" : "";
    return { contactError, participantErrors, studentError, valid: !contactError && !studentError };
  }, [adultBirthDate, email, leadType, participants, phone, primaryContactName]);

  const canContinue = step.id === "contact" ? !validation.contactError : step.id === "student" ? !validation.studentError : true;

  const next = () => {
    setAttempted(true);
    if (!canContinue) {
      setError(step.id === "contact" ? validation.contactError : validation.studentError);
      return;
    }
    setError(null);
    setAttempted(false);
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const updateParticipant = (index: number, value: CreateLeadParticipantInput) => setParticipants((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));

  const submit = async () => {
    if (loading) return;
    if (!validation.valid) {
      setError("Заполните обязательные поля перед созданием лида");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payloadParticipants = leadType === "ADULT" ? [{ fullName: primaryContactName.trim(), birthDate: adultBirthDate, gender: adultGender, experience: adultExperience }] : participants.map((participant) => ({ fullName: participant.fullName.trim(), birthDate: participant.birthDate, gender: participant.gender, experience: participant.experience }));
      if (!saved) {
        await LeadApi.create({ leadType, branchId, primaryContact: { fullName: primaryContactName.trim(), phone: normalizePhoneForSubmit(phone), email: email.trim() || undefined }, comment: comment.trim() || undefined, participants: payloadParticipants });
        setSaved(true);
      }
      await onSuccess();
      onClose();
    } catch (reason) {
      console.error(reason);
      setError(reason instanceof Error ? reason.message : "Не удалось создать лид");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LeadModalShell title="Новый лид" description={`Заявка из филиала ${branchName?.trim() || "по текущему выбору"}.`} eyebrow="Лиды" placement="right" maxWidthClassName="max-w-[520px]" heightClassName="h-[100dvh]" bodyClassName="bg-slate-50 px-4 py-4 sm:px-5" closeDisabled={loading} onClose={onClose} footer={
      <div className="flex justify-between gap-2">
        <Button type="button" variant="secondary" rounded="rounded-lg" disabled={loading} onClick={() => stepIndex && !saved ? (setStepIndex((value) => value - 1), setAttempted(false), setError(null)) : onClose()}><ArrowLeft className="h-4 w-4" />{stepIndex && !saved ? "Назад" : "Отмена"}</Button>
        {step.id === "review" ? <Button type="button" rounded="rounded-lg" isLoading={loading} onClick={() => void submit()}><Check className="h-4 w-4" />{saved ? "Обновить список" : "Создать лид"}</Button> : <Button type="button" rounded="rounded-lg" onClick={next}>Далее<ArrowRight className="h-4 w-4" /></Button>}
      </div>
    }>
      <div className="flex flex-col gap-5">
        <ol aria-label="Шаги создания лида" className="grid grid-cols-3 gap-2">
          {steps.map((item, index) => <li key={item.id}><div className={`h-1 rounded-full ${index <= stepIndex ? "bg-[#0066cc]" : "bg-slate-200"}`} /><span className={`mt-2 block truncate text-xs ${index === stepIndex ? "font-semibold text-slate-900" : "text-slate-600"}`}>{item.label}</span></li>)}
        </ol>

        {step.id === "contact" ? <div className="flex flex-col gap-4">
          <div><h3 className="ui-section-title">Контактное лицо</h3><p className="mt-1 text-xs leading-5 text-slate-600">Укажите человека, с которым администратор будет связываться по заявке.</p></div>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">{contactLabel} <b className="text-rose-500">*</b></span><Input autoFocus value={primaryContactName} maxLength={MAX_NAME_LENGTH} placeholder="Мария Иванова" onChange={(event) => setPrimaryContactName(event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-slate-600">Телефон <b className="text-rose-500">*</b></span><Input value={phone} placeholder="+7 777 123 45 67" onChange={(event) => setPhone(formatPhoneInput(event.target.value))} /></label><label><span className="mb-1.5 block text-xs font-medium text-slate-600">Email</span><Input type="email" value={email} placeholder="maria@example.com" maxLength={MAX_EMAIL_LENGTH} onChange={(event) => setEmail(event.target.value)} /></label></div>
          <label><span className="mb-1.5 block text-xs font-medium text-slate-600">Комментарий</span><Textarea value={comment} maxLength={MAX_COMMENT_LENGTH} placeholder="Что интересует клиента, как удобнее связаться…" onChange={(event) => setComment(event.target.value)} /></label>
          <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">На следующем шаге добавим участников. Пробное, договор и оплата оформляются отдельно.</p>
        </div> : null}

        {step.id === "student" ? <div className="flex flex-col gap-4">
          <div><h3 className="ui-section-title">Кого оформляем?</h3><p className="mt-1 text-xs leading-5 text-slate-600">Эти данные помогут подобрать подходящую группу и время пробного занятия.</p></div>
          <ToggleGroup type="single" aria-label="Направление заявки" value={leadType} onValueChange={(value) => value && setLeadType(value as LeadType)} variant="outline" className="grid gap-2 sm:grid-cols-2">
            <ToggleGroupItem value="CHILDREN" className="h-auto w-full flex-col items-start p-3 text-left"><b>Ребёнок</b><span className="text-xs text-slate-600">Родитель или представитель</span></ToggleGroupItem>
            <ToggleGroupItem value="ADULT" className="h-auto w-full flex-col items-start p-3 text-left"><b>Взрослый ученик</b><span className="text-xs text-slate-600">Клиент занимается сам</span></ToggleGroupItem>
          </ToggleGroup>
          {(leadType === "ADULT" ? [{ fullName: primaryContactName, birthDate: adultBirthDate, gender: adultGender, experience: adultExperience }] : participants).map((participant, index) => {
            const update = (patch: Partial<CreateLeadParticipantInput>) => {
              if (leadType === "ADULT") {
                if (patch.birthDate !== undefined) setAdultBirthDate(patch.birthDate);
                if (patch.gender) setAdultGender(patch.gender);
                if (patch.experience) setAdultExperience(patch.experience);
              } else updateParticipant(index, { ...participant, ...patch });
            };
            return <section key={index} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-900">{leadType === "ADULT" ? primaryContactName : `Участник ${index + 1}`}</h4>
              {leadType === "CHILDREN" && <label><span className="mb-1.5 block text-xs font-medium text-slate-600">Имя ученика *</span><Input aria-label={`Имя участника ${index + 1}`} maxLength={MAX_NAME_LENGTH} aria-invalid={attempted && !participant.fullName.trim()} value={participant.fullName} onChange={e => update({ fullName: e.target.value })}/></label>}
              <label><span className="mb-1.5 block text-xs font-medium text-slate-600">Дата рождения *</span><DatePicker placeholder={`Дата рождения участника ${index + 1}`} max={addBusinessDays(businessDate(), -1)} value={participant.birthDate} aria-invalid={attempted && Boolean(birthDateError(participant.birthDate))} onValueChange={birthDate => update({ birthDate })}/>{attempted && birthDateError(participant.birthDate) && <span className="mt-1 block text-xs text-rose-600">{birthDateError(participant.birthDate)}</span>}</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="mb-1.5 block text-xs font-medium text-slate-600">Пол</span><NativeSelect aria-label={`Пол участника ${index + 1}`} value={participant.gender} onChange={e => update({ gender: e.target.value as Gender })}><option value="MALE">Мужской</option><option value="FEMALE">Женский</option></NativeSelect></label>
                <label><span className="mb-1.5 block text-xs font-medium text-slate-600">Подготовка</span><NativeSelect aria-label={`Подготовка участника ${index + 1}`} value={participant.experience} onChange={e => update({ experience: e.target.value as ExperienceLevel })}><option value="BEGINNER">Начинающий</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутый</option></NativeSelect></label>
              </div>
              {leadType === "CHILDREN" && participants.length > 1 && <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setParticipants(current => current.filter((_, i) => i !== index))}><Trash2 data-icon="inline-start"/>Удалить ученика</Button>}
            </section>;
          })}
          {leadType === "CHILDREN" && <Button variant="secondary" onClick={() => setParticipants(current => [...current, { ...EMPTY_PARTICIPANT }])}><Plus data-icon="inline-start"/>Добавить ученика</Button>}
        </div> : null}

        {step.id === "review" ? <div className="flex flex-col gap-4"><div><h3 className="ui-section-title">Проверьте данные</h3><p className="mt-1 text-xs leading-5 text-slate-600">После создания лид появится в колонке «Новые».</p></div><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-4"><Review label="Контакт" value={primaryContactName} note={`${phone}${email ? ` · ${email}` : ""}`} /><Review label="Ученик" value={leadType === "ADULT" ? primaryContactName : participants.map((item) => item.fullName).filter(Boolean).join(", ")} note={leadType === "ADULT" ? "Взрослый ученик" : "Детский клуб"} /><Review label="Следующий шаг" value="Связаться с клиентом" note="Договор и зачисление в группу выполняются отдельно" /></div></div> : null}
        {saved && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Лид создан. Повторное обновление списка не создаст ещё одну заявку.</p>}
        {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </LeadModalShell>
  );
};

const Review: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]"><span className="text-xs font-semibold uppercase text-slate-600">{label}</span><span><span className="block ui-section-title">{value || "Не указано"}</span>{note ? <span className="mt-1 block text-xs text-slate-600">{note}</span> : null}</span></div>;

export default AdminCreateLeadModal;
