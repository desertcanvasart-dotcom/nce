# Local test users (local Supabase and CI only)

These accounts exist only in the local Docker database created by `supabase db reset`. They are never created on staging or production.

Password for every account: `nilecruz-local-only`

| Email                        | Role                                 |
| ---------------------------- | ------------------------------------ |
| admin@nilecruz.test          | Admin (super)                        |
| catalogue@nilecruz.test      | Admin (catalogue)                    |
| owner@operator-a.test        | Operator A · owner                   |
| reservations@operator-a.test | Operator A · reservations            |
| finance@operator-a.test      | Operator A · finance                 |
| viewer@operator-a.test       | Operator A · viewer                  |
| owner@operator-b.test        | Operator B · owner (status: applied) |
| owner@partner.test           | Partner · owner                      |
| reservations@partner.test    | Partner · reservations               |
| finance@partner.test         | Partner · finance                    |
| customer@example.test        | Customer                             |

## Two-step sign-in (admins)

All three admin accounts have an authenticator already set up with the **local test secret** `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`. Add it to an authenticator app as a "manual key" (or let the end-to-end tests compute the code). This secret exists only in the local database.
