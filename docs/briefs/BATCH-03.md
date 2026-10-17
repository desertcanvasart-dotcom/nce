# Batch 3 brief: Data foundation

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-03-data-foundation` (from `main`) · **Size:** M

**Goal:** the shared data foundation every later batch builds on:
- Supabase schema as version-controlled migrations;
- row-level security on every table, proven by tests;
- the identity and organisation model for all roles;
- vessels, destinations and media with translations;
- an append-only audit log;
- deterministic test fixtures for every role;
- the 609-vessel directory imported as **private drafts**;
- the Sanity content project with its base schemas.

No screens are built in this batch. Sign-in arrives in Batch 4a, and the dashboards in 4b onwards.

## Requirement IDs in scope (15)

- **Data:** DATA-001, 002, 005, 006, 013, 014
- **Security:** SEC-001, 004, 010, 013
- **Other:** SEO-030, I18N-011, BRAND-008, 009, 014

## What I will create

**Migrations** (`supabase/migrations/`, applied by CI, never edited in the SQL editor):

1. **Conventions:**
   - money is `bigint` minor units with a `currency_code` domain (ISO 4217);
   - every timestamp is `timestamptz` (UTC);
   - an `updated_at` trigger keeps modification times current.
2. **Identity:**
   - `profiles` holds the platform role (`customer` or `admin`) and an admin role;
   - `organisations` (`operator`, `partner`, `nilecruz`), each with a status: applied, approved, paused or rejected;
   - `memberships` set each person's team role: owner, reservations, finance or viewer.
3. **Catalogue:**
   - `vessels`:
     - type is sail / motor / steam, labelled exactly as in BRAND-008;
     - `slug` (with reserved-slug guard) and `source_ref`, both unique;
     - visibility: private / showcase / published;
     - category, cabin count, guest count;
     - a `sample` flag.
   - `vessel_translations` (en / es / ja, English fallback).
   - `destinations` (common English names, BRAND-009) and `destination_translations`.
   - `media`, attached to one vessel or destination (BRAND-014), with a Supabase Storage bucket and its own access rules.
4. **Audit:**
   - `audit_log` is append-only: a trigger blocks updates and deletes;
   - writes happen only through a `log_event()` function.
5. **Security:**
   - helper functions `is_admin()`, `my_org_ids()` and `has_org_role()`;
   - a policy on every table: public reads only published rows; admins all; operators their own organisation.

**Code:**
- **Server data layer** (`src/server/db/`):
  - a request-scoped Supabase client (`@supabase/ssr`);
  - a server-only admin client, which can never be imported by browser code (ESLint rule plus a build check);
  - generated database types (`supabase gen types`), committed.
- **Validation:** zod schemas for every input to these tables (`src/server/validation/`), plus a helper that validates every server action and route input (SEC-004).
- **Translations:** a helper that returns a translated field, falling back to English (I18N-011).
- **Sample flag:** a mapper that carries the `sample` flag through to components, so seeded records always render "Sample data" (DATA-006).
- **Seed** (`supabase/seed.sql`, local and CI only):
  - one deterministic user for each role: admin, operator owner and staff, customer, partner owner/reservations/finance;
  - two operators and one partner;
  - a handful of vessels, all flagged sample.
- **Vessel import** (`scripts/import-vessels.ts`), for DATA-014:
  - a **dry run first**, with a count report: read, mapped, skipped, duplicate, with reasons;
  - then, on your approval, an import into **staging only** as private drafts.
- **Sanity:**
  - a project with datasets `production` and `development`;
  - base schemas: article, FAQ, vessel-type profile (the VesselCompare and VesselTypeCard data), price-factor set (PriceAnatomy), destination story, and Egyptologist profile (if PROPOSED-015 is approved);
  - document-level translations in EN, ES and JA;
  - Studio hosted by Sanity, so it doesn't add weight to the site.

## Tests I will add

- **Database tests** (pgTAP, run with `supabase test db` in CI against a fresh local database):
  - **RLS coverage:** a test fails if any table lacks RLS or policies (SEC-001).
  - **Isolation:** anonymous visitors see only published vessels; an operator can't read or write another organisation's rows; a customer can't read organisations or the audit log.
  - **Audit log:** cannot be updated or deleted, even by admins (SEC-010).
  - **Slugs:** a vessel slug equal to a facet slug (`luxury`, `compare`, `7-nights`…) is rejected (SEO-030).
  - **Data formats:** no money column is a float, and no timestamp lacks a time zone (DATA-001/002).
  - **Media:** a media row must belong to exactly one record (BRAND-014).
- **Unit tests:** zod schemas, the translation fallback, the sample-flag mapper, the import's type mapping and duplicate detection.
- **CI:**
  - a new job starts Supabase in Docker, applies the migrations from scratch, runs the database tests and checks that the generated types are up to date;
  - on merge to `main`, migrations are applied to staging.

## New dependencies

| Package | Why |
|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | Database and auth clients |
| `next-sanity` | Content queries |
| `sanity`, `@sanity/document-internationalization` (dev/Studio only) | Schemas and the hosted Studio |

## What I need from Faris

1. **Docker Desktop running on this Mac.** The local Supabase stack and the database tests run in Docker. It isn't running now.
2. **A Supabase personal access token** (Supabase → Account → Access Tokens), added to `.env.local` as `SUPABASE_ACCESS_TOKEN` and as a GitHub secret. The CLI needs it to apply migrations to staging.
3. **Sanity:**
   - Should I create a new project "Nilecruz" in your Sanity organisation (your Sanity account is connected here)?
   - Is the hosted Studio at `nilecruz.sanity.studio` acceptable?
4. **Vessel import mapping.**
   - **Types:** the 609 records have only three types: powered (366), dahabiya (238) and lake_nasser (5). Paddle steamers are hidden inside "powered". My proposal:
     - dahabiya → sailing dahabiya;
     - powered and lake_nasser → motor cruise ship;
     - steamers are corrected by an admin in Batch 4b, because I won't guess which ones they are.
   - **Fields:** I import names, aliases, type, route text, cabin and guest counts, decks, year built, star band, source links and verification notes. I do **not** import contacts (emails, phones), prices or scores: they are unverified and stay out until each operator confirms them (ADR-013, Q26).
   - Is this mapping right?
5. **SEC-013 (passenger personal data):** passengers only exist once bookings do (Batch 4e). I propose moving SEC-013 to 4e. In Batch 3 I'll set the policy pattern it will use.
6. **PROPOSED-015 (Egyptologist profiles in the CMS):** approve now so the schema is created with the others? Names, bios and photos would still come from you.
