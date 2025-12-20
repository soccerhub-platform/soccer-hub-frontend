import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import { CoachApi } from './coach.api';
import LoaderButton from '../../../shared/LoaderButton';
import toast from 'react-hot-toast';

/* ================= TYPES ================= */

interface Branch {
  branchId: string;
  name: string;
}

/* ================= PROPS ================= */

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

/* ================= MODAL ================= */

const CreateCoachModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const token = user?.accessToken!;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);

  /* ---------- LOAD BRANCHES ---------- */
  const loadBranches = async () => {
    try {
      const res = await fetch('http://localhost:8080/admin/branch', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setBranches(data.branches ?? []);
    } catch {
      toast.error('Не удалось загрузить филиалы');
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !branchId
    ) {
      toast.error('Заполните все поля и выберите филиал');
      return;
    }

    setLoading(true);
    try {
      const coach = await CoachApi.create(
        {
          ...form,
          branchId,
        }, token);
      toast.success('Тренер успешно создан');
      onClose();
      onCreated();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось создать тренера');
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-admin-700">
            Добавить тренера
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-3">
          <Input
            label="Имя*"
            value={form.firstName}
            onChange={(v) => setForm({ ...form, firstName: v })}
          />
          <Input
            label="Фамилия*"
            value={form.lastName}
            onChange={(v) => setForm({ ...form, lastName: v })}
          />
          <Input
            label="Email*"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <Input
            label="Телефон*"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="+7..."
          />

          {/* BRANCH SELECT */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Филиал*
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-admin-500"
            >
              <option value="">Выберите филиал</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
            disabled={loading}
          >
            Отмена
          </button>

          <LoaderButton
            loading={loading}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-admin-500 text-white rounded-xl hover:bg-admin-700"
          >
            Создать
          </LoaderButton>
        </div>
      </div>
    </div>
  );
};

export default CreateCoachModal;

/* ================= INPUT ================= */

const Input = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-600">
      {label}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                 focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-admin-500"
    />
  </div>
);