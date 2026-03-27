const PHONE_GROUPS = [1, 3, 3, 2, 2];

export const normalizePhoneDigits = (value: string) =>
  value.replace(/\D/g, "").slice(0, 11);

export const formatPhoneInput = (value: string) => {
  const digits = normalizePhoneDigits(value);

  if (!digits) {
    return "";
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const size of PHONE_GROUPS) {
    const chunk = digits.slice(cursor, cursor + size);
    if (!chunk) break;
    parts.push(chunk);
    cursor += size;
  }

  return `+${parts.join(" ")}`;
};

export const normalizePhoneForSubmit = (value: string) => {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : "";
};

export const isValidFormattedPhone = (value: string) =>
  /^7\d{10}$/.test(normalizePhoneDigits(value));
