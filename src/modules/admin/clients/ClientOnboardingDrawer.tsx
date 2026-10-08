import React, { useMemo, useState } from "react";
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../../shared/api";
import {
  Button,
  DatePicker,
  EntitySheet,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "../../../shared/ui";
import { ClientApi } from "./client.api";
import { clientSourceLabels, type ClientSource, type ClientStudentRelationshipType } from "./client.types";

type Mode = "DEPENDENT" | "SELF" | "CLIENT_ONLY";
type Step = "scenario" | "client" | "student" | "review";

const ClientOnboardingDrawer: React.FC<{
  branchId: string;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}> = ({ branchId, onClose, onCreated }) => {
  const [mode, setMode] = useState<Mode>("DEPENDENT");
  const [index, setIndex] = useState(0);
  const [client, setClient] = useState({ firstName: "", lastName: "", phone: "", email: "", source: "MANUAL" as ClientSource, sourceDetails: "", comments: "" });
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
    <EntitySheet
      title="Оформление клиента"
      description="Создайте коммерческую роль клиента и при необходимости профиль ученика. Договор оформляется отдельным следующим шагом."
      contentClassName="sm:max-w-2xl"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex w-full justify-between gap-2"><Button variant="secondary" disabled={saving} onClick={() => index ? setIndex((value) => value - 1) : onClose()}><ArrowLeft className="h-4 w-4" /> {index ? "Назад" : "Отмена"}</Button>{step === "review" ? <Button isLoading={saving} onClick={() => void submit()}><Check className="h-4 w-4" /> Создать</Button> : <Button onClick={next}>Продолжить <ArrowRight className="h-4 w-4" /></Button>}</div>}
    >
      <div className="space-y-6">
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>{steps.map((item, stepIndex) => <li key={item}><div className={`h-1 rounded-full ${stepIndex <= index ? "bg-admin-600" : "bg-slate-200"}`} /><span className="mt-2 block truncate text-xs text-slate-500">{labels[item]}</span></li>)}</ol>

        {step === "scenario" ? <div className="space-y-3">
          <Scenario selected={mode === "DEPENDENT"} icon={<GraduationCap />} title="Клиент оформляет ученика" description="Родитель или представитель оплачивает обучение другого человека." onClick={() => { setMode("DEPENDENT"); setIndex(0); }} />
          <Scenario selected={mode === "SELF"} icon={<User />} title="Клиент занимается сам" description="Создаются роли Client и Student с явной связью SELF." onClick={() => { setMode("SELF"); setIndex(0); }} />
          <Scenario selected={mode === "CLIENT_ONLY"} icon={<UserPlus />} title="Только клиент" description="Ученика можно связать позже из Client Workspace." onClick={() => { setMode("CLIENT_ONLY"); setIndex(0); }} />
        </div> : null}

        {step === "client" ? <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5"><span className="block text-sm font-medium">Имя *</span><Input autoFocus value={client.firstName} placeholder="Например, Мария" onChange={(event) => setClient((value) => ({ ...value, firstName: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Имя контактного лица и будущего плательщика.</span></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Фамилия</span><Input value={client.lastName} placeholder="Например, Иванова" onChange={(event) => setClient((value) => ({ ...value, lastName: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Можно заполнить позже.</span></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Телефон *</span><Input type="tel" value={client.phone} placeholder="+7 700 000 00 00" onChange={(event) => setClient((value) => ({ ...value, phone: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Основной номер для связи.</span></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Email</span><Input type="email" value={client.email} placeholder="client@example.com" onChange={(event) => setClient((value) => ({ ...value, email: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Необязательно, используется для документов.</span></label>
          <label className="space-y-1.5 sm:col-span-2"><span className="block text-sm font-medium">Источник</span><Select value={client.source} onValueChange={(value) => setClient((current) => ({ ...current, source: value as ClientSource }))}><SelectTrigger><SelectValue placeholder="Выберите источник" /></SelectTrigger><SelectContent>{Object.entries(clientSourceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><span className="block text-xs leading-5 text-slate-500">Нужен для аналитики привлечения клиентов.</span></label>
          {client.source === "OTHER" ? <label className="space-y-1.5 sm:col-span-2"><span className="block text-sm font-medium">Уточнение источника</span><Input value={client.sourceDetails} placeholder="Например, школьный турнир" onChange={(event) => setClient((value) => ({ ...value, sourceDetails: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Коротко укажите конкретный источник.</span></label> : null}
          <label className="space-y-1.5 sm:col-span-2"><span className="block text-sm font-medium">Комментарий</span><Textarea className="min-h-24 resize-y" value={client.comments} placeholder="Предпочтения, договорённости или важный контекст" onChange={(event) => setClient((value) => ({ ...value, comments: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Внутренняя заметка для сотрудников клуба.</span></label>
        </div> : null}

        {step === "student" ? <div className="space-y-4">
          {mode === "SELF" ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-admin-600">Профиль ученика будет создан для {clientName}. Связь: SELF.</div> : <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="block text-sm font-medium">Имя ученика *</span><Input value={student.firstName} placeholder="Например, Арман" onChange={(event) => setStudent((value) => ({ ...value, firstName: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Имя в профиле ученика.</span></label><label className="space-y-1.5"><span className="block text-sm font-medium">Фамилия</span><Input value={student.lastName} placeholder="Например, Садыков" onChange={(event) => setStudent((value) => ({ ...value, lastName: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Помогает отличать одноимённых учеников.</span></label></div>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="block text-sm font-medium">Дата рождения *</span><DatePicker value={student.birthDate} onValueChange={(birthDate) => setStudent((value) => ({ ...value, birthDate }))} /><span className="block text-xs leading-5 text-slate-500">Используется для возрастных групп.</span></label>{mode === "DEPENDENT" ? <label className="space-y-1.5"><span className="block text-sm font-medium">Тип связи</span><Select value={relationshipType} onValueChange={(value) => setRelationshipType(value as typeof relationshipType)}><SelectTrigger><SelectValue placeholder="Выберите тип связи" /></SelectTrigger><SelectContent><SelectItem value="MOTHER">Мать</SelectItem><SelectItem value="FATHER">Отец</SelectItem><SelectItem value="GUARDIAN">Представитель</SelectItem><SelectItem value="OTHER">Другое</SelectItem></SelectContent></Select><span className="block text-xs leading-5 text-slate-500">Кем клиент приходится ученику.</span></label> : null}</div>
        </div> : null}

        {step === "review" ? <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4"><Review label="Клиент" value={clientName} note={client.phone} />{mode !== "CLIENT_ONLY" ? <Review label="Ученик" value={studentName} note={mode === "SELF" ? "SELF" : relationshipType} /> : null}<Review label="Следующий шаг" value="Создать договор" note="Откроется из Client Workspace после сохранения" /></div> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </EntitySheet>
  );
};

const Scenario: React.FC<{ selected: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }> = ({ selected, icon, title, description, onClick }) => <button type="button" onClick={onClick} className={`flex w-full gap-3 rounded-lg border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-admin-600 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><span><span className="block ui-section-title">{title}</span><span className="mt-1 block text-sm text-slate-700">{description}</span></span></button>;
const Review: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><span><span className="block ui-section-title">{value}</span>{note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}</span></div>;

export default ClientOnboardingDrawer;
