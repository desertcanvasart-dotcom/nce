# Batch 4a brief: Accounts and roles

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-04a-accounts` (from `main`) · **Size:** M

**Goal:** people can create an account, sign in and out, and keep their account safe. Each person lands in the workspace their role allows, and every server action checks their rights. Later batches fill the workspaces (4b admin, 4c operator, 4e customer journey, 4h travel partner); this batch builds the doors and the walls.

## Requirement IDs in scope (10, plus 3 proposals if approved)

- **Roles:** DASH-ROLE-001 (four workspaces), 002 (admin scope), 003 (operator scope), 004 (customer scope), 005 (partner scope), 006 (navigation changes by role)
- **Account:** DASH-CUS-013 (manage account security)
- **Security:** SEC-002 (every action authorised on the server), SEC-005 (secure sign-up, sign-in, sign-out, sessions)
- **Data:** DATA-003 (dashboards show Cairo time)
- **Proposals needing your decision (questions 1–2):** PROPOSED-001 (password reset, email verification, change email), PROPOSED-002 (operator team roles), PROPOSED-003 (admin sub-roles)

## What I will build

**Account pages** (public-facing, so in English, Spanish and Japanese; `noindex`, outside the sitemap; already blocked in robots.txt):

| Route | Purpose |
|---|---|
| `/account/sign-up/` | Create an account (name, email, password, language) |
| `/account/sign-in/` | Sign in; returns you to where you were (only to our own pages) |
| `/account/verify/` | "Check your email" and the link landing |
| `/account/reset-password/` | Ask for a reset link, then set a new password |
| `/account/security/` | Change password and email, two-step sign-in, sign out of all devices |

- Built with the design-system TextField and Button; they work without JavaScript, because forms post to server actions.
- Every error and empty state is written in the brand voice (StateView).

**The dashboard shell** (`/dashboard/`, English only, DASH-BND-006):
- `/dashboard/` sends each person to their workspace: `admin/`, `operator/`, `partner/` or `journey/` (customers).
- **Which workspace:** admins go to admin; members of an approved operator or partner company go to theirs; everyone else goes to their journey. People with several (for example an operator who also books a trip) get a workspace switcher.
- A sidebar with the sections each role will have. Sections that arrive in later batches show a short "Coming in a later release" state, never a broken link.
- **Company status:** a company that has applied, been paused or been rejected sees a clear status page instead of its workspace.
- A request for another role's workspace gets a "This is not part of your account" page with HTTP 403, never the content.
- Dates and times show in Cairo time, labelled "Cairo" (DATA-003), including Egypt's summer time.

**Server-side authorisation** (`src/server/auth/`):
- `getSession()`, `requireUser()`, `requireAdmin(subRoles?)`, `requireOrgRole(orgId, roles)`, `requireWorkspace(kind)`.
- They are called at the top of every dashboard page, server action and route handler. The database's row-level security (Batch 3) stays as the second wall.
- A lint rule flags any server action file that doesn't call one of them.

**Sessions** (SEC-005):
- Supabase Auth through `@supabase/ssr`, with cookies that are httpOnly, Secure (on https) and SameSite=Lax.
- The proxy refreshes the session on each request; it is combined with the existing language routing.
- Server actions refuse requests from another origin. Route handlers that change data check the Origin header too.
- Sign-out ends the session on the server, not just in the browser.

**Supabase Auth settings** (kept in `supabase/config.toml`, pushed to staging by the deploy workflow):
- passwords of at least 10 characters with letters and digits;
- email confirmation on;
- changing email or password needs the current session to be recent;
- the site and redirect URLs: localhost and the Railway staging domain only.

**Admin bootstrap:**
- `scripts/grant-role.ts` gives a person a role on staging (for example your account as super admin).
- It runs only with your approval for each person, and the database audit log records every change.

## Tests I will add

- **Unit:**
  - workspace resolution for every combination of roles and company status;
  - the authorisation helpers;
  - safe return-to links (no open redirects);
  - Cairo time formatting across Egypt's summer-time changes.
- **End-to-end (Playwright, against local Supabase in CI):**
  - sign up, confirm by email (read from the local mail catcher), sign in, sign out;
  - password reset and change of email;
  - each of the 11 seed users lands in the right workspace;
  - every cross-role URL returns 403;
  - an applied company sees its status page;
  - two-step sign-in for an admin;
  - session cookies carry the right flags;
  - a cross-origin form post is refused.
- **Accessibility and visual:**
  - axe and a keyboard walk on every new page, in Day and Night;
  - screenshots at 375, 768 and 1440 px in `docs/screenshots/batch-04a/`.
- **CI:** the end-to-end job starts local Supabase, so sign-in flows run against a real database.

## New dependencies

None. `@supabase/ssr` and `@supabase/supabase-js` arrived in Batch 3. Two-step sign-in uses Supabase's built-in authenticator-app support, which supplies its own QR code.

## Questions for Faris before I start

1. **PROPOSED-001: password reset, email verification and change of email.** I recommend yes: without them, a forgotten password locks a customer out.
2. **PROPOSED-002 and 003: team roles.** The Batch 3 schema you approved already has:
   - operator team roles: owner, reservations, finance, viewer;
   - admin sub-roles: super, catalogue, finance, content.

   Batch 4a makes them work. Please confirm both formally, so the ledger can record them.
3. **How people sign in.**
   - My proposal: email and password now.
   - Google sign-in later if you want it. It needs a Google Cloud OAuth client from you.
   - Add Google now, or later?
4. **Two-step sign-in.**
   - I recommend it **required for admins** (an authenticator app), and **optional** for operators, partners and customers.
   - Agreed?
5. **Who sends account emails** (confirmation, reset).
   - Supabase's built-in sender allows only a few emails an hour, so it is fine for testing but not for real customers.
   - I recommend Resend, moved forward from Batch 8, sending from a verified `nilecruz.com` address.
   - That needs a Resend account and access to the `nilecruz.com` DNS (CONTENT-NEEDED #18).
   - **Option a:** set it up now.
   - **Option b:** use the built-in sender on staging for now, and switch before launch.
6. **Your staging account.**
   - Once you sign up on staging, may I make `islamjp69@gmail.com` a super admin with `scripts/grant-role.ts`?
   - Should anyone else get an admin role?
7. **Auth settings on staging.** May the deploy workflow push the Auth settings above to the staging project with `supabase config push`, so they are version-controlled like the database?
