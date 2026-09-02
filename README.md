# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

No Docker, database setup or shared cloud credentials are required. Development
uses the shared LaRutica backend declared in the versioned `.env.development`
and `.dev.vars` files. The latter exposes the same public address to the local
Cloudflare Worker used by Vinext.

1. Clone the repository and enter its directory:

   ```bash
   git clone <repository-url>
   cd larutica-frontend
   ```

2. Confirm that Node.js meets the required version:

   ```bash
   node --version
   ```

   The project requires Node.js `22.13.0` or newer.

3. Install the exact dependencies recorded in `package-lock.json`:

   ```bash
   npm ci
   ```

4. Start the local development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in a browser. Registration,
   login, profiles and authorized Admin operations use the hosted backend.

To verify a production build, run:

```bash
npm run build
```

To verify npm registry signatures and production vulnerabilities:

```bash
npm run security:verify
```

## Supabase authentication

During development, the browser still calls same-origin `/api` routes. When no
Supabase server secret is installed locally, those routes proxy to the deployed
backend. The proxy adapts the production session cookie for `localhost` while
preserving `HttpOnly`, `SameSite=Strict` and server-side authorization.

Supabase Auth owns password hashing (bcrypt) and identity verification. Access
and refresh tokens are received only by the server and discarded after the
credentials are validated. The browser receives an opaque session identifier in
an `HttpOnly` cookie; the database stores only its SHA-256 hash.

Application sessions expire after 8 hours, after 30 minutes without an
authenticated request, or when the same account signs in again. Profile and
administrator operations always go through same-origin server APIs. The
`SUPABASE_SECRET_KEY` remains server-only. The legacy
`SUPABASE_SERVICE_ROLE_KEY` is accepted temporarily for existing projects.

### Hosted backend

The publishable backend address in `.env.development` and `.dev.vars` is safe to
version. The
Supabase secret/service-role key bypasses RLS and is stored only as a secret in
the hosting platform. Collaborators do not need it and must never receive it
through Git, chat or email.

Maintainers who intentionally run the backend directly can copy `.env.example`
to `.env.local` and obtain their own authorized values. A clone without that
file automatically stays in proxy mode.

See `supabase/README.md` for remote migrations, redirect URLs and environment
details.

### Windows PowerShell

If PowerShell reports that `npm.ps1` is not digitally signed or that script
execution is disabled, use the Windows command shim instead. This does not
require changing the system execution policy:

```powershell
npm.cmd install
npm.cmd run dev
```

If port `3000` is already in use, stop the process using that port and run the
development command again.

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the application and run local contract/render tests
- `npm run test:auth:cloud`: verify the configured Supabase project directly
- `npm run test:auth:e2e`: with the app running, verify the complete API flow
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
