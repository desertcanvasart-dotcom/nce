"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { allowAnonymous } from "@/server/auth";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { answerFromLink } from "@/server/requests/reply";
import { rateLimit, tooMany } from "@/server/security/rate-limit";

/** ADR-099: the one button on a signed link's page. The link is the permission; nobody signs in. */
const STATUS_TEXT: Record<string, string> = {
  confirmed: "Confirmed. The customer is asked to pay, and you'll see the booking in your dashboard.",
  declined: "Declined. We've marked those cabins as full and will offer the customer other dates.",
  held: "Held for 72 hours. Confirm or decline before then, or the cabins are released.",
  alternative_offered: "Sent. The customer chooses, and you'll hear when they book.",
};

export async function answerLink(
  token: string,
  via: "email" | "whatsapp",
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  allowAnonymous();
  // The Japanese page's answers in Japanese; every other language reads the English, as before.
  const t = fd.get("locale") === "ja" ? await getTranslations({ locale: "ja", namespace: "operatorReply" }) : null;
  const limit = await rateLimit("operator-reply");
  if (!limit.ok)
    return failed(t ? t("errors.tooMany", { n: Math.max(1, Math.ceil(limit.retryAfter / 60)) }) : tooMany(limit.retryAfter));
  const f = formObject(fd);
  let alt: { departure_id?: string; cabin_type_id?: string; cabins: number; note?: string } | undefined;
  if (token.split("~")[1] === "other") {
    const r = z
      .object({
        departure_id: z.uuid().optional(),
        cabin_type_id: z.uuid().optional(),
        cabins: z.coerce.number().int().min(1).max(5),
        note: z.string().trim().max(500).optional(),
      })
      .safeParse({
        departure_id: f.departure_id || undefined,
        cabin_type_id: f.cabin_type_id || undefined,
        cabins: f.cabins,
        note: f.note || undefined,
      });
    if (!r.success) return failed(t ? t("errors.choose") : "Choose another date or cabin type, and how many cabins (1 to 5).");
    if (!r.data.departure_id && !r.data.cabin_type_id)
      return failed(t ? t("errors.chooseOne") : "Choose another date or another cabin type.");
    alt = r.data;
  }
  const out = await answerFromLink(token, via, alt);
  if (!out.ok) return failed(t ? t("errors.failed") : out.message);
  if (!out.changed) return saved(t ? t("result.already") : "This request was already answered. Nothing changed.");
  if (t) return saved(t(`result.${out.status in STATUS_TEXT ? out.status : "done"}` as never));
  return saved(STATUS_TEXT[out.status] ?? "Done.");
}
