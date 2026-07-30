import React, { useEffect, useState } from "react";
import { apiClient } from "../../shared/api";
import { Role } from "../../shared/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui";

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
    <PageShell className="space-y-5">
      <PageHeader title="Пользователи" description="Системные пользователи и их доступы." />

      <SectionCard className="p-0">
        {error ? (
          <div className="p-5"><ErrorState message={error} /></div>
        ) : loading ? (
          <div className="p-5"><LoadingState label="Загрузка пользователей..." /></div>
        ) : users.length === 0 ? (
          <div className="p-5"><EmptyState title="Пользователей пока нет" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Логин</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Активность</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">{user.id}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-slate-900">{user.username}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-700">{roleLabels[user.role] ?? user.role}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${user.active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {user.active ? "Активен" : "Заблокирован"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </PageShell>
  );
};

export default UsersPage;
