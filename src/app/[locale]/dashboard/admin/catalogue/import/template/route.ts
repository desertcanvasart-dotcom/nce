import { CSV_TEMPLATE } from "@/lib/catalogue/csv";
import { requireAdmin } from "@/server/auth";

/** DASH-ADM-020: the CSV template, with one example row that the importer refuses. */
export async function GET() {
  await requireAdmin(["catalogue"], "/dashboard/admin/catalogue/import/");
  return new Response("﻿" + CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nilecruz-vessels-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
