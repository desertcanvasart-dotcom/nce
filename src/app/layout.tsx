import type { ReactNode } from "react";

// The real root layout is app/[locale]/layout.tsx. This passthrough exists so that
// app/not-found.tsx can render for paths outside any locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
