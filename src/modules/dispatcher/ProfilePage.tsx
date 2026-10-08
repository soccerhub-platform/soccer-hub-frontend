import React from "react";
import UserProfilePage from "../../shared/profile/UserProfilePage";

const DispatcherProfilePage: React.FC = () => {
  return (
    <UserProfilePage
      scope="dispatcher"
      roleLabel="Диспетчер"
      roleDescription="Ведет клубы, филиалы, администраторов и поток заявок между филиалами."
      workspaceTitle="Рабочая зона"
      helpText="Доступ к филиалам и системные права назначаются владельцем клуба или системным администратором."
      theme={{
        text: "text-primary",
        border: "border-border",
        softBg: "bg-muted/30",
        button: "bg-primary hover:bg-primary/90",
        ring: "text-primary focus:ring-primary/20",
      }}
    />
  );
};

export default DispatcherProfilePage;
