# Python Error Handling Reference

## Exception Hierarchy

```
BaseException
├── SystemExit
├── KeyboardInterrupt
├── GeneratorExit
└── Exception                    ← catch this or subclasses in application code
    ├── StopIteration
    ├── ArithmeticError
    │   ├── ZeroDivisionError
    │   └── OverflowError
    ├── LookupError
    │   ├── IndexError
    │   └── KeyError
    ├── OSError (IOError alias)
    │   ├── FileNotFoundError
    │   ├── PermissionError
    │   └── TimeoutError
    ├── ValueError
    ├── TypeError
    ├── AttributeError
    ├── NameError
    ├── RuntimeError
    └── (your custom exceptions)
```

**Critical rule**: Never `except BaseException` or bare `except:` — those catch `KeyboardInterrupt` and `SystemExit`, preventing shutdown. Always catch `Exception` or a specific subclass.

---

## EAFP vs LBYL

Python's style is **EAFP** (Easier to Ask Forgiveness than Permission) — try the operation, handle failure — over **LBYL** (Look Before You Leap) — check before acting.

```python
# LBYL — check before acting (not Pythonic for common paths)
if key in data:
    value = data[key]
    process(value)

# EAFP — try and handle (Pythonic)
try:
    value = data[key]
    process(value)
except KeyError:
    handle_missing()

# LBYL creates race conditions in concurrent code:
# if os.path.exists(path):  ← file could be deleted between check and open
#     with open(path) as f: ...

# EAFP is safe:
try:
    with open(path) as f:
        data = f.read()
except FileNotFoundError:
    data = default_value
```

---

## try / except / else / finally

```python
try:
    result = risky_operation()
except SpecificError as e:
    handle(e)
except (AnotherError, YetAnother) as e:
    handle_both(e)
except Exception as e:
    log_and_reraise(e)
    raise
else:
    # Only runs if no exception was raised
    process(result)
finally:
    # Always runs — error or not
    cleanup()
```

### else Is Underused

`else` separates "what happens when successful" from "what happens when it fails":

```python
try:
    conn = db.connect()
except DatabaseError as e:
    logger.error("Cannot connect: %s", e)
    return None
else:
    return conn.query(sql)  # only if connect succeeded
finally:
    conn.close() if conn else None
```

---

## Raising Exceptions

```python
# Raise with message
raise ValueError("Amount must be positive")

# Raise exception instance
raise PaymentError(order_id=order.id, reason="declined")

# Re-raise current exception (preserves traceback)
except Exception:
    log(...)
    raise

# Raise chained exception — preserves original as __cause__
except NetworkError as e:
    raise ServiceUnavailableError("Payment gateway unreachable") from e

# Suppress chaining (when original is irrelevant)
except LegacyError as e:
    raise ModernError("Failed") from None
```

---

## Custom Exception Classes

```python
# Base exception for a domain
class BillingError(Exception):
    """Base for all billing errors."""

class PaymentError(BillingError):
    def __init__(self, order_id: str, reason: str):
        self.order_id = order_id
        self.reason   = reason
        super().__init__(f"Payment failed for order {order_id}: {reason}")

class InsufficientFundsError(PaymentError): ...
class CardDeclinedError(PaymentError): ...
class GatewayTimeoutError(BillingError): ...

# Raise with context
raise CardDeclinedError(order_id="o_123", reason="Card expired")

# Catch broadly or specifically
try:
    process_payment(order)
except CardDeclinedError as e:
    notify_user(e.reason)
except GatewayTimeoutError:
    retry_later()
except BillingError as e:
    log_and_refund(e.order_id)
```

---

## Context Managers for Cleanup

Use context managers instead of `try/finally` for resource cleanup.

```python
from contextlib import contextmanager, suppress

# contextmanager decorator
@contextmanager
def database_transaction(conn):
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise  # re-raise after rollback

# suppress — silently ignore specific exceptions
with suppress(FileNotFoundError):
    os.remove("temp.file")  # won't raise if file doesn't exist

# ExitStack — dynamic number of context managers
from contextlib import ExitStack

def process_files(paths: list[str]):
    with ExitStack() as stack:
        files = [stack.enter_context(open(p)) for p in paths]
        return [f.read() for f in files]
```

---

## ExceptionGroup (Python 3.11+)

Handle multiple simultaneous exceptions (e.g., from `asyncio.TaskGroup`).

```python
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(task_a())
        tg.create_task(task_b())
except* ValueError as eg:
    for exc in eg.exceptions:
        handle_value_error(exc)
except* TimeoutError as eg:
    retry()
```

---

## retry Pattern

```python
import time
import functools

def retry(
    exceptions: tuple = (Exception,),
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0
):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            wait = delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    time.sleep(wait)
                    wait *= backoff
        return wrapper
    return decorator

@retry(exceptions=(TimeoutError, ConnectionError), max_attempts=5, delay=0.5)
def call_api(url: str) -> dict:
    return requests.get(url, timeout=10).json()
```

---

## Fail Fast

Validate at boundaries, trust internal code.

```python
def create_user(name: str, email: str, age: int) -> User:
    # Validate at the boundary
    if not name or not name.strip():
        raise ValueError("Name cannot be blank")
    if "@" not in email:
        raise ValueError(f"Invalid email: {email!r}")
    if not 0 < age < 150:
        raise ValueError(f"Age {age} out of valid range")

    # Internal code proceeds without re-checking
    return User(name=name.strip(), email=email.lower(), age=age)
```

---

## Best Practices

### Do

- Catch the most specific exception type possible
- Always re-raise after logging if you can't handle the error
- Use `from e` when wrapping exceptions — preserve the cause
- Use context managers for resource cleanup instead of `try/finally`
- Create domain exception hierarchies so callers can catch broadly or specifically
- Use `suppress()` for truly optional operations where failure is expected

### Don't

- Never `except:` bare or `except BaseException:` — catches signals
- Never swallow exceptions silently (empty `except` body)
- Don't use exceptions for control flow on expected paths (`find_by` returning None is not an error)
- Don't discard `__cause__` when wrapping — use `raise NewError() from original`
- Don't `print` exceptions — use `logging.exception()` which captures the traceback
