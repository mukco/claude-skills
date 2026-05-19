# Ruby Blocks, Closures, and Callables Reference

Ruby has multiple ways to represent callable behavior. Understanding when to use each — and how closures capture scope — is essential for idiomatic Ruby.

## Block vs. Proc vs. Lambda vs. Method

| | Block | Proc | Lambda | Method |
|--|-------|------|--------|--------|
| Object? | No | Yes | Yes (Proc subtype) | Yes |
| Arity check | No | No | Yes (raises) | Yes |
| `return` exits | Enclosing method | Enclosing method | Lambda only | Method only |
| Created with | `{ }` / `do end` | `proc { }` | `-> { }` / `lambda { }` | `method(:name)` |
| Stored? | Only via `&block` | Yes | Yes | Yes |
| `call` syntax | N/A | `.call()` / `.()` | `.call()` / `.()` | `.call()` |

---

## Blocks

### Syntax

```ruby
# Brace syntax — single line, high precedence
[1, 2, 3].each { |n| puts n }

# do/end syntax — multi-line, low precedence
[1, 2, 3].each do |n|
  processed = transform(n)
  puts processed
end
```

Brace `{}` binds more tightly than `do...end`. With method chains:

```ruby
# {} binds to transform, not each
arr.each { |x| x }.transform  # transform gets the result of each

# do/end binds to each
arr.each do |x| x end.transform  # NoMethodError — transform on nil
```

### yield

`yield` invokes a block passed to a method. Calling `yield` without a block raises `LocalJumpError`.

```ruby
def wrap_in_tag(tag)
  "<#{tag}>#{yield}</#{tag}>"
end

wrap_in_tag("b") { "bold" }  # => "<b>bold</b>"
```

### block_given?

Check whether a block was passed before yielding:

```ruby
def maybe_transform(value)
  if block_given?
    yield value
  else
    value
  end
end

maybe_transform(5) { |n| n * 2 }  # => 10
maybe_transform(5)                 # => 5
```

### Explicit Block Capture

Prefix a parameter with `&` to capture the block as a Proc object. This allows storing it, passing it forward, or calling it later.

```ruby
def repeat(n, &block)
  n.times { block.call }
end

# Or store it
def build_task(&block)
  { action: block, created_at: Time.now }
end

task = build_task { puts "running!" }
task[:action].call  # => "running!"
```

### Blocks for Resource Management

The canonical Ruby idiom: open-use-close via a block.

```ruby
def with_db_transaction
  db.begin_transaction
  result = yield
  db.commit
  result
rescue
  db.rollback
  raise
end

with_db_transaction do
  User.create!(name: "Alice")
  Order.create!(user: alice)
end
```

---

## Procs

### Creating Procs

```ruby
double = Proc.new { |x| x * 2 }
double = proc { |x| x * 2 }   # Shorthand (same behavior)
```

### Arity is Loose

Procs do not enforce argument count. Missing args become `nil`; extras are ignored.

```ruby
p = proc { |a, b| [a, b] }
p.call(1)        # => [1, nil]
p.call(1, 2, 3)  # => [1, 2]
```

### return Exits Enclosing Method

This is the most dangerous Proc behavior. A `return` inside a Proc returns from the **method that defined the Proc**, not just the Proc.

```ruby
def risky
  p = proc { return "from proc" }
  p.call
  "never reached"  # This line is skipped
end

risky  # => "from proc"

# If the defining method has already returned — LocalJumpError
saved = nil
def create_proc
  saved = proc { return "oops" }
end
create_proc
saved.call  # => LocalJumpError
```

**Rule**: Never use `return` inside a Proc. Use implicit return (last expression).

---

## Lambdas

### Creating Lambdas

```ruby
double = lambda { |x| x * 2 }
double = ->(x) { x * 2 }       # Stabby lambda (preferred)
double.call(5)                  # => 10
double.(5)                      # => 10 (shorthand)
double[5]                       # => 10 (array-like syntax)
```

### Arity is Strict

Lambdas enforce argument count and raise `ArgumentError` on mismatch.

```ruby
f = ->(a, b) { a + b }
f.call(1, 2)      # => 3
f.call(1)         # => ArgumentError: wrong number of arguments (1 for 2)
f.call(1, 2, 3)   # => ArgumentError: wrong number of arguments (3 for 2)
```

### return Exits Lambda Only

Unlike Procs, `return` inside a lambda exits only the lambda. Execution continues in the caller.

```ruby
def safe
  f = -> { return "from lambda" }
  result = f.call
  "continues: #{result}"  # This IS reached
end

safe  # => "continues: from lambda"
```

### Lambda with Default Args and Splatting

```ruby
greet = ->(name, greeting = "Hello") { "#{greeting}, #{name}!" }
greet.("Alice")           # => "Hello, Alice!"
greet.("Bob", "Hi")       # => "Hi, Bob!"

variadic = ->(*args) { args.sum }
variadic.(1, 2, 3)        # => 6
```

### Lambdas as First-Class Objects

```ruby
TRANSFORMATIONS = {
  upcase:  ->(s) { s.upcase },
  reverse: ->(s) { s.reverse },
  trim:    ->(s) { s.strip }
}.freeze

def transform(str, *ops)
  ops.reduce(str) { |s, op| TRANSFORMATIONS[op].call(s) }
end

transform("  hello  ", :trim, :upcase)  # => "HELLO"
```

