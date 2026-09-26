import { DAY_KEYS, type BusinessSettings, type DayKey } from "@/lib/models";

/** Uppercase, alphanumerics only ("ab21 cde" -> "AB21CDE"). */
export function normaliseVrm(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Deliberately permissive: current, prefix, suffix, dateless, Northern Irish
 * and personalised plates are all 2-8 characters mixing letters and digits.
 */
export function isPlausibleVrm(normalised: string): boolean {
  return /^[A-Z0-9]{2,8}$/.test(normalised) && /[A-Z]/.test(normalised) && /[0-9]/.test(normalised);
}

/** Returns E.164 (+44…) for UK numbers, or null when not a valid UK number. */
export function normaliseUkPhone(input: string): string | null {
  let s = input.replace(/[\s\-().]/g, "");
  if (s.startsWith("+44")) s = "0" + s.slice(3);
  else if (s.startsWith("0044")) s = "0" + s.slice(4);
  if (!/^0(?:1\d{8,9}|2\d{9}|3\d{9}|7[1-9]\d{8})$/.test(s)) return null;
  return "+44" + s.slice(1);
}

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/** YYYY-MM-DD for "now" in Europe/London. */
export function londonToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isRealIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function dayKeyOf(iso: string): DayKey {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return DAY_KEYS[(dow + 6) % 7];
}

export const MAX_BOOKING_HORIZON_DAYS = 90;

/** Business-rule check for the preferred date. Returns a message or null. */
export function validatePreferredDate(
  iso: string,
  settings: BusinessSettings | null,
  now: Date = new Date(),
): string | null {
  if (!isRealIsoDate(iso)) return "Choose a valid date.";
  const today = londonToday(now);
  if (iso < today) return "Choose today or a future date.";
  if (iso > addDaysIso(today, MAX_BOOKING_HORIZON_DAYS))
    return `Choose a date within the next ${MAX_BOOKING_HORIZON_DAYS} days.`;
  const hours = settings?.openingHours;
  if (hours?.length) {
    const entry = hours.find((h) => h.day === dayKeyOf(iso));
    // Opening hours are configured: a day that is closed or not listed is not bookable.
    if (!entry || entry.closed) {
      return "The workshop is closed that day. Choose another date.";
    }
  }
  return null;
}
