import "server-only";
import { serverEnv } from "@/server/env";

/** DASH-BND-007: email is sent only with a sender configured; without one, admins see it on every page. */
export const emailConfigured = () => !!serverEnv.RESEND_API_KEY && !!serverEnv.EMAIL_FROM;
