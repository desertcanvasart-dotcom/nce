/**
 * DATA-025 (Batch 11): at launch nothing a visitor can see is sample data or a showcase exception (ADR-019). Takes
 * what the public key can read and lists each problem in words.
 */
export type PublicRows = {
  vessels: { slug: string; visibility: string; is_sample: boolean }[];
  tours: { slug: string; is_sample: boolean }[];
};

export function launchProblems({ vessels, tours }: PublicRows): string[] {
  return [
    ...vessels.filter((v) => v.is_sample).map((v) => `Vessel ${v.slug} is sample data and visitors can see it.`),
    ...vessels
      .filter((v) => !v.is_sample && v.visibility === "showcase")
      .map((v) => `Vessel ${v.slug} is still a showcase exception: publish it properly or make it private.`),
    ...tours.filter((t) => t.is_sample).map((t) => `Tour ${t.slug} is sample data and visitors can see it.`),
  ];
}
