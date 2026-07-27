import React, { useEffect, useState } from "react";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { clientSourceLabels, type ClientDetails, type ClientFormInput, type ClientSource } from "./client.types";

const emptyForm: ClientFormInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  source: "MANUAL",
  sourceDetails: "",
  comments: "",
};

const ClientFormDrawer: React.FC<{
  client?: ClientDetails | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: ClientFormInput) => void;
}> = ({ client, saving, error, onClose, onSubmit }) => {
  const [form, setForm] = useState<ClientFormInput>(emptyForm);

  useEffect(() => {
    setForm(client ? {
      firstName: client.client.firstName ?? "",
      lastName: client.client.lastName ?? "",
      phone: client.client.phone ?? "",
      email: client.client.email ?? "",
      source: client.client.source ?? "UNKNOWN",
      sourceDetails: client.client.sourceDetails ?? "",
      comments: client.client.comments ?? "",
    } : emptyForm);
  }, [client]);

  const field = (key: keyof ClientFormInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <ModalShell
      title={client ? "Редактировать клиента" : "Новый клиент"}
      description="Контакт и сторона будущих договоров"
      eyebrow="Клиент"
      placement="right"
      maxWidthClassName="max-w-lg"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button><Button onClick={() => onSubmit(form)} isLoading={saving}>Сохранить</Button></div>}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Имя *</span><input autoFocus value={form.firstName} onChange={(event) => field("firstName", event.target.value)} className={formControlClassName} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Фамилия</span><input value={form.lastName} onChange={(event) => field("lastName", event.target.value)} className={formControlClassName} /></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Телефон</span><input type="tel" value={form.phone} onChange={(event) => field("phone", event.target.value)} className={formControlClassName} placeholder="+7 700 000 00 00" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span><input type="email" value={form.email} onChange={(event) => field("email", event.target.value)} className={formControlClassName} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Источник</span><select value={form.source ?? "UNKNOWN"} onChange={(event) => field("source", event.target.value as ClientSource)} className={formControlClassName}>{Object.entries(clientSourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.source === "OTHER" ? <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Уточнение источника</span><input value={form.sourceDetails ?? ""} onChange={(event) => field("sourceDetails", event.target.value)} className={formControlClassName} placeholder="Например, турнир в школе" /></label> : null}
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Комментарий</span><textarea value={form.comments} onChange={(event) => field("comments", event.target.value)} className={`${formControlClassName} min-h-28 resize-y`} /></label>
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

export default ClientFormDrawer;
