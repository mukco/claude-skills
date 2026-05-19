# Naming Reference

Names are the primary communication medium in code. A good name makes a comment unnecessary. A bad name propagates misunderstanding. These rules apply across languages.

---

## The Core Test

Does the name reveal intent without reading the implementation?

```
# FAILS test — reveals nothing
def d(a, b)
  a.each { |e| b.send(e[:type], e[:val]) }
end

# PASSES test — reveals everything
def dispatch_events(events, handler)
  events.each { |event| handler.send(event[:type], event[:value]) }
end
```

---

## Variables

### Rules

1. Reveal what the variable holds, not its type
2. Pronounceable names only — `usr` is not
3. No encoding or Hungarian notation (`strName`, `iCount`)
4. No single-letter names except accepted loop counters (`i`, `j`) and math (`x`, `y`)

```
# WRONG
d       = Date.today
arr     = []
strName = "Alice"
tmp     = user.profile

# RIGHT
today         = Date.today
recipients    = []
name          = "Alice"
user_profile  = user.profile
```

### Length Should Match Scope

Short scope → shorter name is acceptable. Wide scope → longer, more specific name required.

```ruby
# Fine — tight scope, obvious from context
users.each { |u| process(u) }

# Fine — method level, 5 lines
def send_invites
  batch = users.select(&:invited?)
  batch.each { |u| Mailer.invite(u) }
end

# Requires full name — wide scope, reused across modules
@pending_invitation_recipients = users.select { |u| u.invited? && !u.confirmed? }
```

---

## Booleans

Boolean variables and predicates must be in predicate form — a question that can be answered yes/no.

```
# WRONG
admin         # A thing, not a predicate
active_user
status

# RIGHT
admin?        # Ruby predicate convention
active?
confirmed?
valid?
expired?
```

### Avoid Negated Boolean Names

Negations double the cognitive load when used in conditions.

```
# WRONG — double negative
if !not_active
  ...
end

# RIGHT
if active?
  ...
end
```

---

## Methods / Functions

### Command Methods (Side Effects)

Use verb phrase. The name says what will happen.

```
# WRONG
user_data(user)
email_process
do_thing

# RIGHT
save_user(user)
send_invoice_email
reset_password
archive_order
publish_article
```

### Query Methods (Return a Value, No Side Effects)

Name the return value, not the action.

```
# WRONG
get_user_count   # "get" is noise
fetch_total
retrieve_email

# RIGHT
user_count       # just the noun
total
email
active_users
```

### Predicate Methods (Return Boolean)

Question form. No verb prefix.

```
# WRONG
is_valid
check_admin
has_permission

# RIGHT
valid?
admin?
permitted?
```

### Avoid Misleading Names

A method named `get_user` that also sends an email is a lie. Names must match behavior.

```
# NAME SAYS: get a user
# BEHAVIOR: gets a user AND sends an email AND logs it
def get_user(id)
  user = User.find(id)
  Mailer.welcome(user).deliver
  AuditLog.write(user)
  user
end

# FIX: the side effects need their own call
def find_user(id) = User.find(id)
def welcome_user(user) = Mailer.welcome(user).deliver
```

---

## Classes

### Rules

1. Noun, singular
2. Specific — not `Manager`, `Handler`, `Processor`, `Helper`, `Utils`
3. If you can't name it precisely, the design is wrong

```
# WRONG — vague
UserManager
DataHelper
RequestProcessor
Utils

# RIGHT — specific
UserRegistration
DateFormatter
HttpRequestParser
StringSanitizer (or just sanitize as a module method)
```

### Class Name as Architecture Signal

A class named `XManager` usually violates SRP — it manages multiple things. Extract until each piece has a clean, specific name.

```
# "Manager" signals unclear responsibility
class UserManager
  def create_user; end
  def send_welcome_email; end
  def create_profile; end
end

# Specific names reveal the separation
class UserCreator; end
class WelcomeMailer; end
class ProfileBuilder; end
```

---

## Constants

Constants must name the concept, not just encode the value.

```
# WRONG — magic numbers
MAX    = 3
DELAY  = 0.5
STATUS = 1

# RIGHT — named concepts
MAX_LOGIN_ATTEMPTS    = 3
RETRY_DELAY_SECONDS   = 0.5
ORDER_STATUS_PENDING  = 1

# Or use enums / frozen structs for related constants
module OrderStatus
  PENDING   = "pending"
  CONFIRMED = "confirmed"
  SHIPPED   = "shipped"
  DELIVERED = "delivered"
end
```

### Rules

- SCREAMING_SNAKE for true constants (values that never change)
- Scope constants as narrowly as possible (class constant > module constant > global)
- Freeze mutable constant values (arrays, hashes, strings)

```ruby
class RateLimiter
  MAX_REQUESTS_PER_MINUTE = 60
  BLOCKED_STATUS_CODES    = [429, 503].freeze
end
```

---

## Parameters

Parameters name what the caller provides and what the function expects.

```
# WRONG — encodes type, not purpose
def send(string, hash, int)

# RIGHT — encodes intent
def send(message, headers, retry_count)
```

### Keyword Arguments (3+ parameters)

When a method has 3 or more parameters, use keyword arguments. Callers don't need to remember order, and the call site is self-documenting.

```ruby
# WRONG — order-dependent, opaque at call site
create_user("Alice", "alice@example.com", true, "admin")

# RIGHT — self-documenting
create_user(
  name:     "Alice",
  email:    "alice@example.com",
  verified: true,
  role:     "admin"
)
```

---

## Tests

Tests are documentation. The test name explains what behavior is being verified.

### Structure: context → behavior → outcome

```
# WRONG — says nothing
test "user"
it "works"
describe "error"

# RIGHT — complete sentence without reading the body
describe "User#charge" do
  context "when balance is sufficient" do
    it "deducts the amount from the balance"
    it "records the transaction"
  end

  context "when balance is insufficient" do
    it "raises InsufficientFundsError"
    it "does not modify the balance"
  end
end
```

### No "should" in test names

"should" is hedging — tests are specifications, not suggestions.

```
# WRONG
it "should send an email"

# RIGHT
it "sends a confirmation email to the user"
```

---

## Naming Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| `getData()` | "get" is noise | `data()` or `fetch_user()` |
| `processAll()` | Vague — process how? | `archive_expired_orders()` |
| `flag`, `temp`, `data`, `info` | No information | Name what it actually is |
| `Manager`, `Handler`, `Helper` | SRP violation disguised | Extract and name specifically |
| Abbreviations (`usr`, `cnt`, `msg`) | Not pronounceable | Use full words |
| `is_` prefix in Ruby | Not idiomatic | Use `?` suffix |
| `NOT_` / `NO_` boolean | Double negative | Flip to positive form |
| Comments that explain the name | Name is inadequate | Rename instead |

---

## The Rename Heuristic

If you would add a comment to explain a variable or method name, the name is wrong. Improve the name; delete the comment.

```ruby
# WRONG — name needs explanation
# number of days since last active
d = (Time.now - user.last_active_at) / 86400

# RIGHT — the name IS the explanation
days_since_last_active = (Time.now - user.last_active_at) / 1.day
```
