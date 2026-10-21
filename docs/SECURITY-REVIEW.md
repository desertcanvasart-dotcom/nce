# Security review before launch (SEC-011)

**Date:** 21 Oct 2026 · **Batch:** 11-1 · **Scope:**
- the database: every migration, using the latest definition of each function;
- the server: every server action and route handler, `src/server`, the proxy and config;
- dependencies, CI workflows, client code and Supabase settings.

**How:** three reviews read the code in parallel, one per area. Each finding below was checked against the code before being fixed or decided. The fixes are tested in `supabase/tests/390_security_review.sql` and in the unit and end-to-end tests named.

**Result:** no open High finding. One High was found and fixed. Each Medium is fixed or, where noted, decided for launch.

## Fixed in Batch 11-1

| # | Severity | Finding | Fix | Tested by |
|---|---|---|---|---|
| 1 | **High** | **Vacancy sheets could be credited to the wrong operator.** An emailed sheet was matched to an operator by its From address, which was used as a SQL `LIKE` pattern (`%@%` matched anyone). From addresses can be forged anyway, and with auto-confirm on, a forged sheet could change an operator's availability. Two operators could also list the same address. | The address is matched exactly, with wildcards escaped. **Emailed sheets never auto-confirm**: an admin confirms them. WhatsApp senders are vouched for by Meta's signature, so WhatsApp and uploads still can. An email address or WhatsApp number can belong to only one operator. | `sheets.test.ts`, `390` |
| 2 | Medium | **Open redirect after sign-in:** `?next=/.//evil.com` normalised to `//evil.com`. | Paths that normalise to `//host` are refused. | `auth.test.ts` |
| 3 | Medium | **Notifications could be rewritten:** any team member could change a notification's title and reset it to be emailed again. | Members can only mark notifications read. | `390` |
| 4 | Medium | **Availability could be faked:** an operator writing straight to the inventory table through the API could set it as "API" data, confirmed in the future, making manual counts permanently "instant". | A direct write is always stored as manual, confirmed no later than now. Feeds, the API, sheets and taps go through the database functions as before. | `390` |
| 5 | Medium | **An alternative offer never lapsed**, and could be accepted onto a sailing since cancelled or departed. | Accepting needs the sailing still scheduled, in the future, on a published vessel of an approved operator. Unanswered alternatives expire after 7 days, like waiting requests. | code review; the booking request tests run in CI on a clean database |
| 6 | Medium | **Admin roles weren't kept apart:** a content or finance admin could make themselves an operator's owner, approve companies or edit people. | Companies and memberships: catalogue and super admins only. People: super admins only. Every admin still reads. | `390`, `070` |
| 7 | Medium | **Booking forms trusted their bound arguments:** `cabins: 1e9` would exhaust the server's memory before the database refused it. | The plan and party are checked against a schema (cabins 1–5, up to 3 ages, ids) before anything is built from them. | `plan.ts` schema; reserve e2e |
| 8 | Medium | **Reserving wasn't rate limited:** one account could hold cabins over and over. | 10 reservations an hour per account, for customers and agencies. | `rate-limit.ts` |
| 9 | Medium | **Two-step codes and current-password checks had no limit of ours:** Supabase saw only our server's address. | 10 wrong tries per 15 minutes per account for each. | `account/actions.ts` |
| 10 | Low | **The commission rate was readable by any signed-in user.** | Only Nilecruz admins read it. Bank details and other settings stay readable where needed. | `390` |
| 11 | Low | Agencies could rewrite a booking's or company's ID on their booking notes; owners could move a membership to another person. | Column-level grants: only the editable fields. | `390` |
| 12 | Low | The MCP endpoint read the whole body before the size check, and batches had no cap. | Refused by declared size first and counted in bytes; at most 10 messages per batch. | `mcp.spec.ts` |
| 13 | Low | The WhatsApp verify token was compared with `===`. | Constant-time comparison. | — |
| 14 | Low | Inbound sheets were stored with the sender's content type (a `.png` could be stored as HTML). | The stored type comes from the accepted file extension. | — |
| 15 | Low | CI workflows ran with the repository's default token permissions. | `permissions: contents: read` on every workflow. | — |

## Decided, not changed now

