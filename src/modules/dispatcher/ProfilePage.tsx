import React from "react";
import UserProfilePage from "../../shared/profile/UserProfilePage";

const DispatcherProfilePage: React.FC = () => {
  return (
    <UserProfilePage
      scope="dispatcher"
      roleLabel="Диспетчер"
      roleDescription="Ведет клубы, филиалы, администраторов и поток заявок между филиалами."
      workspaceTitle="Рабочая зона"
      helpText="Доступ к филиалам и системные права назначаются владельцем клуба или SUPER_ADMIN."
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
