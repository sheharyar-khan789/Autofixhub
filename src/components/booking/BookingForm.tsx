"use client";

import { AlertCircle, CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TIME_WINDOWS, TIME_WINDOW_LABELS } from "@/lib/models";
import { compressImage } from "@/lib/photos-client";
import { bookingInputSchema, flattenZodErrors, rawBookingFromFields } from "@/lib/validation/booking";
import { MAX_PHOTOS } from "@/lib/validation/photos";
import { addDaysIso, londonToday, MAX_BOOKING_HORIZON_DAYS } from "@/lib/validation/uk";

export interface ServiceGroup {
  category: string;
  services: { id: string; name: string; slug: string }[];
}

type Status = "idle" | "submitting" | "success" | "error";
interface Photo {
  id: string;
  blob: Blob;
  name: string;
  url: string;
}

const input =
  "w-full rounded border bg-surface-container-lowest px-space-md py-space-sm text-body-md text-text-primary placeholder:text-text-muted/60 border-border-medium focus:border-text-primary aria-[invalid=true]:border-status-fault-red";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="font-code text-label-code text-text-primary">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-body-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="flex items-start gap-space-xs text-body-sm text-status-fault-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

export function BookingForm({ groups, contactPhone }: { groups: ServiceGroup[]; contactPhone?: string }) {
  const uid = useId();
  const params = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [dates, setDates] = useState<{ min: string; max: string }>({ min: "", max: "" });

  useEffect(() => {
    const today = londonToday();
    setDates({ min: today, max: addDaysIso(today, MAX_BOOKING_HORIZON_DAYS) });
  }, []);
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const defaultService = useMemo(() => {
    const slug = params.get("service");
    return groups.flatMap((g) => g.services).find((s) => s.slug === slug)?.id ?? "";
  }, [params, groups]);

  const id = (n: string) => `${uid}-${n}`;
  const ariaFor = (n: string) => ({
    id: id(n),
    name: n,
    "aria-invalid": errors[n] ? true : undefined,
    "aria-describedby": errors[n] ? `${id(n)}-err` : undefined,
  });

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setErrors((p) => ({ ...p, photos: "" }));
    if (photos.length + files.length > MAX_PHOTOS) {
      setErrors((p) => ({ ...p, photos: `Attach no more than ${MAX_PHOTOS} photos.` }));
      return;
    }
    setPhotoBusy(true);
    try {
      const added: Photo[] = [];
      for (const f of files) {
        const blob = await compressImage(f);
        added.push({ id: crypto.randomUUID(), blob, name: f.name, url: URL.createObjectURL(blob) });
      }
      setPhotos((p) => [...p, ...added]);
    } catch (err) {
      setErrors((p) => ({ ...p, photos: err instanceof Error ? err.message : "Photo could not be added." }));
    } finally {
      setPhotoBusy(false);
    }
  }

  function focusFirstError(errs: Record<string, string>) {
    const first = Object.keys(errs).find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting" || photoBusy) return;
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const fields: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string") fields[k] = v;

    const parsed = bookingInputSchema.safeParse(rawBookingFromFields(fields));
    if (!parsed.success) {
      const errs = flattenZodErrors(parsed.error);
      setErrors(errs);
      setStatus("idle");
      focusFirstError(errs);
      return;
    }
    setErrors({});
    setStatus("submitting");

    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    photos.forEach((p, i) => body.append("photos", p.blob, `photo-${i + 1}.jpg`));

    try {
      const res = await fetch("/api/bookings", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; reference: string }
        | { ok: false; message?: string; fieldErrors?: Record<string, string> }
        | null;
      if (res.ok && data && data.ok) {
        setReference(data.reference);
        setStatus("success");
        window.scrollTo({ top: 0 });
        return;
      }
      const failure = data && !data.ok ? data : null;
      setErrors(failure?.fieldErrors ?? {});
      setFormError(failure?.message ?? "Your request could not be sent. Please try again.");
      setStatus("error");
      if (failure?.fieldErrors) focusFirstError(failure.fieldErrors);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again. Your details have been kept.");
      setStatus("error");
    }
  }

  if (status === "success" && reference) {
    return (
      <div role="status" className="flex flex-col gap-space-md rounded border border-status-pass-green bg-surface-raised p-space-lg" data-testid="booking-success">
        <CheckCircle2 className="h-8 w-8 text-status-pass-green" aria-hidden="true" />
        <h2 className="font-headline text-headline-md text-text-primary">Booking request sent</h2>
        <p className="text-body-md text-text-muted">
          Your reference is <strong className="font-code text-text-primary" data-testid="booking-reference">{reference}</strong>.
          This is a request for your preferred date and time. It is not confirmed until the workshop confirms it with you.
        </p>
        <div className="flex flex-wrap gap-space-sm">
          <Link href="/" className="rounded border border-border-medium px-space-md py-space-sm text-body-sm hover:border-text-muted">
            Back to home
          </Link>
          <button
            type="button"
            className="rounded border border-border-medium px-space-md py-space-sm text-body-sm hover:border-text-muted"
            onClick={() => {
              setStatus("idle");
              setReference(null);
              setPhotos([]);
              setErrors({});
            }}
          >
            Make another request
          </button>
        </div>
      </div>
    );
  }

  const submitting = status === "submitting";
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-space-lg" aria-busy={submitting} data-testid="booking-form">
      {formError && (
        <div role="alert" className="flex items-start gap-space-sm rounded border border-status-fault-red bg-surface-raised p-space-md text-body-md text-text-primary" data-testid="booking-error">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-fault-red" aria-hidden="true" />
          <div>
            <p>{formError}</p>
            {contactPhone && <p className="mt-space-xs text-text-muted">You can also call {contactPhone}.</p>}
          </div>
        </div>
      )}

      <fieldset className="grid gap-space-md md:grid-cols-2">
        <legend className="mb-space-sm font-headline text-headline-sm text-text-primary">Your details</legend>
        <Field id={id("name")} label="Full name" error={errors.name}>
          <input {...ariaFor("name")} type="text" autoComplete="name" className={input} required />
        </Field>
        <Field id={id("phone")} label="Phone" error={errors.phone} hint="UK number, e.g. 07700 900123">
          <input {...ariaFor("phone")} type="tel" autoComplete="tel" inputMode="tel" className={input} required />
        </Field>
        <div className="md:col-span-2">
          <Field id={id("email")} label="Email" error={errors.email}>
            <input {...ariaFor("email")} type="email" autoComplete="email" className={input} required />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-space-md md:grid-cols-3">
        <legend className="mb-space-sm font-headline text-headline-sm text-text-primary">Your vehicle</legend>
        <Field id={id("vrm")} label="Registration" error={errors.vrm}>
          <input {...ariaFor("vrm")} type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={10} placeholder="AB21 CDE" className={`${input} font-code uppercase`} required />
        </Field>
        <Field id={id("make")} label="Make" error={errors.make}>
          <input {...ariaFor("make")} type="text" autoComplete="off" className={input} required />
        </Field>
        <Field id={id("model")} label="Model" error={errors.model}>
          <input {...ariaFor("model")} type="text" autoComplete="off" className={input} required />
        </Field>
      </fieldset>

      <fieldset className="grid gap-space-md md:grid-cols-3">
        <legend className="mb-space-sm font-headline text-headline-sm text-text-primary">Service and timing</legend>
        <div className="md:col-span-3">
          <Field id={id("serviceId")} label="Service" error={errors.serviceId}>
            <select key={defaultService} {...ariaFor("serviceId")} defaultValue={defaultService} className={input} required>
              <option value="">Choose a service</option>
              {groups.map((g) => (
                <optgroup key={g.category} label={g.category}>
                  {g.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </div>
        <Field id={id("preferredDate")} label="Preferred date" error={errors.preferredDate}>
          <input {...ariaFor("preferredDate")} type="date" min={dates.min} max={dates.max} className={input} required />
        </Field>
        <Field id={id("preferredTime")} label="Preferred time" error={errors.preferredTime}>
          <select {...ariaFor("preferredTime")} defaultValue="" className={input} required>
            <option value="">Choose a time</option>
            {TIME_WINDOWS.map((t) => (
              <option key={t} value={t}>
                {TIME_WINDOW_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-space-md">
        <legend className="mb-space-sm font-headline text-headline-sm text-text-primary">The problem</legend>
        <Field id={id("description")} label="Describe the problem" error={errors.description} hint="What happens, when, and any warning lights or noises.">
          <textarea {...ariaFor("description")} rows={5} maxLength={2000} className={input} required />
        </Field>

        <div className="flex flex-col gap-space-xs">
          <span className="font-code text-label-code text-text-primary">Photos (optional)</span>
          <div className="flex flex-wrap gap-space-sm">
            {photos.map((p) => (
              <div key={p.id} className="relative h-24 w-24 overflow-hidden rounded border border-border-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Attached photo ${p.name}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                  className="absolute right-1 top-1 rounded bg-surface-base/90 p-1"
                  aria-label={`Remove photo ${p.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-border-medium text-body-sm text-text-muted hover:border-text-muted focus-within:outline focus-within:outline-2 focus-within:outline-text-primary">
                {photoBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
                <span>{photoBusy ? "Preparing" : "Add photo"}</span>
                <input
                  type="file"
                  name="photo-picker"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={onPhotos}
                  disabled={photoBusy}
                  data-testid="photo-input"
                />
              </label>
            )}
          </div>
          <p className="text-body-sm text-text-muted">Up to {MAX_PHOTOS} photos. Images are resized in your browser and location data is removed.</p>
          {errors.photos && (
            <p className="flex items-start gap-space-xs text-body-sm text-status-fault-red" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {errors.photos}
            </p>
          )}
        </div>
      </fieldset>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-space-xs">
        <label className="flex items-start gap-space-sm text-body-md text-text-primary">
          <input
            type="checkbox"
            name="privacyAccepted"
            value="true"
            id={id("privacy")}
            aria-invalid={errors.privacyAccepted ? true : undefined}
            aria-describedby={errors.privacyAccepted ? `${id("privacy")}-err` : undefined}
            className="mt-1 h-4 w-4 accent-primary-container"
          />
          <span>
            I have read the{" "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-4">
              privacy notice
            </Link>{" "}
            and agree to my details being used to handle this request.
          </span>
        </label>
        {errors.privacyAccepted && (
          <p id={`${id("privacy")}-err`} className="flex items-start gap-space-xs text-body-sm text-status-fault-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {errors.privacyAccepted}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting || photoBusy}
          className="inline-flex items-center justify-center gap-space-sm rounded bg-primary-container px-space-lg py-space-md font-headline text-body-md font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-red-hover disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="booking-submit"
        >
          {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {submitting ? "Sending request…" : "Send booking request"}
        </button>
        <p className="text-body-sm text-text-muted" aria-live="polite">
          {submitting ? "Please wait, this can take a few seconds with photos." : ""}
        </p>
      </div>
    </form>
  );
}
