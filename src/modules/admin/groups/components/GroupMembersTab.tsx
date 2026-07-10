import React, { useEffect, useState } from "react";
import { GroupApi, GroupMemberItem } from "../group.api";
import { useAuth } from "../../../../shared/AuthContext";
import { Button, EmptyState, ErrorState, LoadingState } from "../../../../shared/ui";
import { CalendarDaysIcon, ChartBarIcon, DocumentTextIcon, UserCircleIcon } from "@heroicons/react/24/outline";

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

  const contractStatusClassName = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "border-emerald-100 bg-emerald-50 text-emerald-700";
      case "UPCOMING":
        return "border-cyan-100 bg-cyan-50 text-cyan-700";
      case "EXPIRED":
        return "border-rose-100 bg-rose-50 text-rose-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  };

  const attendanceClassName = (rate: number) => {
    if (rate >= 80) return "bg-emerald-600";
    if (rate >= 50) return "bg-amber-500";
    return "bg-rose-500";
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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.playerId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
                  <UserCircleIcon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-950">{item.childName}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDaysIcon className="h-4 w-4" />
                      {formatDate(item.birthDate)}
                    </span>
                    <span>В группе с {formatDate(item.joinedAt)}</span>
                  </div>
                </div>
              </div>

              <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${contractStatusClassName(item.contractStatus)}`}>
                {contractStatusLabel(item.contractStatus)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ChartBarIcon className="h-4 w-4" />
                  Посещаемость
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{item.attendanceRate}%</div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                  <div
                    className={`h-1.5 rounded-full ${attendanceClassName(item.attendanceRate)}`}
                    style={{ width: `${Math.min(100, Math.max(0, item.attendanceRate))}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <DocumentTextIcon className="h-4 w-4" />
                  Контракт
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{contractStatusLabel(item.contractStatus)}</div>
              </div>
            </div>
          </article>
        ))}
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