---

## Method Objects

Convert any method into a callable object with `method(:name)`. Useful for passing named methods as blocks.

```ruby
def double(n) = n * 2

[1, 2, 3].map(&method(:double))  # => [2, 4, 6]

# Equivalent to:
[1, 2, 3].map { |n| double(n) }
```

### `&` and `to_proc`

The `&` operator calls `to_proc` on whatever follows it, then passes the result as a block.

```ruby
# Symbol#to_proc — shorthand for { |x| x.method_name }
["hello", "world"].map(&:upcase)    # => ["HELLO", "WORLD"]
[1, 2, 3].select(&:odd?)            # => [1, 3]

# Method#to_proc
[1, 2, 3].map(&method(:puts))       # prints each, returns [nil, nil, nil]

# Custom to_proc
class Multiplier
  def initialize(factor) = @factor = factor
  def to_proc = ->(n) { n * @factor }
end

[1, 2, 3].map(&Multiplier.new(3))   # => [3, 6, 9]
```

---

## Closures

Blocks, Procs, and Lambdas are all closures — they capture the surrounding local scope at the time they are defined, not when they are called.

```ruby
multiplier = 3

double = ->(n) { n * multiplier }  # captures multiplier

multiplier = 5

double.call(4)  # => 20 (uses current value of multiplier — 5, not 3)
```

### Closures Capture Variables, Not Values

```ruby
closures = (1..3).map { |i| -> { i * 2 } }
closures.map(&:call)  # => [2, 4, 6]
# Each lambda captures its own i from the block scope

# Classic pitfall with mutable variable
lambdas = []
3.times do |i|
  lambdas << -> { i }
end
lambdas.map(&:call)  # => [0, 1, 2] — each captures its own block-local i
```

### Closures for State

Closures can maintain private state without a class.

```ruby
def make_counter(start = 0)
  count = start
  {
    increment: -> { count += 1 },
    decrement: -> { count -= 1 },
    value:     -> { count }
  }
end

counter = make_counter(10)
counter[:increment].call
counter[:increment].call
counter[:value].call  # => 12
```

---

## Callable Objects

Any object that implements `call` is callable with `.()` syntax. Lambdas, Procs, and Method objects all respond to `call`, but so can plain objects.

```ruby
class Validator
  def initialize(min, max)
    @min = min
    @max = max
  end

  def call(value)
    value.between?(@min, @max)
  end
end

age_validator = Validator.new(18, 120)
age_validator.call(25)  # => true
age_validator.(25)      # => true (shorthand — calls #call)

[15, 25, 130].select(&age_validator)  # => [25] — uses to_proc → call
```

This pattern is the basis for the **Command pattern** in Ruby: plain objects with `#call`.

---

## Practical Patterns

### Callback Registration

```ruby
class EventEmitter
  def initialize
    @listeners = Hash.new { |h, k| h[k] = [] }
  end

  def on(event, &block)
    @listeners[event] << block
  end

  def emit(event, *args)
    @listeners[event].each { |cb| cb.call(*args) }
  end
end

emitter = EventEmitter.new
emitter.on(:data) { |d| process(d) }
emitter.on(:data) { |d| log(d) }
emitter.emit(:data, payload)
```

### Lazy Evaluation

```ruby
class Lazy
  def initialize(&block)
    @block = block
    @evaluated = false
  end

  def value
    unless @evaluated
      @value     = @block.call
      @evaluated = true
    end
    @value
  end
end

expensive = Lazy.new { slow_computation }
expensive.value  # computes once
expensive.value  # returns cached
```

### Pipeline with Lambdas

```ruby
PIPELINE = [
  ->(data) { data.strip },
  ->(data) { data.downcase },
  ->(data) { data.gsub(/[^a-z0-9]/, "_") },
  ->(data) { data.squeeze("_") }
].freeze

def slugify(input)
  PIPELINE.reduce(input) { |val, step| step.call(val) }
end

slugify("  Hello, World!  ")  # => "hello_world"
```

---

## Anti-Patterns

### Using return Inside a Proc

```ruby
# WRONG — return exits the enclosing method unexpectedly
transform = proc { |x| return x * 2 if x > 0; 0 }

# RIGHT — implicit return
transform = proc { |x| x > 0 ? x * 2 : 0 }
```

### Storing Procs from Dead Methods

```ruby
def create_risky_proc
  proc { return "boom" }  # return will LocalJumpError after method returns
end

p = create_risky_proc
p.call  # => LocalJumpError
```

### Giant Anonymous Blocks

```ruby
# WRONG — logic hidden, untestable
users.each do |user|
  next unless user.active?
  balance = user.account.transactions.sum(&:amount)
  if balance > threshold
    Mailer.send_alert(user, balance)
  end
end

# RIGHT — extract and name
users.each { |user| notify_if_over_threshold(user) }

def notify_if_over_threshold(user)
  return unless user.active?
  balance = AccountSummarizer.new(user.account).balance
  Mailer.send_alert(user, balance) if balance > threshold
end
```
