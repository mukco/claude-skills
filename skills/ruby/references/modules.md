# Ruby Modules Reference

Modules serve two distinct purposes in Ruby: **namespacing** (organizing code) and **mixins** (sharing behavior). These purposes should not be mixed in one module.

## Namespace vs. Mixin

| Use | When |
|-----|------|
| Namespace | Grouping related classes to avoid name collisions |
| Mixin (`include`) | Adding instance methods to a class |
| Mixin (`extend`) | Adding class-level methods to a class |
| Mixin (`prepend`) | Wrapping existing instance methods |

```ruby
# NAMESPACE — no methods, just organization
module Payments
  class Invoice; end
  class Receipt; end
  class Refund; end
end

# MIXIN — only methods, not meant to stand alone
module Timestampable
  def formatted_created_at
    created_at.strftime("%b %d, %Y")
  end
end
```

---

## include / extend / prepend

### include — Instance Methods

`include` adds the module's methods to instances of the class. The module is inserted into the class's ancestor chain above the class itself.

```ruby
module Greetable
  def greet = "Hello, I am #{name}"
end

class User
  include Greetable
  attr_reader :name
  def initialize(name) = @name = name
end

User.new("Alice").greet  # => "Hello, I am Alice"
User.ancestors
# => [User, Greetable, Object, Kernel, BasicObject]
```

### extend — Class Methods

`extend` adds the module's methods to the class itself (as singleton methods), not to its instances.

```ruby
module Searchable
  def search(query)
    where("name ILIKE ?", "%#{query}%")
  end
end

class Product
  extend Searchable
end

Product.search("widget")  # class-level call
```

### prepend — Wrap Existing Methods

`prepend` inserts the module *before* the class in the ancestor chain, so its methods wrap the class's own methods. Calling `super` from a prepended method calls the original.

```ruby
module Logging
  def save
    Rails.logger.info "Saving #{self.class}##{id}"
    result = super
    Rails.logger.info "Saved: #{result}"
    result
  end
end

class Order
  prepend Logging

  def save
    # original save logic
  end
end

Order.ancestors
# => [Logging, Order, Object, ...]
# prepended module comes FIRST
```

**When to use `prepend`**: Transparently wrapping methods (logging, caching, instrumentation) without modifying the original class or using inheritance.

---

## Self.included Hook

The `self.included` hook fires when a module is included. Use it to extend the including class with class-level methods in one step.

```ruby
module Auditable
  def self.included(base)
    base.extend(ClassMethods)
    base.instance_variable_set(:@auditing_enabled, true)
  end

  # Instance methods (available on instances)
  def audit_trail = AuditLog.for(self)

  module ClassMethods
    # Class methods (available on the class)
    def auditing_enabled? = @auditing_enabled
    def disable_auditing! = @auditing_enabled = false
  end
end

class Order
  include Auditable
end

Order.auditing_enabled?     # => true (class method)
Order.new.audit_trail       # => ... (instance method)
```

### Self.extended Hook

Fires when a module is extended onto an object or class.

```ruby
module Findable
  def self.extended(base)
    base.instance_variable_set(:@default_scope, {})
  end

  def find_by(attrs)
    where(@default_scope.merge(attrs)).first
  end
end

class Product
  extend Findable
end
```

### Self.prepended Hook

Fires when a module is prepended.

```ruby
module Cacheable
  def self.prepended(base)
    base.extend(ClassMethods)
  end
  module ClassMethods
    def cache_key_prefix = name.downcase
  end
end
```

---

## Comparable Module

Include `Comparable` and implement `<=>`. You get `<`, `>`, `<=`, `>=`, `between?`, and `clamp` for free.

```ruby
class Weight
  include Comparable

  attr_reader :value, :unit

  def initialize(value, unit = :kg)
    @value = value.to_f
    @unit  = unit
  end

  def in_kg
    unit == :lb ? value * 0.453592 : value
  end

  def <=>(other)
    in_kg <=> other.in_kg
  end

  def to_s = "#{value}#{unit}"
end

light = Weight.new(5)
heavy = Weight.new(10)

light < heavy    # => true
heavy > light    # => true
[heavy, light].sort  # => [light, heavy]
[heavy, light].min   # => light
```

