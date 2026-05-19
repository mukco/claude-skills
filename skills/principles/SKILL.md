---
name: principles
description: "General software engineering principles — DRY, SOLID, YAGNI, KISS, naming, code smells, and refactoring. Language-agnostic. Use alongside language-specific skills."
---

# Software Engineering Principles

Language-agnostic principles for writing maintainable, readable, and correct software. These are the non-negotiable foundations: DRY, SOLID, naming discipline, recognizing smells, and knowing when to refactor.

Key references: [refactoring.guru](https://refactoring.guru) for named refactoring catalog and design pattern taxonomy. *99 Bottles of OOP* (Sandi Metz) for practical application of abstraction principles.

## Core Principles at a Glance

| Principle | Rule | Violation Signal |
|-----------|------|-----------------|
| DRY | Every piece of knowledge has one authoritative representation | Copying logic to fix a bug in two places |
| SRP | One reason to change | Class that touches UI, business logic, and persistence |
| OCP | Extend without modifying | Adding a new type requires editing existing switch/if blocks |
| LSP | Subtypes are substitutable | Overriding to throw "not supported" |
| ISP | Interfaces are narrow | Implementing stub methods that do nothing |
| DIP | Depend on abstractions | Instantiating collaborators with `new` inside a class |
| YAGNI | Build what's needed now | Abstractions for hypothetical future requirements |
| KISS | The simplest solution that works | Clever code that requires a comment to explain |

## Naming Rules

### The Name Must Earn Its Place

```
Does the name reveal intent without reading the implementation?
├── No → Rename
└── Yes
    └── Does the name encode the "how" instead of the "what"?
        ├── Yes → Rename to reveal purpose
        └── No → Keep
```

```
# WRONG — encodes implementation
calculate_by_multiplying_rate_and_hours()
user_array
is_true_flag

# RIGHT — reveals intent
calculate_pay()
users
active?
```

### Naming Rules by Category

| Category | Rule | Examples |
|----------|------|---------|
| Boolean variables/methods | Predicate form | `valid?`, `empty?`, `is_admin` |
| Methods that return | Name the return value | `total`, `url`, `user_count` |
| Methods that act | Verb phrase | `send_invoice`, `archive!`, `reset` |
| Classes | Noun, singular | `Invoice`, `UserSession`, `Renderer` |
| Constants | SCREAMING_SNAKE or named well | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| No magic numbers | Named constant or config | `MAX_LOGIN_ATTEMPTS = 5` not `5` |

## DRY Quick Reference

DRY is about **knowledge**, not lines of code. Two identical loops are not a DRY violation if they represent different concepts. Two different-looking snippets can violate DRY if they encode the same rule in two places.

```
Is this duplication of knowledge (a rule, decision, or fact)?
├── Yes → Extract to authoritative location
└── No, it's coincidental structural similarity → Leave it
    └── Would a future business rule change them independently?
        ├── Yes → They are NOT the same concept — do not merge
        └── No → They ARE the same concept — DRY them
```

### The Rule of Three

Don't extract on the second occurrence. Extract when:
1. The concept appears three or more times, **and**
2. A change to the concept would require updating all of them

## No Magic Numbers / Strings

Every literal with domain significance must be named.

```
# WRONG
if retries > 3 ...
sleep(0.5)
status == "pending"

# RIGHT
MAX_RETRIES = 3
RETRY_DELAY = 0.5
PENDING_STATUS = "pending"  # or use an enum/constant
```

Constants live at the narrowest scope that makes sense:
- Method-level: not possible in most languages — extract to class or module
- Class-level: private constant when used only internally
- Module/file-level: when shared across a file
- Configuration: when values differ per environment

## SOLID Decision Trees

### Single Responsibility Principle

```
Can you describe this class/module in one sentence without "and" or "or"?
├── No → Extract until each piece has one sentence
└── Yes
    └── If a business rule changed, would more than one team own this class?
        ├── Yes → Split by team responsibility (Conway's Law signal)
        └── No → SRP is likely satisfied
```

### Open/Closed Principle

```
Does adding a new variant require editing existing, tested code?
├── Yes → Introduce polymorphism or strategy
└── No → OCP satisfied
```

### Liskov Substitution Principle

```
Can you substitute every subclass for its parent without callers noticing?
├── No → Check: does the subclass throw "not implemented"?
│        Or: does it require preconditions the parent doesn't?
│        Fix: Pull shared interface; don't inherit — compose
└── Yes → LSP satisfied
```

### Dependency Inversion Principle

```
Does this class instantiate its collaborators with `new`?
├── Yes → Inject them via constructor or method parameter
└── No
    └── Does it depend on a concrete class name?
        ├── Yes → Depend on interface/protocol/duck type instead
        └── No → DIP satisfied
```

## Code Smell Quick Reference

See `references/code_smells.md` for full details and fixes.

| Smell | Signal | Refactoring |
|-------|--------|-------------|
| Long Method | Hard to name; more than one level of abstraction | Extract Method |
| Large Class | Many instance variables; violates SRP | Extract Class |
| Long Parameter List | 4+ positional params | Parameter Object / Keyword Args |
| Divergent Change | One class changes for many different reasons | Extract Class |
| Shotgun Surgery | One change touches many unrelated classes | Move Method/Field |
| Feature Envy | Method uses another class's data more than its own | Move Method |
| Data Clumps | Same group of fields travel together | Extract Class / Value Object |
| Primitive Obsession | Raw strings for domain concepts | Value Object |
| Switch/Case/if-elsif | Type dispatch that grows | Polymorphism / Strategy |
| Parallel Inheritance | Adding a subclass requires adding another elsewhere | Collapse Hierarchy |
| Lazy Class | A class that doesn't justify its existence | Inline Class |
| Speculative Generality | Hooks and abstractions "for the future" | YAGNI — remove it |
| Temporary Field | Field only populated in some paths | Extract Class or Null Object |
| Message Chains | `a.b.c.d()` | Law of Demeter / Delegate Method |
| Middle Man | Class delegates almost everything | Remove Middle Man |
| Comments | Comment explains what the code does | Extract Method with good name |

## Refactoring Decision Tree

When to refactor vs. rewrite:

```
Is the code covered by tests?
├── No → Write tests first, then refactor
└── Yes
    └── Is the smell localized to one area?
        ├── Yes → Refactor incrementally (Martin Fowler catalog)
        └── No, smell is structural
            └── Is it a wrong abstraction or no abstraction?
                ├── Wrong abstraction → Inline first, then re-extract correctly
                └── No abstraction → Extract Method → Extract Class → Extract Module
```

### Common Refactoring Sequence

```
Long Method →
  1. Extract Method (name what each chunk does)
  2. Move Method (if extracted method belongs elsewhere)
  3. If many extracted methods → Extract Class

Switch/if-elsif on type →
  1. Identify the varying behavior
  2. Extract method per case
  3. Replace with polymorphism or strategy

Duplicated logic →
  1. Identify the true source of duplication (same knowledge?)
  2. Extract to single location
  3. Parameterize differences
```

## YAGNI — You Ain't Gonna Need It

Build for the requirements you have. Premature abstraction is technical debt paid in confusion.

```
Are you building this because the current story requires it?
├── Yes → Build it
└── No, building for "when we need it" →
    └── Do you have concrete evidence it will be needed in the next sprint?
        ├── Yes → Still: wait until you have two uses, then extract
        └── No → YAGNI — delete the hypothetical abstraction
```

Signals of YAGNI violations:
- Parameters that only ever receive one value
- Abstract base classes with a single implementation
- Plugin systems with no plugins
- "Extensibility" hooks never triggered
- Config flags always set to the same value

## Best Practices

### Do

- Name things after their intent, not their implementation
- Eliminate magic numbers and strings with named constants
- Follow the Rule of Three before extracting duplication
- Write the simplest code that passes the tests
- Refactor when adding a feature — leave code cleaner than you found it
- Make dependencies explicit (inject them, don't instantiate inside)
- Apply the Strangler Fig pattern for large rewrites: route at the edge, replace incrementally
- Delete code that isn't used — source control remembers it

### Don't

- Don't abstract until you have at least two real use cases
- Don't comment what the code does — rename to make it obvious
- Don't add parameters "for future flexibility"
- Don't write defensive code for inputs that can't reach the function
- Don't make things configurable until there's a real configuration need
- Don't keep dead code "just in case"
- Don't solve a problem you don't have yet

## Additional Resources

### Reference Files

- **`references/dry.md`** — DRY in depth: knowledge vs. structure, Rule of Three, wrong abstraction, Inline First
- **`references/solid.md`** — All five SOLID principles with examples, violations, and fixes
- **`references/naming.md`** — Naming rules across categories: variables, methods, classes, constants, tests
- **`references/code_smells.md`** — Full smell catalog with signals, causes, and named refactorings (refactoring.guru)
- **`references/simplicity.md`** — YAGNI, KISS, premature optimization, coupling, cohesion
