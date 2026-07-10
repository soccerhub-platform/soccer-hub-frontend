import React, { useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import { useAdminBranch } from '../BranchContext';
import { CoachApi } from './coach.api';
import toast from 'react-hot-toast';
import { ApiError } from '../../../shared/api';
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);

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

    setEmailError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setEmailError('Неверный формат email');
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
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: normalizePhoneForSubmit(form.phone),
          branchId,
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
      if (e instanceof ApiError && (e.fields?.email || e.message.toLowerCase().includes('email'))) {
        setEmailError(e.fields?.email ?? 'Email уже используется');
        return;
      }
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
            <Button type="button" isLoading={loading} disabled={loading} onClick={handleSubmit}>
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
            error={emailError}
            onChange={(v) => {
              setEmailError(null);
              setForm({ ...form, email: v });
            }}
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
        <div className="mt-4 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setShowExtra((value) => !value)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700"
          >
            Дополнительная информация
            <span className="text-xs text-slate-400">{showExtra ? 'Свернуть' : 'Раскрыть'}</span>
          </button>
          {showExtra ? (
            <div className="border-t border-slate-100 px-3 py-3 text-xs leading-5 text-slate-500">
              Дата рождения и описание тренера пока не сохраняются admin API. Эти поля появятся здесь после расширения backend DTO.
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          После создания будет показан временный пароль. Тренеру потребуется сменить его при первом входе.
        </p>
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
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string | null;
}) => (
  <FormField label={label} error={error ?? undefined}>
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
