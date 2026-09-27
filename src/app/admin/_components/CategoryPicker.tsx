import Link from "next/link";
import type { ContentCategory } from "@/lib/models";
import type { FieldErrors } from "@/lib/admin/forms";
import { FieldError } from "./ui";

/**
 * Checkbox group writing `categorySlugs`. Draft/archived categories are listed too
 * (marked), so content can be tagged before the category itself is published.
 */
export function CategoryPicker({
  categories,
  selected,
  errors,
}: {
  categories: ContentCategory[];
  selected?: string[];
  errors?: FieldErrors;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-body-sm text-text-muted">
        No categories yet. Create them under <Link href="/admin/categories" className="underline">Categories</Link>.
      </p>
    );
  }
  const groups: [string, ContentCategory[]][] = [
    ["Vehicles", categories.filter((c) => c.kind === "vehicle")],
    ["Topics", categories.filter((c) => c.kind === "topic")],
  ];
  return (
    <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
      <legend className="px-space-xs font-code text-label-code text-text-muted">Categories</legend>
      {groups.map(([title, items]) =>
        items.length ? (
          <div key={title} className="flex flex-col gap-space-xs">
            <p className="font-code text-label-telemetry uppercase text-text-muted">{title}</p>
            <div className="flex flex-wrap gap-x-space-md gap-y-space-xs">
              {items.map((c) => (
                <label key={c.id} className="inline-flex min-h-11 items-center gap-space-xs text-body-sm text-text-primary">
                  <input type="checkbox" name="categorySlugs" value={c.slug} defaultChecked={selected?.includes(c.slug)} className="h-4 w-4" />
                  {c.name}
                  {c.status !== "published" && <span className="font-code text-label-badge text-text-muted">({c.status})</span>}
                </label>
              ))}
            </div>
          </div>
        ) : null,
      )}
      <FieldError errors={errors} name="categorySlugs" />
    </fieldset>
  );
}
