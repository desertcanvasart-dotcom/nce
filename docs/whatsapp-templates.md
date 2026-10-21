# WhatsApp message templates (ADR-099)

WhatsApp only lets a business start a conversation with a **template** Meta has approved. Submit these two in Meta Business Manager → WhatsApp Manager → Message templates before setting `WHATSAPP_ENABLED=true`.

- **Category:** Utility.
- **Language:** English (`en`).
- **Body values** `{{1}}`–`{{5}}` are filled in by the app (`whatsappParams` in `src/lib/requests/message.ts`).
- **Buttons** are four **quick-reply** buttons. WhatsApp allows only two "Visit website" buttons, but up to ten quick replies. The app attaches each button's payload, a signed one-time token, when it sends.
  - A tap comes back to `/api/whatsapp/webhook/` and is answered at once.
  - "Offer other" replies with a link to the form.

Meta asks for a sample value for each placeholder; the samples below can be pasted in.

Only operator contacts who agreed to receive WhatsApp messages get them (the opt-in date is recorded on the contact). Email always goes too.

## 1. `nilecruz_booking_request`

**Header (text):** New booking request

**Body:**

```
A customer asks to book on {{1}}.

Cruise: {{2}}
Cabins: {{3}}
Guests: {{4}}

{{5}}

Tap an answer below. Each button works once, for 7 days.
```

Samples: `{{1}}` Sample Ship · `{{2}}` Luxor to Aswan, Mon 2 Nov 2026, 4 nights · `{{3}}` 2 × Standard · `{{4}}` 2 (GB) · `{{5}}` Your manual entry from 30 Oct showed 4 Standard free.

**Footer:** Nilecruz, booking agent for your cruises

**Buttons (quick reply), in this order:** `Confirm`, `Decline`, `Hold 72h`, `Offer other`.

## 2. `nilecruz_booking_reminder`

**Header (text):** Reminder: booking request waiting

**Body:**

```
This request is still waiting for your answer. The customer is waiting.

Ship: {{1}}
Cruise: {{2}}
Cabins: {{3}}
Guests: {{4}}

{{5}}
```

The samples and the four buttons are the same as above.

## Before switching on

1. Have a Meta Business account and a WhatsApp Business number, with the number verified.
2. Create a permanent system-user token. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN` on the server.
3. In the Meta app's WhatsApp settings, set the webhook to `https://nilecruz.com/api/whatsapp/webhook/` with the same verify token, and subscribe to `messages`.
4. Submit both templates and wait for "Approved".
5. Record each operator contact's WhatsApp opt-in in their dashboard.
6. Set `WHATSAPP_ENABLED=true`.
