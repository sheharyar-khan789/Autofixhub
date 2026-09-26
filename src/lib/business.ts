import type { BusinessSettings } from "@/lib/models";

/**
 * Business facts CONFIRMED by the owner (launch finalisation, 2026-09-26).
 *
 * These fill gaps in `settings/{businessId}`: any value saved in the settings
 * document (via /admin/settings or the seed script) always takes precedence.
 *
 * Only confirmed facts belong here. NOT confirmed, so deliberately absent:
 * street address, postcode, phone/WhatsApp, opening hours, MOT status,
 * legal/company registration details, logo, other social accounts.
 * The owner's work experience with OnTrack (Manchester) is context only:
 * OnTrack is not AutoFixHub and must never be presented as this business.
 */
export const CONFIRMED_BUSINESS = {
  name: "AutoFixHub",
  email: "muhammadibrahimx53@gmail.com",
  /** Confirmed channel (the shared link's `si=` tracking parameter is dropped; same channel). */
  youtubeChannelUrl: "https://www.youtube.com/@muhammadibrahim-vw",
  locality: "Manchester",
  countryCode: "GB",
  experienceYears: 5,
  vehicleGroups: ["Volkswagen Group", "Toyota"],
  vehicles: ["Volkswagen Group diesel vehicles", "Toyota Prius Hybrid", "Toyota Corolla Hybrid"],
  technicalAreas: [
    "Gearbox",
    "Clutch",
    "DPF (diesel particulate filter)",
    "Turbo",
    "Injectors",
    "Oil leaks",
    "Timing belt",
    "Wiring faults",
    "Loom wiring",
    "Electrical diagnostics",
  ],
  /** Work-experience context ONLY. OnTrack is a separate company and not AutoFixHub. */
  workExperience: { company: "OnTrack", place: "Manchester, UK" },
} as const;

const EXPERIENCE_TEXT = [
  `${CONFIRMED_BUSINESS.experienceYears} years of hands-on experience working on Volkswagen Group and Toyota vehicles, with a focus on Volkswagen Group diesel models and the Toyota Prius Hybrid and Toyota Corolla Hybrid.`,
  "Work covers gearboxes and clutches, diesel particulate filters (DPF), turbochargers, injectors, oil leaks, timing belts, wiring faults and loom wiring, and electrical diagnostic work.",
].join("\n\n");

const WHY_CHOOSE_US: NonNullable<BusinessSettings["whyChooseUs"]> = [
  {
    title: "Volkswagen Group diesel",
    text: "Diagnosis and repair work on Volkswagen Group diesel vehicles, including DPF, turbo and injector faults.",
  },
  {
    title: "Toyota hybrid",
    text: "Hands-on work with the Toyota Prius Hybrid and the Toyota Corolla Hybrid.",
  },
  {
    title: `${CONFIRMED_BUSINESS.experienceYears} years' experience`,
    text: "Gearboxes, clutches, timing belts, oil leaks, and wiring and loom faults.",
  },
];

/** Settings with confirmed business facts filled in wherever the settings document is silent. */
export function withConfirmedBusiness(s: BusinessSettings | null): BusinessSettings {
  return {
    ...s,
    tradingName: s?.tradingName ?? CONFIRMED_BUSINESS.name,
    email: s?.email ?? CONFIRMED_BUSINESS.email,
    socialLinks: { ...s?.socialLinks, youtube: s?.socialLinks?.youtube ?? CONFIRMED_BUSINESS.youtubeChannelUrl },
    whyChooseUs: s?.whyChooseUs?.length ? s.whyChooseUs : WHY_CHOOSE_US,
    about: { ...s?.about, experience: s?.about?.experience ?? EXPERIENCE_TEXT },
  };
}
