import { notFound } from "next/navigation";

// Throws on purpose so the branded 500 page can be tested and screenshotted (ENG-017).
// Returns 404 unless ENABLE_DEV_ROUTES=true, which is never set in production.
export const dynamic = "force-dynamic";

export default function ErrorPreview() {
  if (process.env.ENABLE_DEV_ROUTES !== "true") notFound();
  throw new Error("Intentional error to preview the 500 page.");
}
