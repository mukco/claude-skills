# Ruby Error Handling Reference

## Exception Hierarchy

```
Exception
├── ScriptError
│   ├── LoadError
│   ├── NotImplementedError
│   └── SyntaxError
├── SignalException
│   └── Interrupt
├── SystemExit
└── StandardError               ← rescue this or subclasses in application code
    ├── ArgumentError
    │   └── UncaughtThrowError
    ├── EncodingError
    ├── FiberError
    ├── IOError
    │   └── EOFError
    ├── IndexError
    │   ├── KeyError
    │   └── StopIteration
    ├── Math::DomainError
    ├── NameError
    │   └── NoMethodError
    ├── RangeError
    │   └── FloatDomainError
    ├── RegexpError
    ├── RuntimeError            ← raised by raise "message"
    ├── SystemCallError
    │   └── Errno::*           ← ENOENT, ECONNREFUSED, etc.
    ├── ThreadError
    ├── TypeError
    ├── ZeroDivisionError
    └── (your custom errors)
```

**Critical rule**: Never `rescue Exception`. That catches `Interrupt` (Ctrl+C) and `SignalException`, preventing graceful shutdown. Always rescue `StandardError` or a specific subclass.

---

## rescue Syntax

### Basic Forms

```ruby
# Inline rescue (returns nil on error)
value = Integer(input) rescue nil

# Method-level rescue (catches for entire method body)
def parse(input)
  Integer(input)
rescue ArgumentError
  0
end

# Block-level rescue
begin
  risky_operation
rescue SpecificError => e
  handle(e)
rescue AnotherError, YetAnotherError => e
  handle_both(e)
rescue => e      # Rescues StandardError and subclasses
  log_and_reraise(e)
ensure
  cleanup        # Always runs, error or not
end
```

### Rescue Specificity

Always rescue the most specific exception first. Ruby matches the first `rescue` clause that applies.

```ruby
# WRONG — RuntimeError rescued before never-checked SpecificError
rescue RuntimeError
rescue SpecificError  # SpecificError < RuntimeError — never reached!

# RIGHT — specific first
rescue SpecificError
rescue RuntimeError
```

---

## Custom Exception Classes

### Basic Custom Error

```ruby
class PaymentError < StandardError; end
class InsufficientFundsError < PaymentError; end
class CardDeclinedError < PaymentError; end
```

### With Context

```ruby
class OrderError < StandardError
  attr_reader :order_id, :reason

  def initialize(order_id:, reason:)
    @order_id = order_id
    @reason   = reason
    super("Order #{order_id} failed: #{reason}")
  end
end

# Raise with context
raise OrderError.new(order_id: order.id, reason: "payment declined")

# Rescue with context
rescue OrderError => e
  logger.error "Order #{e.order_id} failed: #{e.reason}"
```

### Error Hierarchy for a Domain

Group domain errors under a base class so callers can rescue broadly or specifically.

```ruby
# All billing errors share a base
module Billing
  class Error < StandardError; end
  class PaymentError     < Error; end
  class ValidationError  < Error; end
  class GatewayError     < Error; end
  class TimeoutError     < GatewayError; end
  class DeclinedError    < GatewayError; end
end

# Rescue all billing errors
rescue Billing::Error => e
  handle_billing_failure(e)

# Rescue only gateway timeouts
rescue Billing::TimeoutError => e
  retry_with_backoff
```

---

## raise and fail

`raise` and `fail` are aliases. Convention:
- `raise` for raising exceptions in normal flow (found an invalid state)
- `fail` is often used in guard-clause style — both work identically

```ruby
# Raise with a message
raise ArgumentError, "Name cannot be blank"

# Raise with a custom error instance
raise PaymentError.new(order_id: id, reason: "declined")

# Re-raise the current exception (preserves backtrace)
rescue => e
  logger.error(e.message)
  raise  # re-raises e with original backtrace

# Raise a different error while preserving original as cause
rescue NetworkError => e
  raise ServiceUnavailableError, "Cannot reach payment gateway", cause: e
```

---

## retry

Re-execute the `begin` block. Always bound by a counter to prevent infinite loops.

```ruby
attempts = 0
begin
  attempts += 1
  call_external_api
rescue Timeout::Error => e
  retry if attempts < 3
  raise  # give up after 3 attempts
end

# Exponential backoff
attempts = 0
begin
  attempts += 1
  call_external_api
rescue Timeout::Error
  if attempts < 4
    sleep(2 ** attempts)  # 2, 4, 8 seconds
    retry
  end
  raise
end
```

---

