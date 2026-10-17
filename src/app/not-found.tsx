import Link from "next/link";
import "@/styles/global.css";

// Fallback for requests that never reach a locale (rare). Localised 404s live in app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="en" data-theme="light">
      <body>
        <main style={{ padding: "var(--space-8) var(--space-4)", maxWidth: "var(--container)", margin: "0 auto" }}>
          <h1 className="display-l">We can&apos;t find that page</h1>
          <p className="body-l">
            The address may be mistyped, or the page may have moved. <Link href="/">Go to the home page</Link>.
          </p>
        </main>
      </body>
    </html>
  );
}
