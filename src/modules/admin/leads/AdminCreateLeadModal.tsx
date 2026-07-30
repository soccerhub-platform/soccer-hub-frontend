import React, { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { NativeSelect, Button, DatePicker, Input, ModalShell, Textarea, ToggleGroup, ToggleGroupItem, formControlClassName   } from "../../../shared/ui";
import { formatPhoneInput, isValidFormattedPhone, normalizePhoneForSubmit } from "../../../shared/phone";
import { LeadApi } from "./lead.api";
import { CreateLeadParticipantInput, ExperienceLevel, Gender, LeadType } from "./types";

interface AdminCreateLeadModalProps {
  branchId: string;
  branchName?: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type Step = "contact" | "student" | "interest" | "review";

const EMPTY_PARTICIPANT: CreateLeadParticipantInput = { fullName: "", birthDate: "", gender: "MALE", experience: "BEGINNER" };
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 160;
const MAX_COMMENT_LENGTH = 1000;
const steps: Array<{ id: Step; label: string; hint: string }> = [
  { id: "contact", label: "Контакт", hint: "Кто оставил заявку" },
  { id: "student", label: "Ученик", hint: "Кого записываем" },
  { id: "interest", label: "Интерес", hint: "Что нужно клиенту" },
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
  const [adultGender] = useState<Gender>("MALE");
  const [adultExperience, setAdultExperience] = useState<ExperienceLevel>("BEGINNER");
  const [participants, setParticipants] = useState<CreateLeadParticipantInput[]>([{ ...EMPTY_PARTICIPANT }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = steps[stepIndex];
  const contactLabel = leadType === "ADULT" ? "Игрок / контактное лицо" : "Родитель / представитель";

  const validation = useMemo(() => {
    const contactError = !primaryContactName.trim() ? "Укажите имя контактного лица" : !phone.trim() ? "Укажите телефон" : !isValidFormattedPhone(phone) ? "Введите номер в формате +7 777 123 45 67" : !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Некорректный email";
    const participantErrors = participants.map((participant) => ({
      fullName: participant.fullName.trim() ? "" : "Укажите имя ученика",
      birthDate: participant.birthDate.trim() ? "" : "Укажите дату рождения",
    }));
    const studentError = leadType === "ADULT" ? (!adultBirthDate ? "Укажите дату рождения" : "") : participantErrors.some((item) => item.fullName || item.birthDate) ? "Заполните данные ученика" : "";
    return { contactError, participantErrors, studentError, valid: !contactError && !studentError };
  }, [adultBirthDate, email, leadType, participants, phone, primaryContactName]);

  const canContinue = step.id === "contact" ? !validation.contactError : step.id === "student" ? !validation.studentError : true;

  const next = () => {
    if (!canContinue) {
      setError(step.id === "contact" ? validation.contactError : validation.studentError);
      return;
    }
    setError(null);
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const updateParticipant = (index: number, value: CreateLeadParticipantInput) => setParticipants((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));

  const submit = async () => {
    if (!validation.valid) {
      setError("Заполните обязательные поля перед созданием лида");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payloadParticipants = leadType === "ADULT" ? [{ fullName: primaryContactName.trim(), birthDate: adultBirthDate, gender: adultGender, experience: adultExperience }] : participants.map((participant) => ({ fullName: participant.fullName.trim(), birthDate: participant.birthDate, gender: participant.gender, experience: participant.experience }));
      await LeadApi.create({ leadType, branchId, primaryContact: { fullName: primaryContactName.trim(), phone: normalizePhoneForSubmit(phone), email: email.trim() || undefined }, comment: comment.trim() || undefined, participants: payloadParticipants });
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
    <ModalShell title="Новый лид" description={`Заявка из филиала ${branchName?.trim() || "по текущему выбору"}.`} eyebrow="Лиды" placement="right" maxWidthClassName="max-w-[520px]" heightClassName="h-[100dvh]" bodyClassName="bg-slate-50 px-4 py-4 sm:px-5" closeDisabled={loading} onClose={onClose} footer={
      <div className="flex justify-between gap-2">
        <Button type="button" variant="secondary" rounded="rounded-lg" disabled={loading} onClick={() => stepIndex ? setStepIndex((value) => value - 1) : onClose()}><ArrowLeft className="h-4 w-4" />{stepIndex ? "Назад" : "Отмена"}</Button>
        {step.id === "review" ? <Button type="button" rounded="rounded-lg" isLoading={loading} onClick={() => void submit()}><Check className="h-4 w-4" />Создать лид</Button> : <Button type="button" rounded="rounded-lg" disabled={!canContinue} onClick={next}>Далее<ArrowRight className="h-4 w-4" /></Button>}
      </div>
    }>
      <div className="space-y-5">
        <ol className="grid grid-cols-4 gap-2">
          {steps.map((item, index) => <li key={item.id}><div className={`h-1 rounded-full ${index <= stepIndex ? "bg-[#0066cc]" : "bg-slate-200"}`} /><span className={`mt-2 block truncate text-xs ${index === stepIndex ? "font-semibold text-slate-900" : "text-slate-500"}`}>{item.label}</span></li>)}
        </ol>

        {step.id === "contact" ? <div className="space-y-4">
          <div><h3 className="ui-section-title">Контактное лицо</h3><p className="mt-1 text-xs leading-5 text-slate-500">Укажите человека, с которым администратор будет связываться по заявке.</p></div>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">{contactLabel} <b className="text-rose-500">*</b></span><Input autoFocus value={primaryContactName} maxLength={MAX_NAME_LENGTH} placeholder="Мария Иванова" onChange={(event) => setPrimaryContactName(event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Телефон <b className="text-rose-500">*</b></span><Input value={phone} placeholder="+7 777 123 45 67" onChange={(event) => setPhone(formatPhoneInput(event.target.value))} /></label><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Email</span><Input type="email" value={email} placeholder="maria@example.com" maxLength={MAX_EMAIL_LENGTH} onChange={(event) => setEmail(event.target.value)} /></label></div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-[#0066cc]">Подсказка: после создания лида вы сможете добавить ученика, назначить пробное занятие и оформить клиента отдельными шагами.</div>
        </div> : null}

        {step.id === "student" ? <div className="space-y-4">
          <div><h3 className="ui-section-title">Кого оформляем?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Эти данные помогут подобрать подходящую группу и время пробного занятия.</p></div>
          <ToggleGroup type="single" value={leadType} onValueChange={(value) => value && setLeadType(value as LeadType)} variant="outline" className="grid gap-2 sm:grid-cols-2">
            <ToggleGroupItem value="CHILDREN" className="h-auto w-full flex-col items-start p-3 text-left"><b>Ребёнок</b><span className="text-xs text-slate-500">Родитель или представитель</span></ToggleGroupItem>
            <ToggleGroupItem value="ADULT" className="h-auto w-full flex-col items-start p-3 text-left"><b>Взрослый ученик</b><span className="text-xs text-slate-500">Клиент занимается сам</span></ToggleGroupItem>
          </ToggleGroup>
          {leadType === "ADULT" ? <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Дата рождения *</span><DatePicker value={adultBirthDate} onValueChange={setAdultBirthDate} /></label><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Уровень</span><NativeSelect className={formControlClassName} value={adultExperience} onChange={(event) => setAdultExperience(event.target.value as ExperienceLevel)}><option value="BEGINNER">Начинающий</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутый</option></NativeSelect></label></div> : <div className="flex flex-col gap-3">{participants.map((participant, index) => <div key={index} className="rounded-lg border border-slate-200 bg-white p-3"><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Имя ученика *</span><Input className={formControlClassName} value={participant.fullName} onChange={(event) => updateParticipant(index, { ...participant, fullName: event.target.value })} /></label><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Дата рождения *</span><DatePicker value={participant.birthDate} onValueChange={(birthDate) => updateParticipant(index, { ...participant, birthDate })} /></label></div>{participants.length > 1 ? <Button type="button" variant="ghost" size="sm" className="mt-2 text-rose-600" onClick={() => setParticipants((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 data-icon="inline-start" />Удалить ученика</Button> : null}</div>)}<Button type="button" variant="soft" size="sm" onClick={() => setParticipants((current) => [...current, { ...EMPTY_PARTICIPANT }])}><Plus data-icon="inline-start" />Добавить ученика</Button></div>}
        </div> : null}

          {step.id === "interest" ? <div className="space-y-4"><div><h3 className="ui-section-title">Интерес клиента</h3><p className="mt-1 text-xs leading-5 text-slate-500">Добавьте контекст заявки, чтобы менеджер понимал следующий шаг.</p></div><label><span className="mb-1.5 block text-xs font-medium text-slate-500">Комментарий</span><Textarea className="min-h-32" value={comment} maxLength={MAX_COMMENT_LENGTH} placeholder="Например: интересует футбол для сына 10 лет" onChange={(event) => setComment(event.target.value)} /><span className="mt-1 block text-right text-xs text-slate-400">{comment.length}/{MAX_COMMENT_LENGTH}</span></label><div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">Источник и предпочтения можно уточнить позже в карточке лида. Сейчас достаточно сохранить основной интерес клиента.</div></div> : null}

        {step.id === "review" ? <div className="space-y-4"><div><h3 className="ui-section-title">Проверьте данные</h3><p className="mt-1 text-xs leading-5 text-slate-500">После создания лид появится в колонке «Новые».</p></div><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-4"><Review label="Контакт" value={primaryContactName} note={`${phone}${email ? ` · ${email}` : ""}`} /><Review label="Ученик" value={leadType === "ADULT" ? primaryContactName : participants.map((item) => item.fullName).filter(Boolean).join(", ")} note={leadType === "ADULT" ? "Взрослый ученик" : "Детский клуб"} /><Review label="Следующий шаг" value="Связаться с клиентом" note="Договор и зачисление в группу выполняются отдельно" /></div></div> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

const Review: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><span><span className="block ui-section-title">{value || "Не указано"}</span>{note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}</span></div>;

export default AdminCreateLeadModal;
