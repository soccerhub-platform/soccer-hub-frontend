import React, { useEffect, useState } from "react";
import {
  LinkIcon,
  UserIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, ModalShell, formControlClassName } from "../../../shared/ui";
import { StudentApi } from "../students/student.api";
import type { AdminStudentListItem } from "../students/student.types";
import { ClientApi } from "./client.api";
import type { ClientStudentRelationshipType } from "./client.types";

type StudentMode = "CREATE" | "EXISTING" | "SELF";

const today = () => new Date().toISOString().slice(0, 10);
const latestBirthDate = () => {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
};

const ClientStudentDrawer: React.FC<{
  clientId: string;
  clientName: string;
  branchId: string;
  linkedPlayerIds: string[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ clientId, clientName, branchId, linkedPlayerIds, onClose, onCreated }) => {
  const [mode, setMode] = useState<StudentMode>("CREATE");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AdminStudentListItem[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [student, setStudent] = useState({ firstName: "", lastName: "", birthDate: "" });
  const [relationshipType, setRelationshipType] = useState<ClientStudentRelationshipType>("MOTHER");
  const [relationRoles, setRelationRoles] = useState({
    primaryContact: true,
    primaryPayer: true,
    legalRepresentative: true,
    receivesNotifications: true,
  });
  const [existingRelations, setExistingRelations] = useState<Awaited<ReturnType<typeof ClientApi.getStudentClients>>>([]);
  const [confirmPrimaryTransfer, setConfirmPrimaryTransfer] = useState(false);

  useEffect(() => {
    if (mode !== "EXISTING") return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await StudentApi.list({ branchId, search, page: 0, size: 30, sort: "playerName,asc" });
        const linked = new Set(linkedPlayerIds);
        setOptions(response.content.filter((item) => !linked.has(item.playerId)));
      } catch (reason) {
        setError(getApiErrorMessage(reason, "Не удалось загрузить учеников"));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [branchId, linkedPlayerIds, mode, search]);

  useEffect(() => {
    if (mode !== "EXISTING" || !playerId) {
      setExistingRelations([]);
      return;
    }
    let active = true;
    ClientApi.getStudentClients(playerId)
      .then((relations) => { if (active) setExistingRelations(relations.filter((item) => item.active)); })
      .catch((reason) => { if (active) setError(getApiErrorMessage(reason, "Не удалось проверить текущие связи ученика")); });
    return () => { active = false; };
  }, [mode, playerId]);

  const chooseMode = (next: StudentMode) => {
    setMode(next);
    setError(null);
    setPlayerId("");
    setRelationshipType(next === "SELF" ? "SELF" : "MOTHER");
    setRelationRoles(next === "EXISTING"
      ? { primaryContact: false, primaryPayer: false, legalRepresentative: false, receivesNotifications: true }
      : { primaryContact: true, primaryPayer: true, legalRepresentative: true, receivesNotifications: true });
    setConfirmPrimaryTransfer(false);
  };

  const submit = async () => {
    if (mode === "EXISTING" && !playerId) { setError("Выберите ученика"); return; }
    if (mode === "CREATE" && (!student.firstName.trim() || !student.birthDate)) {
      setError("Укажите имя и дату рождения ученика");
      return;
    }
    if (mode === "SELF" && !student.birthDate) {
      setError("Укажите дату рождения клиента");
      return;
    }
    const primaryWillChange = mode === "EXISTING" && existingRelations.some((item) =>
      (relationRoles.primaryContact && item.primaryContact) || (relationRoles.primaryPayer && item.primaryPayer));
    if (primaryWillChange && !confirmPrimaryTransfer) {
      setError("Подтвердите передачу основной роли от текущего клиента");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const type = mode === "SELF" ? "SELF" : relationshipType;
      const relation = {
        relationshipType: type,
        ...(mode === "SELF"
          ? { primaryContact: true, primaryPayer: true, legalRepresentative: true, receivesNotifications: true }
          : relationRoles),
        replacePrimaryContact: mode === "EXISTING" && relationRoles.primaryContact && confirmPrimaryTransfer,
        replacePrimaryPayer: mode === "EXISTING" && relationRoles.primaryPayer && confirmPrimaryTransfer,
        startedAt: today(),
      } as const;
      if (mode === "EXISTING") {
        await ClientApi.linkStudent(clientId, { playerId, ...relation });
      } else {
        const [firstName, ...rest] = mode === "SELF"
          ? clientName.trim().split(/\s+/)
          : [student.firstName.trim(), student.lastName.trim()];
        await ClientApi.createStudent(clientId, {
          firstName,
          lastName: mode === "SELF" ? rest.join(" ") : rest.filter(Boolean).join(" "),
          birthDate: student.birthDate,
          relationshipType: relation.relationshipType,
          primaryContact: relation.primaryContact,
          primaryPayer: relation.primaryPayer,
          legalRepresentative: relation.legalRepresentative,
          receivesNotifications: relation.receivesNotifications,
          startedAt: relation.startedAt,
        });
      }
      onCreated();
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось добавить ученика"));
    } finally {
      setSaving(false);
    }
  };

  const modes = [
    { id: "CREATE" as const, icon: UserPlusIcon, title: "Создать нового", note: "Новый профиль ученика" },
    { id: "EXISTING" as const, icon: LinkIcon, title: "Связать существующего", note: "Ученик уже есть в CRM" },
    { id: "SELF" as const, icon: UserIcon, title: "Клиент занимается сам", note: "Клиент и ученик — один человек" },
  ];

  return (
    <ModalShell
      title="Добавить ученика"
      description={`Клиент и плательщик: ${clientName}`}
      eyebrow="Получатель услуг"
      placement="right"
      maxWidthClassName="max-w-xl"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button><Button onClick={() => void submit()} isLoading={saving}>{mode === "EXISTING" ? "Связать ученика" : "Создать ученика"}</Button></div>}
    >
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {modes.map((item) => <button key={item.id} type="button" onClick={() => chooseMode(item.id)} className={`min-h-28 rounded-lg border p-3 text-left transition ${mode === item.id ? "border-cyan-700 bg-cyan-50 ring-1 ring-cyan-700" : "border-slate-200 bg-white hover:border-slate-300"}`}><item.icon className={`h-5 w-5 ${mode === item.id ? "text-cyan-700" : "text-slate-500"}`} /><span className="mt-3 block text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.note}</span></button>)}
        </div>

        {mode === "EXISTING" ? <div className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Найти ученика</span><input className={formControlClassName} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя ученика" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Ученик *</span><select className={formControlClassName} value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">{loading ? "Загрузка..." : options.length ? "Выберите ученика" : "Подходящих учеников нет"}</option>{options.map((item) => <option key={item.playerId} value={item.playerId}>{item.playerName}</option>)}</select></label>
        </div> : <div className="grid gap-4 sm:grid-cols-2">
          {mode === "CREATE" ? <><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Имя *</span><input className={formControlClassName} value={student.firstName} onChange={(event) => setStudent((value) => ({ ...value, firstName: event.target.value }))} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Фамилия</span><input className={formControlClassName} value={student.lastName} onChange={(event) => setStudent((value) => ({ ...value, lastName: event.target.value }))} /></label></> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2"><div className="text-xs font-semibold uppercase text-emerald-700">Будет создан профиль ученика</div><div className="mt-1 text-sm font-semibold text-emerald-950">{clientName}</div></div>}
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Дата рождения *</span><input type="date" max={latestBirthDate()} className={formControlClassName} value={student.birthDate} onChange={(event) => setStudent((value) => ({ ...value, birthDate: event.target.value }))} /></label>
        </div>}

        {mode !== "SELF" ? <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Кем клиент приходится ученику *</span><select className={formControlClassName} value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as ClientStudentRelationshipType)}><option value="MOTHER">Мать</option><option value="FATHER">Отец</option><option value="GUARDIAN">Опекун или представитель</option><option value="OTHER">Другое</option></select></label> : null}
        {mode !== "SELF" ? <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">Роли клиента</legend>{([
          ["primaryContact", "Основной контакт"],
          ["primaryPayer", "Основной плательщик"],
          ["legalRepresentative", "Юридический представитель"],
          ["receivesNotifications", "Получает уведомления"],
        ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={relationRoles[key]} onChange={(event) => { setRelationRoles((value) => ({ ...value, [key]: event.target.checked })); setConfirmPrimaryTransfer(false); }} className="h-4 w-4 rounded border-slate-300 text-admin-600 focus:ring-admin-500" />{label}</label>)}</fieldset> : null}
        {mode === "EXISTING" && existingRelations.some((item) => (relationRoles.primaryContact && item.primaryContact) || (relationRoles.primaryPayer && item.primaryPayer)) ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="text-sm font-semibold text-amber-950">Основная роль уже назначена</div><p className="mt-1 text-xs leading-5 text-amber-800">Текущий контакт или плательщик потеряет основную роль. Остальные свойства связи сохранятся.</p><label className="mt-3 flex items-start gap-3 text-sm text-amber-950"><input type="checkbox" checked={confirmPrimaryTransfer} onChange={(event) => setConfirmPrimaryTransfer(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-admin-600 focus:ring-admin-500" />Подтверждаю передачу выбранных ролей</label></div> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

export default ClientStudentDrawer;
