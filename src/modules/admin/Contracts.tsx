import React from 'react';

interface Contract {
  id: string;
  client: string;
  coach: string;
  start: string;
  end: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

const SAMPLE_CONTRACTS: Contract[] = [
  { id: 'C1', client: 'Иван Иванов', coach: 'Кирилл', start: '2025-10-01', end: '2026-03-31', status: 'ACTIVE' },
  { id: 'C2', client: 'Алла Петрова', coach: 'Ольга', start: '2025-07-15', end: '2025-10-15', status: 'COMPLETED' },
  { id: 'C3', client: 'Борис Сидоров', coach: 'Дмитрий', start: '2025-09-01', end: '2025-12-01', status: 'CANCELLED' },
];

const statusLabels: Record<Contract['status'], string> = {
  ACTIVE: 'Активен',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
};

const ContractsPage: React.FC = () => (
  <div>
    <h2 className="text-xl font-bold text-admin-700 mb-4">Контракты</h2>
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
          {SAMPLE_CONTRACTS.map((contract) => (
            <tr key={contract.id} className="hover:bg-admin-100">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.client}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.coach}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.start}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.end}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[contract.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ContractsPage;