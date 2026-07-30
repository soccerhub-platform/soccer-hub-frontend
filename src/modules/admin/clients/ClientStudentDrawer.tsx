import React, { useEffect, useState } from "react";
import {
  Link,
  User,
  UserPlus,
} from "lucide-react";
import { getApiErrorMessage } from "../../../shared/api";
import {
  Button,
  Checkbox,
  DatePicker,
  EntitySheet,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/ui";
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
    { id: "CREATE" as const, icon: UserPlus, title: "Создать нового", note: "Новый профиль ученика" },
    { id: "EXISTING" as const, icon: Link, title: "Связать существующего", note: "Ученик уже есть в CRM" },
    { id: "SELF" as const, icon: User, title: "Клиент занимается сам", note: "Клиент и ученик — один человек" },
  ];

  return (
    <EntitySheet
      title="Добавить ученика"
      description={`Клиент и плательщик: ${clientName}`}
      contentClassName="sm:max-w-xl"
      onClose={onClose}
      closeDisabled={saving}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button><Button onClick={() => void submit()} isLoading={saving}>{mode === "EXISTING" ? "Связать ученика" : "Создать ученика"}</Button></div>}
    >
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {modes.map((item) => <button key={item.id} type="button" onClick={() => chooseMode(item.id)} className={`min-h-28 rounded-lg border p-3 text-left transition ${mode === item.id ? "border-[#0066cc] bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 bg-white hover:border-slate-300"}`}><item.icon className={`h-5 w-5 ${mode === item.id ? "text-[#0066cc]" : "text-slate-500"}`} /><span className="mt-3 block ui-section-title">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.note}</span></button>)}
        </div>

        {mode === "EXISTING" ? <div className="space-y-4">
          <label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Ученик *</span><SearchableSelect value={playerId} onValueChange={setPlayerId} options={options.map((item) => ({ value: item.playerId, label: item.playerName, description: item.birthDate ? `Дата рождения: ${item.birthDate}` : undefined }))} loading={loading} onSearchChange={setSearch} placeholder="Найдите и выберите ученика" searchPlaceholder="Введите имя ученика..." emptyText={search ? "Ученики не найдены" : "Начните вводить имя"} /><span className="block text-xs leading-5 text-slate-500">Поиск выполняется по ученикам филиала. Уже связанные ученики скрыты.</span></label>
        </div> : <div className="grid gap-4 sm:grid-cols-2">
          {mode === "CREATE" ? <><label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Имя *</span><Input value={student.firstName} placeholder="Например, Арман" onChange={(event) => setStudent((value) => ({ ...value, firstName: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Имя нового ученика в CRM.</span></label><label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Фамилия</span><Input value={student.lastName} placeholder="Например, Садыков" onChange={(event) => setStudent((value) => ({ ...value, lastName: event.target.value }))} /><span className="block text-xs leading-5 text-slate-500">Необязательно, можно добавить позже.</span></label></> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2"><div className="text-xs font-semibold uppercase text-emerald-700">Будет создан профиль ученика</div><div className="mt-1 text-sm font-semibold text-emerald-950">{clientName}</div></div>}
          <label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Дата рождения *</span><DatePicker value={student.birthDate} max={latestBirthDate()} onValueChange={(birthDate) => setStudent((value) => ({ ...value, birthDate }))} /><span className="block text-xs leading-5 text-slate-500">Используется для возрастных групп и проверки дублей.</span></label>
        </div>}

        {mode !== "SELF" ? <label className="block space-y-1.5"><span className="block text-sm font-medium text-slate-700">Кем клиент приходится ученику *</span><Select value={relationshipType} onValueChange={(value) => setRelationshipType(value as ClientStudentRelationshipType)}><SelectTrigger><SelectValue placeholder="Выберите тип связи" /></SelectTrigger><SelectContent><SelectItem value="MOTHER">Мать</SelectItem><SelectItem value="FATHER">Отец</SelectItem><SelectItem value="GUARDIAN">Опекун или представитель</SelectItem><SelectItem value="OTHER">Другое</SelectItem></SelectContent></Select><span className="block text-xs leading-5 text-slate-500">Связь определяет роль клиента в карточке ученика.</span></label> : null}
        {mode !== "SELF" ? <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4"><legend className="px-1 ui-section-title">Роли клиента</legend>{([
          ["primaryContact", "Основной контакт"],
          ["primaryPayer", "Основной плательщик"],
          ["legalRepresentative", "Юридический представитель"],
          ["receivesNotifications", "Получает уведомления"],
        ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm text-slate-700"><Checkbox checked={relationRoles[key]} onCheckedChange={(checked) => { setRelationRoles((value) => ({ ...value, [key]: checked === true })); setConfirmPrimaryTransfer(false); }} />{label}</label>)}</fieldset> : null}
        {mode === "EXISTING" && existingRelations.some((item) => (relationRoles.primaryContact && item.primaryContact) || (relationRoles.primaryPayer && item.primaryPayer)) ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="text-sm font-semibold text-amber-950">Основная роль уже назначена</div><p className="mt-1 text-xs leading-5 text-amber-800">Текущий контакт или плательщик потеряет основную роль. Остальные свойства связи сохранятся.</p><label className="mt-3 flex items-start gap-3 text-sm text-amber-950"><Checkbox className="mt-0.5" checked={confirmPrimaryTransfer} onCheckedChange={(checked) => setConfirmPrimaryTransfer(checked === true)} />Подтверждаю передачу выбранных ролей</label></div> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </EntitySheet>
  );
};

export default ClientStudentDrawer;
