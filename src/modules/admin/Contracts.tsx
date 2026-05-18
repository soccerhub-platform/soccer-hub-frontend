import React, { useEffect, useState } from "react";
import { apiClient } from "../../shared/api";

interface Contract {
  id: string;
  client: string;
  coach: string;
  start: string;
  end: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

const statusLabels: Record<Contract["status"], string> = {
  ACTIVE: "Активен",
  COMPLETED: "Завершен",
  CANCELLED: "Отменен",
};

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<Contract[] | { content?: Contract[] }>("/admin/contracts");
        setContracts(Array.isArray(data) ? data : data.content ?? []);
      } catch {
        setError("Не удалось загрузить контракты");
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-admin-700 mb-4">Контракты</h2>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тренер</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Начало</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Конец</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Загрузка...</td>
              </tr>
            )}
            {!loading && contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-admin-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.client}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.coach}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.start}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.end}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[contract.status] ?? contract.status}</td>
              </tr>
            ))}
            {!loading && contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractsPage;
