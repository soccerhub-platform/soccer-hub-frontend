import React, { useState } from 'react';
import { AdminAccount, Role } from '../../shared/types';

const SAMPLE_USERS: AdminAccount[] = [
  { id: 'U1', username: 'admin', role: 'ADMIN', active: true },
  { id: 'U2', username: 'dispatcher1', role: 'DISPATCHER', active: true },
  { id: 'U3', username: 'dispatcher2', role: 'DISPATCHER', active: false },
];

const roleLabels: Record<Role, string> = {
  ADMIN: 'Администратор',
  DISPATCHER: 'Диспетчер',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminAccount[]>(SAMPLE_USERS);

  const toggleActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-admin-700 mb-4">Пользователи</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Логин</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Активность</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-admin-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{roleLabels[user.role]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={() => toggleActive(user.id)}
                      className="h-4 w-4 text-admin-500 border-gray-300 rounded focus:ring-admin-500"
                    />
                    <span className="ml-2">{user.active ? 'Активен' : 'Заблокирован'}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;