import React, { useEffect, useState } from "react";
import { apiClient } from "../../shared/api";

interface Payment {
  id: string;
  client: string;
  amount: number;
  date: string;
  status: "PAID" | "PENDING";
}

const statusLabels: Record<Payment["status"], string> = {
  PAID: "Оплачен",
  PENDING: "В ожидании",
};

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<Payment[] | { content?: Payment[] }>("/admin/payments");
        setPayments(Array.isArray(data) ? data : data.content ?? []);
      } catch {
        setError("Не удалось загрузить платежи");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-admin-700 mb-4">Платежи</h2>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма (₸)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Загрузка...</td>
              </tr>
            )}
            {!loading && payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-admin-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.client}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[payment.status] ?? payment.status}</td>
              </tr>
            ))}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsPage;
