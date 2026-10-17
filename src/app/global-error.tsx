"use client";

import "@/styles/global.css";

// Last-resort boundary when the root layout itself fails. Kept in English and dependency-free.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <main style={{ padding: "var(--space-8) var(--space-4)", maxWidth: "var(--container)", margin: "0 auto" }}>
          <h1 className="display-l">Something went wrong on our side</h1>
          <p className="body-l">Please try again in a moment.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
