---
name: rails-vite-template
description: "Create and build apps from mukco/rails-vite-template (Rails 8.1 API + Vite React TS PWA, Google-allowlist or no auth, Kamal-ready). Covers bin/new-app → bin/rename, the kernel you get, slice conventions, mobile-first rules, and how to evolve the template itself."
---

# rails-vite-template

The house pattern, as a GitHub template repo: `mukco/rails-vite-template`
(`~/Documents/code/rails-vite-template`). Family Hub's proven kernel extracted into a fresh
`rails new --api` + `npm create vite` skeleton, with placeholders that `bin/rename` fills in.

Use this skill when: starting a new app/project, "scaffold", "new app", working in any repo that has
`server/` + `web/` + `bin/dev` + `config/deploy.yml` (it came from this template), or changing the
template itself.

## Creating an app (the whole flow, ~20 min to live)

```bash
cd ~/Documents/code/edwardsfamily-infra
bin/new-app --name "Recipe Box" --slug recipes            # Google-allowlist sign-in (family apps)
bin/new-app --name "Shop Tool" --slug shop --auth none    # app with its own accounts (NoFuss-style)
```
That creates `mukco/<slug>` from the template, clones to `~/Documents/code/<slug>`, runs `bin/rename`
(placeholders, new credentials, `server/.env`, icons, deps), registers DNS/server dirs/backups in the
estate, and commits both repos. Then, in the app:
1. Fill `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`ALLOWED_EMAILS` in `server/.env` (same Google client as the other apps) and add the two redirect URIs it prints.
2. `docker compose up -d && (cd server && bin/rails db:prepare) && bin/dev` — dev login without Google: `http://localhost:<api-port>/dev/login/1`.
3. `export ASDF_RUBY_VERSION=3.3.6 KAMAL_REGISTRY_PASSWORD=$(gh auth token) && kamal setup` → `https://<slug>.edwardsfamily.app`.

Manual alternative (no estate registration): create the repo from the template on GitHub, then
`bin/rename --name … --slug … --host … [--api-port --web-port --pg-port] [--auth none]`. `bin/rename`
deletes itself when done; placeholders are `__APP_NAME__ __APP_SLUG__ __APP_SNAKE__ __APP_HOST__ __COOKIE_KEY__ __DEV_API_PORT__ __DEV_WEB_PORT__ __DEV_PG_PORT__`.

## What the kernel gives you (don't reinvent these)

- **Auth**: `User` + `Allowlist` (ENV `ALLOWED_EMAILS`), `Auth::SessionsController` (OmniAuth Google + CSRF-protected POST), `Api::CsrfController`, `Api::MeController`, `Dev::SessionsController` (dev only), `ApplicationController#require_login` with an `INTERNAL_API_KEY` header bypass for local tools, `Api::BaseController` (`before_action :require_login`) that every API controller inherits. Cookie store with a per-app key, `COOKIE_DOMAIN` for estate-wide SSO, 1-year expiry for installed PWAs. `--auth none` strips the Google parts and leaves this plumbing.
- **SPA serving**: `StaticController` + `root` + catch-all that 404s file-like paths (stale hashed assets on cached phones must never get HTML).
- **Web shell**: `AuthProvider`/`useAuth` (`/api/me` → user; `signIn` posts the CSRF form; `signOut`), `Login`, `Shell` (top bar + safe-area padding), `lib/api.ts` (`api<T>()`, `json()`), minimal mobile-first CSS tokens (light/dark).
- **PWA**: manifest + icons (`bin/make-icons "R"` makes placeholders), service worker that never intercepts `/auth` `/api` `/dev` `/up`, boot watchdog (clears SW caches after a bad deploy), `CrashGuard` error boundary, `maximum-scale=1`, safe-area insets.
- **Ops**: `Dockerfile` (web built into `server/public`), `config/deploy.yml` + `.kamal/secrets` (secrets read from `server/.env` + `master.key`), `docker-compose.yml` (dev Postgres), `.github/workflows/ci.yml` (rspec + build + brakeman/bundler-audit; deploy job stubbed), `bin/dev`, `bin/audit-mobile.mjs` (`npm run audit:mobile`).
- **Specs**: rails_helper/spec_helper, FactoryBot user, request specs for sign-in/allowlist/sign-out, internal key, SPA fallback; model spec for `User`.

## Conventions for code written on top of it

- **Vertical slices**: `web/src/apps/<slice>/` + `server/app/controllers/api/<slice>/` (inherit `Api::BaseController`) + models `module <Slice>` with `table_name_prefix "<slice>_"`. Slices never query each other's tables; the shared kernel stays tiny (`users`, auth, base controller).
- **Routes**: one `namespace :<slice>` block per slice under `namespace :api`; register client routes in `web/src/App.tsx`.
- **Every controller/model/service change ships with RSpec** (request/model specs, FactoryBot, stub external HTTP with WebMock). `cd server && bundle exec rspec` green before any deploy.
- **Mobile is the primary target**: 44 px touch targets, no horizontal overflow, wrap/scroll tab strips, cards over wide tables on phones; run `npm run audit:mobile` (iPhone 13 viewport; overflow + height + screenshots) before calling UI done.
- **Secrets**: `server/.env` (gitignored) only; production reads it through `.kamal/secrets`. Never commit keys; never put a key in a Kamal `env.clear`.
- **Upstreams that block datacenter IPs** (MLB, ESPN, Savant, FanGraphs…): add the WARP env from `edwardsfamily-infra/egress/` to `deploy.yml` — see the `edwardsfamily-infra` skill.
- **Cookie key must stay unique per app** (`config/application.rb`); copying another app's key logs users out of both.

## Evolving the template

- The template is a normal repo: change it, run the e2e check (copy to a scratch dir, `bin/rename … `, `bundle exec rspec`, `npm run build`, `docker build --network=host .`), commit, push. GitHub "template" status is already set.
- Existing apps do **not** auto-update. When a kernel fix matters (auth, SPA fallback, watchdog), port it by hand to family-hub/baseball and note it in the commit.
- Keep `bin/rename` placeholders and `bin/strip-google-auth` in step with any file you add that contains the app name, host, ports, or auth.
- Local `docker build` on this laptop needs `--network=host` (buildkit npm timeouts); Kamal's builder does not.
