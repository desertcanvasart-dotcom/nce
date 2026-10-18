import "server-only";
import { z } from "zod";

/** Server-only settings (SEC-003). Importing this file from browser code fails the build. */
const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SANITY_PROJECT_ID: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .optional(),
  NEXT_PUBLIC_SANITY_DATASET: z.enum(["production", "development"]).optional(),
  SANITY_API_READ_TOKEN: z.string().min(20).optional(),
  // ADR-081: shared with Supabase Vault ("feed_pull_secret"); signs the scheduler's call to pull feeds.
  FEED_PULL_SECRET: z.string().min(32).optional(),
});

export const serverEnv = schema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || undefined,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET || undefined,
  SANITY_API_READ_TOKEN: process.env.SANITY_API_READ_TOKEN || undefined,
  FEED_PULL_SECRET: process.env.FEED_PULL_SECRET || undefined,
});
