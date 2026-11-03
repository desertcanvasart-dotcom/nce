"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ds/Icon/Icon";
import { Media } from "@/components/ds/Media/Media";
import { cx } from "@/components/ds/lib/cx";
import type { VesselPage } from "@/lib/marketplace/vessel";
import styles from "./VesselPhotos.module.css";

type Photo = VesselPage["photos"][number];
// Thumbnails under the lead photo; any more open from the last one ("+3").
const STRIP = 4;

/**
 * The vessel's photos, laid out for how many there are: one fills the width as a wide, cinematic frame; two sit side by
 * side; three or more give a lead photo over a strip. Any photo opens a full-screen viewer (arrow keys, Escape).
 * Without JavaScript the photos still show; only the viewer needs it. In the page's hero (`hero`) the lead photo is
 * taller and the strip always sits under it, beside the vessel's name and price.
 */
export function VesselPhotos({ photos, name, hero }: { photos: Photo[]; name: string; hero?: boolean }) {
  const t = useTranslations("vesselPage.hero");
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const n = photos.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  // Arrow keys move through the photos while the viewer is open; Escape closes it (the dialog's own behaviour).
  useEffect(() => {
    if (open === null || n < 2) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      setOpen((o) => (o === null ? o : (o + step + n) % n));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, n]);

  if (!n) return null;
  const go = (i: number) => setOpen((i + n) % n);
  const frame = (p: Photo, i: number, className: string | undefined, sizes: string, extra?: string) => (
    <button key={i} type="button" className={cx(styles.frame, className)} onClick={() => setOpen(i)}>
      <Media image={p} sizes={sizes} priority={i === 0} className={styles.media} />
      {extra ? (
        <span className={styles.more} aria-hidden="true">
          {extra}
        </span>
      ) : null}
    </button>
  );
  const strip = photos.slice(1, 1 + STRIP);
  const hidden = n - 1 - strip.length;

  return (
    <section className={cx(styles.photos, hero && styles.hero)} aria-label={t("photos", { name })}>
      {n === 2 && !hero ? (
        <div className={styles.pair}>
          {frame(photos[0]!, 0, styles.lead, "(min-width: 900px) 66vw, 100vw")}
          {frame(photos[1]!, 1, styles.side, "(min-width: 900px) 33vw, 100vw")}
        </div>
      ) : (
        frame(photos[0]!, 0, styles.lead, hero ? "(min-width: 1024px) 55vw, 100vw" : "100vw")
      )}
      {n > 2 || (hero && n > 1) ? (
        <div className={styles.strip}>
          {strip.map((p, j) =>
            frame(
              p,
              j + 1,
              styles.thumb,
              "(min-width: 900px) 25vw, 50vw",
              j === strip.length - 1 && hidden > 0 ? `+${hidden}` : undefined,
            ),
          )}
        </div>
      ) : null}
      <p className={styles.caption}>
        {photos[0]!.alt}
        {n > 1 ? <span> · {t("photoCount", { n })}</span> : null}
      </p>

      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-label={t("photoOf", { name, n: open === null ? 1 : open + 1, total: n })}
        onClose={() => setOpen(null)}
      >
        {open !== null ? (
          <>
            <figure className={styles.big}>
              <Media image={photos[open]!} sizes="100vw" className={styles.bigMedia} />
              <figcaption>
                {photos[open]!.alt}
                <span>
                  {open + 1} / {n}
                </span>
              </figcaption>
            </figure>
            <div className={styles.controls}>
              {n > 1 ? (
                <button type="button" onClick={() => go(open - 1)} aria-label={t("prevPhoto")}>
                  <Icon name="chevron-left" />
                </button>
              ) : null}
              {n > 1 ? (
                <button type="button" onClick={() => go(open + 1)} aria-label={t("nextPhoto")}>
                  <Icon name="chevron-right" />
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(null)} aria-label={t("closePhotos")}>
                <Icon name="close" />
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
}
