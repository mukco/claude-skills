<!-- BEGIN claude-skills -->
# Claude Code — Global Instructions

## Context directory

`~/claude-context/` holds files (screenshots, images, code snippets, etc.) staged by the user via Claude Context UI. When the user says things like "look in claude-context", "check the context folder", or references a file by name without a path, read from `~/claude-context/` first.

## Skill triggers

> **Note:** Automatic triggers only work with the **CLI standalone install** (skills in `~/.claude/skills/`). If using the plugin method (`--plugin-dir`), invoke skills manually with the namespace prefix: `/claude-skills:ruby`, `/claude-skills:ts`, etc.

For CLI standalone installs, invoke the relevant skill automatically when the context matches:

| Context | Skill |
|---------|-------|
| Working in `.rb` files, writing or reviewing Ruby code | `ruby` |
| Working in `.js` / `.mjs` files, writing or reviewing JavaScript | `js` |
| Working in `.ts` / `.tsx` files, writing or reviewing TypeScript | `ts` |
| Working in `.py` files, writing or reviewing Python | `python` |
| Working with React components, hooks, JSX | `react` |
| Working in `app/models/`, `db/migrate/`, ActiveRecord queries or associations | `activerecord` |
| Working in `*_spec.rb` files, writing or reviewing RSpec tests | `rspec` |
| Working in `app/decorators/`, `*_decorator.rb` files | `decorators` |
| Reviewing code for quality, discussing architecture, refactoring | `principles` |
| Writing a GitHub issue or ticket | `issue` |
| Referencing a PR or issue number, checking repo state | `github` |
| Deploying, shipping, or debugging an app on the edwardsfamily.app estate (Kamal/VPS), creating a new app from the template, backups/restore, Railway legacy | `deploy` |
<!-- END claude-skills -->
