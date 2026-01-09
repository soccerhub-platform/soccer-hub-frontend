import React, { useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import { useAdminBranch } from '../BranchContext';
import { CoachApi } from './coach.api';
import LoaderButton from '../../../shared/LoaderButton';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const CreateCoachModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const token = user?.accessToken!;
  const { branchId } = useAdminBranch();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!branchId) {
      toast.error('Филиал не выбран');
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      await CoachApi.create(
        {
          ...form,
          branchId,
        },
        token
      );

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
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
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50"
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
      className="w-full border rounded-xl px-3.5 py-2.5 text-sm
                 focus:outline-none focus:ring-2 focus:ring-admin-500"
    />
  </div>
);