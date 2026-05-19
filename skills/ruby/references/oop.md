# Ruby OOP Reference

Practical object-oriented design in Ruby. Based on the principles from *Practical Object-Oriented Design in Ruby* (Sandi Metz) and *99 Bottles of OOP*.

## Single Responsibility Principle

### Identifying Violations

Ask: "What does this class do?" If the answer contains "and," it has more than one responsibility.

Interrogate methods the same way: describe what the method does; if it requires more than one sentence, extract.

```ruby
# ONE responsibility: managing user authentication state
class UserSession
  def initialize(user) = @user = user
  def authenticated? = @user.password_digest.present?
  def expire! = @expires_at = Time.now
  def expired? = @expires_at&.past?
end

# TWO responsibilities: authentication + formatting (violation)
class UserSession
  def authenticate_and_render_badge
    return "<guest>" unless authenticated?
    "<#{@user.name}>"
  end
end
```

### Extracting Responsibilities

When you find multiple responsibilities:
1. List what the class does (each verb is a candidate for extraction).
2. Group related behaviors.
3. Name the group — that name is the new class.

```ruby
# BEFORE — Order manages pricing logic AND persistence
class Order
  def total
    line_items.sum { |i| i.price * i.quantity } * (1 - discount_rate)
  end
  def save! = Database.insert(self)
  def discount_rate = customer.tier == :gold ? 0.1 : 0.0
end

# AFTER — separate pricing knowledge
class OrderPricer
  def initialize(order) = @order = order
  def total = subtotal * (1 - discount_rate)
  private
  def subtotal = @order.line_items.sum { |i| i.price * i.quantity }
  def discount_rate = @order.customer.gold? ? 0.1 : 0.0
end

class Order
  def total = OrderPricer.new(self).total
  def save! = Database.insert(self)
end
```

---

## Tell, Don't Ask

### The Problem

Asking an object for its state so you can make a decision *for* it is a violation. It means the decision logic is in the wrong place.

```ruby
# ASK pattern — violates Tell, Don't Ask
def send_notification(user)
  if user.notification_preferences.email_enabled? &&
     !user.notification_preferences.silenced_until&.future?
    Mailer.notify(user.email)
  end
end

# TELL pattern — push the decision to the owner of the data
def send_notification(user)
  user.notify_via_email  # User and its preferences encapsulate the decision
end
```

### Command/Query Separation (CQS)

Methods either:
- **Command**: change state, return nothing (or `self`)
- **Query**: return a value, change nothing

Never both. Mixing causes reasoning nightmares — you can't call a query safely without worrying about side effects.

```ruby
# VIOLATION — command + query mixed
def pop_and_return
  item = @stack.last
  @stack.delete_at(-1)
  item
end

# CORRECT — separate concerns
def pop = @stack.delete_at(-1)          # command
def peek = @stack.last                   # query
```

---

## Law of Demeter

Only talk to your immediate neighbors. A method should call methods only on:
- `self`
- Objects passed as arguments
- Objects you create locally
- Direct components (instance variables)

**Never** chain through an object graph.

```ruby
# VIOLATION — reaches through 3 layers
def display_city(order)
  order.customer.address.city
end

# CORRECT — delegate through each layer
class Order
  def customer_city = customer.city
end
class Customer
  def city = address.city
end

def display_city(order)
  order.customer_city
end
```

**Exception**: method chains on a known, stable fluent interface (e.g., `Time.now.beginning_of_day.utc`) are acceptable. The violation is reaching through objects you don't own.

---

## Dependency Injection

### The Problem with `new` Inside a Class

When a class instantiates its collaborators, it is tightly coupled to a specific implementation. Testing requires changing production code, and swapping implementations is invasive.

```ruby
# TIGHTLY COUPLED — hard to test, hard to swap
class NotificationService
  def send(message)
    EmailClient.new(api_key: ENV["API_KEY"]).deliver(message)  # concrete dependency
  end
end

# INJECT — dependency is external
class NotificationService
  def initialize(mailer)
    @mailer = mailer
  end
  def send(message) = @mailer.deliver(message)
end

# Production
NotificationService.new(EmailClient.new(api_key: ENV["API_KEY"]))

# Test
NotificationService.new(FakeMailer.new)
```

### Default Values for Convenience

Injection doesn't mean callers always provide everything. Use defaults for the common case:

```ruby
class OrderProcessor
  def initialize(pricer: OrderPricer.new, notifier: EmailNotifier.new)
    @pricer   = pricer
    @notifier = notifier
  end
end

# Common use — defaults apply
OrderProcessor.new

# Test — inject doubles
OrderProcessor.new(pricer: double, notifier: spy)
```

---

## Composition vs. Inheritance

### When Inheritance Is Appropriate

Inheritance models an **is-a** relationship with shared behavior. Every subclass must be a valid specialization of the parent — no override should surprise a caller expecting the parent.

