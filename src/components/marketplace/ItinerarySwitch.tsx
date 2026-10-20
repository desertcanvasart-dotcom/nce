"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./marketplace.module.css";

export type ItineraryPanel = { code: string; label: string; node: ReactNode };

/**
 * DATA-031: every itinerary is rendered on the server (so the page stays static); `?itinerary=CODE` picks the one shown.
 * The parameter is canonical to the vessel URL. Without JavaScript the default (shortest) itinerary shows, and the
 * links still work after a reload.
 */
export function ItinerarySwitch({ panels, defaultCode }: { panels: ItineraryPanel[]; defaultCode: string }) {
  return (
    <Suspense fallback={<Panels panels={panels} current={defaultCode} />}>
      <FromUrl panels={panels} defaultCode={defaultCode} />
    </Suspense>
  );
}

function FromUrl({ panels, defaultCode }: { panels: ItineraryPanel[]; defaultCode: string }) {
  const asked = useSearchParams().get("itinerary")?.toLowerCase();
  const current = panels.find((p) => p.code.toLowerCase() === asked)?.code ?? defaultCode;
  return <Panels panels={panels} current={current} />;
}

function Panels({ panels, current }: { panels: ItineraryPanel[]; current: string }) {
  return (
    <>
      {panels.length > 1 ? (
        <nav aria-label="Itineraries" className={styles.facets}>
          <ul>
            {panels.map((p) => (
              <li key={p.code}>
                {p.code === current ? (
                  <span aria-current="true">{p.label}</span>
                ) : (
                  <a href={`?itinerary=${encodeURIComponent(p.code)}#itinerary`}>{p.label}</a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {panels.map((p) => (
        <div key={p.code} hidden={p.code !== current}>
          {p.node}
        </div>
      ))}
    </>
  );
}
