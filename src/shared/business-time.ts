// The club calendar uses Almaty time, independently of the administrator's device.
export const businessDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

export const sessionTimestamp = (value: string) => Date.parse(
  /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+05:00`,
);

export const addBusinessDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
