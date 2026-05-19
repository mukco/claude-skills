---
name: rails-conform
description: "Review and fix Ruby/Rails code to match project conventions — thin controllers, service patterns, AR queries, RSpec structure. Activate when asked to clean up, fix conventions, or conform code to project style. Pass --all to target every Ruby file in the repo instead of just the diff."
disable-model-invocation: true
allowed-tools: Bash(git diff *) Bash(find *) Bash(git log *) Bash(bundle exec rspec *) Read Edit Write Glob Grep Skill
argument-hint: [--all]
---

## Scope

Arguments passed: `$ARGUMENTS`

**If `$ARGUMENTS` contains `--all`**: the scope is every Ruby file found below.

**Otherwise (default)**: work only from the diff below.

### Git diff (default scope)

!`git diff HEAD`

### All Ruby files (used when --all is passed)

!`find . -name "*.rb" -not -path "*/vendor/*" -not -path "*/.git/*" | sort`

---

## Step 0 — Load reference skills

Before analysing any code, invoke all four skills to load their full rule sets into context. They define the authoritative standards enforced in Step 1.

- Invoke the `activerecord` skill — ActiveRecord queries, associations, callbacks, migrations
- Invoke the `rspec` skill — test structure, matchers, doubles, FactoryBot
- Invoke the `ruby` skill — Ruby OOP, modules, closures, Enumerable, design patterns, error handling
- Invoke the `principles` skill — DRY, SOLID, naming, code smells, no magic numbers, simplicity

---

## Step 0.5 — Filter cached files (`--all` only)

Skip this step entirely if not running with `--all`.

1. Read `.rails-conform-cache.json` if it exists. If missing, treat it as `{}`.
2. Run this single command to get the current git hash for every file in scope:
   ```bash
   find . -name "*.rb" -not -path "*/vendor/*" -not -path "*/.git/*" | sort | while read f; do printf "%s\t%s\n" "$f" "$(git log -1 --format="%h" -- "$f")"; done
   ```
3. Compare each `file → hash` pair against the cache. Remove any file from scope whose hash matches the cached value — it has not changed since it was last reviewed.
4. If the filtered list is empty, skip directly to Step 4 and report: "All files up to date — nothing to review."

---

## Step 1 — Analyse

Read through the code in scope using the full rules from the loaded skills plus the project-specific rules below. Build a complete list of every issue before making any changes.

### Controllers

- Must inherit from `Api::BaseController` (not `ApplicationController` directly)
- Must be thin — no business logic, no data transformation, no conditionals beyond routing
- Only valid body: `render json: result` or `head :ok`
- No inline `rescue` — `BaseController` handles that globally
- No `before_action` for authentication (internal app — no auth)

### Services

- Must use `class << self` — no instance methods called from outside, no `.new` needed
- External HTTP must use Faraday with explicit `timeout`, `open_timeout`, and `:retry` middleware:
  ```ruby
  conn = Faraday.new do |f|
    f.request :retry, max: 2, interval: 1.0
    f.response :raise_error
    f.options.timeout      = 30
    f.options.open_timeout = 10
  end
  ```
- Top-level `rescue => e` must return `{ error: e.message }` — never raise from a service public method
- Do not cache error results — check for `:error` before calling `cache_set`:
  ```ruby
  result = fetch_something(id)
  cache_set(key, result) unless result[:error]
  result
  ```
- In-memory cache uses `@@cache` / `@@cache_timestamps` with a `CACHE_TTL` constant — see `StatcastService` for the exact pattern

### OpenAI Integration

- All AI calls go through `OpenAi::Client#json_completion` — never call the OpenAI API directly
- Must pass `interaction_type:` (e.g. `"factoids"`, `"game_insights"`)
- `temperature: 0.2` for structured output, `0.7` for creative/varied output
- `AssistantService` is the only exception — it uses tool-calling mode directly, not `json_completion`

### ActiveRecord

Apply all rules loaded from the `activerecord` skill.

### RSpec

Apply all rules loaded from the `rspec` skill.

### General Ruby

Apply all rules loaded from the `ruby` skill (OOP design, modules, closures, Enumerable, design patterns, error handling) and the `principles` skill (DRY, SOLID, naming, code smells, magic numbers, simplicity).

Key rules that surface most often in review — treat these as a fast-check layer, not a replacement for the full skill rule sets:

- Use guard clauses and early returns over nested conditionals
- Use `&.` for safe navigation instead of `if x && x.y`
- Never rescue `Exception` — always rescue `StandardError` or a specific subclass
- No bare `rescue; nil` — swallowed exceptions hide bugs
- `freeze` string constants and constant arrays/hashes
- Remove dead code and unused variables — do not comment out
- No magic numbers or magic strings — extract to named constants
- Name methods after intent, not implementation (query methods: noun; command methods: verb phrase)
- Boolean flag parameters signal two methods are needed — split them
- Replace growing `if/elsif` chains on type with polymorphism or strategy
- Apply Law of Demeter — no chained dot calls through intermediaries (`a.b.c.d`)
- Single Responsibility — if a class or method description requires "and", extract

---

## Step 2 — Fix

Make every fix identified. Use the `Edit` tool for targeted changes. For each fix:
- Change only what's wrong — don't rewrite surrounding code that's already correct
- If a controller action contains business logic, extract it to a new or existing service
- If a service instantiates itself, convert public methods to `class << self`

---

## Step 2.5 — Update cache (`--all` only)

Skip this step entirely if not running with `--all`.

Merge the hashes collected in Step 0.5 for every file that was reviewed into `.rails-conform-cache.json` (preserving any existing entries for files not touched this run), then write the file using the `Write` tool.

---

## Step 3 — Verify

After all fixes are applied:

1. Derive the spec file path for each changed source file:
   - `app/services/foo_service.rb` → `spec/services/foo_service_spec.rb`
   - `app/controllers/api/foo_controller.rb` → `spec/controllers/api/foo_controller_spec.rb`
2. Run only the specs for changed files:
   ```bash
   bundle exec rspec <spec_file_1> <spec_file_2> ...
   ```
3. If specs fail:
   - Fix the root cause in the source code (not by modifying the spec)
   - Re-run until green
   - If a spec itself was wrong (testing implementation rather than behaviour), fix the spec and note why

---

## Step 4 — Report

Summarise what changed:

- List each file modified with a one-line description of what was fixed
- Note any spec failures encountered and how they were resolved
- Flag anything you found but chose not to fix (e.g. a larger refactor needed that's out of scope)
