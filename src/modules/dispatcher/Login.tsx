import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';

const DispatcherLogin: React.FC = () => {
  const [email, setEmail] = useState('');          // <-- username → email
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(email, password, 'DISPATCHER');   // <-- передаём роль
      const from = (location.state as any)?.from?.pathname || '/dispatcher/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      alert('Ошибка входа');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dispatcher-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-dispatcher-700">Диспетчер вход</h1>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* EMAIL FIELD */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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

          {/* PASSWORD FIELD */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700 focus:outline-none"
          >
            Войти
          </button>

        </form>
      </div>
    </div>
  );
};

export default DispatcherLogin;