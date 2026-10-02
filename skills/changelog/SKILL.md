---
name: changelog
description: "Family-facing changelog and versions for Family Hub (mukco/family-hub) and the TV (mukco/family-hub-tv). Activate whenever a change to either repo is about to be committed, a PR opened, or a deploy/rollback discussed — every user-visible change ships with a changelog entry, and versions are tagged and switchable."
---

# Changelog & versions — Family Hub and the TV

The family asks "what's new?" and reads the answer in **Settings → What's new** on
the phone and **Options → What's new** on the TV. Those pages are built from the
entries below. A change with no entry is a change nobody hears about.

## The rule

**Every PR to `mukco/family-hub` or `mukco/family-hub-tv` that someone could notice
adds one entry file in the same PR.** Pure refactors, tests and infra that change
nothing on screen get none — say so in the PR body ("No changelog: internal").
Several small fixes in one area may share one entry.

## Entry format (identical in both repos)

`changelog/entries/<YYYY-MM-DD>-<short-slug>.md`

```markdown
---
area: library   # hub: home, library, music, tv, remote, podcasts, read, dinner, chores, board, paper, games, settings, everything
                # TV:  home, tv, library, music, podcasts, games, remote, controller, options, everything
kind: fixed     # new | better | fixed
---
Back on your phone now closes a film instead of leaving Library.
```

### Writing the sentence

Written for the family, read on a phone or a TV across the room:

- **What they will notice**, in their words: "The remote opens on the TV you used last."
  Not how: no "cache", "endpoint", "breaker", "NOTIFY", "refactor", job or file names.
- One or two short sentences. Present tense. No exclamation marks, no emoji (the
  apps use pixel icons; the area picks the icon).
- Name the thing as it appears on screen (Library, Music, the guide, Options, Play on TV).
- A fix says what used to go wrong only if they would recognise it:
  "Shows you ask for appear in the Library as soon as they download — Star Trek sat
  hidden for an afternoon."
- `kind`: **new** = something that wasn't there; **better** = faster/clearer/easier;
  **fixed** = something that was broken.

## Versions

- Date-based: `vYYYY.MM.DD.N` — N counts that day's releases from 1.
- **Hub:** CI computes the next version before building (the app knows its own
  version), deploys, then tags and creates a GitHub Release whose body is the entries
  since the previous tag, grouped New / Better / Fixed. Never tag by hand.
- **TV:** `bin/deploy` does the same from the laptop after a successful deploy, and
  keeps each version on the Pi (`/opt/family-hub-tv/versions/<v>`), so the TV can
  switch between them offline. A deploy with no new commits reuses the current version.
- Releases: `gh release list -R mukco/family-hub` / `-R mukco/family-hub-tv`.

## Switching versions (downgrade / upgrade)

- **Hub — Settings → Versions (admins):** "Switch to this version" dispatches the
  `deploy-version` workflow with that tag (needs `GITHUB_DEPLOY_TOKEN` on the server;
  without it the page says switching isn't set up). From the terminal:
  `gh workflow run deploy-version.yml -R mukco/family-hub -f version=vYYYY.MM.DD.N`.
  Production then runs that tag while `main` is ahead; the next merge to main
  redeploys main. Say so when rolling back, and fix forward if the cause is known.
- **TV — Options → Versions:** picks any version kept on that box and restarts into it.
  From the laptop: `bin/deploy --version vYYYY.MM.DD.N [screen]`.
- Before switching a TV, check it isn't playing (`/api/status` over ssh) unless the
  person asked — a switch restarts the daemon.

## Checklist when shipping

1. Entry file added (or "No changelog: internal" in the PR body).
2. Sentence passes the "would anyone in the family understand it from across the room" test.
3. After the deploy, confirm the release exists and **the running app shows the new
   version** (Settings → What's new / `GET /api/changelog` `current`; TV
   `changelog.json` in `/opt/family-hub-tv/current`) — a green pipeline is not proof.
