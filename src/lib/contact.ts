import { DAY_KEYS, DAY_LABELS, type BusinessSettings, type DayKey } from "@/lib/models";

/** tel: href from a display number; keeps a leading + and digits. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** wa.me link. `whatsapp` is international format; wa.me wants digits only. */
export function whatsappHref(whatsapp: string, text?: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function formatAddress(a: NonNullable<BusinessSettings["address"]>): string {
  return [a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ");
}

export function mapsHref(s: BusinessSettings | null): string | null {
  if (!s) return null;
  if (s.mapsUrl) return s.mapsUrl;
  if (s.address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(s.address))}`;
  return null;
}

export interface HoursRow {
  day: DayKey;
  label: string;
  text: string;
  closed: boolean;
}

export function hoursRows(s: BusinessSettings | null): HoursRow[] | null {
  const hours = s?.openingHours;
  if (!hours?.length) return null;
  return DAY_KEYS.map((day) => {
    const h = hours.find((x) => x.day === day);
    const closed = !h || !!h.closed || !h.open || !h.close;
    return {
      day,
      label: DAY_LABELS[day],
      closed,
      text: closed ? "Closed" : `${h!.open} – ${h!.close}`,
    };
  });
}

const SHORT: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

/** "Mon – Fri 09:00 – 17:00 | Sat – Sun Closed" */
export function hoursSummary(s: BusinessSettings | null): string | null {
  const rows = hoursRows(s);
  if (!rows) return null;
  const groups: { from: DayKey; to: DayKey; text: string }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.text === r.text) last.to = r.day;
    else groups.push({ from: r.day, to: r.day, text: r.text });
  }
  return groups
    .map((g) => `${g.from === g.to ? SHORT[g.from] : `${SHORT[g.from]} – ${SHORT[g.to]}`} ${g.text}`)
    .join(" | ");
}
