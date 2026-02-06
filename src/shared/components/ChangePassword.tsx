import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';
import { getApiUrl } from '../api';
import toast from 'react-hot-toast';

const ChangePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ newPassword: password }),
      });

      if (!res.ok) throw new Error();

      toast.success('Пароль успешно изменён');
      logout();
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error('Ошибка смены пароля');
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
            placeholder="Новый пароль"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Повторите пароль"
            className="w-full border rounded-lg px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
