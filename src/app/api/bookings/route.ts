import { createBooking, type UploadedPhotoInput } from "@/lib/booking/create";
import { getSettingsOrNull } from "@/lib/data";
import { isNotConfigured, workshopFeaturesEnabled } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { getStore } from "@/lib/repo";
import { clientIp, hashIp, isSameOrigin } from "@/lib/security/request";
import { MAX_PHOTOS, MAX_TOTAL_PHOTO_BYTES } from "@/lib/validation/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Text fields + up to 3 photos (<=4 MB) + multipart overhead.
const MAX_BODY_BYTES = MAX_TOTAL_PHOTO_BYTES + 200_000;

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(req: Request) {
  // Dormant workshop feature: no public booking endpoint unless explicitly enabled.
  if (!workshopFeaturesEnabled()) {
    return json({ ok: false, code: "not_found", message: "Not found." }, 404);
  }
  if (!isSameOrigin(req)) {
    return json({ ok: false, code: "forbidden", message: "Request origin not allowed." }, 403);
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return json(
      { ok: false, code: "photos_invalid", message: "The upload is too large. Attach fewer or smaller photos." },
      413,
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, code: "validation", message: "The form data could not be read." }, 400);
  }

  const fields: Record<string, string | undefined> = {};
  const photos: UploadedPhotoInput[] = [];
  let tooManyPhotos = false;
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      if (value.length <= 5000) fields[key] = value;
    } else if (key === "photos" && value.size > 0) {
      // Never buffer more than the allowed number; keep reading the text fields.
      if (photos.length >= MAX_PHOTOS) {
        tooManyPhotos = true;
        continue;
      }
      photos.push({ bytes: new Uint8Array(await value.arrayBuffer()), name: value.name });
    }
  }
  if (tooManyPhotos) {
    return json(
      {
        ok: false,
        code: "photos_invalid",
        message: "Check the highlighted fields and try again.",
        fieldErrors: { photos: `Attach no more than ${MAX_PHOTOS} photos.` },
      },
      413,
    );
  }

  try {
    const store = getStore();
    const settings = await getSettingsOrNull();
    const result = await createBooking(store, {
      fields,
      photos,
      ipHash: hashIp(clientIp(req)),
      settings,
    });
    if (result.ok) return json({ ok: true, reference: result.reference, photos: result.photos }, 201);
    return json(
      { ok: false, code: result.code, message: result.message, fieldErrors: result.fieldErrors },
      result.status,
      result.status === 429 ? { "Retry-After": "3600" } : {},
    );
  } catch (err) {
    if (isNotConfigured(err)) {
      logServerError("booking.not-configured", err);
      return json(
        {
          ok: false,
          code: "service_unavailable",
          message: "Online booking is not available yet. Please call the workshop.",
        },
        503,
      );
    }
    logServerError("booking.unhandled", err);
    return json(
      { ok: false, code: "save_failed", message: "Something went wrong. Please try again, or call the workshop." },
      500,
    );
  }
}
