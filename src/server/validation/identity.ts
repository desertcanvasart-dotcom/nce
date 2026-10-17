import { z } from "zod";
import { locale, optionalText, trimmed, uuid } from "./common";

export const platformRole = z.enum(["customer", "admin"]);
export const adminRole = z.enum(["super", "catalogue", "finance", "content"]);
export const orgKind = z.enum(["operator", "partner", "nilecruz"]);
export const orgStatus = z.enum(["applied", "approved", "paused", "rejected"]);
export const teamRole = z.enum(["owner", "reservations", "finance", "viewer"]);

/** What a person may change on their own profile. Roles are excluded on purpose. */
export const profileSelfUpdate = z.object({ full_name: optionalText(120), locale: locale.optional() }).strict();

export const profileRoleChange = z
  .object({ user_id: uuid, platform_role: platformRole, admin_role: adminRole.nullable() })
  .refine((v) => v.admin_role === null || v.platform_role === "admin", {
    message: "Only admins have an admin role.",
    path: ["admin_role"],
  });

export const organisationCreate = z.object({
  kind: orgKind,
  display_name: trimmed(120),
  legal_name: optionalText(200),
});

export const membershipUpsert = z.object({ org_id: uuid, user_id: uuid, team_role: teamRole });
