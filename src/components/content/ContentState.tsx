import { StateNotice } from "@/components/ui/Section";
import type { Loaded } from "@/lib/data";

interface Copy {
  notConfiguredTitle: string;
  notConfiguredBody: string;
  errorTitle: string;
  emptyTitle: string;
  emptyBody: string;
}

/** Shared shape behind guidesNotice/faultCodesNotice/videosNotice. Returns null when there is data to show. */
function contentNotice<T>(result: Loaded<T[]>, copy: Copy) {
  if (!result.ok) {
    return result.reason === "not-configured" ? (
      <StateNotice title={copy.notConfiguredTitle}>{copy.notConfiguredBody}</StateNotice>
    ) : (
      <StateNotice title={copy.errorTitle} tone="error">
        Something went wrong loading this page. Refresh to try again.
      </StateNotice>
    );
  }
  if (result.value.length === 0) {
    return <StateNotice title={copy.emptyTitle}>{copy.emptyBody}</StateNotice>;
  }
  return null;
}

export function guidesNotice(result: Loaded<unknown[]>) {
  return contentNotice(result as Loaded<unknown[]>, {
    notConfiguredTitle: "Repair guides are not available yet",
    notConfiguredBody: "Guides are loaded from the content database, which has not been connected on this server.",
    errorTitle: "Repair guides could not be loaded",
    emptyTitle: "No guides published yet",
    emptyBody: "Repair guides will appear here once they are published.",
  });
}

export function faultCodesNotice(result: Loaded<unknown[]>) {
  return contentNotice(result as Loaded<unknown[]>, {
    notConfiguredTitle: "The fault code database is not available yet",
    notConfiguredBody: "Fault codes are loaded from the content database, which has not been connected on this server.",
    errorTitle: "Fault codes could not be loaded",
    emptyTitle: "No fault codes published yet",
    emptyBody: "Fault code references will appear here once they are published.",
  });
}

export function videosNotice(result: Loaded<unknown[]>) {
  return contentNotice(result as Loaded<unknown[]>, {
    notConfiguredTitle: "Videos are not available yet",
    notConfiguredBody: "Videos are loaded from the content database, which has not been connected on this server.",
    errorTitle: "Videos could not be loaded",
    emptyTitle: "No videos published yet",
    emptyBody: "Repair and diagnostic videos will appear here once they are published.",
  });
}
