# SOLID Principles Reference

Five principles for object-oriented design that, together, produce code that is easier to maintain, extend, and test. Named by Robert C. Martin.

---

## S — Single Responsibility Principle

> A class should have only one reason to change.

"Reason to change" maps to a stakeholder or concern. If the marketing team and the infrastructure team would both ask you to change a class for different reasons, it has multiple responsibilities.

### Identifying Violations

- The class name contains "And," "Manager," "Handler," "Processor"
- The class imports from many unrelated subsystems
- Changing the persistence layer requires touching the same file as business rules
- The class is hard to name precisely

```
# VIOLATION — three reasons to change (data format, business logic, output)
class SalesReport
  def initialize(data) = @data = data

  def parse_csv         # changes when CSV format changes
  def calculate_totals  # changes when pricing rules change
  def format_html       # changes when design changes
  def send_email        # changes when email provider changes
end

# BETTER — each class has one reason to change
class SalesCsvParser; end         # changes: CSV format
class SalesSummarizer; end        # changes: business rules
class SalesHtmlFormatter; end     # changes: design
class ReportMailer; end           # changes: email provider
```

### The Test: One Sentence

Describe a class in one sentence. If the sentence requires "and" or "or," extract until each piece has a clean one-sentence description.

---

## O — Open/Closed Principle

> Software entities should be open for extension, but closed for modification.

A class is "closed" when it has a stable interface and its internals don't need to change when new variants are added. It is "open" when you can add new behavior without touching existing, tested code.

### Identifying Violations

- Adding a new type requires editing an existing `case`/`if-elsif` chain
- The class has a growing list of boolean flags for different "modes"
- Tests for existing behavior break when new behavior is added

```
# VIOLATION — every new payment type requires editing this method
class PaymentProcessor
  def process(payment)
    case payment.type
    when :credit_card then charge_credit_card(payment)
    when :bank_transfer then initiate_transfer(payment)
    when :crypto       then broadcast_transaction(payment)  # added — modified existing code!
    end
  end
end

# OPEN/CLOSED — new type = new class, no editing existing code
class CreditCardPayment
  def process = ChargeGateway.charge(card_token, amount)
end

class BankTransferPayment
  def process = AchGateway.transfer(routing_number, account_number, amount)
end

class CryptoPayment
  def process = BlockchainClient.broadcast(wallet_address, amount)
end

class PaymentProcessor
  def process(payment)
    payment.process  # delegates to the payment object — no switch needed
  end
end
```

### Practical Application

OCP is about finding the right axis of variation and expressing it through polymorphism, strategy, or configuration — so adding variants doesn't require touching core logic.

---

## L — Liskov Substitution Principle

> Subtypes must be substitutable for their base types without altering the correctness of the program.

If your code takes a `Shape` and draws it, it should work correctly whether that `Shape` is a `Circle`, `Square`, or any future shape — without special-casing.

### Identifying Violations

- A subclass overrides a method to throw `NotImplementedError` or `UnsupportedOperation`
- A subclass adds preconditions the parent doesn't have
- Callers do `if x.is_a?(SpecificSubclass)` to apply different logic
- The subclass weakens postconditions (returns less than the parent promises)

```
# VIOLATION — Rectangle/Square classic
class Rectangle
  attr_accessor :width, :height
  def area = width * height
end

class Square < Rectangle
  def width=(v)  = @width  = @height = v  # breaks Rectangle's contract!
  def height=(v) = @width  = @height = v
end

r = Square.new
r.width  = 5
r.height = 3
r.area    # => 9 — caller expecting 15! (5 * 3)
```

The problem: `Square` cannot honor `Rectangle`'s contract (independent `width`/`height`).

```
# FIX — don't inherit; model correctly
class Shape; end
class Rectangle < Shape
  def initialize(width:, height:)
    @width = width; @height = height
  end
  def area = @width * @height
end
class Square < Shape
  def initialize(side:) = @side = side
  def area = @side ** 2
end
```

### Design Rule

If you find yourself overriding a method to raise "not supported," that's a signal to not inherit — use composition or share only an interface (module/duck type).

---

## I — Interface Segregation Principle

> Clients should not be forced to depend on interfaces they don't use.

