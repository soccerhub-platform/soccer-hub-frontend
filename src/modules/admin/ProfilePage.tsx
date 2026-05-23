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
