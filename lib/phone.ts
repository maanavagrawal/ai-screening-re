import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(value: string) {
  const parsed = parsePhoneNumberFromString(value, "US");
  if (!parsed?.isValid()) return null;
  return parsed.number;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
