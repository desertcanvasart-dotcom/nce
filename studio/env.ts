/** Project and dataset are public identifiers, not secrets. The dataset defaults to "development" on this machine. */
export const projectId = process.env.SANITY_STUDIO_PROJECT_ID || "auho5414";
export const dataset = process.env.SANITY_STUDIO_DATASET || "development";
