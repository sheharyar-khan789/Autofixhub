"use server";

import { revalidatePath } from "next/cache";
import { revalidateContent } from "@/lib/cache";
import { requireRole } from "@/lib/auth/session";
import { SETTINGS_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { updateSettingsAdmin } from "@/lib/admin/settings";
import { schemaErrors, type FieldErrors, type FormState } from "@/lib/admin/forms";
import { businessSettingsSchema, DAY_KEYS, type BusinessSettings } from "@/lib/models";

export type ActionState = FormState;

function optionalText(formData: FormData, key: string): string | undefined {
  const v = String(formData.get(key) ?? "").trim();
  return v || undefined;
}

const ADDRESS_FIELDS: Record<string, string> = { line1: "addressLine1", line2: "addressLine2", city: "addressCity", postcode: "addressPostcode" };

/** Schema path -> the settings form input it came from. */
function settingsField(path: readonly PropertyKey[], raw: BusinessSettings): string | undefined {
  const [top, key, sub] = path;
  if (top === "address" && typeof key === "string") return ADDRESS_FIELDS[key];
  if (top === "socialLinks" && typeof key === "string") return `social${key[0].toUpperCase()}${key.slice(1)}`;
  if (top === "openingHours" && typeof key === "number" && (sub === "open" || sub === "close")) {
    const day = raw.openingHours?.[key]?.day;
    return day ? `${sub}_${day}` : undefined;
  }
  return typeof top === "string" && key === undefined ? top : undefined;
}

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(SETTINGS_ROLES);

  const line1 = optionalText(formData, "addressLine1");
  const city = optionalText(formData, "addressCity");
  const postcode = optionalText(formData, "addressPostcode");
  const hasAddress = line1 && city && postcode;
  // A partly filled address used to be dropped silently; point at the missing parts instead.
  const extra: FieldErrors = {};
  if (!hasAddress && (line1 || city || postcode || optionalText(formData, "addressLine2"))) {
    for (const [key, value] of [["addressLine1", line1], ["addressCity", city], ["addressPostcode", postcode]] as const) {
      if (!value) extra[key] = "Required when an address is entered.";
    }
  }

  const openingHours = DAY_KEYS.map((day) => {
    const closed = formData.get(`closed_${day}`) === "on";
    const open = optionalText(formData, `open_${day}`);
    const close = optionalText(formData, `close_${day}`);
    return { day, closed, open: closed ? undefined : open, close: closed ? undefined : close };
  }).filter((d) => d.closed || d.open || d.close);

  const raw: BusinessSettings = {
    tradingName: optionalText(formData, "tradingName"),
    logoUrl: optionalText(formData, "logoUrl"),
    phone: optionalText(formData, "phone"),
    whatsapp: optionalText(formData, "whatsapp"),
    email: optionalText(formData, "email"),
    mapsUrl: optionalText(formData, "mapsUrl"),
    address: hasAddress
      ? {
          line1: line1!,
          line2: optionalText(formData, "addressLine2"),
          city: city!,
          postcode: postcode!,
        }
      : undefined,
    openingHours: openingHours.length ? openingHours : undefined,
    socialLinks: {
      facebook: optionalText(formData, "socialFacebook"),
      instagram: optionalText(formData, "socialInstagram"),
      tiktok: optionalText(formData, "socialTiktok"),
      x: optionalText(formData, "socialX"),
      youtube: optionalText(formData, "socialYoutube"),
    },
  };

  const parsed = businessSettingsSchema.safeParse(raw);
  if (!parsed.success || Object.keys(extra).length) {
    return schemaErrors(parsed.success ? [] : parsed.error.issues, extra, (path) => settingsField(path, raw));
  }

  try {
    await updateSettingsAdmin(parsed.data, session);
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.settings.save", err);
    return { error: "Could not save settings. Try again." };
  }
  revalidatePath("/admin/settings");
  revalidateContent();
  return { success: "Settings saved." };
}
