import React, { useState } from "react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../../shared/api";
import { formatPhoneInput, isValidFormattedPhone, normalizePhoneForSubmit } from "../../../shared/phone";
import { Button, Input, ModalShell, NativeSelect, TimePicker } from "../../../shared/ui";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../../../shared/ui/shadcn/field";
import { Checkbox } from "../../../shared/ui/shadcn/checkbox";
import { Alert, AlertDescription } from "../../../shared/ui/shadcn/alert";
import { BranchManagementApi } from "./branch.api";
import { BranchDetailsPayload, DispatcherBranch, WEEK_DAYS, WorkingDay } from "./branch.types";

interface Props { club: { clubId: string; name: string }; branch?: DispatcherBranch; onClose: () => void; onSaved: () => Promise<void> }

export default function BranchEditor({ club, branch, onClose, onSaved }: Props) {
  const managers = useQuery(["dispatcher", "branch-managers"], BranchManagementApi.managers);
  const [name, setName] = useState(branch?.name || "");
  const [address, setAddress] = useState(branch?.address || "");
  const [phone, setPhone] = useState(formatPhoneInput(branch?.phone || ""));
  const [email, setEmail] = useState(branch?.email || "");
  const [managerId, setManagerId] = useState(branch?.managerAdminId || "");
  const [hasHours, setHasHours] = useState(Boolean(branch?.workingHours?.length));
  const [hours, setHours] = useState<WorkingDay[]>(() => WEEK_DAYS.map(([day], index) => {
    const saved = branch?.workingHours?.find(item => item.day === day);
    return saved ? { ...saved, opensAt: saved.opensAt?.slice(0, 5) || "09:00", closesAt: saved.closesAt?.slice(0, 5) || "21:00" }
      : { day, closed: index > 4, opensAt: "09:00", closesAt: "21:00" };
  }));
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const candidates = (managers.data?.admins || []).filter(admin => admin.isActive ?? admin.active ?? false);
  const errors = {
    name: name.trim() ? "" : "Укажите название филиала",
    phone: !phone.trim() || isValidFormattedPhone(phone) ? "" : "Введите номер в формате +7 777 123 45 67",
    email: !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Укажите корректный email",
    manager: managerId && !managers.isLoading && !candidates.some(admin => admin.id === managerId) ? "Выберите действующего администратора" : "",
  };
  const hoursError = (item: WorkingDay) => !item.closed && (!item.opensAt || !item.closesAt || item.closesAt <= item.opensAt)
    ? "Закрытие должно быть позже открытия" : "";
  const updateDay = (index: number, patch: Partial<WorkingDay>) => setHours(value => value.map((day, i) => i === index ? { ...day, ...patch } : day));

  const save = async () => {
    if (pending) return;
    setAttempted(true);
    if (Object.values(errors).some(Boolean) || (hasHours && hours.some(day => hoursError(day)))) return;
    if (managerId && (managers.isLoading || managers.isError)) {
      setError("Не удалось проверить руководителя. Обновите список администраторов.");
      return;
    }
    const payload: BranchDetailsPayload = {
      name: name.trim(), address: address.trim(), phone: normalizePhoneForSubmit(phone) || "", email: email.trim(),
      managerAdminId: managerId || null,
      workingHours: hasHours ? hours.map(day => day.closed ? { ...day, opensAt: null, closesAt: null } : day) : [],
    };
    setPending(true); setError("");
    try {
      if (branch) await BranchManagementApi.update(branch.branchId, payload);
      else await BranchManagementApi.create(club.clubId, payload);
      toast.success(branch ? "Филиал обновлён" : "Филиал создан");
      onClose();
      await onSaved();
    } catch (reason) { setError(getApiErrorMessage(reason, "Не удалось сохранить филиал")); }
    finally { setPending(false); }
  };

  return <ModalShell title={branch ? "Редактировать филиал" : "Создать филиал"} description={`Клуб: ${club.name}`} placement="right" maxWidthClassName="max-w-[600px]" closeDisabled={pending} onClose={onClose}
    footer={<div className="flex justify-between gap-2"><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button type="submit" form="branch-details" disabled={pending}>{pending ? "Сохранение…" : branch ? "Сохранить" : "Создать"}</Button></div>}>
    <form id="branch-details" onSubmit={event => { event.preventDefault(); void save(); }}><FieldGroup>
      <Field data-invalid={attempted && Boolean(errors.name)}><FieldLabel htmlFor="branch-name">Название *</FieldLabel><Input id="branch-name" autoFocus maxLength={255} disabled={pending} value={name} aria-invalid={attempted && Boolean(errors.name)} onChange={event => setName(event.target.value)} /><FieldError>{attempted && errors.name}</FieldError></Field>
      <Field><FieldLabel htmlFor="branch-address">Адрес</FieldLabel><Input id="branch-address" maxLength={500} disabled={pending} value={address} onChange={event => setAddress(event.target.value)} /></Field>
      <Field data-invalid={attempted && Boolean(errors.phone)}><FieldLabel htmlFor="branch-phone">Телефон филиала</FieldLabel><Input id="branch-phone" type="tel" maxLength={16} disabled={pending} value={phone} placeholder="+7 777 123 45 67" aria-invalid={attempted && Boolean(errors.phone)} onChange={event => setPhone(formatPhoneInput(event.target.value))} /><FieldError>{attempted && errors.phone}</FieldError></Field>
      <Field data-invalid={attempted && Boolean(errors.email)}><FieldLabel htmlFor="branch-email">Email филиала</FieldLabel><Input id="branch-email" type="email" maxLength={254} disabled={pending} value={email} aria-invalid={attempted && Boolean(errors.email)} onChange={event => setEmail(event.target.value)} /><FieldError>{attempted && errors.email}</FieldError></Field>
      <Field data-invalid={attempted && Boolean(errors.manager)}><FieldLabel htmlFor="branch-manager">Руководитель филиала</FieldLabel><NativeSelect id="branch-manager" value={managerId} disabled={pending || managers.isLoading || managers.isError} onChange={event => setManagerId(event.target.value)}><option value="">Не назначен</option>{branch?.managerAdminId && !candidates.some(admin => admin.id === branch.managerAdminId) && <option value={branch.managerAdminId} disabled>{branch.managerName || "Руководитель недоступен"}</option>}{candidates.map(admin => <option key={admin.id} value={admin.id}>{admin.firstName} {admin.lastName} · {admin.email}</option>)}</NativeSelect><FieldDescription>Выбранный администратор получит доступ к филиалу.</FieldDescription><FieldError>{attempted && errors.manager}</FieldError>{managers.isError && <Alert variant="destructive"><AlertDescription>Не удалось загрузить администраторов. <Button type="button" size="sm" variant="ghost" onClick={() => void managers.refetch()}>Повторить</Button></AlertDescription></Alert>}{!managers.isLoading && !managers.isError && !candidates.length && <FieldDescription>Сначала добавьте администратора в разделе «Администраторы». Руководителя можно назначить позже.</FieldDescription>}</Field>
      <Field><div className="flex items-center gap-3"><Checkbox id="branch-has-hours" checked={hasHours} disabled={pending} onCheckedChange={value => setHasHours(value === true)} /><FieldLabel htmlFor="branch-has-hours">Указать график работы</FieldLabel></div><FieldDescription>Местное время филиала. График работы отделён от расписания тренировок.</FieldDescription></Field>
      {hasHours && <fieldset className="min-w-0"><legend className="mb-4 text-sm font-medium">График по дням недели</legend><FieldGroup>{hours.map((day, index) => <Field key={day.day} data-invalid={attempted && Boolean(hoursError(day))}>
        <div className="flex flex-wrap items-center justify-between gap-3"><FieldLabel>{WEEK_DAYS[index][1]}</FieldLabel><div className="flex items-center gap-2"><Checkbox id={`closed-${day.day}`} checked={day.closed} disabled={pending} onCheckedChange={value => updateDay(index, { closed: value === true })} /><FieldLabel htmlFor={`closed-${day.day}`}>Выходной</FieldLabel></div></div>
        {!day.closed && <div className="grid grid-cols-2 gap-3"><TimePicker aria-label={`Открытие: ${WEEK_DAYS[index][1]}`} aria-invalid={attempted && Boolean(hoursError(day))} disabled={pending} minuteStep={1} value={day.opensAt || ""} onValueChange={value => updateDay(index, { opensAt: value })} /><TimePicker aria-label={`Закрытие: ${WEEK_DAYS[index][1]}`} aria-invalid={attempted && Boolean(hoursError(day))} disabled={pending} minuteStep={1} value={day.closesAt || ""} onValueChange={value => updateDay(index, { closesAt: value })} /></div>}
        <FieldError>{attempted && hoursError(day)}</FieldError>
      </Field>)}</FieldGroup></fieldset>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </FieldGroup></form>
  </ModalShell>;
}
