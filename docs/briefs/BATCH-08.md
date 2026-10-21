# Batch 8 brief: Conversion layer

**Status:** approved by Faris 21 Oct 2026 with the recommended answers (ADR-101) · **Branch:** `batch-08-2-conversion` (stacked on the operator loop) · **Size:** M (two pull requests)

**Goal:** a visitor can start planning without an account, sign up, send the request and hear back by email. Bots are kept off the forms, and assistants such as ChatGPT or Claude can search our cruises read-only.

**Exit criterion (BATCH-PLAN):** an anonymous visitor plans a cruise, creates an account, sends the request, and gets an email when an offer arrives.

**Already done in the operator loop (ADR-099, ADR-100):**
- request-to-book from the vessel page;
- Resend as the email service, with every message recorded;
- one-tap answers for operators.

## Requirement IDs in scope (9)

- **Planning:** PAGE-105 `/plan-my-cruise/`, DASH-PUB-007 (start planning without an account)
- **Email:** DASH-BND-007 (sending needs a configured sender and fails visibly), plus PROPOSED-005 (transactional notifications; your answer to Q33 was "needed for launch")
- **Protection:** SEC-006 (public forms and sign-in are rate-limited and protected from bots)
- **AI assistants:** DASH-PUB-011 (read-only MCP: search, compare, availability), DASH-PUB-012 (same restrictions as the site; can't book or administer)
- **Booking summary:** DATA-011 (lines come from the departure, rate and policy), DATA-016 (gratuity a separate line, paid on board, never charged online), DATA-017 (the cruise total never includes flights, tours or transfers)

## What I will build

**1. Plan my cruise** (PAGE-105, DASH-PUB-007)
- A public page where a visitor picks route, dates, nights, guests and children's ages, budget and notes, with no account needed.
- The plan stays in their browser.
- "Send to operators" asks them to sign up or sign in, then sends the plan as their request, ready to check and send, with nothing retyped.
- ContactPage data, the workbook's links, and Plan my cruise in the header (the button that's already there).

**2. Emails to customers, travel partners and operators** (DASH-BND-007, PROPOSED-005)

| Who | Emails |
|---|---|
| Customers and travel partners | offer received or updated; booking request answered (confirmed, held, other offer, declined, expired); reservation made; payment deadline reminders (3 days and 1 day before); payment received, with the receipt; cancellation outcome and refund; tour order confirmed |
| Operators | new request for offers; new booking; cancellation request |
| Nilecruz admins | new Contact message; proof to verify |

- Every email also stays as a dashboard notice, as today.
- One outbox records every message; a failed send is retried and shown to admins.
- If the sender isn't configured, admins see a banner on the dashboard, and nothing fails silently.
- Each customer and travel partner can turn off the non-essential emails (reminders stay on).
- Sign-in, confirmation and password emails also go through Resend (question 3).

**3. Rate limits and bots** (SEC-006)
- Limits per address and per account on:
  - sign-up, sign-in and password reset;
  - Contact, Plan my cruise and booking requests;
  - the operator reply page.
- The Resend and WhatsApp webhooks are signed; the WhatsApp one is also limited.
- Hidden honeypot fields on every public form.
- Too many tries shows "try again in N minutes", never a bare error.

**4. Read-only MCP for AI assistants** (DASH-PUB-011, 012)
- A public MCP endpoint at `/api/mcp/`.
- **Tools:**
  - search cruises by route, dates, nights and vessel type;
  - a vessel's facts, evaluation and itinerary;
  - compare up to three vessels;
  - a sailing's booking mode (instant, confirmed by the operator, sold out).
- **The same limits as a visitor without an account:** "from" prices only, and no exact cabin counts.
- **No changes possible:** no booking, no requests, no admin. Rate-limited, and every answer links back to the page on Nilecruz.

**5. Booking summary checks** (DATA-011, 016, 017)
- Review every place a reservation's total is shown: the vessel page, reservations, offers, receipts and the travel partner's client sheet.
- Lines come only from the departure, rate and policy.
- The gratuity is always its own line, "paid on board at check-out", never in the amount due or commission.
- No flights, tours or transfers in the cruise total.
- Fix what's off, and add tests that lock it in.

## Tests I will add

- **Unit:** the plan's form rules and the hand-over to a request; each email's wording and links; rate-limit windows; the MCP tools' answers (no exact prices or counts); booking summary lines.
- **Database (pgTAP):** rate-limit counting and expiry; the outbox and retries; email preferences; MCP queries return only public data.
- **End-to-end:**
  - an anonymous visitor plans, signs up, sends the request, an operator offers, and the offer email is recorded;
  - a sender that isn't configured shows the admin banner;
  - too many sign-ins are slowed;
  - MCP search answers without prices; trying to book through MCP is refused;
  - axe in Day and Night; screenshots.

## Questions for Faris

1. **Email languages.** Recommended: **English for now**, in the customer's site language once ES and JA translations exist (CONTENT-NEEDED, translators).
2. **Payment reminders.** Recommended: **3 days and 1 day** before the deadline, plus one on the day. Or another schedule?
3. **Sign-in emails through Resend.** Recommended: **yes**, so they come from nilecruz.com and land in inboxes. It's a setting in Supabase on staging, which I'd make with your OK.
4. **Bot protection.** Recommended: **rate limits and hidden fields now**, and Cloudflare Turnstile (an invisible check) only if bots get through. Turnstile needs a free Cloudflare account.
5. **MCP access.** Recommended: **public data only, no login**, the same as a visitor without an account. Signed-in prices through personal access tokens can follow later.
6. **Plan my cruise before an account.** Recommended: keep the plan **in the browser only** and ask for no email until they sign up (no lists, no spam). Or should we collect an email first, to send a reminder link?
7. **Two pull requests.** Recommended: **8-2a** for Plan my cruise, emails and rate limits; **8-2b** for MCP and the booking summary checks.
