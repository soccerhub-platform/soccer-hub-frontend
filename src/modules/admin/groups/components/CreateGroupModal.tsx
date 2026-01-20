import React, { useState } from "react";
import { GroupApi } from "../group.api";
import { useAuth } from "../../../../shared/AuthContext";
import { useAdminBranch } from "../../BranchContext";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const LEVELS = [
  { value: "BEGINNER", label: "Начальный" },
  { value: "INTERMEDIATE", label: "Средний" },
  { value: "PRO", label: "Продвинутый" },
];

const CreateGroupModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const token = user?.accessToken!;
  const { branchId } = useAdminBranch();

  const [form, setForm] = useState({
    name: "",
    description: "",
    ageFrom: "",
    ageTo: "",
    capacity: "",
    level: "BEGINNER",
  });

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      await GroupApi.create(
        {
          name: form.name,
          description: form.description || undefined,
          branchId: branchId!,
          ageFrom: form.ageFrom ? Number(form.ageFrom) : undefined,
          ageTo: form.ageTo ? Number(form.ageTo) : undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          level: form.level,
        },
        token
      );

      onClose();
      onCreated();
    } catch (e) {
      console.error(e);
      alert("Не удалось создать группу");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Создание группы</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <Input label="Название*" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />

          <Input label="Описание" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Возраст от" value={form.ageFrom} onChange={(v) => setForm({ ...form, ageFrom: v })} />
            <Input label="Возраст до" value={form.ageTo} onChange={(v) => setForm({ ...form, ageTo: v })} />
          </div>

          <Input label="Вместимость" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />

          <div>
            <div className="text-xs text-gray-500 mb-1">Уровень</div>
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full border rounded-xl px-3 py-2"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-admin-500 text-white text-sm"
          >
            {loading ? "Создание…" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;

/* -------- Input -------- */

const Input = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-xl px-3 py-2"
    />
  </div>
);