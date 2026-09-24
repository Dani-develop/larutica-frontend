import { isValidPhoneNumber } from "react-phone-number-input";

export const DEFAULT_PHONE_COUNTRY = "CR" as const;

export function isOptionalPhoneNumber(
  value: string | undefined | null,
): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return true;
  return isValidPhoneNumber(trimmed);
}

export function isRequiredPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return isValidPhoneNumber(trimmed);
}
