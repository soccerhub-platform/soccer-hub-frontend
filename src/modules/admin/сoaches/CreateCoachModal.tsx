import React, { useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import { useAdminBranch } from '../BranchContext';
import { CoachApi } from './coach.api';
import toast from 'react-hot-toast';
import {
  formatPhoneInput,
  isValidFormattedPhone,
  normalizePhoneForSubmit,
} from '../../../shared/phone';
import {
  Button,
  FormField,
  ModalShell,
  formControlClassName,
} from '../../../shared/ui';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const CreateCoachModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
  });

  const [loading, setLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Нет авторизации');
      return;
    }
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Неверный формат email');
      return;
    }

    if (!isValidFormattedPhone(form.phone)) {
      toast.error('Введите номер в формате +7 777 123 45 67');
      return;
    }

    setLoading(true);
    try {
      const created = await CoachApi.create(
        {
          ...form,
          phone: normalizePhoneForSubmit(form.phone),
          branchId,
          specialization: form.specialization.trim() || undefined,
        },
        token
      );
      const password = created.tempPassword ?? created.temporaryPassword ?? null;
      if (password) {
        setCreatedPassword(password);
      } else {
        onClose();
      }

      toast.success('Тренер успешно создан');
      onCreated();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось создать тренера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!createdPassword ? (
      <ModalShell
        title="Добавить тренера"
        description="Создайте учетную запись тренера и привяжите ее к текущему филиалу."
        onClose={onClose}
        closeDisabled={loading}
        maxWidthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" isLoading={loading} onClick={handleSubmit}>
              Создать
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            placeholder="+7 777 123 45 67"
            type="tel"
          />
          <Input
            label="Специализация"
            value={form.specialization}
            onChange={(v) => setForm({ ...form, specialization: v })}
          />
        </div>
      </ModalShell>
      ) : null}
      {createdPassword ? (
      <ModalShell
        title="Тренер создан"
        description="Временный пароль показан один раз."
        onClose={() => {
          setCreatedPassword(null);
          onClose();
        }}
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                setCreatedPassword(null);
                onClose();
              }}
            >
              Готово
            </Button>
          </div>
        }
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <code className="text-sm font-semibold text-slate-900">{createdPassword}</code>
        </div>
        <p className="mt-2 text-xs text-rose-600">Сохраните пароль сейчас. Повторно он показан не будет.</p>
      </ModalShell>
      ) : null}
    </>
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
  <FormField label={label}>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) =>
        onChange(type === 'tel' ? formatPhoneInput(e.target.value) : e.target.value)
      }
      inputMode={type === 'tel' ? 'tel' : undefined}
      autoComplete={type === 'tel' ? 'tel' : undefined}
      maxLength={type === 'tel' ? 16 : undefined}
      className={formControlClassName}
    />
  </FormField>
);
