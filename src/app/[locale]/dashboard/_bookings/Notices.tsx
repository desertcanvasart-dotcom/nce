import Link from "next/link";
import { ActionForm, type FormAction } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import type { notices } from "@/server/bookings/queries";

/** In-dashboard notices (ADR-088): new requests, offers, updates and reservations. Email comes later. */
export function Notices({ items, markRead }: { items: Awaited<ReturnType<typeof notices>>; markRead: FormAction }) {
  const unread = items.filter((n) => !n.read_at);
  return (
    <Section title={unread.length ? `Notices (${unread.length} new)` : "Notices"} id="notices">
      {items.length ? (
        <ul className={ui.list}>
          {items.map((n) => (
            <li key={n.id}>
              {n.read_at ? null : <strong>New: </strong>}
              {n.link ? <Link href={n.link}>{n.title}</Link> : n.title} · <CairoTime value={n.created_at} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No notices.</p>
      )}
      {unread.length ? <ActionForm action={markRead} submit="Mark all as read" variant="ghost" /> : null}
    </Section>
  );
}
