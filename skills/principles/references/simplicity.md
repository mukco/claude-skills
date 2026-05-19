# Simplicity — YAGNI, KISS, and Avoiding Premature Complexity

Simplicity is a design goal, not a starting condition. Code tends toward complexity by accumulation; keeping it simple requires active discipline.

---

## YAGNI — You Ain't Gonna Need It

Build only what the current requirement demands. Do not design for hypothetical future requirements.

### Why YAGNI Matters

- Speculative features cost time now (design, implementation, tests, code review)
- They carry ongoing maintenance cost forever
- They may never be used — requirements change
- They make the codebase harder to understand for every future reader
- They make the eventual real requirement harder to implement — you're working around the speculation

### YAGNI Decision Filter

```
Am I building this because:
├── A current story or requirement needs it → Build it
└── I think we might need it later
    └── Do I have a specific, concrete, near-term use case (next sprint)?
        ├── Yes → Discuss with team — might still wait
        └── No → YAGNI. Delete the speculative abstraction.
```

### Common YAGNI Violations

| What You Built | Why It's Speculative |
|---------------|---------------------|
| Plugin system | No plugins exist or are planned |
| Abstract base class with one implementation | OCP applied before a second case |
| Configuration flag always set to same value | No real variation needed |
| Generic parameter for one-use method | Generality not needed |
| Extra indirection "for flexibility" | Flexibility for what? |
| "Future-proof" API versioning on a new endpoint | No second version exists |

### The Rule

Wait until you have the second (or third) concrete use case before extracting an abstraction. The first use defines one possible shape; the second reveals the real variation; the third confirms the pattern. Extracting on the first use frequently produces the wrong abstraction.

---

## KISS — Keep It Simple

The simplest solution that correctly meets the requirements is the right solution. Complexity is not sophistication.

### Measuring Simplicity

A solution is simple when:
- A new team member can understand it in one reading
- Adding the next feature doesn't require understanding the whole system
- Tests are easy to write because behavior is obvious
- The implementation fits in a few lines without clever tricks

A solution is complex when:
- Understanding it requires reading multiple files
- It has multiple layers of indirection with no apparent reason
- Changing one thing breaks something in an unrelated area
- It requires a comment to explain what the code does

### Clever Code Is Not Good Code

```
# CLEVER — technically works, requires decoding
sorted = data.zip((0..data.size).to_a).sort_by { |v, i| [!v.nil? ? 0 : 1, i] }.map(&:first)

# SIMPLE — immediately readable
sorted = data.compact + data.select(&:nil?)
# or even more explicit:
non_nil, nils = data.partition { |v| !v.nil? }
sorted = non_nil + nils
```

Clever code signals that the author was optimizing for their own satisfaction, not for the team's ability to maintain it.

---

## Coupling and Cohesion

### Cohesion

High cohesion: everything inside a module belongs together. It does one thing, and all its parts serve that one thing.

Low cohesion: a module contains loosely related or unrelated pieces. Adding a feature requires understanding a large, unfocused surface area.

**Aim for high cohesion**: each class, module, and function contains only things that change together and for the same reason.

### Coupling

Coupling measures how much one module knows about another. High coupling means changing one module forces changes in others.

| Type | Description | Example |
|------|-------------|---------|
| Content coupling (worst) | One module modifies another's internal data directly | Reaching into private fields |
| Control coupling | One module controls flow of another via flag | Boolean parameter that changes behavior |
| Stamp coupling | Modules share a complex structure unnecessarily | Passing full User object when only email needed |
| Data coupling (best) | Modules share only simple, necessary data | Passing just the email string |

**Aim for low coupling**: pass only the minimum data a collaborator needs. Don't give a function a whole database connection if it only needs to run one query.

### Coupling Decision

```
What does this collaborator actually need?
├── Specific piece of data → Pass that data (data coupling — best)
├── An operation on data → Pass an object that provides that operation
└── Many pieces from one object → Pass the object (but check if Feature Envy applies)
```

---

## Premature Optimization

> Premature optimization is the root of all evil. — Knuth

Optimize only:
1. After profiling — you know *where* the bottleneck is
2. When performance is a demonstrated problem — not a theoretical one
3. At the specific hotspot — not the whole system

```
Is this optimization driven by a measured performance problem?
├── Yes, profiler identified this as a hotspot → Optimize
└── No, it "might be slow"
    └── Does the simpler version meet the performance requirement?
        ├── Yes → Write the simpler version
        └── No → Profile first, then optimize the specific bottleneck
```

### What "Premature" Looks Like

- Pre-calculating results that are rarely needed
- Using low-level data structures to avoid GC pressure before profiling
- Caching method results before measuring the uncached cost
- Batching operations to reduce DB calls before confirming N+1 exists
- Switching to async before measuring synchronous latency

---

## The Right Level of Abstraction

Abstraction hides complexity. The right abstraction hides the complexity that varies while keeping visible the parts that are stable and meaningful.

### Signs the Abstraction Is Too Low

- Callers repeatedly write the same boilerplate setup
- Changing the implementation requires updating many callers
- Tests for callers test implementation details of the dependency

### Signs the Abstraction Is Too High

- The abstraction is so general it provides no real help (a "strategy factory builder")
- Callers must fight against the abstraction to express their intent
- The abstraction has more code managing itself than it saves callers

### Finding the Right Level (Sandi Metz)

Abstractions live one level above the things they abstract. A method name should say *what* it does without revealing *how*. A class name should say *what it is* without revealing *how it works internally*.

```
# Too low — callers understand the algorithm
def users_with_active_subscriptions_not_expired_and_confirmed
  User.where(active: true, confirmed: true)
      .where("subscription_expires_at > ?", Time.now)
end

# Right level — callers get what they need
def eligible_users
  User.active.confirmed.with_valid_subscription
end
```

---

## Incremental Design

Prefer working software that's simple and correct today over complex software designed for an imagined future.

### Red-Green-Refactor

1. **Red**: Write a failing test for the next small behavior
2. **Green**: Write the simplest code to pass it (Sandi Metz calls this "Shameless Green")
3. **Refactor**: Now improve the design — duplication is visible, abstractions are earned

Shameless Green means writing obvious, repetitive code that works. Don't optimize prematurely for beauty. Once all tests pass, *then* extract the right abstraction from the real patterns you see.

### Boy Scout Rule

Leave the code cleaner than you found it. Not a complete rewrite — just a small improvement each time you touch an area. Compound over time.

---

## Simplicity Heuristics

| Heuristic | Application |
|-----------|-------------|
| If it needs a comment to explain what it does, simplify it | Rename or extract |
| If tests are hard to write, the design is complex | Decouple, inject dependencies |
| If you can't name it clearly, the abstraction is wrong | Inline First, then re-extract |
| If adding a feature touches 5+ files, responsibility is scattered | Consolidate (Move Method/Field) |
| If you haven't used the abstraction in 3 months, it was speculative | Delete it |
| If two implementations of the same interface exist, the first was wrong | Find the right abstraction |
| If you're adding a parameter "just in case," you're violating YAGNI | Remove it |
