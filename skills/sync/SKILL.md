---
name: sync
description: Sync the claude-skills repo into this machine's ~/.claude/ environment. Use when setting up a new machine or pulling latest skill updates from GitHub.
---

# Sync Claude Skills

Pull the latest skills and config from the `claude-skills` repo and install them into `~/.claude/`.

## Steps

1. Find the local clone of the `claude-skills` repo. Default: `~/Documents/code/claude-skills/`. Ask the user if it's not there.
2. Pull latest from GitHub.
3. Rsync all skills into `~/.claude/skills/` — merges without deleting local-only skills.
4. Copy `CLAUDE.md` to `~/.claude/CLAUDE.md`.
5. Confirm what changed.

## Implementation

```bash
REPO="${HOME}/Documents/code/claude-skills"

git -C "$REPO" pull

rsync -av "$REPO/skills/" "$HOME/.claude/skills/"

cp "$REPO/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
```

## Notes

- Local-only skills (not in the repo) are preserved — rsync merges, it does not wipe.
- After syncing, restart Claude Code to pick up any new skills.
- To push local changes back to the repo, copy updated skills into `$REPO/skills/` and commit.
