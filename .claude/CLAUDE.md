# claude-skills — Project Instructions

## Dual-runtime repo

This repo serves two runtimes:

- **Claude Code CLI (standalone)** — skills installed to `~/.claude/skills/` via `install.sh`, invoked as `/ruby`, `/ts`, etc.
- **Claude Cowork / Claude Code (plugin)** — installed via `/plugin install github:mukco/claude-skills`, invoked as `/claude-skills:ruby`, `/claude-skills:ts`, etc.

The skill format (`SKILL.md` files in `skills/`) is identical for both. The only difference is the namespace prefix when installed as a plugin.

## README maintenance

Whenever a skill is added, removed, renamed, or its purpose changes, update `README.md`:

- Add new skills to the Skills table with a one-line description
- Remove deleted skills from the table
- Update descriptions if a skill's scope changes
- Keep both installation sections accurate if the workflow changes

Do not wait to be asked — README updates are part of any skill change.
