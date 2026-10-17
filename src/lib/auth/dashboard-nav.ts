import type { AdminRole, TeamRole, Workspace } from "./workspaces";

/**
 * DASH-ROLE-006: each workspace's sections, named as in the Dashboard Guide, with the batch that builds them.
 * `roles` limits who sees a section (admin sub-roles or team roles); super admins and company owners see all,
 * and an empty list means owners (or super admins) only.
 * Sections not built yet render a "coming in a later release" page, never a broken link.
 */
export type NavItem = { slug: string; label: string; batch: string; roles?: (AdminRole | TeamRole)[] };

const ADMIN: NavItem[] = [
  { slug: "", label: "Overview", batch: "4b" },
  { slug: "catalogue", label: "Catalogue", batch: "4b", roles: ["catalogue"] },
  { slug: "evaluations", label: "Vessel evaluations", batch: "4b", roles: ["catalogue"] },
  { slug: "submissions", label: "Cruise submissions", batch: "4b", roles: ["catalogue"] },
  { slug: "operators", label: "Operators", batch: "4b", roles: ["catalogue"] },
  { slug: "sailings", label: "Cabins and sailings", batch: "4c", roles: ["catalogue"] },
  { slug: "promotions", label: "Promotions", batch: "4c", roles: ["catalogue"] },
  { slug: "tours", label: "Tours and sightseeing", batch: "4d", roles: ["catalogue", "content"] },
  { slug: "bookings", label: "Requests and bookings", batch: "4e", roles: ["finance"] },
  { slug: "finance", label: "Deposits and commission", batch: "4f", roles: ["finance"] },
  { slug: "partners", label: "Travel partners", batch: "4h", roles: ["catalogue"] },
];

const OPERATOR: NavItem[] = [
  { slug: "", label: "Overview", batch: "4c" },
  { slug: "cruises", label: "Cruises and submissions", batch: "4b", roles: ["reservations"] },
  { slug: "cabins", label: "Cabins and decks", batch: "4c", roles: ["reservations", "viewer"] },
  { slug: "schedules", label: "Routes, schedules and rates", batch: "4c", roles: ["reservations", "viewer"] },
  { slug: "promotions", label: "Promotions and upgrades", batch: "4c", roles: [] },
  { slug: "inventory", label: "Inventory connections", batch: "4c", roles: [] },
  { slug: "offers", label: "Requests and offers", batch: "4e", roles: ["reservations", "viewer"] },
  { slug: "bookings", label: "Bookings and payments", batch: "4e", roles: ["reservations", "finance", "viewer"] },
  { slug: "team", label: "Team", batch: "4b", roles: [] },
];

const PARTNER: NavItem[] = [
  { slug: "", label: "Overview", batch: "4h", roles: ["reservations", "finance"] },
  { slug: "search", label: "Search departures", batch: "4h", roles: ["reservations"] },
  { slug: "requests", label: "Requests and offers", batch: "4h", roles: ["reservations"] },
  { slug: "bookings", label: "Company bookings", batch: "4h", roles: ["reservations", "finance"] },
  { slug: "payments", label: "Payments", batch: "4h", roles: ["finance"] },
  { slug: "team", label: "Team", batch: "4h", roles: [] },
];

const JOURNEY: NavItem[] = [
  { slug: "", label: "My journey", batch: "4g" },
  { slug: "requests", label: "Cruise requests", batch: "4e" },
  { slug: "offers", label: "Offers", batch: "4e" },
  { slug: "reservations", label: "Reservations and payments", batch: "4f" },
  { slug: "tours", label: "Tours and sightseeing", batch: "4g" },
  { slug: "past", label: "Past trips", batch: "4g" },
];

function allowed(item: NavItem, role: AdminRole | TeamRole | null, top: AdminRole | TeamRole): boolean {
  if (!item.roles || role === top) return true;
  return role !== null && item.roles.includes(role);
}

export function navFor(w: Workspace): NavItem[] {
  switch (w.kind) {
    case "admin":
      return ADMIN.filter((i) => allowed(i, w.adminRole, "super"));
    case "operator":
      return OPERATOR.filter((i) => allowed(i, w.teamRole, "owner"));
    case "partner":
      return PARTNER.filter((i) => allowed(i, w.teamRole, "owner"));
    case "journey":
      return JOURNEY;
  }
}

/** The section for a URL slug if this person may see it; undefined means 404 (unknown) or 403 (not theirs). */
export function sectionAccess(w: Workspace, slug: string): "ok" | "forbidden" | "unknown" {
  const all = { admin: ADMIN, operator: OPERATOR, partner: PARTNER, journey: JOURNEY }[w.kind];
  if (!all.some((i) => i.slug === slug)) return "unknown";
  return navFor(w).some((i) => i.slug === slug) ? "ok" : "forbidden";
}

export const WORKSPACE_LABEL: Record<Workspace["kind"], string> = {
  admin: "Nilecruz admin",
  operator: "Operator",
  partner: "Travel partner",
  journey: "My journey",
};
