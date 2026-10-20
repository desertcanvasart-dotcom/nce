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
  // ADR-020, ADR-089: Stripe test mode outside production. Without the key, card payments say they're off.
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/)
    .optional(),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .regex(/^whsec_/)
    .optional(),
  // ADR-099: signs the one-tap links in booking-request messages. Without it, no request message is sent.
  ACTION_LINK_SECRET: z.string().min(32).optional(),
  // ADR-099 (Faris, 21 Oct: Resend): transactional email. Without the key, messages are recorded as skipped.
  RESEND_API_KEY: z.string().regex(/^re_/).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  // Where alerts go when an operator hasn't answered in twice its reply time.
  ADMIN_ALERT_EMAIL: z.email().optional(),
  // WhatsApp Cloud API, off until Meta approves the templates (docs/whatsapp-templates.md).
  WHATSAPP_ENABLED: z.enum(["true", "false"]).optional(),
  WHATSAPP_TOKEN: z.string().min(20).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/).optional(),
  WHATSAPP_APP_SECRET: z.string().min(16).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(16).optional(),
});

export const serverEnv = schema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || undefined,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET || undefined,
  SANITY_API_READ_TOKEN: process.env.SANITY_API_READ_TOKEN || undefined,
  FEED_PULL_SECRET: process.env.FEED_PULL_SECRET || undefined,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
  ACTION_LINK_SECRET: process.env.ACTION_LINK_SECRET || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL || undefined,
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED || undefined,
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || undefined,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || undefined,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || undefined,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || undefined,
});
