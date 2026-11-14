import { siteUrl } from "@/lib/env";
import { llmsTxt } from "@/lib/seo/llms";

/** A plain-text guide to the site for AI assistants (see src/lib/seo/llms.ts). */
export function GET() {
  return new Response(llmsTxt(siteUrl), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
