import React from "react";
import UserProfileMockPage from "../../shared/profile/UserProfileMockPage";

const DispatcherProfilePage: React.FC = () => {
  return (
    <UserProfileMockPage
      roleLabel="Диспетчер"
      roleDescription="Ведет клубы, филиалы, администраторов и поток заявок между филиалами."
      defaultProfile={{
        firstName: "Диспетчер",
        lastName: "CRM",
        phone: "+7 777 200 30 40",
        emailFallback: "dispatcher@soccerhub.kz",
        position: "Операционный диспетчер",
        bio: "Контролирует первичный поток заявок, структуру клубов и качество операционной обработки.",
      }}
      workspaceTitle="Рабочая зона"
      workspaceItems={[
        {
          title: "Клубы и филиалы",
          description: "Роль: Диспетчер. Доступ к клубам, филиалам, администраторам и лидам.",
        },
        {
          title: "Ключевые доступы",
          description: "Контроль структуры клубов, распределение заявок и операционная аналитика.",
        },
      ]}
      notificationItems={[
        { key: "unassignedLead", label: "Новый лид без филиала", defaultEnabled: true },
        { key: "branchWithoutAdmin", label: "Филиал без администратора", defaultEnabled: true },
        { key: "slaBreach", label: "Нарушен SLA по обработке лида", defaultEnabled: true },
        { key: "adminNoResponse", label: "Админ долго не обработал лид", defaultEnabled: false },
      ]}
      helpText="Доступ к филиалам и системные права назначаются владельцем клуба или SUPER_ADMIN. Эта страница пока работает как mock UI."
      theme={{
        text: "text-dispatcher-700",
        border: "border-emerald-100",
        softBg: "bg-emerald-50",
        button: "bg-dispatcher-500 hover:bg-dispatcher-700",
        ring: "text-dispatcher-600 focus:ring-emerald-100",
      }}
    />
  );
};

export default DispatcherProfilePage;
