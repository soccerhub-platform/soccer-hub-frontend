import React, { useState } from "react";
import { GroupApi } from "../group.api";
import { useAuth } from "../../../../shared/AuthContext";
import { useAdminBranch } from "../../BranchContext";
import toast from "react-hot-toast";
import { AcademicCapIcon, IdentificationIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../../shared/api";
import { Button, FormField, ModalShell, formControlClassName } from "../../../../shared/ui";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const LEVELS = [
  { value: "BEGINNER", label: "Начальный" },
  { value: "INTERMEDIATE", label: "Средний" },
  { value: "PRO", label: "Продвинутый" },
];

const AUDIENCE_TYPES = [
  { value: "CHILDREN", label: "Детская группа" },
  { value: "ADULT", label: "Взрослая группа" },
] as const;

const CreateGroupModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [form, setForm] = useState({
    name: "",
    description: "",
    audienceType: "CHILDREN",
    ageFrom: "",
    ageTo: "",
    capacity: "",
    level: "BEGINNER",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    if (!branchId) {
      toast.error("Филиал не выбран");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Название обязательно");
      return;
    }

    const ageFrom = form.ageFrom ? Number(form.ageFrom) : undefined;
    const ageTo = form.ageTo ? Number(form.ageTo) : undefined;
    const capacity = form.capacity ? Number(form.capacity) : undefined;

    if (form.audienceType === "CHILDREN" && ageFrom !== undefined && (!Number.isFinite(ageFrom) || ageFrom <= 0)) {
      toast.error("Возраст от должен быть положительным числом");
      return;
    }
    if (form.audienceType === "CHILDREN" && ageTo !== undefined && (!Number.isFinite(ageTo) || ageTo <= 0)) {
      toast.error("Возраст до должен быть положительным числом");
      return;
    }
    if (form.audienceType === "CHILDREN" && ageFrom !== undefined && ageTo !== undefined && ageFrom > ageTo) {
      toast.error("Возраст от не может быть больше возраста до");
      return;
    }
    if (capacity !== undefined && (!Number.isFinite(capacity) || capacity <= 0)) {
      toast.error("Вместимость должна быть положительным числом");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await GroupApi.create(
        {
          name: form.name,
          description: form.description || undefined,
          branchId,
          audienceType: form.audienceType as "CHILDREN" | "ADULT",
          ageFrom: form.audienceType === "CHILDREN" ? ageFrom : undefined,
          ageTo: form.audienceType === "CHILDREN" ? ageTo : undefined,
          capacity,
          level: form.level,
        },
        token
      );

      onClose();
      onCreated();
    } catch (e) {
      console.error(e);
      setError(getApiErrorMessage(e, "Не удалось создать группу"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Создать группу"
      description="Основные параметры состава. Тренеров и расписание можно назначить после создания."
      placement="right"
      maxWidthClassName="max-w-2xl"
      closeDisabled={loading}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>Отмена</Button>
          <Button type="button" isLoading={loading} onClick={submit}>Создать группу</Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <SectionHeading icon={<IdentificationIcon />} title="Основные данные" description="Название и краткое описание для администраторов и тренеров." />
          <div className="mt-4 space-y-4">
            <FormField label="Название *">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={formControlClassName} placeholder="Например, Adal PRO" />
            </FormField>
            <FormField label="Описание" hint="Необязательно. Отображается в шапке группы.">
              <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={formControlClassName} placeholder="Особенности и цель группы" />
            </FormField>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <SectionHeading icon={<UserGroupIcon />} title="Состав и ограничения" description="Кому подходит группа и сколько учеников можно принять." />
          <div className="mt-4 space-y-4">
            <FormField label="Тип аудитории">
            <select
              value={form.audienceType}
              onChange={(e) => setForm({ ...form, audienceType: e.target.value })}
              className={formControlClassName}
            >
              {AUDIENCE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Возраст от"><input type="number" min="1" value={form.ageFrom} onChange={(event) => setForm({ ...form, ageFrom: event.target.value })} className={formControlClassName} placeholder="10" /></FormField>
            <FormField label="Возраст до"><input type="number" min="1" value={form.ageTo} onChange={(event) => setForm({ ...form, ageTo: event.target.value })} className={formControlClassName} placeholder="16" /></FormField>
          </div>

          {form.audienceType === "ADULT" ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Для взрослых групп возрастной диапазон можно не задавать.
            </div>
          ) : null}

            <FormField label="Вместимость" hint="Можно изменить позже, если состав не превышает новое значение.">
              <input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className={formControlClassName} placeholder="20" />
            </FormField>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <SectionHeading icon={<AcademicCapIcon />} title="Уровень подготовки" description="Помогает подобрать учеников и тренеров подходящего уровня." />
          <div className="mt-4">
            <FormField label="Уровень">
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className={formControlClassName}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            </FormField>
          </div>
        </section>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</div> : null}
      </div>
    </ModalShell>
  );
};

export default CreateGroupModal;

const SectionHeading: React.FC<{ icon: React.ReactElement; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
      {React.cloneElement(icon, { className: "h-5 w-5" })}
    </span>
    <div><h4 className="text-sm font-semibold text-slate-950">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
  </div>
);
