# claude-skills

Personal Claude Code skill library and global config, synced across machines.

## What's in here

- **`CLAUDE.md`** — shared global instructions for Claude Code (skill triggers, context directory)
- **`skills/`** — Claude Code skills covering languages, frameworks, and workflows
- **`install.sh`** — bootstrap script for setting up a new machine
- **`merge_claude_md.py`** — merges the shared CLAUDE.md block without overwriting machine-specific config

## Skills

| Skill | Purpose |
|-------|---------|
| `ruby` | Ruby idioms, OOP (Sandi Metz / POODR), design patterns, modules, closures, Enumerable |
| `js` | JavaScript idioms, closures, async, functional programming, ES modules |
| `ts` | TypeScript type system, generics, narrowing, branded types, advanced types |
| `python` | Python idioms, OOP, functional patterns, type hints, design patterns |
| `react` | React hooks, state management, performance, composition patterns |
| `activerecord` | Associations, queries, migrations, callbacks, scopes |
| `rspec` | RSpec + FactoryBot — matchers, doubles, shared examples |
| `decorators` | Draper decorator patterns for Rails views |
| `rails-conform` | Full Rails code review workflow — loads relevant skills automatically |
| `principles` | DRY, SOLID, YAGNI, KISS, naming, code smells — language-agnostic |
| `github` | `gh` CLI — issues, PRs, sub-issues, CI |
| `issue` | GitHub issue writing with WHAT/WHY/HOW framework |
| `pr` | Create a pull request from the current branch |
| `mcp-server` | Ruby MCP server development |
| `sync` | Pull latest from this repo and install into `~/.claude/` |

## Setup — new machine

```bash
git clone https://github.com/mukco/claude-skills.git ~/Documents/code/claude-skills
cd ~/Documents/code/claude-skills
./install.sh
```

Then restart Claude Code.

## Keeping in sync

From inside any Claude Code session:

```
/sync
```

This pulls the latest from GitHub, merges skills into `~/.claude/skills/`, and updates the shared CLAUDE.md block. Machine-specific content in your local CLAUDE.md is never overwritten.

## Adding or updating a skill

1. Edit the skill in `~/.claude/skills/<skill-name>/`
2. Copy the updated directory into this repo: `rsync -a ~/.claude/skills/<skill-name>/ ~/Documents/code/claude-skills/skills/<skill-name>/`
3. Commit and push
