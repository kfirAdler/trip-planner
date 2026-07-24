# Japan Trip Planner

Personal itinerary app: trip home page, day-by-day itinerary, an ArcGIS map, and
category stats, with Google sign-in and trip sharing (view/edit permissions).

## One-time setup

1. **`.env.local`** — create this file in the project root (gitignored) with:

   ```
   DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   AUTH_SECRET="<generate with: openssl rand -base64 32>"
   AUTH_GOOGLE_ID=""
   AUTH_GOOGLE_SECRET=""
   ARCGIS_API_KEY=""
   NEXT_PUBLIC_ARCGIS_API_KEY=""
   ```

   Get the two Postgres URLs from the Supabase dashboard: **Connect → ORM → Prisma**.
   `DATABASE_URL` is the transaction-mode pooler (used by the running app),
   `DIRECT_URL` is the session-mode pooler (used only by Prisma migrations).
   See `.env.local.example` for the same template.

2. **Google OAuth** (for login) — in [Google Cloud Console](https://console.cloud.google.com/):
   - Create a project, configure the OAuth consent screen (External, add yourself as a test user).
   - Create an OAuth 2.0 Client ID (Web application) with authorized redirect URI
     `http://localhost:3000/api/auth/callback/google`.
   - Put the Client ID/Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

3. **ArcGIS** (for place-name search *and* the map page) — at
   [developers.arcgis.com](https://developers.arcgis.com/):
   - Sign up for a free ArcGIS Location Platform account (no credit card
     needed for the free tier).
   - Dashboard → **API keys** → Create API key (default privileges include
     geocoding and basemaps, which is all this app uses).
   - Put the same key value into **both** `ARCGIS_API_KEY` and
     `NEXT_PUBLIC_ARCGIS_API_KEY`. Two env vars, one key: the first is used
     server-side only (place-name search, proxied through `/api/places/*`,
     never reaches the browser); the second is the same key exposed to the
     browser (`NEXT_PUBLIC_` prefix) so the map page's ArcGIS SDK can render
     the basemap client-side — any client-exposed key is visible in the page
     source, so if you want to lock it down, restrict `NEXT_PUBLIC_ARCGIS_API_KEY`
     by HTTP referrer in the ArcGIS dashboard. Without these keys, the
     place-name field behaves like a plain text input and the map page shows
     a setup notice.

4. **Database** — hosted on Supabase (see step 1 for connection strings). Once
   `.env.local` is filled in, create the tables:

   ```bash
   npx prisma migrate dev --name init
   ```

## Running

```bash
npm run dev
```

Open http://localhost:3000 — it redirects to `/login`.

## Notes

- Uploaded photos (trip cover, attraction photos) are saved to `public/uploads/`
  locally. This won't persist on Vercel's serverless filesystem — swap
  `lib/storage.ts`'s `saveImage()` for Vercel Blob's `put()` when deploying;
  no other code needs to change.
- No git repo has been initialized for this project (personal, local-only).
