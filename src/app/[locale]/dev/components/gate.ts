import { notFound } from "next/navigation";

/** The gallery exists only where ENABLE_DEV_ROUTES=true (local, staging); never in production (ENG-007). */
export function requireDevRoutes() {
  if (process.env.ENABLE_DEV_ROUTES !== "true") notFound();
}
