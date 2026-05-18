export const getHomePathForRoles = (roles: string[]) => {
  if (roles.includes("COACH")) return "/coach/today";
  if (roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")) return "/admin/branch-select";
  if (roles.includes("DISPATCHER")) return "/dispatcher/dashboard";
  return "/login";
};

export const canRoleAccessPath = (roles: string[], path: string) => {
  if (path.startsWith("/coach")) return roles.includes("COACH");
  if (path.startsWith("/admin")) return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  if (path.startsWith("/dispatcher")) return roles.includes("DISPATCHER");
  return false;
};
