/**
 * Validation utility functions
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Check if a value is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a value is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if a value is a valid ISO date string
 */
export function isValidISODate(date: string): boolean {
  return dayjs(date, "YYYY-MM-DDTHH:mm:ss.SSSZ", true).isValid();
}

/**
 * Check if a value is a valid date string (YYYY-MM-DD)
 */
export function isValidDateString(date: string): boolean {
  return dayjs(date, "YYYY-MM-DD", true).isValid();
}

/**
 * Sanitize a string by removing HTML tags
 */
export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Trim and normalize whitespace in a string
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Check if a string contains only alphanumeric characters
 */
export function isAlphanumeric(input: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(input);
}

/**
 * Check if a string is a valid phone number (basic check)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
}