## ensure

`ensure` runs whether or not an exception was raised. Use for teardown and cleanup — releasing locks, closing connections, resetting state.

```ruby
def process_file(path)
  file = File.open(path)
  process(file)
rescue IOError => e
  log_error(e)
ensure
  file&.close  # Always runs; safe navigation handles case where open failed
end
```

`ensure` does NOT suppress exceptions. If the `begin` block raises, `ensure` runs, then the exception propagates.

If you `return` from `ensure`, that return value overrides the exception — avoid this.

---

## else in rescue

The `else` block runs only if no exception was raised. Separates success handling from error handling.

```ruby
begin
  result = risky_operation
rescue NetworkError => e
  handle_network_error(e)
else
  # Only runs when no exception
  process_result(result)
ensure
  cleanup
end
```

---

## Fail Fast

Fail early with a clear error rather than propagating a bad state through the system.

```ruby
# WRONG — bad state propagates, error appears far from cause
def process(user)
  order = build_order(user)
  # ... 30 lines later ...
  order.user.email  # NoMethodError: undefined method email for nil
end

# RIGHT — fail at the boundary
def process(user)
  raise ArgumentError, "User is required" unless user
  raise ArgumentError, "User must be active" unless user.active?
  order = build_order(user)
  # ...
end
```

### Guard at System Boundaries

Validate inputs at the entry points of your system. Trust internal code.

```ruby
class CreateOrder
  def initialize(params)
    @user_id  = Integer(params[:user_id])  # raises ArgumentError for bad input
    @amount   = BigDecimal(params[:amount].to_s)
    @currency = params[:currency].to_s.upcase
    validate!
  end

  private

  def validate!
    raise ArgumentError, "Amount must be positive"  unless @amount.positive?
    raise ArgumentError, "Invalid currency: #{@currency}" unless VALID_CURRENCIES.include?(@currency)
  end
end
```

---

## Result Objects (Alternative to Exceptions)

For expected failures in business logic, result objects are often clearer than exceptions. Exceptions are for exceptional conditions — not for "user didn't have funds."

```ruby
class Result
  attr_reader :value, :error

  def self.ok(value)    = new(value: value, success: true)
  def self.err(message) = new(error: message, success: false)

  def initialize(value: nil, error: nil, success:)
    @value   = value
    @error   = error
    @success = success
  end

  def ok?     = @success
  def failure? = !@success

  def on_ok
    yield @value if ok?
    self
  end

  def on_failure
    yield @error if failure?
    self
  end
end

def charge_card(user, amount)
  return Result.err("Insufficient funds") if user.balance < amount
  return Result.err("Card expired") if user.card.expired?

  gateway_result = PaymentGateway.charge(user.card, amount)
  Result.ok(gateway_result.transaction_id)
rescue Gateway::TimeoutError => e
  Result.err("Gateway timeout: #{e.message}")
end

result = charge_card(user, 50.00)
result
  .on_ok    { |tx_id| confirm_order(tx_id) }
  .on_failure { |msg| flash[:error] = msg }
```

---

## Exception Best Practices

### Do

- Rescue specific exception classes, not `StandardError` broadly
- Add context when re-raising (message, `cause:`, structured data)
- Use `ensure` for cleanup — never rely on the success path alone
- Create domain-specific error hierarchies (`Billing::Error`, `Billing::GatewayError`)
- Use result objects for expected business failures; exceptions for truly exceptional states
- Log the original exception's message and backtrace before wrapping

### Don't

- Never `rescue Exception` — catches signals and prevents clean shutdown
- Don't rescue and swallow errors silently (`rescue nil` or empty rescue body)
- Don't use exceptions for control flow (non-exceptional cases like "user not found")
- Don't rescue in a method that can't meaningfully handle the error — let it propagate
- Don't discard the original exception when wrapping: preserve `cause`

### Anti-Patterns

```ruby
# WRONG — rescue Exception
rescue Exception => e
  puts e  # swallows Interrupt, SignalException, etc.

# WRONG — silent rescue
begin
  risky
rescue
  # do nothing — the error has now vanished
end

# WRONG — broad rescue hiding specific errors
rescue StandardError => e
  # handles ArgumentError, TypeError, NoMethodError, etc. — too broad for this context

# WRONG — exception as flow control
begin
  user = User.find(id)  # raises RecordNotFound
rescue ActiveRecord::RecordNotFound
  redirect_to root_path  # use find_by + nil check instead
end

# RIGHT — use find_by for optional records
user = User.find_by(id: id)
redirect_to root_path and return unless user
```