| # | Severity | Finding | Decision |
|---|---|---|---|
| 16 | Medium | **Rate limits live in the app, but some database functions and tables are callable directly** with a signed-in user's token (`customer_reserve`, `order_tour_slot`, `cruise_requests`; `contact_messages` for visitors). Throwaway accounts could hold inventory or send many requests. | **Recommended for 11-2, before real traffic:** caps in the database, for example at most 3 open unpaid reservations per person per sailing, 5 open tour holds per person, and requests and contact messages per account per hour. Until then, sign-up needs a confirmed email and is limited per address, and unpaid holds lapse at their deadline. |
| 17 | Medium (unverified) | **Rate limits trust the first `X-Forwarded-For` address.** If Railway appends rather than replaces it, a client could pick a fresh address each time. | **Verify on staging (11-2):** log what Railway sends, then key the limits on the address Railway itself adds. Changing it blind could put every visitor in one bucket. Per-account limits (sign-in failures per email, two-step, reserving) are unaffected. |
| 18 | Medium | **Production Supabase isn't configured yet:** no production remote in `config.toml`, no SMTP (the built-in mailer sends about 2 emails an hour), and staging's `site_url` names a Railway host. | **Launch checklist (`docs/LAUNCH.md`):** a production remote with the real domain as `site_url` and exact redirect URLs, Resend SMTP, staging's tighter auth limits (sign-in 30 per 5 min, `max_frequency` 1 minute), OTP expiry 30 minutes, and leaked-password protection on. |
| 19 | Low | Operators that are paused or rejected keep some powers (vessel edits, answering requests), and any tour-office member, a viewer included, can cancel a slot. | **11-2:** add "approved" to those checks, and limit slot cancellation to owner and reservations roles. No operator is paused today. |
| 20 | Low | The trip planner puts its free-text notes in the request form's address, so they can end up in logs and browser history. | **Accepted for now:** the notes are about the trip, not identity. Move them to a POST when the planner is next changed. |
| 21 | Low | A Resend webhook replayed within 5 minutes creates a duplicate sheet. | **Accepted:** a replayed email can only add a duplicate sheet for an admin to discard. Since fix 1, emailed sheets never confirm themselves, so a replay can't change availability. |
| 22 | Low | Team invites use the admin client with no limit of ours, and say whether an address already has an account. | **11-2:** a per-owner limit on invites. |
| 23 | Low | CSP allows inline scripts (ADR-034); server actions accept 16 MB bodies; `rateLimit` lets requests through if the database errors. | **Accepted, recorded:** a nonce would make every page dynamic (PERF-010). The 16 MB cap is for photo uploads. Failing open keeps sign-in working when the database is struggling. |
| 24 | Low | Third-party CI actions are pinned to tags, not commit SHAs. | **11-2:** pin `pnpm/action-setup` and `supabase/setup-cli` (they run with deploy secrets) to SHAs. |
| 25 | Moderate (dependency) | `uuid` below 11.1.1, pulled in by `exceljs` (GHSA-w5hq-g745-h8pq). | **Accepted:** the bug needs `uuid` v3/v5/v6 called with a caller-supplied buffer, which nothing here does. Forcing a major version under `exceljs` could break the sheet reader. Revisit when `exceljs` updates. |
| 26 | Unverified | Hosted settings to confirm: email confirmations on, and the `app` schema not exposed through the Data API. | **11-2:** check both in the staging and production dashboards (launch checklist). |

## Checked and sound

- **Functions:**
  - all 199 database functions were read, and every security-definer one sets `search_path = ''`;
  - every public function revokes EXECUTE from PUBLIC;
  - `service_*` functions check the service role.
- **Tables and access rules:**
  - all 82 public tables have RLS; there are no views;
  - write policies have `with check`;
  - money tables are read-only to users, and every money change goes through finance-admin (two-step) or service-role functions;
  - prices are recomputed in the database, and refunds are capped.
- **Server actions:** all 160 check the caller before touching the database. Admin actions need two-step, which the database checks again. The service-role client is never used inside an action.
- **Signed endpoints:**
  - the Stripe webhook verifies the raw body;
  - internal routes use HMAC with a 5-minute window and constant-time comparison;
  - the v1 API uses Ed25519 signatures, a replay window and idempotency;
  - operator reply links are HMAC-signed, expire and work once.
- **Feeds:** fetches go through an SSRF-safe client (https only, pinned DNS, private ranges blocked, every redirect re-checked).
- **Secrets and headers:**
  - no secrets in `NEXT_PUBLIC_*` or the client bundle; gitleaks finds nothing in 214 commits;
  - cookies are httpOnly, SameSite=Lax and Secure;
  - security headers: HSTS, `frame-ancestors 'none'`, `object-src 'none'`, `nosniff`.
- **Client code:** no `dangerouslySetInnerHTML` with user data, nothing sensitive in `localStorage`, no `postMessage` handlers.
- **Dependencies:** no High or Critical advisories in production dependencies (`pnpm audit --prod`).
