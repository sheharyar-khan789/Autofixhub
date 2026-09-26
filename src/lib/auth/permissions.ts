import { ROLES, type Role } from "@/lib/models";

/**
 * Which roles may access each admin area. Checked server-side by every admin
 * page/layout (`requireRole`) and every server action that mutates data —
 * never enforced only in the UI. Keep in sync with `docs/design` if the role
 * model changes.
 */
export const DASHBOARD_ROLES: readonly Role[] = ROLES; // any signed-in staff member
export const BOOKINGS_ROLES: readonly Role[] = ["owner", "manager", "technician"];
export const CONTENT_ROLES: readonly Role[] = ["owner", "manager", "editor"];
export const SETTINGS_ROLES: readonly Role[] = ["owner", "manager"];
