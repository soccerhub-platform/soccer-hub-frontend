import React, { useEffect, useState } from "react";
import { GroupApi, GroupMemberItem } from "../group.api";
import { useAuth } from "../../../../shared/AuthContext";
import { Button, EmptyState, ErrorState, LoadingState } from "../../../../shared/ui";

const GroupMembersTab: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [items, setItems] = useState<GroupMemberItem[]>([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await GroupApi.getMembers(groupId, page, size, token);
      setItems(data.content ?? []);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch (e) {
      console.error("Failed to load group members", e);
      setError("Не удалось загрузить состав группы");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
  };

  const contractStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Активен";
      case "UPCOMING":
        return "Скоро начнется";
      case "EXPIRED":
        return "Завершен";
      default:
        return status;
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [groupId, page, token]);

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadMembers} />;
  }

  if (loading) {
    return <LoadingState label="Загрузка состава..." />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Состав группы пуст"
        description="В этой группе пока нет учеников с активными контрактами."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Ученик</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Рождение</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Посещаемость</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Контракт</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">В группе с</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <tr key={item.playerId} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.childName}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.birthDate)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.attendanceRate}%</td>
                <td className="px-4 py-3 text-sm text-slate-600">{contractStatusLabel(item.contractStatus)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Назад
        </Button>
        <span className="text-xs text-slate-500">
          Страница {page + 1} из {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Вперед
        </Button>
      </div>
    </div>
  );
};

export default GroupMembersTab;
