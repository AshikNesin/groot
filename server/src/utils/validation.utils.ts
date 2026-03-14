/**
 * Validation utility functions
 */

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
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  if (!isoRegex.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * Check if a value is a valid date string (YYYY-MM-DD)
 */
export function isValidDateString(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !Number.isNaN(d.getTime());
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
