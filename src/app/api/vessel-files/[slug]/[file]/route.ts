import { vesselFileUrl } from "@/server/marketplace/queries";

/**
 * Stable addresses for a public vessel's files (the storage bucket is private, BRAND-014, and its links expire):
 * `photo` is the main photo itself, cached by browsers and crawlers for og:image; `deck-plan` sends the visitor on to a
 * freshly signed download of the operator's original.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await params;
  if (file !== "photo" && file !== "deck-plan") return new Response("Not found", { status: 404 });
  const url = await vesselFileUrl(slug, file);
  if (!url) return new Response("Not found", { status: 404 });
  if (file === "deck-plan") return Response.redirect(url, 302);
  const res = await fetch(url);
  if (!res.ok || !res.body) return new Response("Not found", { status: 404 });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
