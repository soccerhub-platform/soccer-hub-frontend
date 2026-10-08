import React from "react";
import UserProfilePage from "../../shared/profile/UserProfilePage";

const AdminProfilePage: React.FC = () => {
  return (
    <UserProfilePage
      scope="admin"
      roleLabel="Администратор филиала"
      roleDescription="Управляет лидами, группами, тренерами, расписанием и операционной аналитикой выбранного филиала."
      workspaceTitle="Мой филиал"
      helpText="Филиалы, роль и критичные права меняются через SUPER_ADMIN или владельца клуба."
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

export default AdminProfilePage;
