import { z } from "zod";

/**
 * Environment is validated once, at startup (SEC-004 groundwork).
 * Only NEXT_PUBLIC_* values may reach the browser; secrets stay server-side (SEC-003).
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  // Indexing is off everywhere except production, so staging never reaches search engines.
  ALLOW_INDEXING: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_SUPABASE_URL: z.union([z.url(), z.literal("")]).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  ALLOW_INDEXING: process.env.ALLOW_INDEXING || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
export const indexingAllowed = env.ALLOW_INDEXING === "true";
