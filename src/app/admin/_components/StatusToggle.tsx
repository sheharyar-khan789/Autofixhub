import type { PublishStatus } from "@/lib/models";
import { SubmitButton } from "./SubmitButton";
import { rowActionClass } from "./ui";

/**
 * Publish / Unpublish as a real form POST to a server action (works without JS).
 * `back` returns the editor to the same filtered list, where a toast confirms the change.
 */
export function StatusToggle({
  action,
  id,
  status,
  back,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  status: PublishStatus;
  back: string;
}) {
  const publish = status !== "published";
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={publish ? "published" : "draft"} />
      <input type="hidden" name="back" value={back} />
      <SubmitButton
        pendingLabel={publish ? "Publishing…" : "Unpublishing…"}
        className={`${rowActionClass} ${publish ? "!text-status-pass-green" : ""}`}
      >
        {publish ? "Publish" : "Unpublish"}
      </SubmitButton>
    </form>
  );
}
