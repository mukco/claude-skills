---
name: sync
description: Sync the claude-skills repo into this machine's ~/.claude/ environment. Use when setting up a new machine or pulling latest skill updates from GitHub.
---

# Sync Claude Skills

Pull the latest skills and config from the `claude-skills` repo and install them into `~/.claude/`.

## Step 1 — Locate the repo

Check these paths in order, use the first that exists:

```bash
~/Documents/code/claude-skills    # Arch Linux (home)
~/code/claude-skills               # Mac (work) — common
~/projects/claude-skills           # Mac (work) — alternative
~/Developer/claude-skills          # Mac (work) — alternative
```

If none exist, ask the user where they cloned the repo.

## Step 2 — Locate ~/.claude/

`$HOME/.claude/` is the correct path on both Arch Linux and macOS. Verify it exists:

```bash
ls "$HOME/.claude/skills"
```

If missing, run `mkdir -p "$HOME/.claude/skills"`.

Also ensure the claude-context directory exists:

```bash
mkdir -p "$HOME/claude-context"
```

## Step 3 — Sync

```bash
REPO="<resolved path from Step 1>"

git -C "$REPO" pull

rsync -av "$REPO/skills/" "$HOME/.claude/skills/"

cp "$REPO/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
```

## Step 4 — Confirm

Report what changed. Remind the user to restart Claude Code to pick up new skills.

## Notes

- `rsync` merges — local-only skills not in the repo are preserved.
- `rsync` is available by default on both macOS and Arch Linux.
- To push local skill changes back: copy updated skill dirs into `$REPO/skills/`, commit, and push.
