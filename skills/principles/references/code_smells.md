# Code Smells Reference

Code smells are surface indicators that a deeper problem may exist in the design. They are not bugs — the code may work — but they signal friction in maintenance and extension.

Smell catalog from [refactoring.guru](https://refactoring.guru/refactoring/smells) and Martin Fowler's *Refactoring*.

---

## Bloaters

Smells that indicate code has grown too large.

### Long Method

**Signal**: Method requires a comment to explain what it does; more than one level of abstraction; hard to name.

**Cause**: Incremental additions without periodic extraction. Every "just one more thing" added to a method.

**Fix**: Extract Method. If extracted methods belong elsewhere, then Move Method.

```
# BEFORE — long method with many levels of abstraction
def process_order(order)
  # validate
  return if order.items.empty?
  return unless order.user.active?

  # calculate total
  subtotal = order.items.sum { |i| i.price * i.quantity }
  discount = order.user.premium? ? subtotal * 0.1 : 0
  total    = subtotal - discount + order.shipping_cost

  # charge
  result = PaymentGateway.charge(order.user.card, total)
  order.update!(payment_id: result.id, total: total)

  # notify
  OrderMailer.confirmation(order).deliver_later
  order.user.update!(last_order_at: Time.now)
end

# AFTER — each extracted method has one level of abstraction
def process_order(order)
  return unless order_valid?(order)
  total = calculate_total(order)
  charge_and_record(order, total)
  notify_completion(order)
end
```

**Rule (Sandi Metz)**: Methods should be ~5 lines. Not a hard ceiling, but anything longer deserves scrutiny.

---

### Large Class

**Signal**: Class has many instance variables; many public methods; imports from many subsystems.

**Cause**: Accumulation. Classes grow because adding to an existing class is always easier than creating a new one.

**Fix**: Extract Class. Group related instance variables and the methods that use them; extract into a focused class.

**Heuristic**: A class should be describable in one sentence without "and."

---

### Long Parameter List

**Signal**: Method with 4+ positional parameters. Callers must look up argument order.

**Cause**: Trying to generalize a method, or methods that merged from two separate operations.

**Fix**:
1. **Keyword Arguments** — order-independent, self-documenting at call site
2. **Parameter Object** — extract related params into a value object/struct
3. **Preserve Whole Object** — pass the object you're unpacking instead of its parts

```
# BEFORE
def schedule_delivery(name, address, city, state, zip, priority, notes)

# AFTER — parameter object
Delivery = Data.define(:address, :priority, :notes)
def schedule_delivery(delivery)

# Or keyword arguments
def schedule_delivery(address:, priority: :standard, notes: nil)
```

---

### Primitive Obsession

**Signal**: Using raw strings, integers, or arrays to represent domain concepts. Email as `String`, money as `Float`, date ranges as two separate date params.

**Cause**: Reluctance to create small classes for small concepts.

**Fix**: Value Object. The new class carries validation, formatting, and behavior alongside the data.

```
# BEFORE — email is just a string everywhere
user = User.new(email: "alice@example.com")
send_to(user.email)
format_label(user.email)
valid = user.email.match?(/\A[^@]+@[^@]+\z/)  # repeated everywhere

# AFTER — EmailAddress value object
class EmailAddress
  attr_reader :value
  def initialize(raw)
    @value = raw.to_s.strip.downcase
    raise ArgumentError, "Invalid email: #{raw}" unless valid?
  end
  def domain = value.split("@").last
  def valid?  = value.match?(/\A[^@]+@[^@]+\z/)
  def to_s    = value
end

user = User.new(email: EmailAddress.new("Alice@Example.COM"))
```

Common candidates for value objects: email, phone number, money, coordinates, color, date range, URL, IP address.

---

### Data Clumps

**Signal**: The same group of data fields always travels together — passed as multiple parameters, stored as multiple instance variables, appearing in multiple classes.

**Cause**: Related data not modeled as a cohesive unit.

**Fix**: Extract Class or Value Object to represent the group.

```
# BEFORE — address appears as 4 params everywhere
def create_order(user, street, city, state, zip)
def ship_to(name, street, city, state, zip)
def verify_address(street, city, state, zip)

# AFTER — Address is a first-class concept
class Address
  attr_reader :street, :city, :state, :zip
  def initialize(street:, city:, state:, zip:) = ...
  def full_address = "#{street}, #{city}, #{state} #{zip}"
end

def create_order(user, address)
def ship_to(name, address)
def verify_address(address)
```

---

## Object-Orientation Abusers

### Switch/Case / if-elsif on Type

**Signal**: A conditional that dispatches on a type tag, class, or status string — and will grow as more types are added.

**Cause**: Procedural thinking in an OO language. Adding types by editing an existing switch rather than extending.

**Fix**: Polymorphism (Replace Conditional with Polymorphism). Each type knows its own behavior.

```
# BEFORE — switch grows with every new shape
def area(shape)
  case shape.type
  when :circle    then Math::PI * shape.radius ** 2
  when :rectangle then shape.width * shape.height
  when :triangle  then shape.base * shape.height / 2.0
  end
end

# AFTER — each shape knows its area
class Circle
  def area = Math::PI * radius ** 2
end
class Rectangle
  def area = width * height
end
class Triangle
  def area = base * height / 2.0
end

def area(shape) = shape.area
```

---

### Refused Bequest

**Signal**: A subclass inherits from a parent but overrides most methods to do nothing, or raises "not supported."

**Cause**: Inheritance used for code reuse when there is no true is-a relationship.

**Fix**: Replace Inheritance with Delegation. The subclass should use the parent as a component, not inherit from it.

---

### Temporary Field

**Signal**: An instance variable is only set and used in some code paths. `nil` most of the time.

**Cause**: An algorithm that needs context gets its context stuffed into instance variables instead of local variables or a dedicated object.

**Fix**: Extract Class — move the temporary field and the methods that use it into a dedicated object for that operation.

---

## Change Preventers

### Divergent Change

**Signal**: One class changes for many different reasons — e.g., a class changes when the DB schema changes, when the business rules change, and when the output format changes.

**Cause**: SRP violation. Multiple responsibilities merged into one class.

**Fix**: Extract Class per responsibility.

---

### Shotgun Surgery

**Signal**: One business change requires touching many small, unrelated classes across the codebase.

**Cause**: A concept is scattered across the system rather than centralized.

**Fix**: Move Method and Move Field. Gather all the related logic into one place.

| Smell | One class changes for many reasons | Many classes change for one reason |
|-------|-----------------------------------|-------------------------------------|
| | Divergent Change | Shotgun Surgery |
| Fix | Extract Class | Move Method/Field → consolidate |

---

## Couplers

### Feature Envy

**Signal**: A method uses another class's data and methods more than its own class's data.

**Cause**: Logic placed in the wrong class.

**Fix**: Move Method to the class whose data it uses.

```
# BEFORE — OrderSummary reaches into Order's data
class OrderSummary
  def display(order)
    "#{order.user.name}: #{order.items.count} items, $#{order.total}"
  end
end

# AFTER — move it to Order (or a dedicated presenter)
class Order
  def summary = "#{user.name}: #{items.count} items, $#{total}"
end
```

---

### Inappropriate Intimacy

**Signal**: Class A accesses Class B's private fields or internal data structures directly.

**Cause**: Missing encapsulation; public exposure of internals.

**Fix**: Move Method, Extract Class, or add a proper public API.

---

### Message Chains

**Signal**: `a.b.c.d()` — reaching through multiple objects.

**Cause**: Violation of Law of Demeter. Code knows too much about internal structure.

**Fix**: Hide Delegate — let the intermediate object provide the service directly.

```
# BEFORE
user.account.billing_profile.address.city

# AFTER — each layer hides what's below it
class User
  def billing_city = account.billing_city
end
class Account
  def billing_city = billing_profile.city
end
```

---

### Middle Man

**Signal**: A class that does almost nothing except delegate every method to another class.

**Cause**: Over-application of delegation, often left over from a refactoring that went too far.

**Fix**: Remove Middle Man — have callers talk to the real object directly.

```
# BEFORE — Manager just passes through
class OrderManager
  def initialize(order) = @order = order
  def total    = @order.total
  def complete = @order.complete!
  def cancel   = @order.cancel!
end

# AFTER — use Order directly
order.total
order.complete!
```

---

## Dispensables

Code that shouldn't be there.

### Comments

**Signal**: A comment explains *what* the code does.

**Cause**: The code is not self-explanatory; name is poor or method is too long.

**Fix**: If a comment explains what a block does, Extract Method with a name that explains it. Delete the comment.

```
# BEFORE — comment compensates for a bad name
# get all active users who haven't logged in for 30 days
u = User.where(active: true).where("last_login_at < ?", 30.days.ago)

# AFTER — the name IS the comment
inactive_active_users = User.active.dormant_for(30.days)
```

**Exception**: Comments for non-obvious WHY (workaround for external bug, subtle algorithm constraint) are valuable. Comments for WHAT the code does are not.

---

### Dead Code

**Signal**: Methods, variables, or classes that are never called.

**Cause**: Incomplete feature removal; left-over experiments; defensive code for cases that never occur.

**Fix**: Delete it. Source control remembers.

---

### Speculative Generality

**Signal**: Abstract base classes with one subclass; parameters that only ever receive one value; plugin systems with no plugins; config flags always set to the same value.

**Cause**: "We might need this later" thinking.

**Fix**: YAGNI — remove it. See `simplicity.md`.

---

### Lazy Class

**Signal**: A class that barely does anything. Its whole behavior could fit in the callers.

**Cause**: Over-engineering; planned but unused expansion points.

**Fix**: Inline Class — fold it back into its callers.

---

## Smell Severity and Priority

Not all smells are equally urgent. Prioritize by:

1. **Smells that block adding features** — Shotgun Surgery, Divergent Change, Message Chains
2. **Smells that create bugs** — Temporary Field, Inappropriate Intimacy
3. **Smells that slow reading** — Comments-as-documentation, Long Method
4. **Smells that waste space** — Dead Code, Lazy Class, Speculative Generality

Apply the Boy Scout Rule: leave the code cleaner than you found it when you touch an area — but don't refactor everything at once. Incremental improvement compounds over time.
