/** Newline-separated textarea -> trimmed non-empty string array, or undefined if empty. */
export function parseLines(v: FormDataEntryValue | null): string[] | undefined {
  const lines = String(v ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
}

/** Comma-separated id list -> trimmed non-empty string array, or undefined if empty. */
export function parseCsvIds(v: FormDataEntryValue | null): string[] | undefined {
  const ids = String(v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return ids.length ? ids : undefined;
}

/**
 * Image references stored on content (guide/service/video images) must be an
 * https URL or a site-relative path. Anything else (javascript:, data:, http:,
 * protocol-relative "//host") is rejected server-side, whatever the form sent.
 */
export function isSafeImageRef(v: string): boolean {
  if (v.startsWith("/")) return !v.startsWith("//") && !v.includes("\\");
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/** Checkbox group (e.g. categorySlugs) -> unique non-empty string array, or undefined. */
export function parseCheckboxes(values: FormDataEntryValue[]): string[] | undefined {
  const out = [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
  return out.length ? out : undefined;
}

/**
 * FAQ textarea -> entries. Blocks are separated by a blank line; each block is
 * "Q: question" followed by "A: answer" (the answer may span several lines).
 * Returns an error message for a malformed block instead of silently dropping it.
 */
export function parseFaqs(v: FormDataEntryValue | null): { faqs?: { question: string; answer: string }[]; error?: string } {
  const text = String(v ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return {};
  const faqs: { question: string; answer: string }[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const m = block.trim().match(/^Q:\s*([\s\S]+?)\nA:\s*([\s\S]+)$/i);
    if (!m) return { error: 'Each FAQ needs a "Q:" line then an "A:" line, with a blank line between FAQs.' };
    faqs.push({ question: m[1].trim(), answer: m[2].trim() });
  }
  return { faqs };
}

/** FAQ entries -> the textarea format parseFaqs() reads. */
export function formatFaqs(faqs: { question: string; answer: string }[] | undefined): string {
  return (faqs ?? []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
}

/** Append a `notice` key (see admin FlashToast) to an admin path. */
export function withNotice(path: string, notice: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice)}`;
}

/**
 * Status from the editor: the clicked button's `intent` ("draft" | "published") wins,
 * then the `status` field, then draft. Anything else is left for schema validation to reject.
 */
export function statusFromForm(formData: FormData): string {
  const intent = formData.get("intent");
  if (intent === "draft" || intent === "published" || intent === "archived") return intent;
  return String(formData.get("status") ?? "draft");
}

/** Which toast to show after saving. */
export function saveNotice(isNew: boolean, status: string): "published" | "saved" | "created" {
  if (status === "published") return "published";
  return isNew ? "created" : "saved";
}