In Ruby (no explicit interfaces), this manifests as: don't mix unrelated behaviors into one module, mixin, or base class. Classes that `include` a module should need all of its methods.

### Identifying Violations

- A module that classes include but only use 30% of its methods
- Stub implementations of required methods: `def send_email; end`
- A base class with abstract methods that only some subclasses override

```
# VIOLATION — implementors must define export even if they don't export
module Reportable
  def generate; end   # all need this
  def export_pdf; end # only some need this
  def export_csv; end # only some need this
  def archive; end    # only some need this
end

class SummaryReport
  include Reportable
  def generate = build_summary
  def export_pdf = raise NotImplementedError  # forced stub
  def export_csv = raise NotImplementedError  # forced stub
  def archive    = raise NotImplementedError  # forced stub
end

# BETTER — narrow interfaces
module Reportable
  def generate; end
end

module PdfExportable
  def export_pdf; end
end

module Archivable
  def archive; end
end

class SummaryReport
  include Reportable  # only what it needs
end

class FullReport
  include Reportable
  include PdfExportable
  include Archivable
end
```

---

## D — Dependency Inversion Principle

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

### The Two Rules

1. High-level policy code should not depend on low-level detail code.
2. Abstractions should not depend on details; details should depend on abstractions.

### Identifying Violations

- A business logic class instantiates `MySqlAdapter.new`, `S3Client.new`, or `SendgridMailer.new` directly
- Tests require the real implementation (cannot swap for a test double)
- Changing the database or email provider requires editing business logic

```
# VIOLATION — OrderService depends directly on concrete classes
class OrderService
  def process(order)
    db      = PostgresAdapter.new(ENV["DB_URL"])  # concrete dep
    mailer  = SendgridMailer.new(ENV["SG_KEY"])   # concrete dep
    payment = StripeGateway.new(ENV["STRIPE_KEY"])# concrete dep

    payment.charge(order.amount)
    db.save(order)
    mailer.send(order.user.email, "Order confirmed")
  end
end

# BETTER — depend on injected abstractions
class OrderService
  def initialize(payment_gateway:, repository:, mailer:)
    @payment = payment_gateway
    @repo    = repository
    @mailer  = mailer
  end

  def process(order)
    @payment.charge(order.amount)
    @repo.save(order)
    @mailer.send(order.user.email, "Order confirmed")
  end
end

# Wire it up at the application boundary (not inside the service)
OrderService.new(
  payment_gateway: StripeGateway.new(ENV["STRIPE_KEY"]),
  repository:      OrderRepository.new(PostgresAdapter.new),
  mailer:          SendgridMailer.new(ENV["SG_KEY"])
)

# Or for tests — inject fakes
OrderService.new(
  payment_gateway: FakePaymentGateway.new,
  repository:      InMemoryRepository.new,
  mailer:          FakeMailer.new
)
```

### DIP in Ruby Without Explicit Interfaces

Ruby uses duck typing, so you don't need formal interface declarations. Document the expected protocol in comments or use `respond_to?` checks at system boundaries:

```ruby
class OrderService
  # payment_gateway: must respond to #charge(amount)
  # repository:      must respond to #save(record)
  # mailer:          must respond to #send(to, subject)
  def initialize(payment_gateway:, repository:, mailer:)
    # ...
  end
end
```

---

## SOLID Together

The principles reinforce each other:

| SRP | Ensures classes are small enough that OCP, LSP, ISP, DIP are achievable |
|-----|-------------------------------------------------------------------------|
| OCP | Makes the system extensible without regression risk |
| LSP | Makes polymorphism trustworthy |
| ISP | Keeps modules focused, preventing unnecessary coupling |
| DIP | Decouples layers, enabling testability and swappability |

A common failure mode: large classes (SRP violation) that own their dependencies (DIP violation) and check `is_a?` instead of polymorphism (LSP/OCP violation) — all three compound into systems that are hard to change without breaking unrelated things.

---

## SOLID Anti-Patterns Summary

| Principle | Common Anti-Pattern |
|-----------|-------------------|
| SRP | Manager/Handler/Processor God classes |
| OCP | `case`/`if-elsif` chains on type that grow |
| LSP | Raising `NotImplementedError` in subclass overrides |
| ISP | Stub/empty method implementations |
| DIP | `DatabaseAdapter.new` inside business logic |
