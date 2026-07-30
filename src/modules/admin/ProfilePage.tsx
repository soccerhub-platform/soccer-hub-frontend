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
        text: "text-[#0066cc]",
        border: "border-blue-100",
        softBg: "bg-blue-50",
        button: "bg-blue-500 hover:bg-[#0066cc]",
        ring: "text-[#0066cc] focus:ring-blue-100",
      }}
    />
  );
};

export default AdminProfilePage;
