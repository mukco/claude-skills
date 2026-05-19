# Python Design Patterns Reference

Classic patterns applied to Python idioms. Python's first-class functions and duck typing mean many patterns are lighter than their Java/C++ counterparts.

Pattern catalog sourced from [refactoring.guru](https://refactoring.guru/design-patterns).

---

## Strategy

Define interchangeable algorithms. In Python, a callable (function, lambda, or object with `__call__`) is the natural strategy.

```python
from typing import Callable

# Strategies as callables
def flat_rate(order) -> float:
    return 5.99

def weight_based(order) -> float:
    return order.weight_kg * 2.50

def free_shipping(order) -> float:
    return 0.0

# Context — strategy injected, not hardcoded
class ShippingCalculator:
    def __init__(self, strategy: Callable):
        self._strategy = strategy

    def cost(self, order) -> float:
        return self._strategy(order)

calc = ShippingCalculator(weight_based)
calc.cost(order)

# Strategy dict — select by key
STRATEGIES = {
    "flat":   flat_rate,
    "weight": weight_based,
    "free":   free_shipping,
}

def shipping_cost(order, strategy: str = "weight") -> float:
    return STRATEGIES[strategy](order)
```

---

## Factory Method

Create objects without specifying the exact class. In Python, use a dict of constructors or a function.

```python
class Notification:
    def deliver(self, message: str) -> None:
        raise NotImplementedError

class EmailNotification(Notification):
    def __init__(self, address: str): self.address = address
    def deliver(self, message: str) -> None:
        print(f"Email to {self.address}: {message}")

class SmsNotification(Notification):
    def __init__(self, number: str): self.number = number
    def deliver(self, message: str) -> None:
        print(f"SMS to {self.number}: {message}")

# Factory using dict of constructors
_BUILDERS = {
    "email": EmailNotification,
    "sms":   SmsNotification,
}

def create_notification(type_: str, **kwargs) -> Notification:
    cls = _BUILDERS.get(type_)
    if cls is None:
        raise ValueError(f"Unknown notification type: {type_!r}")
    return cls(**kwargs)

notif = create_notification("email", address="alice@example.com")
notif.deliver("Hello!")
```

---

## Observer (Event System)

Notify subscribers when state changes. Python's `__init_subclass__` and descriptor protocols offer elegant solutions.

```python
from __future__ import annotations
from collections import defaultdict
from typing import Callable, Any

class EventEmitter:
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)

    def on(self, event: str, handler: Callable) -> None:
        self._subscribers[event].append(handler)

    def off(self, event: str, handler: Callable) -> None:
        self._subscribers[event] = [
            h for h in self._subscribers[event] if h is not handler
        ]

    def emit(self, event: str, **payload: Any) -> None:
        for handler in self._subscribers[event]:
            handler(**payload)

class Order(EventEmitter):
    def __init__(self, id: str):
        super().__init__()
        self.id     = id
        self.status = "pending"

    def complete(self) -> None:
        self.status = "complete"
        self.emit("completed", order_id=self.id)

order = Order("o_1")
order.on("completed", lambda order_id: print(f"Sending receipt for {order_id}"))
order.on("completed", lambda order_id: print(f"Updating inventory for {order_id}"))
order.complete()
```

---

## Decorator

Wrap an object to add behavior, maintaining the same interface. Python's function decorators are the most common form.

```python
from abc import ABC, abstractmethod
from functools import wraps

# Class-based decorator wrapping an interface
class Logger:
    def __init__(self, service):
        self._service = service

    def process(self, request: dict) -> dict:
        print(f"Request: {request}")
        result = self._service.process(request)
        print(f"Response: {result}")
        return result

class Cache:
    def __init__(self, service, ttl: int = 60):
        self._service = service
        self._cache: dict = {}

    def process(self, request: dict) -> dict:
        key = str(request)
        if key not in self._cache:
            self._cache[key] = self._service.process(request)
        return self._cache[key]

class RealService:
    def process(self, request: dict) -> dict:
        return {"result": "data"}

# Stack decorators
service = Cache(Logger(RealService()), ttl=300)
service.process({"query": "users"})

# Function decorator form — more common in Python
def validate(fn):
    @wraps(fn)
    def wrapper(request: dict, **kwargs):
        if "query" not in request:
            raise ValueError("Missing query")
        return fn(request, **kwargs)
    return wrapper
```

---

## Command

Encapsulate an operation as an object — enables undo, queuing, and logging.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...
    @abstractmethod
    def undo(self) -> None: ...

@dataclass
class TransferFunds(Command):
    from_account: "Account"
    to_account:   "Account"
    amount:       float

    def execute(self) -> None:
        self.from_account.debit(self.amount)
        self.to_account.credit(self.amount)

    def undo(self) -> None:
        self.to_account.debit(self.amount)
        self.from_account.credit(self.amount)

class CommandHistory:
    def __init__(self):
        self._history: list[Command] = []

    def execute(self, command: Command) -> None:
        command.execute()
        self._history.append(command)

    def undo(self) -> None:
        if self._history:
            self._history.pop().undo()
```

---

## Template Method

Define algorithm skeleton in a base class; subclasses fill in the steps.

```python
from abc import ABC, abstractmethod

class DataImporter(ABC):
    def run(self, source: str) -> list[dict]:
        raw     = self.read(source)        # step 1 — subclass implements
        parsed  = self.parse(raw)          # step 2 — subclass implements
        valid   = self.validate(parsed)    # step 3 — shared default
        return valid

    @abstractmethod
    def read(self, source: str) -> str: ...

    @abstractmethod
    def parse(self, raw: str) -> list[dict]: ...

    def validate(self, records: list[dict]) -> list[dict]:
        return [r for r in records if r]  # default: filter empty

class CsvImporter(DataImporter):
    def read(self, source: str) -> str:
        with open(source) as f: return f.read()
    def parse(self, raw: str) -> list[dict]:
        import csv, io
        return list(csv.DictReader(io.StringIO(raw)))

class ApiImporter(DataImporter):
    def read(self, source: str) -> str:
        import urllib.request
        return urllib.request.urlopen(source).read().decode()
    def parse(self, raw: str) -> list[dict]:
        import json
        return json.loads(raw)
```

---

## Context Manager (Resource Management Pattern)

Use `contextlib` for simple context managers without writing a full class.

```python
from contextlib import contextmanager, asynccontextmanager

@contextmanager
def managed_transaction(conn):
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise

@contextmanager
def timer(label: str = ""):
    import time
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{label}: {elapsed:.4f}s")

# Usage
with managed_transaction(db.connect()) as conn:
    conn.execute("INSERT INTO ...")

with timer("data processing"):
    process_data(records)

# Class-based — when state is complex
class DatabasePool:
    def __enter__(self):
        self._conn = self._pool.acquire()
        return self._conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._pool.release(self._conn)
        return False  # don't suppress exceptions
```

---

## Null Object

Return a do-nothing object instead of `None` — eliminates repeated None checks.

```python
class NullLogger:
    def info(self, msg: str)  -> None: pass
    def warn(self, msg: str)  -> None: pass
    def error(self, msg: str) -> None: pass
    def debug(self, msg: str) -> None: pass

class NullCache:
    def get(self, key: str): return None
    def set(self, key: str, value, ttl: int = 0): pass
    def delete(self, key: str): pass

class Service:
    def __init__(self, logger=None, cache=None):
        self._logger = logger or NullLogger()
        self._cache  = cache  or NullCache()

    def process(self, key: str):
        self._logger.info(f"Processing {key}")   # no None check needed
        cached = self._cache.get(key)
        if cached: return cached
        result = self._expensive_compute(key)
        self._cache.set(key, result, ttl=300)
        return result
```

---

## Adapter

Make incompatible interfaces work together.

```python
# Third-party API with a different interface
class LegacyPaymentAPI:
    def charge_card(self, card_number: str, amount_cents: int) -> dict:
        return {"transaction_id": "tx_123", "success": True}

# Our system expects this interface
class PaymentGateway(Protocol):
    def charge(self, token: str, amount: float) -> str: ...

# Adapter bridges the gap
class LegacyPaymentAdapter:
    def __init__(self, api: LegacyPaymentAPI):
        self._api = api

    def charge(self, token: str, amount: float) -> str:
        result = self._api.charge_card(token, int(amount * 100))
        if not result["success"]:
            raise PaymentError("Charge failed")
        return result["transaction_id"]
```

---

## Pattern Quick-Select

| Situation | Pattern |
|-----------|---------|
| Multiple algorithms, swap at runtime | Strategy |
| Which class to create depends on input | Factory Method |
| Notify multiple objects of changes | Observer |
| Add behavior without subclassing | Decorator |
| Encapsulate operation for undo/queue | Command |
| Shared algorithm, varying steps | Template Method |
| Eliminate None checks | Null Object |
| Incompatible interfaces | Adapter |
| Resource needs guaranteed cleanup | Context Manager |
