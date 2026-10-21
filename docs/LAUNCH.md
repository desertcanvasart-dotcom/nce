# Launch checklist

**For:** the day nilecruz.com moves to the new site · **Owner of the whole list:** Faris, who signs it off at the end · **Drafted:** Batch 11-1, 21 Oct 2026

Each step has an owner and a check. Do them in order. Don't switch indexing on (step 7) until everything above it is ticked.

**Owners:** **F** = Faris (accounts, money, DNS), **C** = Claude (code, scripts, checks).

## 1. Before the day

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Every pull request merged; CI green on `main` | F | GitHub shows `main` green |
| ☐ | Content: every CONTENT-NEEDED item marked "must have for launch" is in (11-2 content check) | F | the signed list in CONTENT-NEEDED.md |
| ☐ | Real vessels published, with their operators' confirmation; no sample or showcase data public | F, C | `pnpm launch:check` against production prints "Ready" (DATA-025) |
| ☐ | Terms, privacy and booking conditions reviewed, with the legal entity's details | F | CONTENT-NEEDED #9, #27 |
| ☐ | Spanish and Japanese: pages stay English with a note until each translation is approved (Batch 10) | — | nothing to do; pages join as translations arrive |

## 2. Production accounts

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Supabase production project created (EU), on a paid plan with daily backups | F | dashboard: backups listed |
| ☐ | A restore rehearsed from staging's backup into a scratch project, and the time it took written down (ENG-015) | F, C | the rehearsal log in BUILD-LOG |
| ☐ | Production migrations applied by hand (never from CI) | C, with F | `supabase db push` to production; the grants check shows no differences |
| ☐ | Auth on production: `site_url` = `https://nilecruz.com`; exact redirect URLs (no wildcards, no localhost) | F | dashboard → Authentication → URL configuration |
| ☐ | Auth on production: SMTP through Resend; email confirmation on; sign-in limit 30 per 5 min; resend interval 1 minute; OTP expiry 30 minutes; leaked-password protection on | F | dashboard → Authentication |
| ☐ | The `app` schema is not exposed through the Data API | F | dashboard → API settings: exposed schemas `public` only |
| ☐ | Resend: the sending domain verified (SPF, DKIM, DMARC) | F | Resend shows "Verified" |
| ☐ | Stripe: live keys; a live webhook to `/api/stripe/webhook/` for the checkout events | F | Stripe → Developers → Webhooks: endpoint enabled |
| ☐ | Sentry: production project; its DSN in Railway (ENG-014) | F | a test error appears in Sentry |

## 3. Railway production service

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Variables set: Supabase URL and keys, `NEXT_PUBLIC_SITE_URL=https://nilecruz.com`, Stripe live keys and webhook secret, Resend key, `FEED_PULL_SECRET`, WhatsApp (if on), `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production` | F | Railway → Variables, compared with `.env.example` |
| ☐ | `ALLOW_INDEXING` **not** set yet | F | `robots.txt` on the Railway URL says `Disallow: /` |
| ☐ | The scheduler's signed URLs in Supabase Vault point at production (tick, feed pull) | C, with F | Vault entries; the next tick logs a 200 |
| ☐ | Deployed; `/api/health/` answers `{"ok":true}` | C | curl |
| ☐ | Rate limits key on the right client address: check what Railway sends in `X-Forwarded-For` (SECURITY-REVIEW #17) | C | a test request's header logged |

## 4. Smoke test on the Railway address (before DNS)

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Sign up, confirm the email, sign in, turn on two-step | C | the emails arrive through Resend |
| ☐ | Search, open a vessel, compare, reserve, pay by card with a live card for a small refundable amount, then cancel and refund | F, C | Stripe shows the payment and the refund |
| ☐ | An operator request and a one-tap reply by email | C | the reply lands in the operator dashboard |
| ☐ | Admin: two-step required; the queues load | C | dashboard |

## 5. Domain

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Lower DNS TTL a day before | F | registrar |
| ☐ | Point `nilecruz.com` and `www` at Railway; HTTPS certificate issued | F | `https://nilecruz.com/api/health/` answers |
| ☐ | `www` redirects to the bare domain | C | curl shows a 301 |

## 6. The old site's addresses

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Every address in `docs/imports/live-site-urls.md` 301s to its new page on the real domain | C | the same checks as `http.spec.ts`, run against `https://nilecruz.com` |

## 7. Indexing on

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | `ALLOW_INDEXING=true` in Railway; redeploy | F | `robots.txt` allows `/` and lists `/sitemap.xml`; no `X-Robots-Tag` header |
| ☐ | Search Console: the domain verified; `https://nilecruz.com/sitemap.xml` submitted | F | Search Console shows the sitemap read |
| ☐ | Lighthouse on the live key templates (the deployed workflow, run by hand with the URL) | C | LCP ≤ 2.5 s, CLS ≤ 0.05 |

## 8. The first week

| ✓ | Step | Owner | Check |
|---|---|---|---|
| ☐ | Sentry: new errors looked at daily | C | Sentry issues |
| ☐ | Search Console: coverage and any 404s from old links | F, C | add a redirect for any old address still being visited |
| ☐ | Real-visitor Core Web Vitals (Sentry performance): INP ≤ 200 ms | C | Sentry web vitals |

## If it goes wrong (rollback)

- **The site is broken after a deploy:** Railway → Deployments → redeploy the previous one. The database isn't touched.
- **A migration broke something:** fix forward with a new migration. Don't restore a backup unless data was lost; if it was, restore point-in-time or the last daily backup into a new project and switch the variables (the rehearsal in step 2 says how long that takes).
- **The domain:** point DNS back at the old site's host. Its addresses still work there.

## Sign-off

- [ ] **Faris:** every step above is done, and Nilecruz is live. Date: ____________
