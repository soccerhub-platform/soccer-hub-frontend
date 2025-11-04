import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';

/**
 * Login page for dispatchers.  Uses a blue colour scheme to
 * differentiate from the administrator login.  On successful
 * authentication the user is redirected to the dispatcher
 * dashboard or the location they attempted to visit.  */
const DispatcherLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
    // If the user was redirected to login from a protected route,
    // location.state.from holds the original destination.  Otherwise
    // go to the dashboard.
    const from = (location.state as any)?.from?.pathname || '/dispatcher/dashboard';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dispatcher-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-dispatcher-700">Диспетчер вход</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Логин
            </label>
            <input
              id="username"
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
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