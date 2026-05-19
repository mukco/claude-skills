# DRY — Don't Repeat Yourself

DRY is about **knowledge**, not syntax. The principle from *The Pragmatic Programmer*: "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."

## DRY Is Not About Lines of Code

Structural similarity is not the same as knowledge duplication. Two loops that look identical but represent different business concepts are NOT a DRY violation. Merging them would create a wrong abstraction that couples two independent things.

```
Is this duplication of knowledge — the same business rule, constraint, or decision?
├── Yes → Extract to one authoritative location
└── No, it's coincidental structural similarity
    └── Would each be changed independently by separate business rules?
        ├── Yes → Leave them separate. They are different concepts.
        └── No → They represent the same concept. DRY them.
```

---

## Rule of Three

Don't extract on the first occurrence. Don't extract on the second. Extract on the third (or when you can clearly name the abstraction).

**First occurrence**: Write the code inline. No abstraction yet.

**Second occurrence**: Feel the duplication but resist. Tolerating duplication is better than the wrong abstraction.

**Third occurrence**: Now extract. Three uses proves the concept is stable enough to name.

Why: Premature extraction locks in the wrong abstraction. The cost of one duplicate is low; the cost of the wrong abstraction — and the contortions needed to maintain it — is high.

---

## The Wrong Abstraction

*"Prefer duplication over the wrong abstraction"* — Sandi Metz.

When an abstraction is wrong, developers add parameters and special cases to make it fit new uses. The abstraction becomes a tangled mess of conditionals. The cure: **Inline First**.

### Inline First Pattern

When you suspect an abstraction is wrong:

1. **Inline** the abstraction back into its callers — unfold all the duplication
2. Look at the actual patterns that emerge
3. Extract the *correct* abstraction based on what you see

```
# Step 1 — before inlining (wrong abstraction)
def format_value(value, type, opts = {})
  case type
  when :currency  then "$#{value.round(2)}"
  when :percent   then "#{(value * 100).round(1)}%"
  when :date      then value.strftime(opts[:format] || "%Y-%m-%d")
  when :truncated then value.to_s[0, opts[:length] || 50]
  end
end

# Step 2 — inline and see what's actually there
# Caller A: format_value(amount, :currency)
# Caller B: format_value(ratio, :percent)
# Caller C: format_value(created_at, :date, format: "%b %d")
# Caller D: format_value(description, :truncated, length: 100)

# Step 3 — the right abstractions become obvious
module FormatHelpers
  def format_currency(value) = "$#{value.round(2)}"
  def format_percent(ratio)  = "#{(ratio * 100).round(1)}%"
  def format_date(date, fmt: "%Y-%m-%d") = date.strftime(fmt)
  def truncate(str, length: 50) = str.to_s[0, length]
end
```

---

## Knowledge Categories to DRY

### Business Rules

A business rule lives in exactly one place. If "a premium user gets 20% off" is a business rule, it must not appear as `* 0.8` scattered through pricing calculations, mailers, and API responses.

```
# WRONG — rule scattered
class PricingService
  def calculate(user, price)
    user.premium? ? price * 0.8 : price
  end
end

class InvoiceGenerator
  def line_item_price(user, item)
    user.premium? ? item.price * 0.8 : item.price
  end
end

# RIGHT — rule in one place
class DiscountPolicy
  PREMIUM_DISCOUNT = 0.8

  def apply(user, price)
    user.premium? ? price * PREMIUM_DISCOUNT : price
  end
end
```

### Data Schema

A data field's definition lives in one place (the schema/model). Don't re-declare its shape in request params, serializers, API docs, and tests independently.

### Configuration

A constant value lives in one place. Duplicated timeout values, URL patterns, and API keys across multiple files mean one update misses the other.

```
# WRONG — timeout duplicated in 4 places
class HttpClient
  TIMEOUT = 30
end
class ApiWrapper
  TIMEOUT = 30  # Same? Different? Intentional?
end

# RIGHT — single source
module AppConfig
  HTTP_TIMEOUT = 30
end
```

---

## DRY in Tests

Tests should be DRY in their **structure**, not necessarily their assertions. Shared examples can go too far.

```
Is the test setup identical for two tests?
├── Yes → shared before block or factory
└── No, slightly different → keep separate — coupling test setup is dangerous

Is an assertion repeated many times?
├── Yes — extracting shared assertion makes sense
└── No — duplication in tests is often acceptable for clarity
```

Tests that are too DRY become impossible to read in isolation. A failing test should tell you everything it needs without reading 3 other files.

---

## DRY Violations to Watch For

| Signal | Likely Violation | Fix |
|--------|-----------------|-----|
| Fixing a bug in two places | Duplicated business rule | Extract to single service/class |
| Copy-pasting code with minor edits | Premature fear of abstraction | Extract with parameterized difference |
| Same validation in model AND controller | Validation in wrong layer | Trust model validations |
| Constants defined in multiple files | Config scattering | Single config source |
| Same SQL / query in 3+ places | Missing query scope/method | Named scope or repository method |
| Updating serializers when schema changes | Schema duplication | Single source of truth for shape |

---

## When NOT to DRY

- When concepts are coincidentally similar but conceptually different
- When DRYing would create a hard-to-name abstraction
- When callers would need conditional logic to use the shared code
- In tests, when the duplication aids readability
- When you're on the second occurrence and don't have a clear name

The cost of the wrong abstraction is always higher than the cost of tolerated duplication.
