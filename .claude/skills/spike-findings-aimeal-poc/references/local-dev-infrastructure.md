# Local Dev Infrastructure

## Validated Patterns

### Supabase local startup
`supabase init` + `supabase start` + `supabase db reset` applies all migrations on first boot.
Schema is defined in `supabase/migrations/` — one file per migration, timestamped.

```bash
supabase start        # boots postgres, auth, edge runtime, studio, realtime
supabase db reset     # wipes + re-applies all migrations (dev only)
supabase db diff      # confirms no drift between code and running DB
```

"No schema changes found" from `db diff` = migration applied exactly.

### Port offset for multiple local Supabase projects
Two Supabase projects cannot share default ports (54321–54327). Offset by 10 in `config.toml`:

```toml
[api]
port = 54331          # default 54321

[db]
port = 54332          # default 54322
shadow_port = 54330   # default 54320

[studio]
port = 54333          # default 54323

[inbucket]
port = 54334          # default 54324

[analytics]
port = 54337          # default 54327

[db.pooler]
port = 54339          # default 54329
```

This project runs on 54331–54339. Coexists with `wfm-ai-family-mealplanner` on defaults.

### Netlify dev proxy to local Supabase
Single `[[redirects]]` block in `netlify.toml` routes all Supabase traffic through Netlify dev.
React app uses relative URLs — zero environment-switching needed.

```toml
[dev]
  command = "vite"
  port = 8888
  targetPort = 5173

[[redirects]]
  from = "/functions/v1/*"
  to = "http://127.0.0.1:54331/functions/v1/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/rest/v1/*"
  to = "http://127.0.0.1:54331/rest/v1/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/auth/v1/*"
  to = "http://127.0.0.1:54331/auth/v1/:splat"
  status = 200
  force = true
```

Frontend calls `/functions/v1/trpc/ping` — Netlify proxies to Supabase on 54331. Works for
tRPC, REST, and Auth.

### RLS pattern
Every table has RLS enabled + a policy using `auth.uid()`. Shared read tables
(e.g. `spoonacular_cache`) use `for select using (true)` with write restricted to service role.

## Landmines

- **`supabase start` without Docker** — fails silently or hangs; Docker Desktop must be running first
- **Port conflict** — if `supabase start` fails with no clear error, check `docker ps` for existing instances on the same ports
- **`supabase/seed.sql` warning** — CLI warns if seed file configured but missing; safe to ignore or add an empty file

## Constraints

- Supabase CLI v2.84.2 tested (v2.90.0 available — update before production)
- `supabase db diff` requires Docker; uses a shadow database on `shadow_port`
- Netlify CLI v24.11.1 tested
- `netlify dev` proxy only works with `force = true` in redirect rules

## Origin
Synthesized from spikes: 001, 004
Source files: `sources/001-supabase-local-schema/`, `sources/004-netlify-supabase-local/`
