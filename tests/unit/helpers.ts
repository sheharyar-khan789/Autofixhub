import { londonToday, addDaysIso, dayKeyOf } from "@/lib/validation/uk";

/** Next Monday-Friday date (>= 2 days ahead) as YYYY-MM-DD. */
export function nextWeekday(from = new Date(), minDays = 2): string {
  let d = addDaysIso(londonToday(from), minDays);
  while (["sat", "sun"].includes(dayKeyOf(d))) d = addDaysIso(d, 1);
  return d;
}

export function nextDay(dayKey: "sat" | "sun", from = new Date()): string {
  let d = addDaysIso(londonToday(from), 2);
  while (dayKeyOf(d) !== dayKey) d = addDaysIso(d, 1);
  return d;
}

export function validFields(serviceId = "clutch-repair", over: Record<string, string> = {}): Record<string, string> {
  return {
    name: "  Alex   Driver ",
    phone: "07700 900123",
    email: "Alex@Example.com",
    vrm: "ab21 cde",
    make: "Toyota",
    model: "Corolla",
    serviceId,
    preferredDate: nextWeekday(),
    preferredTime: "morning",
    description: "Warning light came on and the car feels rough when accelerating.",
    privacyAccepted: "true",
    ...over,
  };
}

/** Minimal byte sequences that satisfy the magic-byte sniffing. */
export const jpegBytes = (size = 2000) => {
  const b = new Uint8Array(size);
  b.set([0xff, 0xd8, 0xff, 0xe0]);
  return b;
};
export const pngBytes = (size = 2000) => {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
};
