# Nilecruz Studio (Sanity)

Editorial content: articles, FAQs, destination stories, vessel-type profiles, price explainers and Egyptologist profiles.
Prices, vessel facts, itineraries and bookings live in Supabase, not here (CLAUDE.md §6).

- Project `auho5414`, datasets `development` (local and staging) and `production` (live site). Both are private.
- Hosted Studio: https://nilecruz.sanity.studio (deployed by CI from `main`).
- Translations: articles, FAQs, destination stories and vessel-type profiles are translated as whole documents
  (each language published on its own). Price explainers and Egyptologist profiles share figures and photos,
  so only their text fields are translated. English is always required; the site falls back to English.

```bash
cd studio
pnpm install --ignore-workspace
pnpm dev                 # http://localhost:3333, development dataset
```
