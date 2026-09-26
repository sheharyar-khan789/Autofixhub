import { StateNotice } from "@/components/ui/Section";
import type { Loaded, Catalog } from "@/lib/data";

/** Renders the right notice for unavailable/empty catalogue; returns null when there is data. */
export function catalogNotice(result: Loaded<Catalog>) {
  if (!result.ok) {
    return result.reason === "not-configured" ? (
      <StateNotice title="Services are not available yet">
        The service list is loaded from the workshop&apos;s database, which has not been connected on this server.
      </StateNotice>
    ) : (
      <StateNotice title="Services could not be loaded" tone="error">
        Something went wrong loading the service list. Refresh the page, or contact the workshop directly.
      </StateNotice>
    );
  }
  if (result.value.services.length === 0) {
    return (
      <StateNotice title="No services published yet">
        Services will appear here once they are published from the workshop&apos;s admin.
      </StateNotice>
    );
  }
  return null;
}
