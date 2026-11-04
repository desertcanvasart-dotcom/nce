"use client";

import { Suspense, useState, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Heading } from "@/lib/marketplace/sailing-calendar";
import styles from "./marketplace.module.css";

export type ItineraryPanel = {
  code: string;
  /** "4 nights", in the page's language. */
  nights: string;
  /** "Luxor → Aswan". */
  route: string;
  /** "Mondays", or how it sails when it has no weekly day. */
  when: string;
  heading: Heading;
  node: ReactNode;
};

const ARROW = { south: "↓", north: "↑" } as const;

/**
 * DATA-031: every itinerary is rendered on the server (so the page stays static); `?itinerary=CODE` picks the one shown.
 * The parameter is canonical to the vessel URL. Choosing another itinerary swaps it in place and updates the address,
 * so the choice can be shared. Without JavaScript the default (shortest) itinerary shows, and the links still work.
 */
export function ItinerarySwitch({
  panels,
  defaultCode,
  label,
}: {
  panels: ItineraryPanel[];
  defaultCode: string;
  /** "Choose your cruise", in the page's language. */
  label: string;
}) {
  return (
    <Suspense fallback={<Panels panels={panels} initial={defaultCode} label={label} />}>
      <FromUrl panels={panels} defaultCode={defaultCode} label={label} />
    </Suspense>
  );
}

function FromUrl({ panels, defaultCode, label }: { panels: ItineraryPanel[]; defaultCode: string; label: string }) {
  const asked = useSearchParams().get("itinerary")?.toLowerCase();
  const initial = panels.find((p) => p.code.toLowerCase() === asked)?.code ?? defaultCode;
  return <Panels key={initial} panels={panels} initial={initial} label={label} />;
}

function Panels({ panels, initial, label }: { panels: ItineraryPanel[]; initial: string; label: string }) {
  const [current, setCurrent] = useState(initial);
  const pick = (e: MouseEvent<HTMLAnchorElement>, code: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setCurrent(code);
    const url = new URL(window.location.href);
    url.searchParams.set("itinerary", code);
    url.hash = "itinerary";
    window.history.replaceState(window.history.state, "", url);
  };
  return (
    <>
      {panels.length > 1 ? (
        <nav aria-label={label} className={styles.lengths}>
          <p className={styles.lengthsTitle}>{label}</p>
          <ul>
            {panels.map((p) => (
              <li key={p.code}>
                <a
                  href={`?itinerary=${encodeURIComponent(p.code)}#itinerary`}
                  aria-current={p.code === current ? "true" : undefined}
                  onClick={(e) => pick(e, p.code)}
                >
                  <strong>{p.nights}</strong>
                  <span>
                    {p.heading ? (
                      <span className={styles[p.heading]} aria-hidden="true">
                        {ARROW[p.heading]}{" "}
                      </span>
                    ) : null}
                    {p.route}
                  </span>
                  <small>{p.when}</small>
                </a>
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
