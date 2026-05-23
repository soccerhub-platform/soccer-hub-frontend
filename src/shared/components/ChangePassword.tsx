import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';
import { ApiError, apiClient, getApiErrorMessage } from '../api';
import toast from 'react-hot-toast';

const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error('Введите текущий пароль');
      return;
    }

    if (password.length < 8) {
      toast.error('Новый пароль должен быть не короче 8 символов');
      return;
    }

    if (password !== confirm) {
      toast.error('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword: password,
      });

      toast.success('Пароль успешно изменён');
      logout();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fields?.currentPassword) {
        toast.error('Текущий пароль указан неверно');
      } else {
        toast.error(getApiErrorMessage(error, 'Ошибка смены пароля'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-md"
      >
        <h2 className="text-xl font-semibold text-gray-900">
          Смена пароля
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Необходимо задать новый пароль
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="password"
            placeholder="Текущий пароль"
            className="w-full border rounded-lg px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <input
            type="password"
            placeholder="Новый пароль"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <input
            type="password"
            placeholder="Повторите пароль"
            className="w-full border rounded-lg px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700"
        >
          {loading ? 'Сохранение...' : 'Сменить пароль'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordPage;
