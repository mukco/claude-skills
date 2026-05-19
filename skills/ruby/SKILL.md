---
name: ruby
description: "Ruby idioms, OOP design (Sandi Metz / POODR), design patterns (refactoring.guru), modules, closures, Enumerable, and Ruby-specific best practices."
---

# Ruby Patterns

Comprehensive guidance for idiomatic Ruby. Covers OOP design, patterns that emerge naturally from Ruby's object model, closures, enumerables, and classic design patterns applied to Ruby.

Key references: *99 Bottles of OOP* and *Practical Object-Oriented Design in Ruby* (Sandi Metz), [refactoring.guru](https://refactoring.guru) for named refactoring and pattern catalog.

## Quick Reference

### Core Idioms

```ruby
# Guard clauses instead of nested conditionals
def process(user)
  return unless user.active?
  return if user.banned?
  do_work(user)
end

# Memoization with ||=
def connection
  @connection ||= Database.connect
end

# Safe navigation operator
user&.profile&.avatar_url

# tap — side effects in a chain (returns receiver)
User.new.tap { |u| u.name = "Alice" }.save!

# then / yield_self — pipeline transformation (returns block result)
fetch_user(id)
  .then { |u| enrich(u) }
  .then { |u| serialize(u) }

# Conditional assignment
@config   ||= load_config         # Assign if nil/false
@counter  &&= @counter + 1        # Assign only if already set
```

### Object Design Decision Tree

```
Does this logic belong to this class?
├── It uses another class's data more than its own → Move Method
└── It fits here
    └── Does this class have one reason to change?
        ├── No → Extract Class (Split Responsibilities)
        └── Yes
            └── Are there if/elsif branches on type?
                ├── Yes → Replace with Polymorphism
                └── No → Continue
```

### Pattern Selection

```
Shared behavior across unrelated classes?
├── Identical, stateless behavior → Module mixin (include)
└── Behavior varies by context → Strategy pattern

Building objects with many options?
├── Few, stable options → Keyword args with defaults
└── Many, complex, optional params → Builder pattern

Wrapping extra behavior around existing objects?
├── Single, transparent wrap → Decorator
└── Order matters, chain of handlers → Chain of Responsibility

Object creation needs variation?
├── One product, varying how it's built → Factory Method
└── Families of related products → Abstract Factory

Notifications across unrelated objects?
└── Observer / Publish-Subscribe
```

### Enumerable Quick Reference

```ruby
users.map(&:name)               # Transform to new array
users.select(&:active?)         # Keep matching
users.reject(&:banned?)         # Remove matching
users.find { |u| u.admin? }     # First match or nil
users.any?(&:admin?)            # At least one matches?
users.all?(&:active?)           # All match?
users.none?(&:deleted?)         # None match?
users.count(&:premium?)         # Count matching
users.sum(&:balance)            # Sum attribute
users.min_by(&:score)           # Minimum by attribute
users.max_by(&:created_at)      # Maximum by attribute
users.sort_by(&:name)           # Stable sort by attribute
users.group_by(&:role)          # Hash of arrays
users.flat_map(&:tags)          # Map then flatten one level
users.tally                     # Count occurrences → Hash
users.filter_map { |u| u.name if u.active? }  # Select + map (Ruby 2.7+)
users.each_with_object({}) { |u, h| h[u.id] = u }  # Build hash/array
users.zip(other_array)          # Interleave two arrays
users.each_slice(100)           # Iterate in groups
users.lazy.select(&:active?).first(10)  # Lazy — stop early
```

### Module Use Quick Reference

```ruby
# Namespace — organize, prevent name collisions
module Payments
  class Invoice; end
  class Receipt; end
end

# Mixin instance methods (include)
module Auditable
  def audit_log = "#{self.class.name}##{id}"
end
class Order
  include Auditable
end
order.audit_log  # instance method

# Add class-level methods (extend)
module Findable
  def find_active = where(active: true)
end
class User
  extend Findable
end
User.find_active  # class method

# Hook to include + extend in one step
module Trackable
  def self.included(base)
    base.extend(ClassMethods)
  end
  module ClassMethods
    def track(attr); end
  end
end

# prepend — wrap existing methods (decorates method lookup)
module Logging
  def save
    Rails.logger.info "Saving #{self.class}"
    super
  end
end
class User
  prepend Logging
end
```

## OOP Principles

### Single Responsibility

A class has one responsibility when you can describe what it does without "and" or "or."

```ruby
# WRONG — parses AND formats
class ReportHandler
  def parse_csv(raw); end
  def format_html(data); end
end

# RIGHT — one reason to change each
class CsvParser
  def parse(raw); end
end
class HtmlFormatter
  def format(data); end
end
```

### Tell, Don't Ask

Avoid querying an object's state externally to make a decision for it. Send a command instead.

```ruby
# WRONG — ask wallet's state, decide outside
def charge(user, amount)
  if user.wallet.balance >= amount
    user.wallet.deduct(amount)
  end
end

# RIGHT — tell user to handle it
def charge(user, amount)
  user.charge(amount)
end
# User#charge encapsulates the balance check
```

### Depend on Behavior, Not Type

Duck typing: ask "what can this object do?" not "what class is it?"

```ruby
# WRONG — brittle type check
def render(content)
  if content.is_a?(String)
    wrap_text(content)
  elsif content.is_a?(Array)
    content.map { |c| wrap_text(c) }.join
  end
end

# RIGHT — depend on interface
def render(content)
  content.to_renderable.each { |chunk| output(chunk) }
end
# String and Array implement to_renderable however they need to
```

### Prefer Composition over Inheritance

Use inheritance only for genuine is-a relationships with shared behavior. Use composition for shared capabilities.

```ruby
# Inheritance for shared TYPE (is-a)
class Animal; end
class Dog < Animal; end  # Dog IS an Animal — appropriate

# Composition for shared BEHAVIOR (has-a)
class Report
  def initialize(formatter:, exporter:)
    @formatter = formatter
    @exporter  = exporter
  end
  def run(data)
    @exporter.export(@formatter.format(data))
  end
end
# Swap formatters/exporters without subclassing
```

### Law of Demeter (Don't Chain Dot Calls)

Only talk to immediate collaborators. Deep chains couple you to a whole object graph.

```ruby
# WRONG — reaches through intermediaries
user.account.billing.address.city

# RIGHT — ask the user directly; let it delegate
user.billing_city

# Or provide a value object
class User
  def billing_city = account.billing.address.city
end
```

## Blocks, Procs, and Lambdas

### Choosing the Right Callable

| Type | Arity check | `return` behavior | Created with |
|------|-------------|-------------------|--------------|
| Block | No | Exits enclosing method | `{ }` / `do end` |
| Proc | No | Exits enclosing method | `proc { }` / `Proc.new` |
| Lambda | Yes (raises) | Exits lambda only | `lambda { }` / `->` |
| Method | Yes | Returns from method | `method(:name)` |

```ruby
# Use blocks for iteration and resource management
[1, 2, 3].each { |n| process(n) }
File.open(path) { |f| f.read }

# Use lambdas as first-class callables with strict signature
validate = ->(value) { value.positive? }
validate.call(5)   # => true
validate.(5)       # => true (shorthand)
validate.call(-1)  # => false

# Use Proc for stored blocks with loose arity
sanitize = proc { |s| s.to_s.strip }
sanitize.call(nil)  # => "" (no error, nil.to_s works)
```

### Method Objects

Extract complex logic from blocks into callable objects.

```ruby
# BEFORE — logic hidden in a block
users.select { |u| u.active? && u.subscription_expires_at > Time.now && u.confirmed? }

# AFTER — named, testable, reusable
class EligibleUserFilter
  def call(user)
    user.active? && !user.subscription_expired? && user.confirmed?
  end
end

filter = EligibleUserFilter.new
users.select(&filter)  # & calls filter.to_proc
```

## Best Practices

### Do

- Use guard clauses to reduce nesting depth
- Name methods after intent, not implementation (`#charge` not `#deduct_from_wallet`)
- Keep methods under ~5 lines; classes under ~100 lines (Sandi Metz rules)
- Prefer `respond_to?` over `is_a?` for duck typing
- Use keyword arguments for methods with 3+ parameters
- Use `freeze` on constant data structures
- Use `Comparable` instead of manually writing `<`, `>`, `<=`, etc.
- Use `protected` for methods called between sibling instances
- Return `self` from mutating methods to enable chaining
- Use `attr_reader` by default; only expose writers when callers need them

### Don't

- Don't use boolean flag parameters — split into two clearly named methods
- Don't use `else` when a guard clause suffices
- Don't use `elsif` chains that grow — this is a polymorphism signal
- Don't rescue `Exception` — rescue `StandardError` or specific subclasses
- Don't use class variables (`@@var`) — they bleed across subclasses
- Don't mutate arguments passed in
- Don't expose internals via `attr_accessor` by default
- Don't inherit just for code reuse — use mixins or composition
- Don't write long anonymous blocks — extract to a named method or object

## Anti-Patterns Quick List

| Anti-Pattern | Solution |
|--------------|----------|
| Boolean flag parameter | Two separate methods |
| `is_a?` type switch | Duck typing / polymorphism |
| Growing `elsif` on type | Strategy pattern or polymorphism |
| Long parameter list | Keyword args or Parameter Object |
| Feature envy (reaches into other classes) | Move method closer to data |
| Primitive obsession (raw string for email/money) | Value object |
| Mutable shared state (`@@var`, global) | Inject dependencies |
| God class (knows too much) | Extract Class, SRP |
| Deep inheritance chain | Flatten with composition + modules |
| Message chains (`a.b.c.d`) | Law of Demeter, delegate method |

## Additional Resources

### Reference Files

- **`references/oop.md`** — SRP in depth, composition, tell-don't-ask, Law of Demeter, dependency injection, value objects, service objects
- **`references/modules.md`** — Namespaces, mixins, hooks, include/extend/prepend, Comparable, Enumerable as modules
- **`references/blocks_closures.md`** — Blocks, procs, lambdas, method objects, closure scope, callable patterns
- **`references/enumerable.md`** — Full Enumerable API, lazy enumerators, implementing Enumerable in custom classes
- **`references/design_patterns.md`** — Strategy, Decorator, Observer, Command, Factory, Template Method, Null Object, Adapter, Facade
- **`references/error_handling.md`** — Exception hierarchy, rescue idioms, custom error classes, retry, fail-fast, ensure
