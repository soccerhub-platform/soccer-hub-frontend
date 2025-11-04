import React from 'react';
// Icons representing each admin statistic
import {
  DocumentTextIcon,
  CreditCardIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

/**
 * Administrator dashboard.  Presents high‑level statistics about
 * contracts, payments and user accounts.  Currently uses static
 * placeholder data.  */
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
        {/* Card for contracts */}
        <div className="p-4 bg-white shadow rounded flex items-center space-x-4">
          <div className="p-2 bg-admin-100 rounded-full">
            <DocumentTextIcon className="h-6 w-6 text-admin-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Контракты</div>
            <div className="text-2xl font-bold text-admin-700">{stats.totalContracts}</div>
          </div>
        </div>
        {/* Card for pending payments */}
        <div className="p-4 bg-white shadow rounded flex items-center space-x-4">
          <div className="p-2 bg-admin-100 rounded-full">
            <CreditCardIcon className="h-6 w-6 text-admin-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Ожидающие платежи</div>
            <div className="text-2xl font-bold text-admin-700">{stats.pendingPayments}</div>
          </div>
        </div>
        {/* Card for active users */}
        <div className="p-4 bg-white shadow rounded flex items-center space-x-4">
          <div className="p-2 bg-admin-100 rounded-full">
            <UserIcon className="h-6 w-6 text-admin-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Активные пользователи</div>
            <div className="text-2xl font-bold text-admin-700">{stats.activeUsers}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;