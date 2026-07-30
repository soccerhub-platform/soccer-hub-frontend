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
        text: "text-[#0066cc]",
        border: "border-emerald-100",
        softBg: "bg-emerald-50",
        button: "bg-[#0066cc] hover:bg-[#0066cc]",
        ring: "text-[#0066cc] focus:ring-emerald-100",
      }}
    />
  );
};

export default DispatcherProfilePage;
