---
name: python
description: "Python idioms, OOP (dataclasses, ABCs, Protocols), functional patterns, design patterns (refactoring.guru), type hints, context managers, generators, and Pythonic best practices."
---

# Python Patterns

Comprehensive guidance for idiomatic Python. Covers the object model, type system, functional patterns, design patterns implemented in Python idioms, and the conventions that separate Pythonic from merely-correct code.

Key references: [refactoring.guru](https://refactoring.guru/design-patterns) for pattern catalog, PEP 8 / PEP 20 (*The Zen of Python*) for style and philosophy.

## Quick Reference

### Core Idioms

```python
# Unpacking
first, *rest = [1, 2, 3, 4]
a, b = b, a  # swap

# Walrus operator (assignment expression)
if (n := len(data)) > 10:
    print(f"Too many: {n}")

# EAFP over LBYL
# LBYL (Look Before You Leap) — checking before acting
if "key" in d:
    value = d["key"]

# EAFP (Easier to Ask Forgiveness than Permission) — Pythonic
try:
    value = d["key"]
except KeyError:
    value = default

# Context managers
with open(path) as f:
    data = f.read()

# Truthiness — use directly, not == True/False/None
if items:          # not: if len(items) > 0
if not items:      # not: if len(items) == 0
if value is None:  # not: if value == None

# f-strings
name = "Alice"
msg = f"Hello, {name!r} — score: {score:.2f}"
```

### Comprehension Quick Reference

```python
# List comprehension
squares = [x**2 for x in range(10)]
evens   = [x for x in data if x % 2 == 0]

# Dict comprehension
by_id = {user.id: user for user in users}

# Set comprehension
unique_domains = {email.split("@")[1] for email in emails}

# Generator expression (lazy — preferred for large data)
total = sum(x**2 for x in range(1_000_000))

# Nested comprehension
flat = [item for row in matrix for item in row]

# Avoid: nested comprehensions with conditions > 1 level — use a loop
```

### OOP Quick Reference

```python
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from typing import Protocol

# Dataclass — preferred for data containers
@dataclass(frozen=True)  # frozen = immutable value object
class Point:
    x: float
    y: float
    def distance_to(self, other: "Point") -> float:
        return ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5

# Abstract base class — enforces interface on subclasses
class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...
    @abstractmethod
    def perimeter(self) -> float: ...

# Protocol — structural subtyping (duck typing with type safety)
class Drawable(Protocol):
    def draw(self) -> None: ...
# No explicit inheritance needed — any class with draw() satisfies Drawable

# Property
class Temperature:
    def __init__(self, celsius: float) -> None:
        self._celsius = celsius

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9/5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value: float) -> None:
        self._celsius = (value - 32) * 5/9
```

### Functional Quick Reference

```python
from functools import reduce, partial, lru_cache
import itertools

# map / filter / reduce
names   = list(map(str.upper, users))
actives = list(filter(lambda u: u.active, users))
total   = reduce(lambda a, b: a + b, amounts, 0)

# Prefer comprehensions over map/filter for readability
names   = [u.upper() for u in users]
actives = [u for u in users if u.active]

# partial — fix some arguments
double = partial(pow, exp=2)
double(5)  # => 25

# lru_cache — memoization
@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    return n if n < 2 else fibonacci(n-1) + fibonacci(n-2)

# itertools
itertools.chain(list1, list2)           # flatten
itertools.islice(iterable, 10)          # lazy first 10
itertools.groupby(sorted_data, key_fn)  # group consecutive
itertools.product("AB", repeat=2)       # cartesian product
itertools.accumulate([1,2,3,4])         # running totals: [1,3,6,10]
```

### Pattern Selection Decision Tree

```
Shared behavior across unrelated classes?
├── Same interface, different implementations → Protocol (structural)
└── Shared base behavior to inherit → ABC (nominal)

Object needs many optional attributes?
├── Data-heavy, no complex logic → dataclass with defaults
└── Complex construction logic → Builder pattern

Behavior changes at runtime?
└── Strategy pattern (inject callable or object)

Wrapping extra behavior without subclassing?
└── Decorator (function decorator or class wrapper)

Notification across loosely coupled objects?
└── Observer / event system
```

## OOP Principles

### Prefer Composition

```python
# Inheritance for true is-a
class Animal: ...
class Dog(Animal): ...  # Dog IS an Animal

# Composition for has-a / uses-a
class Report:
    def __init__(self, formatter, exporter):
        self._formatter = formatter
        self._exporter  = exporter
    def run(self, data):
        self._exporter.export(self._formatter.format(data))
```

### Tell, Don't Ask

```python
# WRONG — ask then decide externally
def process(order):
    if order.status == "pending" and order.payment.verified:
        order.status = "processing"

# RIGHT — tell the object
def process(order):
    order.begin_processing()  # Order encapsulates the guard
```

### Single Responsibility

```python
# WRONG — parses AND formats AND persists
class ReportManager:
    def parse_csv(self, data): ...
    def format_html(self, report): ...
    def save_to_db(self, report): ...

# RIGHT — one reason to change per class
class CsvParser: ...
class HtmlFormatter: ...
class ReportRepository: ...
```

## Type Hints Quick Reference

```python
from typing import Optional, Union, Any, TypeVar, Generic
from collections.abc import Callable, Iterator, Sequence

# Basic
def greet(name: str) -> str: ...

# Optional (prefer X | None in Python 3.10+)
def find(id: int) -> Optional[str]: ...
def find(id: int) -> str | None: ...   # 3.10+

# Union
def process(value: int | str) -> None: ...

# Generics
T = TypeVar("T")
def first(items: list[T]) -> T: ...

# Callable
def apply(fn: Callable[[int], str], value: int) -> str: ...

# TypedDict
from typing import TypedDict
class UserDict(TypedDict):
    id: int
    name: str
    email: str
```

## Best Practices

### Do

- Follow PEP 8: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE` for constants
- Use `dataclass` for data containers instead of bare `__init__`
- Use `Protocol` for duck-typed interfaces over ABC when you don't control the implementors
- Use `@property` instead of explicit getters/setters
- Use context managers (`with`) for any resource that needs cleanup
- Prefer generators over building full lists when consuming sequentially
- Use `is None` / `is not None` — never `== None`
- Use `enumerate()` instead of `range(len(...))`
- Use `zip()` to iterate multiple sequences together
- Keep functions under 20 lines; classes under 200

### Don't

- Don't use mutable default arguments: `def f(items=[])` — use `None` then assign
- Don't use `type()` for isinstance checks — use `isinstance()`
- Don't catch bare `except:` — catch specific exception types
- Don't use `__del__` for cleanup — use context managers
- Don't name variables `l`, `O`, or `I` (look like 1, 0)
- Don't use `global` — pass state explicitly
- Don't return `None` implicitly from functions that have a return path — be explicit
- Don't mix tabs and spaces

## Anti-Patterns Quick List

| Anti-Pattern | Solution |
|--------------|----------|
| Mutable default argument `def f(x=[])` | `def f(x=None): x = x or []` |
| `type(x) == str` | `isinstance(x, str)` |
| `except:` bare catch | `except Exception as e:` or specific type |
| `range(len(items))` loop | `enumerate(items)` |
| Manual `__init__` for data class | `@dataclass` |
| Inheritance for code reuse | Composition or mixin |
| `== None` / `== True` | `is None` / `is True` (or truthiness) |
| `for i in range(len(a)): a[i]` | `for item in a:` |
| Long module with everything | Split into submodules with `__init__.py` |
| Calling `list()` on a comprehension | Just use the comprehension |

## Additional Resources

### Reference Files

- **`references/oop.md`** — Dataclasses, ABCs, Protocols, properties, `__dunder__` methods, MRO, mixins
- **`references/functional.md`** — Comprehensions, generators, itertools, functools, closures, decorators
- **`references/design_patterns.md`** — GoF patterns in Python: Strategy, Decorator, Observer, Factory, Command, etc.
- **`references/type_hints.md`** — Full typing module, generics, TypedDict, Protocol, Literal, TypeGuard, overload
- **`references/error_handling.md`** — Exception hierarchy, EAFP, custom exceptions, context managers, ExceptionGroup (3.11+)
- **`references/modules.md`** — Packages, imports, `__init__.py`, `__all__`, relative imports, namespace packages
