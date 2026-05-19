# claude-skills

Personal skill library and global config for Claude Code CLI and Claude Cowork.

## What's in here

- **`.claude-plugin/plugin.json`** — plugin manifest (makes this repo installable in Claude Cowork and Claude Code)
- **`CLAUDE.md`** — shared global instructions for Claude Code CLI (skill triggers, context directory)
- **`skills/`** — skills usable in both Claude Code CLI and as a Cowork plugin
- **`install.sh`** — bootstrap script for Claude Code CLI standalone install
- **`merge_claude_md.py`** — merges the shared CLAUDE.md block without overwriting machine-specific config

## Skills

### Languages

#### `ruby`
Ruby idioms and OOP design following Sandi Metz / POODR principles. Covers single responsibility, Tell Don't Ask, Law of Demeter, composition over inheritance, dependency injection, and value/service objects. Includes a full design patterns reference (refactoring.guru) in Ruby idioms, module system (include/extend/prepend), blocks/procs/lambdas, the full Enumerable API, and exception handling with Result objects.

#### `js`
Modern JavaScript — closures, scope, hoisting, and the `this` binding table. Async patterns covering the event loop, Promises (all combinators), async/await, sequential vs parallel, debounce/throttle, AbortController, and async generators. OOP with ES6 classes and private fields. Functional programming: pure functions, immutability, composition, currying, memoization. ES modules and CommonJS interop.

#### `ts`
TypeScript type system in depth. `interface` vs `type` decision rules, utility types, generics with constraints and defaults, discriminated unions, control flow narrowing, custom type guards and assertion functions. Advanced types: conditional, mapped, template literal, recursive. Branded/opaque types, phantom types, `satisfies` operator, `const` assertions. Builder pattern with type-safety, Result type, and type-safe event systems. Full tsconfig reference with strict mode flags explained.

#### `python`
Pythonic idioms and OOP. Dataclasses (frozen, ordered, `__post_init__`), ABCs, Protocols for structural subtyping, properties, dunder methods, MRO and `super()`, mixins. Functional patterns: comprehensions, generator functions, `yield from`, full `itertools` and `functools` APIs, decorators, closures. Design patterns in Python idioms. EAFP error handling, custom exception hierarchies, `ExceptionGroup` (3.11+), retry with backoff. Type hints: `TypeVar`, `Generic`, `TypedDict`, `Protocol`, `Literal`, `overload`, `ParamSpec`.

#### `react`
React component patterns and the full hooks API. `useState` (lazy init, functional updates), `useReducer` for state machines, `useEffect` with cleanup and AbortController, `useRef` (DOM, mutable values, previous state), `useMemo`/`useCallback` decision trees, `useContext`, `useTransition`, `useSyncExternalStore`. Custom hooks. Compound components, provider pattern, controlled/uncontrolled/hybrid abstractions, headless components, ErrorBoundary, Portals. Performance: React.memo, stable props, code splitting with `lazy`/`Suspense`, list virtualization, key prop rules.

### Rails / Ruby

#### `activerecord`
ActiveRecord in depth. Associations (all types, `through`, polymorphic, self-referential, counter caches), validations (built-in, custom validators, contexts, database constraints), querying (scopes, finders, batch processing, eager loading, N+1 prevention), callbacks (lifecycle, transaction, conditional — and when to avoid them), migrations (safe patterns for large tables, reversible migrations, indexes and constraints).

#### `rspec`
RSpec testing with FactoryBot. Full matcher reference (equality, truthiness, comparisons, collections, errors, output, change, yield, composing). Test doubles: doubles, spies, stubs, mocks, argument matchers, message chains. FactoryBot: factory definition, traits, inheritance, transients, associations, build strategies, callbacks. Rails-specific specs: models, requests, controllers, mailers, jobs, system tests, routing.

#### `decorators`
Draper decorator patterns for Rails views. Separating presentation logic from models, building `ApplicationDecorator`, testing decorators, and anti-patterns to avoid.

#### `rails-conform`
Full Rails code review workflow. Loads `activerecord`, `rspec`, `ruby`, and `principles` automatically, then runs a structured review covering models, services, controllers, jobs, tests, and general Ruby quality. Invoke this for a deep review rather than individual skills.

### Engineering

#### `principles`
Language-agnostic software engineering principles. DRY (knowledge vs structure, Rule of Three, Wrong Abstraction, Inline First). Full SOLID breakdown with identification tests and decision trees for each principle. Naming rules for variables, booleans, methods, classes, constants, and tests. Fowler's code smell catalog (Bloaters, OO Abusers, Change Preventers, Couplers, Dispensables). YAGNI, KISS, coupling/cohesion, premature optimization, and incremental design (Red-Green-Refactor, Boy Scout Rule).

### GitHub

#### `github`
`gh` CLI reference for operations not covered by top-level commands — sub-issues via REST API (global IDs, add/list/reorder), and piping `gh` JSON output through `toon` to reduce token cost.

#### `issue`
GitHub issue writing with the WHAT/WHY/HOW framework. Covers issue structure (title format, body template with Problem/Solution/Details/Why sections), issue types (model/entity, feature/flow, research/spike), writing guidelines (specific, concrete examples, show don't tell), and a quality checklist.

#### `pr`
Creates a GitHub pull request from the current branch. Analyses commits and diff to write a concise title, summary bullets, and test-plan checklist. Pushes the branch if needed. Accepts `--draft` flag.

### Other

#### `mcp-server`
Ruby MCP server development using the `mcp` gem. Tools, prompts, resources, transport (stdio and HTTP), LLM tool integrations, streaming, and Rails integration patterns.

#### `sync`
Pulls the latest from this repo and installs into `~/.claude/`. Detects the repo location across Arch Linux and macOS, runs `git pull`, rsyncs skills, and merges the CLAUDE.md block. Machine-specific CLAUDE.md content outside the markers is never touched.

---

## Installation

### Claude Cowork / Claude Code (plugin — recommended)

Install directly from GitHub inside any Claude Code or Cowork session:

```
/plugin install github:mukco/claude-skills
```

Skills are namespaced under the plugin name: `/claude-skills:ruby`, `/claude-skills:ts`, etc.

To update:
```
/plugin update claude-skills
```

---

### Claude Code CLI (standalone install)

Use this if you want skills available without the `/claude-skills:` namespace prefix — e.g. `/ruby` instead of `/claude-skills:ruby`.

```bash
git clone https://github.com/mukco/claude-skills.git ~/Documents/code/claude-skills
cd ~/Documents/code/claude-skills
./install.sh
```

Then restart Claude Code.

To pull updates from inside a Claude Code session:
```
/sync
```

This pulls the latest, merges skills into `~/.claude/skills/`, and updates the shared CLAUDE.md block. Machine-specific content in your local CLAUDE.md is never overwritten.

---

## Adding or updating a skill

1. Edit the skill in `~/.claude/skills/<skill-name>/`
2. Copy it into this repo: `rsync -a ~/.claude/skills/<skill-name>/ ~/Documents/code/claude-skills/skills/<skill-name>/`
3. Update the Skills section in `README.md`
4. Commit and push — plugin installs update automatically on next `/plugin update`
