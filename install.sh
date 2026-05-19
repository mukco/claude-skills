#!/usr/bin/env bash
# Bootstrap: installs skills and CLAUDE.md into ~/.claude/
# Run this once on a new machine after cloning the repo.
# After that, use the /sync skill inside Claude Code to pull updates.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Claude skills from $REPO_DIR..."

mkdir -p "$HOME/.claude/skills"
mkdir -p "$HOME/claude-context"

rsync -av "$REPO_DIR/skills/" "$HOME/.claude/skills/"

python3 "$REPO_DIR/merge_claude_md.py" "$REPO_DIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"

echo ""
echo "Done. Restart Claude Code to pick up new skills."
