import React, { useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DocumentTextIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { ContractsApi } from "../contracts/contracts.api";
import type { ContractGroupOption, CreateContractRequest } from "../contracts/contracts.types";
import { ClientApi } from "./client.api";
import type { ClientStudentRelationshipType } from "./client.types";

type OnboardingMode = "DEPENDENT" | "SELF" | "CLIENT_ONLY";
type StepId = "scenario" | "client" | "student" | "contract" | "review";

const today = () => new Date().toISOString().slice(0, 10);
const oneMonthFromToday = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};
const fullName = (firstName: string, lastName: string) => `${firstName.trim()} ${lastName.trim()}`.trim();
const money = (value: string, currency: string) => `${new Intl.NumberFormat("ru-RU").format(Number(value || 0))} ${currency}`;

const relationshipLabels: Record<Exclude<ClientStudentRelationshipType, "SELF" | "LEGACY_PARENT">, string> = {
  MOTHER: "Мать",
  FATHER: "Отец",
  GUARDIAN: "Опекун или представитель",
  OTHER: "Другое",
};

const ClientOnboardingDrawer: React.FC<{
  branchId: string;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}> = ({ branchId, onClose, onCreated }) => {
  const [mode, setMode] = useState<OnboardingMode>("DEPENDENT");
  const [stepIndex, setStepIndex] = useState(0);
  const [groups, setGroups] = useState<ContractGroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState({ firstName: "", lastName: "", phone: "", email: "", source: "", comments: "" });
  const [student, setStudent] = useState({ firstName: "", lastName: "", birthDate: "" });
  const [relationshipType, setRelationshipType] = useState<Exclude<ClientStudentRelationshipType, "SELF" | "LEGACY_PARENT">>("MOTHER");
  const [contract, setContract] = useState({
    groupId: "",
    startDate: today(),
    endDate: oneMonthFromToday(),
    amount: "30000",
    currency: "KZT",
    notes: "",
  });

  const steps = useMemo<Array<{ id: StepId; label: string }>>(() => mode === "CLIENT_ONLY"
    ? [{ id: "scenario", label: "Сценарий" }, { id: "client", label: "Клиент" }, { id: "review", label: "Проверка" }]
    : [
        { id: "scenario", label: "Сценарий" },
        { id: "client", label: "Клиент" },
        { id: "student", label: "Ученик" },
        { id: "contract", label: "Договор" },
        { id: "review", label: "Проверка" },
      ], [mode]);
  const step = steps[stepIndex]?.id ?? "scenario";
  const selectedGroup = groups.find((item) => item.id === contract.groupId) ?? null;
  const clientName = fullName(client.firstName, client.lastName);
  const studentName = mode === "SELF" ? clientName : fullName(student.firstName, student.lastName);

  useEffect(() => {
    if (mode === "CLIENT_ONLY") return;
    setGroupsLoading(true);
    ContractsApi.listGroups(branchId, mode === "SELF" ? "ADULT" : "CHILDREN", "")
      .then(setGroups)
      .catch((requestError) => setError(getApiErrorMessage(requestError, "Не удалось загрузить группы")))
      .finally(() => setGroupsLoading(false));
  }, [branchId, mode]);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, steps.length - 1));
    setContract((current) => ({ ...current, groupId: "" }));
    setError(null);
  }, [mode, steps.length]);

  useEffect(() => {
    setError(null);
  }, [client, contract, relationshipType, student]);

  const validateStep = () => {
    if (step === "client") {
      if (!client.firstName.trim()) return "Укажите имя клиента";
      if (!client.phone.trim()) return "Укажите телефон клиента";
    }
    if (step === "student") {
      if (mode === "DEPENDENT" && !student.firstName.trim()) return "Укажите имя ученика";
      if (!student.birthDate) return "Укажите дату рождения ученика";
    }
    if (step === "contract") {
      if (!contract.groupId) return "Выберите группу";
      if (!contract.startDate || !contract.endDate) return "Укажите срок договора";
      if (contract.endDate < contract.startDate) return "Дата окончания должна быть не раньше даты начала";
      if (!contract.amount.trim() || Number(contract.amount) < 0) return "Укажите корректную сумму договора";
    }
    return null;
  };

  const next = () => {
    const message = validateStep();
    if (message) { setError(message); return; }
    setError(null);
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === "CLIENT_ONLY") {
        const created = await ClientApi.create({ ...client, branchId });
        toast.success("Карточка клиента создана");
        onCreated(created.client.id);
        return;
      }

      const payload: CreateContractRequest = {
        branchId,
        leadType: mode === "SELF" ? "ADULT" : "CHILDREN",
        participantDraft: { fullName: studentName, birthDate: student.birthDate },
        primaryContactDraft: {
          fullName: clientName,
          phone: client.phone.trim(),
          email: client.email.trim() || undefined,
          source: client.source.trim() || undefined,
          comments: client.comments.trim() || undefined,
        },
        relationshipType: mode === "SELF" ? "SELF" : relationshipType,
        groupId: contract.groupId,
        coachId: selectedGroup?.coach?.id ?? null,
        startDate: contract.startDate,
        endDate: contract.endDate,
        amount: Number(contract.amount),
        currency: contract.currency,
        notes: contract.notes.trim() || undefined,
      };
      const result = await ContractsApi.create(payload, "");
      if ("valid" in result) {
        setError(result.errors.map((item) => item.message).join(". ") || "Договор не прошёл проверку");
        return;
      }
      toast.success("Клиент, ученик и договор оформлены");
      onCreated(result.primaryContact.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось завершить оформление"));
    } finally {
      setSaving(false);
    }
  };

  const scenarioOptions = [
    { mode: "DEPENDENT" as const, icon: AcademicCapIcon, title: "Клиент оформляет ученика", description: "Родитель или представитель оплачивает, другой человек посещает занятия.", result: "Клиент + ученик + договор" },
    { mode: "SELF" as const, icon: UserIcon, title: "Клиент занимается сам", description: "Для взрослой группы: клиент одновременно является учеником.", result: "Клиент и ученик — один человек + договор" },
    { mode: "CLIENT_ONLY" as const, icon: DocumentTextIcon, title: "Только карточка клиента", description: "Ученика и договор можно будет добавить позже из карточки клиента.", result: "Только клиент" },
  ];

  return (
    <ModalShell
      title="Оформление клиента"
      description="Один последовательный процесс без повторного ввода данных"
      eyebrow="Клиенты"
      placement="right"
      maxWidthClassName="max-w-3xl"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex w-full items-center justify-between gap-3"><Button variant="secondary" onClick={() => stepIndex ? setStepIndex((current) => current - 1) : onClose()} disabled={saving}><ArrowLeftIcon className="h-4 w-4" /> {stepIndex ? "Назад" : "Отмена"}</Button>{step === "review" ? <Button onClick={() => void submit()} isLoading={saving}><CheckIcon className="h-4 w-4" /> {mode === "CLIENT_ONLY" ? "Создать клиента" : "Оформить всё"}</Button> : <Button onClick={next}>Продолжить <ArrowRightIcon className="h-4 w-4" /></Button>}</div>}
    >
      <div className="space-y-6">
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((item, index) => <li key={item.id} className="min-w-0"><div className={`h-1 rounded-full ${index <= stepIndex ? "bg-cyan-700" : "bg-slate-200"}`} /><span className={`mt-2 block truncate text-xs font-medium ${index === stepIndex ? "text-cyan-800" : "text-slate-500"}`}>{item.label}</span></li>)}
        </ol>

        {step === "scenario" ? <div className="space-y-3"><div><h3 className="text-base font-semibold text-slate-950">Что нужно оформить?</h3><p className="mt-1 text-sm text-slate-500">Выберите реальный сценарий. Система сама создаст нужные роли и связи.</p></div>{scenarioOptions.map((option) => { const Icon = option.icon; const selected = mode === option.mode; return <button key={option.mode} type="button" onClick={() => setMode(option.mode)} className={`flex w-full gap-4 rounded-lg border p-4 text-left transition ${selected ? "border-cyan-600 bg-cyan-50 ring-2 ring-cyan-100" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${selected ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-950">{option.title}</span><span className="mt-1 block text-sm leading-5 text-slate-500">{option.description}</span><span className="mt-2 block text-xs font-semibold text-cyan-700">Результат: {option.result}</span></span>{selected ? <CheckIcon className="h-5 w-5 shrink-0 text-cyan-700" /> : null}</button>; })}</div> : null}

        {step === "client" ? <div className="space-y-4"><div><h3 className="text-base font-semibold text-slate-950">Кто заключает договор и оплачивает?</h3><p className="mt-1 text-sm text-slate-500">Это профиль клиента. Спортивные данные будут храниться отдельно у ученика.</p></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Имя *</span><input autoFocus value={client.firstName} onChange={(event) => setClient((current) => ({ ...current, firstName: event.target.value }))} className={formControlClassName} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Фамилия</span><input value={client.lastName} onChange={(event) => setClient((current) => ({ ...current, lastName: event.target.value }))} className={formControlClassName} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Телефон *</span><input type="tel" value={client.phone} onChange={(event) => setClient((current) => ({ ...current, phone: event.target.value }))} className={formControlClassName} placeholder="+7 700 000 00 00" /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span><input type="email" value={client.email} onChange={(event) => setClient((current) => ({ ...current, email: event.target.value }))} className={formControlClassName} /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Источник</span><input value={client.source} onChange={(event) => setClient((current) => ({ ...current, source: event.target.value }))} className={formControlClassName} placeholder="Рекомендация, сайт, звонок" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Комментарий</span><textarea value={client.comments} onChange={(event) => setClient((current) => ({ ...current, comments: event.target.value }))} className={`${formControlClassName} min-h-24 resize-y`} /></label></div></div> : null}

        {step === "student" ? <div className="space-y-4"><div><h3 className="text-base font-semibold text-slate-950">Кто будет посещать занятия?</h3><p className="mt-1 text-sm text-slate-500">Ученик отвечает за группу, расписание и посещаемость.</p></div>{mode === "SELF" ? <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4"><span className="text-xs font-semibold uppercase text-cyan-700">Клиент занимается сам</span><p className="mt-2 text-sm font-semibold text-slate-950">{clientName}</p><p className="mt-1 text-sm text-slate-600">Будет создан отдельный профиль ученика и явная SELF-связь.</p></div> : <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Имя ученика *</span><input autoFocus value={student.firstName} onChange={(event) => setStudent((current) => ({ ...current, firstName: event.target.value }))} className={formControlClassName} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Фамилия</span><input value={student.lastName} onChange={(event) => setStudent((current) => ({ ...current, lastName: event.target.value }))} className={formControlClassName} /></label></div>}<div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Дата рождения *</span><input type="date" value={student.birthDate} onChange={(event) => setStudent((current) => ({ ...current, birthDate: event.target.value }))} className={formControlClassName} /></label>{mode === "DEPENDENT" ? <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Кем клиент приходится ученику?</span><select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as typeof relationshipType)} className={formControlClassName}>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}</div></div> : null}

        {step === "contract" ? <div className="space-y-4"><div><h3 className="text-base font-semibold text-slate-950">Условия договора и группа</h3><p className="mt-1 text-sm text-slate-500">После оформления ученик будет зачислен в выбранную группу.</p></div><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Группа *</span><select value={contract.groupId} onChange={(event) => setContract((current) => ({ ...current, groupId: event.target.value }))} className={formControlClassName} disabled={groupsLoading || !groups.length}><option value="">{groupsLoading ? "Загрузка групп..." : groups.length ? "Выберите группу" : mode === "SELF" ? "Активных взрослых групп нет" : "Активных детских групп нет"}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.coach ? ` · ${group.coach.fullName}` : ""}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Начало *</span><input type="date" value={contract.startDate} onChange={(event) => setContract((current) => ({ ...current, startDate: event.target.value }))} className={formControlClassName} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Окончание *</span><input type="date" value={contract.endDate} onChange={(event) => setContract((current) => ({ ...current, endDate: event.target.value }))} className={formControlClassName} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Стоимость *</span><input type="number" min="0" value={contract.amount} onChange={(event) => setContract((current) => ({ ...current, amount: event.target.value }))} className={formControlClassName} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Валюта</span><select value={contract.currency} onChange={(event) => setContract((current) => ({ ...current, currency: event.target.value }))} className={formControlClassName}><option value="KZT">KZT</option><option value="RUB">RUB</option><option value="USD">USD</option></select></label></div><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Примечание к договору</span><textarea value={contract.notes} onChange={(event) => setContract((current) => ({ ...current, notes: event.target.value }))} className={`${formControlClassName} min-h-24 resize-y`} /></label></div> : null}

        {step === "review" ? <div className="space-y-4"><div><h3 className="text-base font-semibold text-slate-950">Проверьте перед оформлением</h3><p className="mt-1 text-sm text-slate-500">После подтверждения все связанные записи будут созданы вместе.</p></div><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-4"><ReviewRow label="Клиент · платит" value={clientName} detail={[client.phone, client.email].filter(Boolean).join(" · ")} />{mode !== "CLIENT_ONLY" ? <><ReviewRow label="Ученик · посещает" value={studentName} detail={mode === "SELF" ? "Клиент занимается сам" : relationshipLabels[relationshipType]} /><ReviewRow label="Договор" value={selectedGroup?.name ?? "Группа не выбрана"} detail={`${contract.startDate} — ${contract.endDate} · ${money(contract.amount, contract.currency)}`} /></> : <ReviewRow label="Результат" value="Только карточка клиента" detail="Ученика и договор можно добавить позже" />}</div>{mode !== "CLIENT_ONLY" ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckIcon className="h-5 w-5 shrink-0" /> Клиент, ученик, связь, договор и зачисление в группу создадутся одной операцией.</div> : null}</div> : null}

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

const ReviewRow: React.FC<{ label: string; value: string; detail?: string }> = ({ label, value, detail }) => <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><span><span className="block text-sm font-semibold text-slate-950">{value}</span>{detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}</span></div>;

export default ClientOnboardingDrawer;
