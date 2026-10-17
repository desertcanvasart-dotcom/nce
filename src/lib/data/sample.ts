/**
 * DATA-006: carry the database's is_sample flag to the components' `sample` prop,
 * so a seeded record can never render without its "Sample data" flag.
 */
export function withSample<T extends { is_sample: boolean }>(row: T): Omit<T, "is_sample"> & { sample: boolean } {
  const { is_sample, ...rest } = row;
  return { ...rest, sample: is_sample };
}

/** A view that mixes records is sample data if any one of them is. */
export function anySample(rows: readonly { is_sample: boolean }[]): boolean {
  return rows.some((r) => r.is_sample);
}
