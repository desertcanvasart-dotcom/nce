import "server-only";
import { z } from "zod";

/** Server-only settings (SEC-003). Importing this file from browser code fails the build. */
const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
});

export const serverEnv = schema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
});
