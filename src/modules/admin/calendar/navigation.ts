export function calendarReturnTo(value: string | null, groupId?: string): string | null {
  if (!value || /[\\#\r\n]/.test(value)) return null;
  const path = value.split("?")[0];
  return path === "/admin/schedule" || (groupId && path === `/admin/groups/${groupId}/schedule`) ? value : null;
}
