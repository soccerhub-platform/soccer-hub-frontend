import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, DatePicker, Input, ModalShell, NativeSelect, Textarea, ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../../../shared/ui/shadcn/field";
import { Alert, AlertDescription } from "../../../shared/ui/shadcn/alert";
import { addBusinessDays, businessDate } from "../../../shared/business-time";
import { getApiErrorMessage } from "../../../shared/api";
import { formatPhoneInput, isValidFormattedPhone, normalizePhoneForSubmit } from "../../../shared/phone";
import { DispatcherLeadsApi } from "./leads.api";
import { CreateDispatcherLeadPayload, DispatcherBranchOption } from "./types";
import { validateDispatcherParticipant } from "./lead.validation";

interface Props {
  branches: DispatcherBranchOption[];
  initialBranchId?: string;
  onClose: () => void;
  onSuccess: (branchId: string) => Promise<void> | void;
}
const newParticipant = () => ({ fullName: "", birthDate: "", gender: "MALE" as const, experience: "BEGINNER" });

const CreateLeadModal: React.FC<Props> = ({ branches, initialBranchId, onClose, onSuccess }) => {
  const [leadType, setLeadType] = useState<CreateDispatcherLeadPayload["leadType"]>("CHILDREN");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState(initialBranchId || branches[0]?.id || "");
  const [comment, setComment] = useState("");
  const [participants, setParticipants] = useState<CreateDispatcherLeadPayload["participants"]>([newParticipant()]);
  const [adult, setAdult] = useState<CreateDispatcherLeadPayload["participants"][number]>(newParticipant());
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const visibleParticipants = leadType === "ADULT" ? [{ ...adult, fullName: name }] : participants;
  const contactErrors = {
    name: name.trim() ? "" : "Укажите имя контактного лица",
    phone: isValidFormattedPhone(phone) ? "" : "Введите телефон в формате +7 777 123 45 67",
    email: !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Некорректный email",
    branch: branches.some(branch => branch.id === branchId) ? "" : "Выберите филиал",
  };
  const participantErrors = visibleParticipants.map(validateDispatcherParticipant);
  const updateParticipant = (index: number, patch: Partial<CreateDispatcherLeadPayload["participants"][number]>) => {
    if (leadType === "ADULT") setAdult(value => ({ ...value, ...patch }));
    else setParticipants(values => values.map((value,i) => i === index ? { ...value, ...patch } : value));
  };
  const submit = async () => {
    if (saving) return;
    setAttempted(true);
    if (Object.values(contactErrors).some(Boolean) || participantErrors.some(Boolean) || visibleParticipants.length === 0) return;
    setSaving(true);
    setError("");
    try {
      if (!saved) {
        await DispatcherLeadsApi.create({ leadType, branchId, primaryContact: { fullName: name.trim(), phone: normalizePhoneForSubmit(phone), email: email.trim() || undefined }, comment: comment.trim() || undefined, participants: visibleParticipants.map(participant => ({ ...participant, fullName: participant.fullName.trim() })) });
        setSaved(true);
      }
      await onSuccess(branchId);
      onClose();
    } catch (reason) { setError(getApiErrorMessage(reason, "Не удалось создать лид")); }
    finally { setSaving(false); }
  };

  return <ModalShell title="Новый лид" description="Добавьте контакт и учеников. Администратор филиала продолжит обработку заявки." placement="right" maxWidthClassName="max-w-[560px]" closeDisabled={saving} onClose={onClose} footer={
    <div className="flex justify-between gap-2"><Button variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button><Button disabled={saving} onClick={() => void submit()}>{saving ? "Сохранение…" : saved ? "Обновить список" : "Создать лид"}</Button></div>
  }>
    <form id="dispatcher-create-lead" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <FieldGroup>
        <Field><FieldLabel htmlFor="lead-branch">Филиал *</FieldLabel><NativeSelect id="lead-branch" value={branchId} disabled={saving || saved} onChange={e => setBranchId(e.target.value)}><option value="">Выберите филиал</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</NativeSelect><FieldError>{attempted ? contactErrors.branch : ""}</FieldError></Field>
        <Field><FieldLabel>Направление заявки</FieldLabel><ToggleGroup type="single" variant="outline" aria-label="Направление заявки" value={leadType} disabled={saving || saved} onValueChange={value => { if (value === "CHILDREN" || value === "ADULT") setLeadType(value); }}><ToggleGroupItem value="CHILDREN">Детский клуб</ToggleGroupItem><ToggleGroupItem value="ADULT">Взрослый ученик</ToggleGroupItem></ToggleGroup></Field>
        <Field data-invalid={attempted && Boolean(contactErrors.name)}><FieldLabel htmlFor="lead-contact">{leadType === "ADULT" ? "Имя ученика / контакта *" : "Родитель / представитель *"}</FieldLabel><Input id="lead-contact" autoFocus value={name} maxLength={120} disabled={saving || saved} aria-invalid={attempted && Boolean(contactErrors.name)} onChange={e => setName(e.target.value)} /><FieldError>{attempted ? contactErrors.name : ""}</FieldError></Field>
        <Field data-invalid={attempted && Boolean(contactErrors.phone)}><FieldLabel htmlFor="lead-phone">Телефон *</FieldLabel><Input id="lead-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 777 123 45 67" value={phone} maxLength={16} disabled={saving || saved} aria-invalid={attempted && Boolean(contactErrors.phone)} onChange={e => setPhone(formatPhoneInput(e.target.value))} /><FieldError>{attempted ? contactErrors.phone : ""}</FieldError></Field>
        <Field data-invalid={attempted && Boolean(contactErrors.email)}><FieldLabel htmlFor="lead-email">Email</FieldLabel><Input id="lead-email" type="email" autoComplete="email" value={email} maxLength={160} disabled={saving || saved} aria-invalid={attempted && Boolean(contactErrors.email)} onChange={e => setEmail(e.target.value)} /><FieldError>{attempted ? contactErrors.email : ""}</FieldError></Field>
        {visibleParticipants.map((participant,index) => <section key={index} className="rounded-xl border border-border p-4">
          <div className="mb-4 flex items-center justify-between gap-2"><h3 className="ui-section-title">{leadType === "ADULT" ? "Данные ученика" : `Ученик ${index + 1}`}</h3>{leadType === "CHILDREN" && participants.length > 1 && <Button type="button" variant="ghost" size="sm" disabled={saving || saved} aria-label={`Удалить ученика ${index + 1}`} onClick={() => setParticipants(values => values.filter((_,i) => i !== index))}><Trash2 data-icon="inline-start" /></Button>}</div>
          <FieldGroup>
            {leadType === "CHILDREN" && <Field><FieldLabel htmlFor={`lead-student-${index}`}>Имя ученика *</FieldLabel><Input id={`lead-student-${index}`} value={participant.fullName} maxLength={120} disabled={saving || saved} aria-invalid={attempted && !participant.fullName.trim()} onChange={e => updateParticipant(index,{fullName:e.target.value})} /></Field>}
            <Field><FieldLabel htmlFor={`lead-birth-${index}`}>Дата рождения *</FieldLabel><DatePicker id={`lead-birth-${index}`} placeholder={`Дата рождения ученика ${index + 1}`} value={participant.birthDate || ""} max={addBusinessDays(businessDate(),-1)} disabled={saving || saved} onValueChange={birthDate => updateParticipant(index,{birthDate})} /><FieldDescription>Укажите точную дату: она нужна для подбора группы.</FieldDescription></Field>
            <Field><FieldLabel htmlFor={`lead-gender-${index}`}>Пол</FieldLabel><NativeSelect id={`lead-gender-${index}`} value={participant.gender} disabled={saving || saved} onChange={e => updateParticipant(index,{gender:e.target.value as "MALE" | "FEMALE"})}><option value="MALE">Мужской</option><option value="FEMALE">Женский</option></NativeSelect></Field>
            <Field><FieldLabel htmlFor={`lead-experience-${index}`}>Подготовка</FieldLabel><NativeSelect id={`lead-experience-${index}`} value={participant.experience} disabled={saving || saved} onChange={e => updateParticipant(index,{experience:e.target.value})}><option value="BEGINNER">Начинающий</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутый</option></NativeSelect></Field>
            <FieldError>{attempted ? participantErrors[index] : ""}</FieldError>
          </FieldGroup>
        </section>)}
        {leadType === "CHILDREN" && <Button type="button" variant="secondary" disabled={saving || saved} onClick={() => setParticipants(values => [...values,newParticipant()])}><Plus data-icon="inline-start" />Добавить ученика</Button>}
        <Field><FieldLabel htmlFor="lead-comment">Комментарий</FieldLabel><Textarea id="lead-comment" value={comment} maxLength={1000} disabled={saving || saved} onChange={e => setComment(e.target.value)} /><FieldDescription>{comment.length}/1000</FieldDescription></Field>
        {saved && <Alert><AlertDescription>Лид создан. Повторное обновление списка не создаст дубликат.</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </FieldGroup>
    </form>
  </ModalShell>;
};
export default CreateLeadModal;
