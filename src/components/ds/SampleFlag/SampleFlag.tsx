import { useTranslations } from "next-intl";
import { Badge } from "../Badge/Badge";

/** Visible flag on anything showing seeded or illustrative figures (CLAUDE.md §6, DATA-006). */
export function SampleFlag() {
  const t = useTranslations("ds");
  return (
    <Badge tone="accent" icon="info">
      {t("sampleData")}
    </Badge>
  );
}
