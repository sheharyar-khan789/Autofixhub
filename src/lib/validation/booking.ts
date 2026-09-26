import { z } from "zod";
import { TIME_WINDOWS } from "@/lib/models";
import { isPlausibleVrm, normaliseUkPhone, normaliseVrm } from "./uk";

// Strip control characters (keeps newlines/tabs; used on free text too).
const noControl = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
const cleanLine = (s: string) => noControl(s).trim().replace(/\s+/g, " ");

export const bookingInputSchema = z.object({
  name: z
    .string({ error: "Enter your name." })
    .transform(cleanLine)
    .pipe(z.string().min(2, "Enter your full name.").max(100, "Name is too long.")),
  phone: z
    .string({ error: "Enter a phone number." })
    .transform((s) => s.trim())
    .refine((s) => normaliseUkPhone(s) !== null, "Enter a valid UK phone number, e.g. 07700 900123.")
    .transform((s) => normaliseUkPhone(s) as string),
  email: z
    .string({ error: "Enter your email address." })
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(254, "Email address is too long.")),
  vrm: z
    .string({ error: "Enter the vehicle registration." })
    .transform(normaliseVrm)
    .refine(isPlausibleVrm, "Enter a valid UK registration, e.g. AB21 CDE."),
  make: z
    .string({ error: "Enter the vehicle make." })
    .transform(cleanLine)
    .pipe(z.string().min(2, "Enter the vehicle make.").max(40, "Make is too long.")),
  model: z
    .string({ error: "Enter the vehicle model." })
    .transform(cleanLine)
    .pipe(z.string().min(1, "Enter the vehicle model.").max(60, "Model is too long.")),
  serviceId: z.string({ error: "Choose a service." }).trim().min(1, "Choose a service.").max(100),
  preferredDate: z
    .string({ error: "Choose a preferred date." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a preferred date."),
  preferredTime: z.enum(TIME_WINDOWS, { error: "Choose a preferred time." }),
  description: z
    .string({ error: "Describe the problem." })
    .transform((s) => noControl(s).trim())
    .pipe(
      z
        .string()
        .min(10, "Describe the problem in at least 10 characters.")
        .max(2000, "Description must be 2000 characters or fewer."),
    ),
  privacyAccepted: z.literal(true, { error: "Confirm you have read the privacy notice." }),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export const BOOKING_TEXT_FIELDS = [
  "name",
  "phone",
  "email",
  "vrm",
  "make",
  "model",
  "serviceId",
  "preferredDate",
  "preferredTime",
  "description",
] as const;

/** Turns raw form values into the shape the schema expects. */
export function rawBookingFromFields(fields: Record<string, string | undefined>) {
  const raw: Record<string, unknown> = {};
  for (const k of BOOKING_TEXT_FIELDS) if (fields[k] !== undefined) raw[k] = fields[k];
  raw.privacyAccepted = fields.privacyAccepted === "true" || fields.privacyAccepted === "on";
  return raw;
}

export function flattenZodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
