import React from 'react';
// Import icons to visually represent each statistic
import {
  UserPlusIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

/**
 * Dashboard page for dispatchers.  Displays key metrics such as
 * number of new clients and a list of upcoming trial trainings.
 * In a real application these values would be fetched from the
 * server.  */
const Dashboard: React.FC = () => {
  // Placeholder data.  Replace with data fetched from API or state.
  const stats = {
    newClients: 4,
    totalClients: 27,
    upcomingTrainings: 3,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-dispatcher-700">Панель диспетчера</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card for new clients */}
        <div className="p-4 bg-white shadow rounded flex items-center space-x-4">
          <div className="p-2 bg-dispatcher-100 rounded-full">
            <UserPlusIcon className="h-6 w-6 text-dispatcher-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Новых клиентов</div>
            <div className="text-2xl font-bold text-dispatcher-700">{stats.newClients}</div>
          </div>
        </div>
        {/* Card for total clients */}
        <div className="p-4 bg-white shadow rounded flex items-center space-x-4">
          <div className="p-2 bg-dispatcher-100 rounded-full">
            <UserGroupIcon className="h-6 w-6 text-dispatcher-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Всего клиентов</div>
            <div className="text-2xl font-bold text-dispatcher-700">{stats.totalClients}</div>
          </div>
        </div>
        {/* Card for upcoming trial trainings */}
        <div className="p-4 bg-white shadow rounded flex items-center space-x-4">
          <div className="p-2 bg-dispatcher-100 rounded-full">
            <CalendarDaysIcon className="h-6 w-6 text-dispatcher-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Ближайшие тренировки</div>
            <div className="text-2xl font-bold text-dispatcher-700">{stats.upcomingTrainings}</div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-dispatcher-700 mb-2">Ближайшие пробные тренировки</h3>
        <ul className="bg-white shadow rounded divide-y divide-gray-200">
          <li className="p-4 flex justify-between">
            <span>Иван Иванов</span>
            <span>5 ноября, 15:00</span>
          </li>
          <li className="p-4 flex justify-between">
            <span>Алла Петрова</span>
            <span>6 ноября, 16:00</span>
          </li>
          <li className="p-4 flex justify-between">
            <span>Борис Сидоров</span>
            <span>7 ноября, 14:00</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;