# PowerLink

A bilingual Mongolian/English URL shortener built with Next.js App Router, React, and TypeScript.

## Run locally

Requires Node.js 22.18+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Local development stores links as files under `.data/links/` unless you set `DATABASE_URL`. For a production build, set a private `CREATE_ACCESS_TOKEN`, then use `npm run build` followed by `npm start`. Production link creation rejects requests without this owner key.

## Features

- Real redirects at `/s/:alias`, persisted on the server.
- Custom names (3–48 letters, numbers, underscores, or hyphens; case-insensitive uniqueness).
- Optional password protection, stored as a salted scrypt hash.
- Optional start and expiration times; checked on every redirect.
- Real QR PNGs generated locally with `qrcode`.
- Copy, QR download, and the last 50 links in this browser's local storage.
- Mongolian/English UI, keyboard focus styles, and responsive layouts.

Account buttons were removed because the original project had no authentication service. No credentials are collected for fake sign-in.

## Data and deployment

Storage is selected by `DATABASE_URL`:

- **With `DATABASE_URL`** (production): links are stored in Postgres. The `links` table is created automatically on first use. Use a free managed provider such as Neon or Supabase; set the connection string as an environment variable, never in Git.
- **Without `DATABASE_URL`** (development/tests): links are stored as files in `.data/links/` (ignored by Git). Set `LINK_DATA_DIR` to change the directory. This path is ephemeral on diskless hosts, so production must set `DATABASE_URL`.

Optional Postgres tuning: `DATABASE_SSL_REJECT_UNAUTHORIZED=false` disables certificate verification for providers that need it (default verifies), and `DATABASE_POOL_MAX` sets the pool size (default 5).

Link passwords are never included in API responses or browser history. Production creation requires an owner access key; password attempts and creation requests have in-memory rate limits per instance. Public multi-user creation needs account management and durable quotas. Serve over HTTPS.

The included `render.yaml` prepares a **free** Render web service backed by an external Postgres database (no persistent disk). Follow [DEPLOYMENT.md](DEPLOYMENT.md) for setup and verification.

Localhost links work only on the local device. Share links from your own deployed domain. No external short-link domain is assumed. QR codes contain the short URL, not the protected destination. Browser history is private to the browser profile; removing a history entry does not revoke a link.

## API

`POST /api/links` accepts JSON:

```json
{
  "url": "https://example.com/article",
  "alias": "my-article",
  "password": "optional-password",
  "startsAt": "2027-01-01T00:00:00Z",
  "expiresAt": "2027-02-01T00:00:00Z"
}
```

Only `url` is required. Omit unused options. Expiration must be in the future and after the start. HTTP(S) destinations only; embedded credentials are rejected.

## Checks

```sh
npm run lint
npm run test
npm run build
```

Tests use an isolated temporary directory and never modify real link data.

## Structure

- `app/page.tsx`: link creation and browser history
- `app/globals.css`: shared colors, layout, and responsive styles
- `app/api/links/route.ts`: validated creation endpoint
- `app/s/[alias]/route.ts`: redirect, scheduling, and password gate
- `lib/links.ts`: persistence and password hashing
- `lib/translations.ts`: Mongolian/English copy
- `tests/links.test.mjs`: persistence and validation tests
