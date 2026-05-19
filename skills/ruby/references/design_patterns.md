# Ruby Design Patterns Reference

Classic design patterns applied to Ruby's idioms. Ruby's dynamic nature means many patterns are lighter than their statically-typed counterparts — some collapse to a module inclusion, a block, or a proc.

Pattern catalog sourced from [refactoring.guru](https://refactoring.guru/design-patterns).

---

## Creational Patterns

### Factory Method

Define an interface for creating an object, but let subclasses (or a factory object) decide which class to instantiate.

**Use when**: You know the interface of what you need but not which concrete class to use until runtime.

```ruby
# Factory method on a base class
class Notification
  def self.for(type, recipient:)
    case type.to_sym
    when :email then EmailNotification.new(recipient)
    when :sms   then SmsNotification.new(recipient)
    when :push  then PushNotification.new(recipient)
    else raise ArgumentError, "Unknown notification type: #{type}"
    end
  end

  def deliver = raise NotImplementedError
end

class EmailNotification < Notification
  def initialize(recipient) = @recipient = recipient
  def deliver = Mailer.send(to: @recipient.email)
end

# Usage
notif = Notification.for(:email, recipient: user)
notif.deliver
```

**Ruby note**: When the factory logic is simple and stable, a Hash of constructors is often cleaner:

```ruby
BUILDERS = {
  email: EmailNotification,
  sms:   SmsNotification,
  push:  PushNotification
}.freeze

def build_notification(type, recipient)
  BUILDERS.fetch(type) { raise ArgumentError, "Unknown: #{type}" }.new(recipient)
end
```

---

### Builder

Construct complex objects step by step, separating construction from representation.

**Use when**: An object needs many optional parts and the constructor would become unwieldy.

```ruby
class QueryBuilder
  def initialize
    @conditions = []
    @order_by   = nil
    @limit      = nil
    @includes   = []
  end

  def where(**conditions)
    @conditions << conditions
    self  # returns self for chaining
  end

  def order(column)
    @order_by = column
    self
  end

  def limit(n)
    @limit = n
    self
  end

  def with(*associations)
    @includes.concat(associations)
    self
  end

  def build
    scope = User.all
    @conditions.each { |c| scope = scope.where(**c) }
    scope = scope.order(@order_by) if @order_by
    scope = scope.limit(@limit)    if @limit
    scope = scope.includes(*@includes) unless @includes.empty?
    scope
  end
end

users = QueryBuilder.new
  .where(active: true)
  .where(role: :admin)
  .order(:name)
  .limit(10)
  .with(:profile)
  .build
```

**Ruby note**: Prefer keyword arguments for simple optional params. Use Builder only when the construction logic is itself complex (validation, multi-step assembly).

---

## Structural Patterns

### Decorator

Attach additional responsibilities to an object dynamically by wrapping it in an object with the same interface.

**Use when**: You want to add behavior to individual objects without changing the class.

```ruby
# Component interface
class TextProcessor
  def process(text)
    text
  end
end

# Concrete decorators — each wraps the previous
class StripDecorator
  def initialize(processor) = @processor = processor
  def process(text) = @processor.process(text.strip)
end

class DowncaseDecorator
  def initialize(processor) = @processor = processor
  def process(text) = @processor.process(text.downcase)
end

class TruncateDecorator
  def initialize(processor, length: 100)
    @processor = processor
    @length    = length
  end
  def process(text)
    result = @processor.process(text)
    result.length > @length ? result[0...@length] + "…" : result
  end
end

# Compose at call site
processor = TruncateDecorator.new(
  DowncaseDecorator.new(
    StripDecorator.new(
      TextProcessor.new
    )
  ),
  length: 50
)

processor.process("  HELLO WORLD  ")  # => "hello world"
```

**Rails note**: Draper decorators follow this pattern. Wrap models to add presentation logic without polluting the model. See the `decorators` skill.

**SimpleDelegator shortcut**: Use `SimpleDelegator` when you want to wrap an object and override only specific methods.

```ruby
class LoggingCache < SimpleDelegator
  def fetch(key, &block)
    Rails.logger.info "Cache #{key}"
    super
  end
end

cache = LoggingCache.new(Rails.cache)
cache.fetch("key") { expensive_call }
```

---

### Adapter

Convert the interface of a class into another interface that clients expect.

**Use when**: You need two incompatible interfaces to work together.

```ruby
# External library has a different interface
class LegacyShippingAPI
  def create_shipment(dest_city, dest_country, weight_lbs)
    # ...
  end
end

# Our system expects this interface
class ShipmentService
  def initialize(adapter) = @adapter = adapter
  def ship(address:, weight_kg:)
    @adapter.create_shipment(address, weight_kg)
  end
end

# Adapter translates between them
class LegacyShippingAdapter
  def initialize(api) = @api = api

  def create_shipment(address, weight_kg)
    weight_lbs = weight_kg * 2.20462
    @api.create_shipment(address.city, address.country, weight_lbs)
  end
end

service = ShipmentService.new(
  LegacyShippingAdapter.new(LegacyShippingAPI.new)
)
service.ship(address: address, weight_kg: 5)
```

---

### Facade

Provide a simplified interface to a complex subsystem.

**Use when**: A subsystem is complex but clients only need a simple entry point.

```ruby
# Subsystem — multiple complex classes
class Inventory; def reserve(items); end; end
class Payment; def charge(card, amount); end; end
class Shipment; def schedule(address, items); end; end
class Email; def send_confirmation(user, order); end; end

# Facade — simple interface
class OrderFacade
  def initialize
    @inventory = Inventory.new
    @payment   = Payment.new
    @shipment  = Shipment.new
    @email     = Email.new
  end

  def place_order(user:, items:, card:, address:)
    @inventory.reserve(items)
    @payment.charge(card, items.sum(&:price))
    @shipment.schedule(address, items)
    @email.send_confirmation(user, items)
  end
end

# Callers use one simple method
OrderFacade.new.place_order(user:, items:, card:, address:)
```

---

## Behavioral Patterns

### Strategy

Define a family of algorithms, encapsulate each one, and make them interchangeable.

**Use when**: You have multiple ways to do something and want to select the algorithm at runtime without conditionals.

```ruby
# Strategies — all respond to `calculate`
class FlatRateShipping
  def calculate(order) = 5.99
end

class WeightBasedShipping
  def calculate(order) = order.weight_kg * 2.50
end

class FreeShipping
  def calculate(order) = 0.0
end

# Context — uses whichever strategy is injected
class ShippingCalculator
  def initialize(strategy) = @strategy = strategy
  def cost(order) = @strategy.calculate(order)
end

calc = ShippingCalculator.new(WeightBasedShipping.new)
calc.cost(order)

# Runtime switching
calc = if order.qualifies_for_free_shipping?
  ShippingCalculator.new(FreeShipping.new)
else
  ShippingCalculator.new(WeightBasedShipping.new)
end
```

**Ruby shortcut**: When strategies are simple and stateless, use lambdas:

```ruby
SHIPPING = {
  flat:   ->(_order) { 5.99 },
  weight: ->(order) { order.weight_kg * 2.50 },
  free:   ->(_order) { 0.0 }
}.freeze

def shipping_cost(order, strategy: :weight)
  SHIPPING.fetch(strategy).call(order)
end
```

---

### Observer (Publish/Subscribe)

Define a one-to-many dependency so that when one object changes, all its dependents are notified.

**Use when**: Changes in one object should trigger updates in others, without tight coupling.

```ruby
module Observable
  def self.included(base)
    base.instance_variable_set(:@subscribers, Hash.new { |h, k| h[k] = [] })
    base.extend(ClassMethods)
  end

  module ClassMethods
    def subscribe(event, &block)
      @subscribers[event] << block
    end

    def subscribers = @subscribers
  end

  def publish(event, payload = {})
    self.class.subscribers[event].each { |cb| cb.call(payload.merge(source: self)) }
  end
end

class Order
  include Observable

  def complete!
    update!(status: :complete)
    publish(:completed, order_id: id)
  end
end

Order.subscribe(:completed) { |event| InventoryService.release(event[:order_id]) }
Order.subscribe(:completed) { |event| Mailer.send_receipt(event[:order_id]) }
```

**Rails note**: ActiveSupport::Notifications and ActiveRecord callbacks are built on this pattern.

---

### Command

Encapsulate a request as an object, allowing parameterization, queuing, and undo.

**Use when**: You need to queue operations, support undo, log operations, or treat requests as first-class objects.

```ruby
# Commands are objects with a #call method
class TransferFunds
  attr_reader :from, :to, :amount

  def initialize(from:, to:, amount:)
    @from   = from
    @to     = to
    @amount = amount
  end

  def call
    ActiveRecord::Base.transaction do
      @from.debit!(@amount)
      @to.credit!(@amount)
    end
    self
  end

  def undo
    ActiveRecord::Base.transaction do
      @to.debit!(@amount)
      @from.credit!(@amount)
    end
  end
end

# Invoker — queues and executes commands
class CommandQueue
  def initialize = @history = []

  def execute(command)
    command.call
    @history << command
  end

  def undo_last
    @history.pop&.undo
  end
end

queue = CommandQueue.new
queue.execute(TransferFunds.new(from: alice, to: bob, amount: 100))
queue.undo_last
```

---

### Template Method

Define the skeleton of an algorithm in a base class; let subclasses override specific steps without changing the overall structure.

**Use when**: Multiple classes share the same algorithm structure but differ in specific steps.

```ruby
class ReportGenerator
  def generate(data)
    formatted = format(data)       # step 1 — subclass overrides
    validate!(formatted)           # step 2 — shared
    output(formatted)              # step 3 — subclass overrides
  end

  private

  def validate!(data)
    raise "No data" if data.empty?
  end

  def format(data)   = raise NotImplementedError
  def output(data)   = raise NotImplementedError
end

class PdfReport < ReportGenerator
  private
  def format(data) = PdfRenderer.render(data)
  def output(data) = S3Uploader.upload(data, bucket: "reports")
end

class CsvReport < ReportGenerator
  private
  def format(data) = CsvSerializer.serialize(data)
  def output(data) = $stdout.print(data)
end
```

**Ruby note**: Often better expressed with composition (Strategy) rather than inheritance (Template Method). Use Template Method when the algorithm structure itself is the thing being reused.

---

### Null Object

Provide a default object that does nothing, eliminating conditional checks for nil.

**Use when**: Code repeatedly guards against nil for an optional dependency or missing record.

```ruby
# Without Null Object — nil checks everywhere
def display_avatar(user)
  if user.avatar
    user.avatar.url
  else
    "/images/default_avatar.png"
  end
end

# Null Object — no more nil checks
class NullAvatar
  def url = "/images/default_avatar.png"
  def present? = false
  def blank? = true
end

class User
  def avatar
    @avatar || NullAvatar.new
  end
end

# Usage — clean, no conditionals
user.avatar.url
```

```ruby
# Null logger — silent in tests, real in production
class NullLogger
  def info(_msg)  = nil
  def warn(_msg)  = nil
  def error(_msg) = nil
  def debug(_msg) = nil
end

class Service
  def initialize(logger: NullLogger.new)
    @logger = logger
  end
end
```

---

### Chain of Responsibility

Pass a request along a chain of handlers. Each handler decides whether to handle or pass along.

**Use when**: More than one object might handle a request, and the handler isn't known a priori.

```ruby
class Handler
  def initialize(next_handler = nil)
    @next = next_handler
  end

  def handle(request)
    @next&.handle(request)
  end
end

class AuthHandler < Handler
  def handle(request)
    return "Unauthorized" unless request[:token]
    super
  end
end

class RateLimitHandler < Handler
  def handle(request)
    return "Too Many Requests" if rate_limited?(request[:ip])
    super
  end
  private
  def rate_limited?(ip) = RateLimiter.exceeded?(ip)
end

class ProcessHandler < Handler
  def handle(request)
    { status: :ok, data: process(request) }
  end
  private
  def process(req) = "processed: #{req[:body]}"
end

# Build chain
chain = AuthHandler.new(RateLimitHandler.new(ProcessHandler.new))
chain.handle(token: "abc", ip: "1.2.3.4", body: "hello")
```

**Rails note**: Rack middleware is a Chain of Responsibility. Each middleware calls `@app.call(env)` to pass down the chain.

---

## Pattern Quick-Select

| Situation | Pattern |
|-----------|---------|
| "Which class to instantiate depends on input" | Factory Method |
| "Object has many optional parts" | Builder |
| "Add behavior without subclassing" | Decorator |
| "Two incompatible interfaces must work together" | Adapter |
| "Simplify a complex subsystem" | Facade |
| "Select algorithm at runtime" | Strategy |
| "Notify many objects when one changes" | Observer |
| "Operations need queuing, logging, or undo" | Command |
| "Shared algorithm structure, varying steps" | Template Method |
| "Eliminate repeated nil checks" | Null Object |
| "Pass request through chain of handlers" | Chain of Responsibility |