**Rules for `<=>`**:
- Return `-1`, `0`, or `1` (or any negative/zero/positive integer)
- Return `nil` if incomparable (prevents sorting with incompatible types)
- Must be consistent with `==`

---

## Enumerable Module

Include `Enumerable` and implement `each`. You get `map`, `select`, `reject`, `find`, `sort`, `min`, `max`, `group_by`, `flat_map`, `inject`, and ~50 more methods.

```ruby
class WordCollection
  include Enumerable

  def initialize(words)
    @words = words
  end

  def each(&block)
    @words.each(&block)
  end
end

words = WordCollection.new(%w[apple banana cherry])
words.map(&:upcase)             # => ["APPLE", "BANANA", "CHERRY"]
words.select { |w| w.length > 5 }  # => ["banana", "cherry"]
words.sort                      # => ["apple", "banana", "cherry"]
words.min_by(&:length)          # => "apple"
words.include?("banana")        # => true
```

### Enumerable with Custom Comparison

If your collection holds `Comparable` objects, `min`, `max`, and `sort` work automatically.

```ruby
class PriorityQueue
  include Enumerable

  def initialize = @items = []
  def push(item) = @items.push(item).tap { @items.sort! }
  def each(&block) = @items.each(&block)
end
```

---

## Concerns Pattern (Rails / ActiveSupport)

`ActiveSupport::Concern` streamlines the `self.included` hook pattern and handles module dependencies.

```ruby
module Searchable
  extend ActiveSupport::Concern

  included do
    # Runs in the context of the including class
    scope :search, ->(q) { where("name ILIKE ?", "%#{q}%") }
    validates :name, presence: true
  end

  # Instance methods
  def search_key = name.downcase.gsub(/\s+/, "-")

  module ClassMethods
    def indexed_fields = %w[name description]
  end
end

class Product
  include Searchable
end

Product.search("widget")          # scope (class method)
Product.indexed_fields            # class method
Product.new.search_key            # instance method
```

### Concern Dependencies

Use `depends_on` (inside `Concern`) to declare that one concern requires another:

```ruby
module Publishable
  extend ActiveSupport::Concern

  include Timestampable  # explicit dependency

  included do
    scope :published, -> { where(published: true) }
  end
end
```

---

## Refinements

Refinements provide scoped monkey-patching — extend a class in a specific file scope without affecting the global object space.

```ruby
module StringExtensions
  refine String do
    def word_count = split.size
    def palindrome? = self == reverse
  end
end

# Refinement only active in files/scopes that use it
using StringExtensions

"hello world".word_count   # => 2
"racecar".palindrome?      # => true
```

**When to use**: Safely adding methods to core classes in a library without polluting the global namespace. Prefer refinements over open classes in library code.

---

## Module Anti-Patterns

### Mixin as God Object

A module that includes too many methods becomes an unnamed God Object that hides complexity.

```ruby
# WRONG — does too much, violates SRP
module Useful
  def format_currency; end
  def validate_email; end
  def log_action; end
  def authenticate!; end
end

# RIGHT — focused, named responsibility
module Formattable; end
module Validatable; end
module Auditable; end
```

### Module as Namespace AND Mixin

```ruby
# WRONG — mixing concerns
module Payments
  class Invoice; end

  def process_payment  # Instance methods on a namespace? Confusing.
    ...
  end
end

# RIGHT — separate concerns
module Payments
  class Invoice; end
end

module Payable
  def process_payment; end
end
```

### Include Instead of Extend for Class Behavior

```ruby
# WRONG — included adds instance methods, but we want class methods
class User
  include Findable
end
User.new.search_by_name("Alice")  # instance method — probably wrong

# RIGHT
class User
  extend Findable
end
User.search_by_name("Alice")  # class method
```

### Violating Method Lookup Order

`prepend` > `include` > class definition. Knowing this prevents surprises when overriding methods.

```ruby
module A
  def hello = "A"
end

module B
  def hello = "B"
end

class C
  include A
  include B  # B is inserted ABOVE A — B wins
  def hello = "C"
end

C.ancestors  # => [C, B, A, Object, ...]
C.new.hello  # => "C" (class always wins over includes)
```

With `prepend`:

```ruby
class C
  prepend A  # A is inserted BEFORE C
  def hello = "C"
end

C.ancestors  # => [A, C, Object, ...]
C.new.hello  # => "A" (prepended wins)
```
