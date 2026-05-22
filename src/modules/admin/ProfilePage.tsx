import React from "react";
import UserProfileMockPage from "../../shared/profile/UserProfileMockPage";

const AdminProfilePage: React.FC = () => {
  return (
    <UserProfileMockPage
      roleLabel="Администратор филиала"
      roleDescription="Управляет лидами, группами, тренерами, расписанием и операционной аналитикой выбранного филиала."
      defaultProfile={{
        firstName: "Админ",
        lastName: "Филиала",
        phone: "+7 777 100 20 30",
        emailFallback: "admin@soccerhub.kz",
        position: "Администратор филиала",
        bio: "Отвечает за продажи, расписание, группы и ежедневную операционную работу филиала.",
      }}
      workspaceTitle="Мой филиал"
      workspaceItems={[
        {
          title: "Adal",
          description: "Роль: Администратор. Доступ к лидам, группам, тренерам и аналитике.",
        },
        {
          title: "Ключевые доступы",
          description: "Лиды, группы, тренеры, пробные занятия и отчеты по филиалу.",
        },
      ]}
      notificationItems={[
        { key: "newLead", label: "Новый лид в моем филиале", defaultEnabled: true },
        { key: "trialToday", label: "Пробная тренировка сегодня", defaultEnabled: true },
        { key: "overdueCoachReport", label: "Тренер не закрыл отчет", defaultEnabled: true },
        { key: "waitingPayment", label: "Оплата ожидает подтверждения", defaultEnabled: false },
      ]}
      helpText="Филиалы, роль и критичные права меняются через SUPER_ADMIN или владельца клуба. Профиль ниже пока работает как mock UI."
      theme={{
        text: "text-admin-700",
        border: "border-cyan-100",
        softBg: "bg-cyan-50",
        button: "bg-admin-500 hover:bg-admin-700",
        ring: "text-admin-600 focus:ring-cyan-100",
      }}
    />
  );
};

export default AdminProfilePage;
