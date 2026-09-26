import type { FaqEntry } from "@/lib/models";

export function FaqSection({ faqs }: { faqs: FaqEntry[] | undefined }) {
  if (!faqs || faqs.length === 0) return null;
  return (
    <div className="flex flex-col gap-space-sm">
      <h2 className="font-headline text-headline-md text-text-primary">Frequently asked questions</h2>
      <dl className="flex flex-col divide-y divide-border-subtle rounded border border-border-subtle bg-surface-raised">
        {faqs.map((f, i) => (
          <div key={i} className="p-space-md">
            <dt className="font-headline text-headline-sm text-text-primary">{f.question}</dt>
            <dd className="mt-space-xs text-body-md text-text-muted">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
