---
name: review
description: "Review a change before it merges: fixed rules + a triage agent pick reviewers (design, security, quality), they run in parallel, a verifier tries to disprove every finding, and only what survives is reported. Run before opening or merging any PR in the estate's repos, or when asked to review a branch or commit range."
argument-hint: "[BASE [HEAD]]  e.g. origin/master  |  abc123~1 abc123"
---

# Review — the software factory's inspection line

Every change gets the reviewers it needs and no more. Nothing here merges or
deploys: the person still says "merge". The point is that what they see has
already been looked at from each angle, and what is reported is true.

## 1. The range

In the repo being changed. `BASE` / `HEAD` from the arguments, else the
merge-base with origin's default branch and `HEAD`. Note the repo, the range
and a one-paragraph description of what the change is for (from the commits
or the conversation).

## 2. Fixed rules (free, certain)

```bash
python3 ~/.claude/skills/review/bin/rules BASE HEAD
```

`required` reviewers WILL run. `nothing: true` (only docs/changelog) → say
"No review needed: docs only" and stop.

## 3. Triage (cheap)

Agent `review-triage` with: repo path, range, the rules JSON, the
description. It returns `add` (extra reviewers, with why) and `skip_reasons`.
Reviewers = `required` ∪ `add`. Triage can only add.

## 4. Reviewers, in parallel

One Agent call per reviewer, all in the same message: `review-design`,
`review-security`, `review-quality`. Give each: repo path, range, the
description, and for design which TV/host to use (bedroom
`raspberrypi.local` unless the change is TV-specific). Each returns a JSON
array of findings.

## 5. Verify, in parallel

One `review-verify` Agent per finding (all in one message), given the
finding, repo path and range. Keep `confirmed`; list `pre-existing`
separately; drop `rejected` (but count them).

## 6. Report

Short, to the person:

```
Review of <repo> <range> — reviewers: design, quality (security skipped: UI only)
Blockers: 1   Should: 2   Nits: 0   (4 rejected by verification, 1 pre-existing)

[blocker] ui/style.css:96 — <claim>  (evidence: <file/screenshot>)  fix: <fix>
...
```

Then fix blockers and shoulds yourself when the fix is clear and inside the
change's scope, re-run only the reviewers whose findings you fixed, and say
what changed. Ask before anything beyond the change's scope.

## 7. Log

Append one line per review, for the weekly spot check of what triage
skipped:

```bash
python3 - <<'EOF'
import json, time, os
p = os.path.expanduser("~/.claude/review-log.jsonl")
open(p, "a").write(json.dumps({"at": time.strftime("%FT%T"), "repo": "<repo>", "range": "<range>",
  "ran": [...], "skipped": {...}, "confirmed": N, "rejected": N, "pre_existing": N}) + "\n")
EOF
```

## Weekly spot check

When asked (or once a week when reviewing anyway): pick three logged reviews
with a skipped reviewer, run that reviewer on the range, and if it finds a
real problem, tighten `bin/rules` or the triage agent's guidance.

## Tools here

- `bin/rules` — the fixed triage.
- `bin/tv-shots.mjs` — real-data screenshots of the TV page (design reviewer).
