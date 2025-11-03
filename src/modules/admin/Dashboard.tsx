import React from 'react';

const Dashboard: React.FC = () => {
  const stats = {
    totalContracts: 12,
    pendingPayments: 5,
    activeUsers: 3,
  };
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-admin-700">Панель администратора</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Контракты</div>
          <div className="text-2xl font-bold text-admin-700">{stats.totalContracts}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Ожидающие платежи</div>
          <div className="text-2xl font-bold text-admin-700">{stats.pendingPayments}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Активные пользователи</div>
          <div className="text-2xl font-bold text-admin-700">{stats.activeUsers}</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;