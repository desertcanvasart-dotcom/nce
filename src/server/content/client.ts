import "server-only";
import { createClient, type QueryParams } from "@sanity/client";
import { serverEnv } from "@/server/env";

/**
 * Editorial content (Sanity), read on the server only (CLAUDE.md §6 server-first).
 * Both datasets are private, so every read carries the server-only read token.
 */
export class ContentNotConfiguredError extends Error {
  constructor() {
    super("Sanity is not configured: set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and SANITY_API_READ_TOKEN.");
  }
}

export const SANITY_API_VERSION = "2026-10-01";

export function getContentClient() {
  const {
    NEXT_PUBLIC_SANITY_PROJECT_ID: projectId,
    NEXT_PUBLIC_SANITY_DATASET: dataset,
    SANITY_API_READ_TOKEN: token,
  } = serverEnv;
  if (!projectId || !dataset || !token) throw new ContentNotConfiguredError();
  return createClient({ projectId, dataset, token, apiVersion: SANITY_API_VERSION, useCdn: false, perspective: "published" });
}

export async function fetchContent<T>(query: string, params: QueryParams = {}): Promise<T> {
  return getContentClient().fetch<T>(query, params);
}
