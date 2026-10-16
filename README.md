# Krew

**Your people. Your event. Your moment.**

Krew is an event staffing marketplace. Organizers publish staffing requests and
confirm their crew; workers find shifts, apply, and track confirmed work. Both
journeys run on one Next.js App Router codebase, one design system, and one
Neon PostgreSQL database.

- Public brand, tagline and signup routes live in `lib/brand.ts`.
- Design tokens (colour, type, focus ring, motion) live in `app/globals.css`.
- Reusable brand components live in `components/brand/`.

## Team

- **Victor** — [@Vict3310](https://github.com/Vict3310)
- **Qayah Fashinaru**
- **Ayomide Olapade**

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + React |
| Styling | Tailwind CSS v4 with Krew design tokens |
| Database | Neon serverless PostgreSQL via Prisma |
| Auth | Custom email/username + password sessions (Argon2 hashing, signed cookie) |
| Tests | Vitest (unit) and Playwright (end-to-end) |

## Setup

### 1. Environment

Copy the template and fill in real values:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
SESSION_SECRET="generate-a-long-random-secret"
APP_URL="http://localhost:3000"
DEMO_AUTH="false"
NEXT_PUBLIC_DEMO_AUTH="false"
```

Use the pooled Neon connection string for `DATABASE_URL`. Keep the direct string
for migration workflows. Never commit or share these values.

`DEMO_AUTH` stays `false` for real use: the marketplace, dashboards and
application flows are database-backed and do not fabricate records.

### 2. Install, migrate, run

```bash
npm install
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The app is served at `http://localhost:3000`.

## Scripts

```bash
npm run dev                     # development server against Neon
npm run build && npm start      # production build and server
npm test                        # Vitest unit tests
npx tsc --noEmit                # type check
npx eslint .                    # lint
npm run db:check                # safe database connectivity diagnostics
npm run bootstrap-admin -- <email>  # grant ADMIN to an existing account
npm run seed                    # optional sample organizer, worker and shifts
```

`npm run bootstrap-admin` is the only supported path to an administrator
account. Public signup can only create `WORKER` or `ORGANIZER` accounts.

`npm run db:check` reports whether `DATABASE_URL` is present and plausible
without printing the secret.

## Demo mode

Setting `DEMO_AUTH=true` and `NEXT_PUBLIC_DEMO_AUTH=true` switches sign-in to
browser-local demo personas and a localStorage store. It is a sandbox for UI
work only — the operational marketplace always reads and writes PostgreSQL.

Demo accounts (demo mode only):

| Persona | Email | Password |
|---|---|---|
| Ada Worker | `ada.worker@demo.local` | `Ada@12345` |
| Chidi Organizer | `chidi.organizer@demo.local` | `Chidi@12345` |
| Krew Admin | `admin@demo.local` | `Admin@12345` |

Demo data lives in localStorage under `eventcrew_demo_store_v1`. That name is an
internal storage key, not a product name, and is left unchanged so existing
browser data is not orphaned.

## Internal identifiers kept after the rebrand

Renaming user-visible branding never requires a destructive database change, so
these stay as they are and are intentionally undocumented to end users:

- the session cookie name and demo storage keys,
- the `@eventcrew.ng` addresses used by the optional seed script,
- the local `docker-compose.yml` database name.

Change them only alongside a migration and a deliberate session reset.

## Venue navigation

Workers get a venue map, distance, directions and organizer arrival instructions on
their assignment page (`/assignments/[id]`). Organizers confirm the venue location
when creating or editing a staffing request.

The map is Leaflet with OpenStreetMap tiles — no key, no account. Two server-side
services sit behind it, both proxied so keys and rate limits stay on the server:

| Concern | Default | Environment |
|---|---|---|
| Venue search / address lookup | Public Nominatim | `GEOCODING_BASE_URL`, `GEOCODING_USER_AGENT`, `GEOCODING_COUNTRY_CODES` |
| Route preview | Public OSRM demo server | `ROUTING_PROVIDER` (`osrm` or `none`), `ROUTING_BASE_URL` |

**Before production traffic, point these at your own instances.** The public OSRM
demo server is not capacity for real usage, and Nominatim's policy caps clients at
one request per second (which this app enforces and caches, but a self-hosted or
commercial instance is still the right answer at scale). While the defaults are in
use, the interface labels route previews as guides sourced from a shared public
service. Set `ROUTING_PROVIDER=none` to switch route previews off entirely — the
venue map and the external directions links keep working.

Coordinates are never invented: a venue without a confirmed pin renders an honest
"no coordinates" state, and organizer-placed pins are stored with an
`EXACT`/`APPROXIMATE` precision that the worker sees. Worker location is read once
from the browser, used for that request, and never written to the database.

### QA verification

```bash
node scripts/qa-venue-fixtures.mjs   # idempotent QA accounts, shifts and assignments
node scripts/qa-venue-e2e.mjs        # 35 checks against a running server (BASE_URL=...)
```

## Diagnostics

```bash
npm run db:check   # connectivity and configuration status
```
