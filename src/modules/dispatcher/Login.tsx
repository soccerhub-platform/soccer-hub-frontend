import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';
import toast from 'react-hot-toast';
import LoaderButton from '../../shared/LoaderButton';

const DispatcherLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password, 'DISPATCHER');
      toast.success('Добро пожаловать!');
      const from = (location.state as any)?.from?.pathname || '/dispatcher/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error('Ошибка входа. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center app-bg-dispatcher px-4">
      <div className="glass-card rounded-3xl p-8 w-full max-w-md">
        <div className="mb-6">
          <div className="heading-font text-2xl font-semibold text-dispatcher-700">
            Диспетчер
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Вход в рабочее пространство
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
              focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
              focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* SUBMIT */}
          <LoaderButton
            type="submit"
            loading={loading}
            className="w-full bg-dispatcher-500 text-white hover:bg-dispatcher-700 rounded-xl"
          >
            Войти
          </LoaderButton>
        </form>
      </div>
    </div>
  );
};

export default DispatcherLogin;
