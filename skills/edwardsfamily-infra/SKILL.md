---
name: edwardsfamily-infra
description: "Operate the edwardsfamily.app estate — the DigitalOcean VPS, Cloudflare DNS, nightly R2 backups, WARP egress, status/restore/rebuild, and registering new apps. Source of truth is the mukco/edwardsfamily-infra repo; every change is a commit there."
---

# edwardsfamily-infra

The estate is **one VPS running every app behind one Kamal proxy**, described entirely by the repo
`mukco/edwardsfamily-infra` (`~/Documents/code/edwardsfamily-infra`). If something about the server,
DNS, backups, or egress is not in that repo, it does not exist yet — add it there first, then apply it.

Use this skill for: "what's running", "is prod healthy", add/remove an app on the estate, DNS records,
backups or restore, the server itself (resize, rebuild, hardening), WARP egress, disk/RAM, "the box".
For shipping a single app's code use the `deploy` skill; for creating a new app use `rails-vite-template`.

## Map

| Thing | Value |
|---|---|
| Server | DigitalOcean Droplet `edwardsfamily`, NYC3, Ubuntu 24.04, 2 vCPU / 4 GB + 3 GB swap, 90 GB; `ssh root@157.245.123.68` (laptop key) |
| Domain | `edwardsfamily.app` — Cloudflare Registrar + DNS (token in `~/.bashrc` as `CLOUD_FLARE_TOKEN`; export as `CLOUDFLARE_API_TOKEN`) |
| Apps | `hub.` family-hub (Postgres) · `nofuss.` (MySQL + Redis, own auth) · `baseball.` (SQLite, FlareSolverr, WARP env) — table in the repo README |
| Data | `/srv/<app>/{storage,postgres|mysql|redis}` host dirs (Kamal volumes/accessory dirs) |
| Backups | `edwardsfamily-backup.timer` 03:16 UTC → `/srv/backups/<date>` (14 d) + R2 bucket `edwardsfamily-backups` (90 d, pruned by the script); keys in `~/.bashrc` as `R2_*`, rclone remote `offsite:` |
| Egress | Cloudflare WARP (proxy mode, SOCKS5 `127.0.0.1:40000`) + privoxy on the Docker `kamal` gateway `http://172.18.0.1:8118` — for hosts that block datacenter IPs (MLB, ESPN, Savant, FanGraphs) |
| Firewall | ufw 22/80/443 only; fail2ban; unattended security upgrades |

## Repo layout and the command for each job

```
bin/status                 one screen: every host's /up, containers, RAM/disk/load, last backup local+off-site, WARP, cert expiry
bin/new-app --name "X" --slug x [--auth none] [--api-port N --web-port N --pg-port N]
                           template repo → bin/rename → DNS record → /srv dirs → backup line → README row → commits (then: kamal setup in the app)
bin/restore <app> <YYYY-MM-DD> [--offsite]     overwrite the live DB (+uploads) from a backup; asks for confirmation
server/bootstrap.sh        idempotent hardening + Docker + data dirs:  ssh root@IP 'bash -s' < server/bootstrap.sh
dns/records.yml + dns/apply.sh                 desired A records; apply is idempotent (create/update)
backups/backup.sh + backups/systemd/           what the timer runs (pg_dump, mysqldump, SQLite online backup, tars, rclone copy + prune)
egress/setup-warp.sh + egress/README.md        WARP + privoxy install/repair; which env vars an app needs to use it
docs/runbook.md            deploy / add an app / restore / rebuild / resize, step by step
README.md                  topology + the apps table — keep it current
```

## How to work

1. **Check first**: `bin/status`. Most "is it down?" questions end here.
2. **Change = commit**: edit the file in the repo, apply it (`scp`/`ssh`/`dns/apply.sh`), run/verify, commit with a why, push. Never hand-edit the server without mirroring it in the repo — the repo is how the box gets rebuilt.
3. **Adding an app to the estate** is `bin/new-app`; it touches five files so they stay consistent. Adding an *accessory* (DB/redis) to an existing app: host dir in `server/bootstrap.sh`, dump line in `backups/backup.sh`, then the app's `config/deploy.yml`.
4. **Capacity**: ~2 GB used by the three apps; a 4th/5th small app fits; after that resize (DigitalOcean → Resize → CPU/RAM only, ~1 min downtime, containers restart themselves). Prefer one shared Postgres accessory with a DB per app for the next Postgres app.
5. **Rebuild from nothing** (runbook §Rebuild): new Droplet with the laptop SSH key → update the IP in `dns/records.yml`, README, each app's `deploy.yml` → `bootstrap.sh` → `dns/apply.sh` → `egress/setup-warp.sh` → `kamal setup` per app → `bin/restore` each → reinstall the backup timer (runbook §Backups).

## Gotchas (each cost real time)

- **Datacenter-IP blocks masquerade as code bugs** (MLB 406, ESPN 403, Savant hangs, FlareSolverr "challenge timeout"). Test the URL from the server and from the laptop before touching code; the fix is the WARP env (`HTTPS_PROXY`/`NO_PROXY`, and `FLARESOLVERR_PROXY_URL` for FlareSolverr), not retries.
- **Ubuntu's rclone 1.60 fails TLS against R2** — `setup` installs current rclone. Bucket-scoped tokens 403 on `rclone lsd offsite:` by design; `rclone ls offsite:edwardsfamily-backups` is the real check.
- **Resolver negative cache**: querying a hostname before its record exists caches NXDOMAIN for 30 min on the laptop; verify with `curl --resolve host:443:IP` or Cloudflare DoH.
- **Records are DNS-only (grey cloud)** so kamal-proxy can complete Let's Encrypt; turning on Cloudflare's proxy needs SSL mode Full and is a deliberate change.
- **Volumes are root-owned**; an image that drops privileges (NoFuss, uid 1000) needs its host dir chowned — `bootstrap.sh` does it.
- **Railway is gone** (workspace banned 2026-08-20, data lost). Anything still mentioning it is stale; fix the doc.