```ruby
class Payment
  def process = raise NotImplementedError
  def record_attempt = AuditLog.write(self)
end

class CreditCardPayment < Payment
  def process = StripeGateway.charge(amount, card_token)
end

class BankTransferPayment < Payment
  def process = AchGateway.transfer(amount, routing_number)
end
```

### When Composition Is Appropriate

Composition models a **has-a** relationship. Prefer it when:
- You want to reuse behavior without committing to a type hierarchy
- The behavior may change at runtime
- Multiple behaviors need to be combined

```ruby
# Inheritance creates a deep, rigid hierarchy
class EmailReport < Report; end
class PdfReport < Report; end
class ScheduledEmailReport < EmailReport; end  # starts to get messy

# Composition — any combination without hierarchy
class Report
  def initialize(formatter:, delivery:)
    @formatter = formatter
    @delivery  = delivery
  end
  def run(data)
    @delivery.deliver(@formatter.format(data))
  end
end

Report.new(formatter: PdfFormatter.new, delivery: EmailDelivery.new)
Report.new(formatter: HtmlFormatter.new, delivery: S3Delivery.new)
```

---

## Value Objects

Use value objects when a primitive (string, integer) carries domain meaning and behavior.

A value object:
- Is defined by its attributes, not identity
- Is immutable (frozen in Ruby)
- Has no side effects
- Implements equality by value, not object identity

```ruby
class Money
  include Comparable

  attr_reader :amount, :currency

  def initialize(amount, currency)
    @amount   = amount.to_d
    @currency = currency.to_s.upcase.freeze
    freeze
  end

  def +(other)
    assert_same_currency!(other)
    Money.new(amount + other.amount, currency)
  end

  def <=>(other)
    assert_same_currency!(other)
    amount <=> other.amount
  end

  def ==(other)
    other.is_a?(Money) && amount == other.amount && currency == other.currency
  end

  def to_s = "#{amount} #{currency}"

  private

  def assert_same_currency!(other)
    raise ArgumentError, "Currency mismatch" unless currency == other.currency
  end
end

price = Money.new(10, "USD")
tax   = Money.new(1, "USD")
total = price + tax  # => Money(11, USD)
```

**Other good value objects**: `EmailAddress`, `PhoneNumber`, `Coordinates`, `DateRange`, `Color`

---

## Service Objects

Service objects encapsulate a single business operation — a verb, not a noun. Use them when:
- A transaction involves multiple models
- An operation has multiple steps with distinct failure modes
- A workflow needs to be tested in isolation

### Structure

```ruby
class CreateOrder
  Result = Data.define(:order, :success, :error)

  def initialize(user:, cart:, payment_method:)
    @user           = user
    @cart           = cart
    @payment_method = payment_method
  end

  def call
    ActiveRecord::Base.transaction do
      order   = build_order
      charge  = process_payment(order)
      confirm(order, charge)
      Result.new(order: order, success: true, error: nil)
    end
  rescue PaymentError => e
    Result.new(order: nil, success: false, error: e.message)
  end

  private

  def build_order
    Order.create!(user: @user, items: @cart.items)
  end

  def process_payment(order)
    PaymentGateway.charge(@payment_method, order.total)
  end

  def confirm(order, charge)
    order.update!(payment_id: charge.id, status: :confirmed)
    OrderMailer.confirmation(order).deliver_later
  end
end

# Usage
result = CreateOrder.new(user: current_user, cart: cart, payment_method: pm).call
if result.success
  redirect_to order_path(result.order)
else
  flash[:error] = result.error
end
```

### Conventions

- Name the class after the operation: `CreateUser`, `ArchiveOrder`, `SyncInventory`
- Entry point is always `#call`
- Return a result object, not `true`/`false`
- The service should not know about HTTP; controllers translate
- One service = one business operation; chain services, don't nest them

---

## Anti-Patterns

### Anemic Model

A model with only data accessors and no behavior. Business logic lives entirely in external services or controllers.

```ruby
# ANEMIC — Order is just a struct
class Order
  attr_accessor :status, :total, :user_id
end

# Behavior scattered in controllers
def approve_order
  order.status = "approved"
  order.save
  UserMailer.order_approved(order.user).deliver_later
end

# RICH MODEL — behavior belongs to the model when it's about the model
class Order
  def approve!
    update!(status: :approved)
    UserMailer.order_approved(user).deliver_later
  end
end
```

### God Object

A class that knows about and coordinates everything. Grows by accumulation. Signs: 500+ lines, 20+ public methods, `requires` half the codebase.

Fix: Apply SRP iteratively. Extract the first obvious responsibility, run tests, repeat.

### Inappropriate Intimacy

Class A reaches into Class B's private parts — reads internal attributes, bypasses public interface.

Fix: Move the behavior to where the data lives, or create a proper public API.
