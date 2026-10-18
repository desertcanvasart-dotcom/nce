import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { Section, Select, ui } from "@/components/dashboard/ui";
import { CATEGORIES, VESSEL_TYPE_LABEL } from "@/lib/catalogue/categories";
import { requireAdmin } from "@/server/auth";
import { listVessels } from "@/server/catalogue/queries";

type Props = { searchParams: Promise<{ q?: string; type?: string; visibility?: string; ready?: string; page?: string }> };

const VIS = { private: "Private draft", showcase: "Showcase", published: "Published" } as const;
const category = (c: string | null) => CATEGORIES.find((x) => x.value === c)?.label ?? "—";

/** DASH-ADM-010–012: the vessel directory. */
export default async function CataloguePage({ searchParams }: Props) {
  const session = await requireAdmin(["catalogue", "content", "finance"], "/dashboard/admin/catalogue/");
  const sp = await searchParams;
  const ready = sp.ready === "complete" || sp.ready === "incomplete" ? sp.ready : undefined;
  const list = await listVessels({ q: sp.q, type: sp.type, visibility: sp.visibility, ready, page: Number(sp.page) || 1 });
  const canCreate = session.adminRole === "super" || session.adminRole === "catalogue";
  const qs = (page: number) => {
    const p = new URLSearchParams(Object.entries({ ...sp, page: String(page) }).filter(([, v]) => !!v) as [string, string][]);
    return `?${p.toString()}`;
  };

  return (
    <>
      <h1 className={ui.pageTitle}>Catalogue</h1>
      {canCreate ? (
        <p className={ui.actions}>
          <Link href="/dashboard/admin/catalogue/new/">Add a vessel</Link>
          <Link href="/dashboard/admin/catalogue/import/">Import from CSV</Link>
        </p>
      ) : null}

      <form method="get" className={ui.grid} role="search" aria-label="Filter vessels">
        <div className={ui.field}>
          <label className={ui.label} htmlFor="q">
            Name or alias
          </label>
          <input id="q" name="q" className={ui.input} defaultValue={sp.q ?? ""} type="search" />
        </div>
        <Select
          label="Type"
          name="type"
          placeholder="All types"
          defaultValue={sp.type}
          options={Object.entries(VESSEL_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <Select
          label="Visibility"
          name="visibility"
          placeholder="All"
          defaultValue={sp.visibility}
          options={Object.entries(VIS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          label="Readiness"
          name="ready"
          placeholder="All"
          defaultValue={ready}
          options={[
            { value: "incomplete", label: "Incomplete" },
            { value: "complete", label: "Complete" },
          ]}
        />
        <div className={ui.filterSubmit}>
          <Button type="submit">Filter</Button>
        </div>
      </form>

      <Section title={`${list.total} vessel${list.total === 1 ? "" : "s"}`} id="results">
        <div className={ui.tableWrap}>
          <table className={`${ui.table} ${ui.stack}`}>
            <caption className="visually-hidden">Vessels in the catalogue</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Category</th>
                <th scope="col">Visibility</th>
                <th scope="col">Operator</th>
                <th scope="col">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((v) => (
                <tr key={v.id}>
                  <td data-label="Name">
                    <Link href={`/dashboard/admin/catalogue/${v.id}/`}>{v.name}</Link>
                    {v.is_sample ? (
                      <>
                        {" "}
                        <Badge tone="accent">Sample data</Badge>
                      </>
                    ) : null}
                  </td>
                  <td data-label="Type">{VESSEL_TYPE_LABEL[v.type]}</td>
                  <td data-label="Category">{category(v.category)}</td>
                  <td data-label="Visibility">{VIS[v.visibility]}</td>
                  <td data-label="Operator">{v.operator?.display_name ?? <span className={ui.muted}>None</span>}</td>
                  <td data-label="Readiness">
                    {v.readiness.complete ? (
                      <Badge tone="success">Complete</Badge>
                    ) : (
                      <span
                        title={v.readiness.items
                          .filter((i) => !i.done)
                          .map((i) => i.label)
                          .join(", ")}
                      >
                        <Badge tone="danger">Incomplete</Badge> {v.readiness.missing} missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.pages > 1 ? (
          <nav className={ui.pager} aria-label="Pages">
            {list.page > 1 ? <Link href={qs(list.page - 1)}>Previous</Link> : null}
            <span>
              Page {list.page} of {list.pages}
            </span>
            {list.page < list.pages ? <Link href={qs(list.page + 1)}>Next</Link> : null}
          </nav>
        ) : null}
      </Section>
    </>
  );
}
