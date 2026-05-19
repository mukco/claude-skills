---
name: pr
description: "Create a GitHub pull request from the current branch. Analyses commits and diff to write a concise title, summary bullets, and test-plan checklist. Pushes the branch if needed. Pass --draft to open as a draft PR."
allowed-tools: Bash(git status) Bash(git log *) Bash(git diff *) Bash(git branch *) Bash(git push *) Bash(git rev-parse *) Bash(git remote *) Bash(bundle exec rspec *) Bash(gh pr create *) Bash(gh repo view *)
argument-hint: [--draft]
---

## Context

Arguments passed: `$ARGUMENTS`

Draft mode: `$ARGUMENTS` contains `--draft` → pass `--draft` flag to `gh pr create`.

### Current branch

!`git branch --show-current`

### Base branch

!`gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main"`

### Commits on this branch (not yet in base)

Using the base branch name from above, run:

```bash
git log <base-branch>..HEAD --oneline
```

### Full diff

```bash
git diff <base-branch>..HEAD
```

---

## Step 1 — Pre-flight checks

Run these in order. Stop and tell the user if any check fails.

### 1a — Uncommitted changes

```bash
git status --short
```

If there are any uncommitted or unstaged changes (non-empty output), **stop and warn**:
> "There are uncommitted changes. Commit or stash them before opening a PR."

### 1b — Tests (only if spec/ exists)

```bash
ls spec/ 2>/dev/null && bundle exec rspec --format progress
```

If specs exist and any fail, **stop and report the failures**. Do not open the PR until tests are green.

---

## Step 2 — Draft the PR

Using the commits and diff loaded above, write:

### Title

- One line, under 70 characters
- Action-oriented: start with a verb ("Add", "Fix", "Move", "Remove", "Update")
- Describe the _outcome_, not the mechanism — "Move caching to DailySummaryService" not "Edit daily_summary_service.rb"
- No ticket numbers, no branch name

### Body

Use exactly this template:

```
## Summary
- [bullet: what changed and why — focus on intent, not line-by-line description]
- [repeat for each logical change group; aim for 2–5 bullets]

## Test plan
- [ ] [concrete thing to verify manually or via logs/response]
- [ ] [repeat; at least 2 items, no more than 6]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Summary bullets** should explain intent: "Moves caching out of controller so business logic is not duplicated in the request layer" — not "Changed line 12 of daily_summary_controller.rb".

**Test plan items** should be specific and actionable: "GET /api/daily_summary returns 200 with and without ?refresh=true" — not "Test the endpoint".

---

## Step 3 — Push and create

### Push if needed

Check whether the current branch already exists on the remote:

```bash
git remote get-url origin
git branch -r --list "origin/$(git branch --show-current)"
```

If the branch is not on the remote, push it:

```bash
git push -u origin $(git branch --show-current)
```

### Create the PR

```bash
gh pr create \
  --title "<title from Step 2>" \
  --base <base branch from Context> \
  [--draft if --draft was passed] \
  --body "$(cat <<'EOF'
<body from Step 2>
EOF
)"
```

After creation, output the PR URL so the user can open it directly.
