import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Notice, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { BEST_FOR, CATEGORIES, VESSEL_TYPE_LABEL } from "@/lib/catalogue/categories";
import { VERDICTS } from "@/lib/evaluation/method";
import { requireAdmin } from "@/server/auth";
import { approvedOperators, vesselForEditor } from "@/server/catalogue/queries";
import { isUuid } from "../../../sections";
import {
  addExternalRating,
  addSafety,
  deleteExternalRating,
  deletePhoto,
  saveDescriptions,
  saveDetails,
  savePhoto,
  setSafetyStatus,
  setVisibility,
  uploadPhoto,
} from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

const VIS = { private: "Private draft", showcase: "Showcase", published: "Published" } as const;
const SAFETY = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
] as const;
const verdictLabel = (v: string) => VERDICTS.find((x) => x.value === v)?.label ?? v;

/** DASH-ADM-013–019, 026–034: the vessel editor. */
export default async function VesselEditor({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireAdmin(["catalogue", "content", "finance"], `/dashboard/admin/catalogue/${id}/`);
  const [v, operators] = await Promise.all([vesselForEditor(id), approvedOperators()]);
  if (!v) notFound();
  const { saved } = await searchParams;
  const canEdit = session.adminRole === "super" || session.adminRole === "catalogue";
  const canText = canEdit || session.adminRole === "content";
  const desc = (l: string) => v.vessel_translations.find((t) => t.locale === l)?.description ?? "";
  const alt = (m: (typeof v.media)[number], l: string) => m.media_translations.find((t) => t.locale === l)?.alt ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const priv = v.vessel_private;

  return (
    <>
      <p>
        <Link href="/dashboard/admin/catalogue/">← Catalogue</Link>
      </p>
      <h1 className={ui.pageTitle}>{v.name}</h1>
      <p className={ui.actions}>
        <Badge>{VESSEL_TYPE_LABEL[v.type]}</Badge>
        <Badge tone={v.visibility === "private" ? "neutral" : "success"}>{VIS[v.visibility]}</Badge>
        {v.is_sample ? <Badge tone="accent">Sample data</Badge> : null}
        {!canEdit ? (
          <span className={ui.muted}>
            {canText ? "You can edit descriptions and photo descriptions." : "Read only for your role."}
          </span>
        ) : null}
      </p>
      {saved === "evaluation" ? <Notice tone="success">Evaluation saved.</Notice> : null}

      <Section title="Readiness and visibility" id="readiness">
        <p>
          <strong>Visibility now: {VIS[v.visibility]}</strong>
        </p>
        <p className={ui.muted}>
          {v.readiness.complete
            ? "Everything needed for publication is in place."
            : `${v.readiness.missing} item${v.readiness.missing === 1 ? "" : "s"} missing before this vessel can be published.`}
        </p>
        <ul className={ui.list}>
          {v.readiness.items.map((i) => (
            <li key={i.key}>
              {i.done ? "✓" : "✗"} {i.label}
              {!i.done && i.later ? <span className={ui.muted}> (built in Batch {i.later})</span> : null}
            </li>
          ))}
        </ul>
        {v.visibility === "showcase" ? (
          <Notice>
            Showcased until {v.showcase_until}: {v.showcase_reason}. Shown with “Details in preparation · sample”, never bookable.
          </Notice>
        ) : null}
        {canEdit ? (
          <div className={ui.grid}>
            <ActionForm action={setVisibility.bind(null, id)} submit="Publish" variant="outline">
              <input type="hidden" name="mode" value="published" />
              <p className={ui.hint}>Only when the readiness check is complete.</p>
            </ActionForm>
            <ActionForm action={setVisibility.bind(null, id)} submit="Showcase while incomplete" variant="outline">
              <input type="hidden" name="mode" value="showcase" />
              <Input label="Show until" name="showcase_until" type="date" min={today} required defaultValue={v.showcase_until} />
              <Input
                label="Reason"
                name="showcase_reason"
                required
                maxLength={300}
                defaultValue={v.showcase_reason}
                hint="Why this vessel is shown before it is complete."
              />
            </ActionForm>
            {v.visibility !== "private" ? (
              <ActionForm action={setVisibility.bind(null, id)} submit="Make private" variant="ghost">
                <input type="hidden" name="mode" value="private" />
              </ActionForm>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section title="Details" id="details">
        {canEdit ? (
          <ActionForm action={saveDetails.bind(null, id)} submit="Save details">
            <div className={ui.grid}>
              <Input label="Name" name="name" required maxLength={120} defaultValue={v.name} />
              <Select
                label="Type"
                name="type"
                required
                defaultValue={v.type}
                options={Object.entries(VESSEL_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
              />
              <Select
                label="Category"
                name="category"
                placeholder="Not set"
                defaultValue={v.category}
                options={CATEGORIES}
                hint="Set by Nilecruz, not calculated from the score."
              />
              <Input label="Route" name="route_text" maxLength={200} defaultValue={v.route_text} />
              <Input label="Cabins" name="cabin_count" inputMode="numeric" defaultValue={v.cabin_count} />
              <Input label="Guests" name="max_guests" inputMode="numeric" defaultValue={v.max_guests} />
              <Input label="Decks" name="deck_count" inputMode="numeric" defaultValue={v.deck_count} />
              <Input label="Year built" name="year_built" inputMode="numeric" defaultValue={v.year_built} />
              <Select
                label="Operator"
                name="operator_org_id"
                placeholder="No operator"
                defaultValue={v.operator_org_id}
                options={operators.map((o) => ({ value: o.id, label: o.display_name }))}
                hint="Only approved operators are listed."
              />
            </div>
            <Checkboxes
              legend="Best for"
              name="best_for"
              options={BEST_FOR}
              checked={v.best_for}
              hint="Editorial labels chosen by Nilecruz; never derived from scores."
            />
          </ActionForm>
        ) : (
          <dl className={ui.grid}>
            <div>
              <dt className={ui.label}>Category</dt>
              <dd>{CATEGORIES.find((c) => c.value === v.category)?.label ?? "Not set"}</dd>
            </div>
            <div>
              <dt className={ui.label}>Route</dt>
              <dd>{v.route_text ?? "—"}</dd>
            </div>
            <div>
              <dt className={ui.label}>Cabins · guests</dt>
              <dd>
                {v.cabin_count ?? "—"} · {v.max_guests ?? "—"}
              </dd>
            </div>
            <div>
              <dt className={ui.label}>Operator</dt>
              <dd>{v.operator?.display_name ?? "None"}</dd>
            </div>
          </dl>
        )}
      </Section>

      <Section title="Description" id="description">
        {canText ? (
          <ActionForm action={saveDescriptions.bind(null, id)} submit="Save descriptions">
            <TextArea label="English" name="description_en" lang="en" maxLength={4000} defaultValue={desc("en")} required />
            <TextArea
              label="Spanish"
              name="description_es"
              lang="es"
              maxLength={4000}
              defaultValue={desc("es")}
              hint="Optional. Empty shows the English text."
            />
            <TextArea
              label="Japanese"
              name="description_ja"
              lang="ja"
              maxLength={4000}
              defaultValue={desc("ja")}
              hint="Optional. Empty shows the English text."
            />
          </ActionForm>
        ) : (
          <p>{desc("en") || <span className={ui.muted}>No description yet.</span>}</p>
        )}
      </Section>

      <Section title="Photos" id="photos">
        {v.media.length ? (
          <ul className={ui.thumbs}>
            {v.media.map((m) => (
              <li key={m.id} className={ui.thumb}>
                {m.url ? (
                  <Image src={m.url} alt={alt(m, "en")} width={m.width} height={m.height} sizes="12rem" unoptimized />
                ) : (
                  <span className={ui.muted}>Preview unavailable</span>
                )}
                {canText ? (
                  <ActionForm action={savePhoto.bind(null, id, m.id)} submit="Save photo details" variant="outline">
                    <Input label="Description (English)" name="alt_en" required maxLength={300} defaultValue={alt(m, "en")} />
                    <Input label="Spanish" name="alt_es" maxLength={300} defaultValue={alt(m, "es")} />
                    <Input label="Japanese" name="alt_ja" maxLength={300} defaultValue={alt(m, "ja")} />
                    <Input label="Credit" name="credit" required maxLength={200} defaultValue={m.credit} />
                    <Input label="Order" name="sort_order" inputMode="numeric" defaultValue={m.sort_order} />
                  </ActionForm>
                ) : (
                  <span>{alt(m, "en")}</span>
                )}
                {canEdit ? <ActionForm action={deletePhoto.bind(null, id, m.id)} submit="Remove photo" variant="ghost" /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No photos yet. Without one, the site shows the vessel-type illustration.</p>
        )}
        {canEdit ? (
          <ActionForm
            action={uploadPhoto.bind(null, id)}
            submit="Upload photo"
            resetOnSuccess
            variant="outline"
            encType="multipart/form-data"
          >
            <div className={ui.field}>
              <label className={ui.label} htmlFor="photo">
                Photo (JPEG, PNG, WebP or AVIF, up to 15 MB)
              </label>
              <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
            </div>
            <Input
              label="Description for screen readers (English)"
              name="alt_en"
              required
              maxLength={300}
              hint="What the photo shows, in one sentence."
            />
            <Input label="Spanish" name="alt_es" maxLength={300} />
            <Input label="Japanese" name="alt_ja" maxLength={300} />
            <Input label="Credit" name="credit" required maxLength={200} hint="Photographer or source, as the licence asks." />
            <Checkboxes
              legend="Rights"
              name="rights"
              options={[{ value: "yes", label: "Nilecruz has the right to publish this photo" }]}
              checked={[]}
            />
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Evaluations" id="evaluations">
        {v.evaluations.length ? (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className="visually-hidden">Evaluations of {v.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Assessed</th>
                  <th scope="col">Evaluator</th>
                  <th scope="col">Verdict</th>
                  <th scope="col" className={ui.num}>
                    Score
                  </th>
                  <th scope="col">Published</th>
                </tr>
              </thead>
              <tbody>
                {[...v.evaluations]
                  .sort((a, b) => b.assessed_on.localeCompare(a.assessed_on))
                  .map((e) => (
                    <tr key={e.id}>
                      <td>
                        {canEdit ? (
                          <Link href={`/dashboard/admin/catalogue/${id}/evaluations/${e.id}/`}>{e.assessed_on}</Link>
                        ) : (
                          e.assessed_on
                        )}
                      </td>
                      <td>{e.evaluator}</td>
                      <td>{verdictLabel(e.verdict)}</td>
                      <td className={ui.num}>{Number(e.overall_score).toFixed(2)} / 100</td>
                      <td>{e.published ? "Yes" : "No (internal)"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No evaluations yet.</p>
        )}
        {canEdit ? (
          <p>
            <Link href={`/dashboard/admin/catalogue/${id}/evaluations/new/`}>Add an evaluation</Link>
          </p>
        ) : null}
      </Section>

      <Section title="External ratings" id="ratings">
        <p className={ui.muted}>
          Other websites’ ratings, entered by hand with their source and date. Never mixed into the Nilecruz score.
        </p>
        {v.external_ratings.length ? (
          <ul className={ui.list}>
            {v.external_ratings.map((r) => (
              <li key={r.id}>
                {r.source_name}: {Number(r.rating)} / {Number(r.scale)}
                {r.review_count != null ? ` from ${r.review_count} reviews` : ""}, read {r.retrieved_on}
                {r.url ? (
                  <>
                    {" "}
                    · <a href={r.url}>source</a>
                  </>
                ) : null}
                {canEdit ? (
                  <ActionForm action={deleteExternalRating.bind(null, id, r.id)} submit="Remove" variant="ghost" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {canEdit ? (
          <ActionForm action={addExternalRating.bind(null, id)} submit="Add external rating" resetOnSuccess variant="outline">
            <div className={ui.grid}>
              <Input label="Source" name="source_name" required maxLength={120} />
              <Input label="Rating" name="rating" inputMode="decimal" required />
              <Input label="Out of" name="scale" inputMode="decimal" required defaultValue="5" />
              <Input label="Number of reviews" name="review_count" inputMode="numeric" />
              <Input label="Link" name="url" type="url" inputMode="url" />
              <Input label="Date read" name="retrieved_on" type="date" required max={today} />
            </div>
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Safety observations (internal)" id="safety">
        <p className={ui.muted}>Never public and never part of the score.</p>
        {v.safety_observations.length ? (
          <ul className={ui.list}>
            {v.safety_observations.map((o) => (
              <li key={o.id}>
                <strong>{o.observed_on}</strong> · {SAFETY.find((s) => s.value === o.status)?.label}: {o.notes}
                {canEdit ? (
                  <ActionForm action={setSafetyStatus.bind(null, id, o.id)} submit="Update status" variant="ghost">
                    <Select label="Status" name="status" defaultValue={o.status} options={SAFETY} />
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {canEdit ? (
          <ActionForm action={addSafety.bind(null, id)} submit="Record observation" resetOnSuccess variant="outline">
            <div className={ui.grid}>
              <Input label="Date observed" name="observed_on" type="date" required max={today} />
              <Select label="Status" name="status" defaultValue="open" options={SAFETY} />
            </div>
            <TextArea label="Notes" name="notes" required maxLength={4000} />
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Source and verification (private)" id="private">
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Address name</dt>
            <dd>{v.slug}</dd>
          </div>
          <div>
            <dt className={ui.label}>Source reference</dt>
            <dd>{v.source_ref ?? "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Aliases</dt>
            <dd>{priv?.aliases?.length ? priv.aliases.join(", ") : "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Operator named by the source</dt>
            <dd>{priv?.claimed_operator_name ?? "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Rating in the source</dt>
            <dd>{priv?.raw_class_rating ?? "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Last changed</dt>
            <dd>
              <CairoTime value={v.updated_at} />
            </dd>
          </div>
        </dl>
        {priv?.verification_note ? <p>{priv.verification_note}</p> : null}
        {priv?.source_urls?.length ? (
          <ul className={ui.list}>
            {priv.source_urls.map((u) => (
              <li key={u}>
                <a href={u} rel="noreferrer">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
    </>
  );
}
