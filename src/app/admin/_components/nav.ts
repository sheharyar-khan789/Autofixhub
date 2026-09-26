import { BOOKINGS_ROLES, CONTENT_ROLES, DASHBOARD_ROLES, SETTINGS_ROLES } from "@/lib/auth/permissions";
import type { Role } from "@/lib/models";

export type NavIcon =
  | "dashboard" | "guides" | "videos" | "faultCodes" | "categories" | "media"
  | "seo" | "settings" | "activity" | "account" | "bookings" | "services" | "reviews";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface Def extends NavItem {
  roles: readonly Role[];
  workshopOnly?: boolean;
}

const GROUPS: { label: string; items: Def[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", roles: DASHBOARD_ROLES }] },
  {
    label: "Content",
    items: [
      { href: "/admin/guides", label: "Guides", icon: "guides", roles: CONTENT_ROLES },
      { href: "/admin/videos", label: "Videos", icon: "videos", roles: CONTENT_ROLES },
      { href: "/admin/fault-codes", label: "Fault codes", icon: "faultCodes", roles: CONTENT_ROLES },
      { href: "/admin/categories", label: "Categories", icon: "categories", roles: CONTENT_ROLES },
      { href: "/admin/gallery", label: "Media", icon: "media", roles: CONTENT_ROLES },
    ],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/seo", label: "SEO", icon: "seo", roles: CONTENT_ROLES },
      { href: "/admin/settings", label: "Settings", icon: "settings", roles: SETTINGS_ROLES },
    ],
  },
  {
    // Dormant workshop features (WORKSHOP_FEATURES_ENABLED): hidden unless switched on.
    label: "Workshop",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: "bookings", roles: BOOKINGS_ROLES, workshopOnly: true },
      { href: "/admin/services", label: "Services", icon: "services", roles: CONTENT_ROLES, workshopOnly: true },
      { href: "/admin/reviews", label: "Reviews", icon: "reviews", roles: CONTENT_ROLES, workshopOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/activity", label: "Activity", icon: "activity", roles: SETTINGS_ROLES },
      { href: "/admin/account", label: "Account", icon: "account", roles: DASHBOARD_ROLES },
    ],
  },
];

/** Navigation for one staff member: filtered by role (server-side) and the workshop flag. */
export function navFor(role: Role, workshopFeatures: boolean): NavGroup[] {
  return GROUPS.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => i.roles.includes(role) && (workshopFeatures || !i.workshopOnly))
      .map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((g) => g.items.length > 0);
}
