import { ORDER_NUMBER_PREFIX } from "../constants/index.js";

// ── Order Number ─────────────────────────────────────────────
/**
 * Generates a human-readable order number.
 * Format: AS-YYYY-NNNNN  e.g. AS-2026-00001
 */
export function formatOrderNumber(year: number, sequence: number): string {
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(sequence).padStart(5, "0")}`;
}

/**
 * Parses year and sequence from an order number string.
 */
export function parseOrderNumber(orderNumber: string): { year: number; sequence: number } | null {
  const match = orderNumber.match(/^AS-(\d{4})-(\d+)$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), sequence: parseInt(match[2], 10) };
}

// ── Distance / Haversine ─────────────────────────────────────
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two coordinates
 * using the Haversine formula. Returns distance in kilometres.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** Alias for calculateDistance — matches architecture doc naming */
export const haversine = calculateDistance;

// ── Currency ─────────────────────────────────────────────────
/**
 * Formats a number (or numeric string) as Philippine Peso.
 * e.g. 1234.5 → "₱1,234.50"
 */
export function formatCurrency(amount: number | string, currency = "PHP"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

// ── Date / Time ──────────────────────────────────────────────
export function formatDate(date: string | Date, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// ── Pagination ───────────────────────────────────────────────
export function getPaginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function getTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

// ── String helpers ───────────────────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fullName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}
