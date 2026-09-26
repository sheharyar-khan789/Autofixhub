import "server-only";
import { revalidatePath, updateTag } from "next/cache";

/**
 * Cross-request cache for published content (see src/lib/data.ts). Pages that read
 * searchParams (pagination, search) are dynamic, so without this every visit would
 * query Firestore. Entries live for CONTENT_REVALIDATE_SECONDS, and every admin
 * mutation clears them immediately via revalidateContent().
 */
export const CONTENT_TAG = "published-content";
export const CONTENT_REVALIDATE_SECONDS = 60;

/**
 * Call from admin SERVER ACTIONS after any content/settings change. updateTag gives
 * read-your-own-writes: the next request waits for fresh data instead of being served
 * the stale cached entry (revalidateTag's stale-while-revalidate left an unpublished
 * page visible for one more request, caught by the emulator admin-flow test).
 */
export function revalidateContent(): void {
  updateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
}
