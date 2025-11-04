import React from 'react';

interface Payment {
  id: string;
  client: string;
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING';
}

const SAMPLE_PAYMENTS: Payment[] = [
  { id: 'P1', client: 'Иван Иванов', amount: 50000, date: '2025-10-05', status: 'PAID' },
  { id: 'P2', client: 'Алла Петрова', amount: 30000, date: '2025-10-10', status: 'PENDING' },
  { id: 'P3', client: 'Борис Сидоров', amount: 45000, date: '2025-10-12', status: 'PAID' },
];

const statusLabels: Record<Payment['status'], string> = {
  PAID: 'Оплачен',
  PENDING: 'В ожидании',
};

/**
 * Payments management page.  Displays a table of payments with
 * amounts and statuses.  */
const PaymentsPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-admin-700 mb-4">Платежи</h2>
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
            {SAMPLE_PAYMENTS.map((payment) => (
              <tr key={payment.id} className="hover:bg-admin-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.client}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[payment.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsPage;