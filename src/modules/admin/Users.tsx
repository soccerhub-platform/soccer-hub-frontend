import React, { useEffect, useState } from "react";
import { apiClient } from "../../shared/api";
import { Role } from "../../shared/types";

interface UserRow {
  id: string;
  username: string;
  role: Role;
  active: boolean;
}

const roleLabels: Record<Role, string> = {
  ADMIN: "Администратор",
  DISPATCHER: "Диспетчер",
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<UserRow[] | { content?: UserRow[] }>("/admin/users");
        setUsers(Array.isArray(data) ? data : data.content ?? []);
      } catch {
        setError("Не удалось загрузить пользователей");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-admin-700 mb-2">Сотрудники филиала</h2>
      <p className="mb-4 text-sm text-slate-600">
        Операционное управление пользователями филиала. Создание и привязка администраторов к филиалам
        выполняются в разделе диспетчера «Администраторы».
      </p>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
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
            {loading && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Загрузка...</td>
              </tr>
            )}
            {!loading && users.map((user) => (
              <tr key={user.id} className="hover:bg-admin-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{roleLabels[user.role] ?? user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.active ? "Активен" : "Заблокирован"}</td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;
