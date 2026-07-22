import React, { useMemo, useState } from "react";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  UserIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { ClientApi } from "./client.api";
import type { ClientStudentRelationshipType } from "./client.types";

type Mode = "DEPENDENT" | "SELF" | "CLIENT_ONLY";
type Step = "scenario" | "client" | "student" | "review";

const ClientOnboardingDrawer: React.FC<{
  branchId: string;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}> = ({ branchId, onClose, onCreated }) => {
  const [mode, setMode] = useState<Mode>("DEPENDENT");
  const [index, setIndex] = useState(0);
  const [client, setClient] = useState({ firstName: "", lastName: "", phone: "", email: "", source: "", comments: "" });
  const [student, setStudent] = useState({ firstName: "", lastName: "", birthDate: "" });
  const [relationshipType, setRelationshipType] = useState<Exclude<ClientStudentRelationshipType, "SELF" | "LEGACY_PARENT">>("MOTHER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo<Step[]>(() => mode === "CLIENT_ONLY"
    ? ["scenario", "client", "review"]
    : ["scenario", "client", "student", "review"], [mode]);
  const step = steps[index];
  const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ");
  const studentName = mode === "SELF" ? clientName : [student.firstName, student.lastName].filter(Boolean).join(" ");

  const next = () => {
    if (step === "client" && (!client.firstName.trim() || !client.phone.trim())) {
      setError("Укажите имя и телефон клиента");
      return;
    }
    if (step === "student" && (!student.birthDate || (mode === "DEPENDENT" && !student.firstName.trim()))) {
      setError("Укажите имя и дату рождения ученика");
      return;
    }
    setError(null);
    setIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await ClientApi.create({ ...client, branchId });
      if (mode !== "CLIENT_ONLY") {
        await ClientApi.createStudent(created.client.id, {
          firstName: mode === "SELF" ? client.firstName : student.firstName,
          lastName: mode === "SELF" ? client.lastName : student.lastName,
          birthDate: student.birthDate,
          relationshipType: mode === "SELF" ? "SELF" : relationshipType,
          primaryContact: true,
          primaryPayer: true,
          legalRepresentative: true,
          receivesNotifications: true,
          startedAt: new Date().toISOString().slice(0, 10),
        });
      }
      toast.success(mode === "CLIENT_ONLY" ? "Клиент создан" : "Клиент и ученик оформлены");
      onCreated(created.client.id);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось завершить оформление"));
    } finally {
      setSaving(false);
    }
  };

  const labels: Record<Step, string> = { scenario: "Сценарий", client: "Клиент", student: "Ученик", review: "Проверка" };

  return (
    <ModalShell
      title="Оформление клиента"
      eyebrow="Клиенты"
      description="Создайте коммерческую роль клиента и при необходимости профиль ученика. Договор оформляется отдельным следующим шагом."
      placement="right"
      maxWidthClassName="max-w-2xl"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex justify-between gap-2"><Button variant="secondary" rounded="rounded-lg" disabled={saving} onClick={() => index ? setIndex((value) => value - 1) : onClose()}><ArrowLeftIcon className="h-4 w-4" /> {index ? "Назад" : "Отмена"}</Button>{step === "review" ? <Button rounded="rounded-lg" isLoading={saving} onClick={() => void submit()}><CheckIcon className="h-4 w-4" /> Создать</Button> : <Button rounded="rounded-lg" onClick={next}>Продолжить <ArrowRightIcon className="h-4 w-4" /></Button>}</div>}
    >
      <div className="space-y-6">
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>{steps.map((item, stepIndex) => <li key={item}><div className={`h-1 rounded-full ${stepIndex <= index ? "bg-admin-700" : "bg-slate-200"}`} /><span className="mt-2 block truncate text-xs text-slate-500">{labels[item]}</span></li>)}</ol>

        {step === "scenario" ? <div className="space-y-3">
          <Scenario selected={mode === "DEPENDENT"} icon={<AcademicCapIcon />} title="Клиент оформляет ученика" description="Родитель или представитель оплачивает обучение другого человека." onClick={() => { setMode("DEPENDENT"); setIndex(0); }} />
          <Scenario selected={mode === "SELF"} icon={<UserIcon />} title="Клиент занимается сам" description="Создаются роли Client и Student с явной связью SELF." onClick={() => { setMode("SELF"); setIndex(0); }} />
          <Scenario selected={mode === "CLIENT_ONLY"} icon={<UserPlusIcon />} title="Только клиент" description="Ученика можно связать позже из Client Workspace." onClick={() => { setMode("CLIENT_ONLY"); setIndex(0); }} />
        </div> : null}

        {step === "client" ? <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-sm font-medium">Имя *</span><input autoFocus className={formControlClassName} value={client.firstName} onChange={(event) => setClient((value) => ({ ...value, firstName: event.target.value }))} /></label>
          <label><span className="mb-1.5 block text-sm font-medium">Фамилия</span><input className={formControlClassName} value={client.lastName} onChange={(event) => setClient((value) => ({ ...value, lastName: event.target.value }))} /></label>
          <label><span className="mb-1.5 block text-sm font-medium">Телефон *</span><input className={formControlClassName} value={client.phone} onChange={(event) => setClient((value) => ({ ...value, phone: event.target.value }))} /></label>
          <label><span className="mb-1.5 block text-sm font-medium">Email</span><input type="email" className={formControlClassName} value={client.email} onChange={(event) => setClient((value) => ({ ...value, email: event.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Источник</span><input className={formControlClassName} value={client.source} onChange={(event) => setClient((value) => ({ ...value, source: event.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Комментарий</span><textarea className={`${formControlClassName} min-h-24`} value={client.comments} onChange={(event) => setClient((value) => ({ ...value, comments: event.target.value }))} /></label>
        </div> : null}

        {step === "student" ? <div className="space-y-4">
          {mode === "SELF" ? <div className="rounded-lg border border-admin-200 bg-admin-50 p-4 text-sm text-admin-900">Профиль ученика будет создан для {clientName}. Связь: SELF.</div> : <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Имя ученика *</span><input className={formControlClassName} value={student.firstName} onChange={(event) => setStudent((value) => ({ ...value, firstName: event.target.value }))} /></label><label><span className="mb-1.5 block text-sm font-medium">Фамилия</span><input className={formControlClassName} value={student.lastName} onChange={(event) => setStudent((value) => ({ ...value, lastName: event.target.value }))} /></label></div>}
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Дата рождения *</span><input type="date" className={formControlClassName} value={student.birthDate} onChange={(event) => setStudent((value) => ({ ...value, birthDate: event.target.value }))} /></label>{mode === "DEPENDENT" ? <label><span className="mb-1.5 block text-sm font-medium">Тип связи</span><select className={formControlClassName} value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as typeof relationshipType)}><option value="MOTHER">Мать</option><option value="FATHER">Отец</option><option value="GUARDIAN">Представитель</option><option value="OTHER">Другое</option></select></label> : null}</div>
        </div> : null}

        {step === "review" ? <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4"><Review label="Клиент" value={clientName} note={client.phone} />{mode !== "CLIENT_ONLY" ? <Review label="Ученик" value={studentName} note={mode === "SELF" ? "SELF" : relationshipType} /> : null}<Review label="Следующий шаг" value="Создать договор" note="Откроется из Client Workspace после сохранения" /></div> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

const Scenario: React.FC<{ selected: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }> = ({ selected, icon, title, description, onClick }) => <button type="button" onClick={onClick} className={`flex w-full gap-3 rounded-lg border p-4 text-left transition ${selected ? "border-admin-500 bg-admin-50" : "border-slate-200 hover:border-slate-300"}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-admin-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><span><span className="block text-sm font-semibold text-slate-950">{title}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span></button>;
const Review: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><span><span className="block text-sm font-semibold text-slate-950">{value}</span>{note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}</span></div>;

export default ClientOnboardingDrawer;
