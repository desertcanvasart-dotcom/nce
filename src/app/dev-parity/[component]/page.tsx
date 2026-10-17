import { notFound } from "next/navigation";
import { findEntry } from "@/components/ds/registry";

export const dynamic = "force-dynamic";

/** Renders a component's parity story alone, for comparison with its preview.html (ENG-009). */
export default async function ParityPage({ params }: { params: Promise<{ component: string }> }) {
  if (process.env.ENABLE_DEV_ROUTES !== "true") notFound();
  const entry = findEntry((await params).component);
  const story = entry?.stories.find((s) => s.parity);
  if (!entry || !story) notFound();
  return (
    // Same padding as each preview.html: none for Hero and NavBar, 24px for Scene, 32px otherwise.
    <div
      id="parity-root"
      style={{ padding: entry.name === "Hero" || entry.name === "NavBar" ? 0 : entry.name === "Scene" ? 24 : 32 }}
    >
      {story.render()}
    </div>
  );
}
