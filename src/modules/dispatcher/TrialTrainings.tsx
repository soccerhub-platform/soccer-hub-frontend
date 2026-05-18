import React, { useEffect, useState } from "react";
import { TrialTraining, TrialTrainingStatus } from "../../shared/types";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../shared/api";

const statusLabels: Record<TrialTrainingStatus, string> = {
  SCHEDULED: "Запланирована",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
  NO_SHOW: "Не пришел",
};

const TrialTrainingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<TrialTrainingStatus | "ALL">("ALL");
  const [items, setItems] = useState<TrialTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<TrialTraining[] | { content?: TrialTraining[] }>("/dispatcher/trial-trainings");
        setItems(Array.isArray(data) ? data : data.content ?? []);
      } catch {
        setError("Не удалось загрузить пробные тренировки");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = items.filter((training) => statusFilter === "ALL" || training.status === statusFilter);

  const formatDate = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-dispatcher-700 mb-4">Пробные тренировки</h2>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <div className="mb-4 max-w-xs">
        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Статус</label>
        <div className="relative mt-1">
          <select
            id="statusFilter"
            className="block w-full appearance-none bg-white px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TrialTrainingStatus | "ALL")}
          >
            <option value="ALL">Все</option>
            {Object.keys(statusLabels).map((status) => (
              <option key={status} value={status}>{statusLabels[status as TrialTrainingStatus]}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Загрузка...</td>
              </tr>
            )}
            {!loading && filtered.map((training) => (
              <tr key={training.id} className="hover:bg-dispatcher-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(training.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.clientId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[training.status]}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Нет записей</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrialTrainingsPage;
