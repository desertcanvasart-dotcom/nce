"""SEO-008–014: turn the silo workbook into the committed link map the site and its CI link check read.

    /usr/local/bin/python3 -I scripts/link-map.py ../nce/nilecrz-site-silo.xlsx

Writes src/lib/seo/link-map.json: one entry per row of "Silo map", keyed by URL, with the row's id, silo, level, parent,
H1, page type, primary keyword, phase, and its links (up, down, across, bridges) as URLs. The workbook stays outside the
repository; the JSON is the reviewed copy CI checks against. Felucca rows are dropped (ADR-008, ADR-096).
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

src = Path(sys.argv[1] if len(sys.argv) > 1 else "../nce/nilecrz-site-silo.xlsx")
out = Path(__file__).resolve().parent.parent / "src/lib/seo/link-map.json"
URL = re.compile(r"/[a-z0-9\-/]*")
DROPPED = re.compile(r"felucca")  # ADR-008: felucca removed from the site


def urls(text):
    return [u for u in URL.findall(text or "") if not DROPPED.search(u)]


def section(text, name):
    """'Up: a | Down: b · c | Across: d' → the URLs after `name`."""
    for part in (text or "").split("|"):
        head, _, rest = part.partition(":")
        if head.strip().lower() == name:
            return urls(rest)
    return []


wb = openpyxl.load_workbook(src, read_only=True)
rows = list(wb["Silo map"].iter_rows(values_only=True))
head = rows[0]
col = {h: i for i, h in enumerate(head)}
pages = {}
for r in rows[1:]:
    if not r[col["ID"]] or not r[col["URL"]]:
        continue
    url = r[col["URL"]].strip()
    if DROPPED.search(url):
        continue
    same = r[col["Internal links (same silo)"]] or ""
    parent = (r[col["Parent URL"]] or "").strip()
    pages[url] = {
        "id": r[col["ID"]],
        "silo": r[col["Silo"]],
        "level": r[col["Level"]],
        "parent": parent if parent.startswith("/") else None,
        "h1": r[col["Page H1"]],
        "type": r[col["Page type"]],
        "keyword": r[col["Primary keyword"]],
        "phase": r[col["Phase"]],
        "down": section(same, "down"),
        "across": section(same, "across"),
        "bridges": urls(r[col["Bridge links (other silos)"]]),
        "schema": [s.strip() for s in (r[col["Schema"]] or "").split("·") if s.strip()],
    }

out.write_text(json.dumps(pages, indent=1, ensure_ascii=False) + "\n")
print(f"{len(pages)} pages → {out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out}")
