import React from 'react';

const Dashboard: React.FC = () => {
  const stats = {
    newClients: 4,
    totalClients: 27,
    upcomingTrainings: 3,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-dispatcher-700">Панель диспетчера</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Новых клиентов</div>
          <div className="text-2xl font-bold text-dispatcher-700">{stats.newClients}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Всего клиентов</div>
          <div className="text-2xl font-bold text-dispatcher-700">{stats.totalClients}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Ближайшие тренировки</div>
          <div className="text-2xl font-bold text-dispatcher-700">{stats.upcomingTrainings}</div>
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