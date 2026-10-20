import type { EditorialPage } from "@/lib/content/editorial";
import P001 from "./P001.json";
import P026 from "./P026.json";
import P027 from "./P027.json";
import P030 from "./P030.json";
import P032 from "./P032.json";
import P033 from "./P033.json";
import P036 from "./P036.json";
import P041 from "./P041.json";
import P042 from "./P042.json";

/** The drafted pages in the repository (ADR-096): Sanity's seed, and the fallback where Sanity isn't configured. */
export const DRAFT_PAGES: Record<string, EditorialPage> = {
  P001: P001 as EditorialPage,
  P026: P026 as EditorialPage,
  P027: P027 as EditorialPage,
  P030: P030 as EditorialPage,
  P032: P032 as EditorialPage,
  P033: P033 as EditorialPage,
  P036: P036 as EditorialPage,
  P041: P041 as EditorialPage,
  P042: P042 as EditorialPage,
};
