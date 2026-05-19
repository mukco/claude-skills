# Python OOP Reference

## Dataclasses

`@dataclass` generates `__init__`, `__repr__`, `__eq__`, and optionally `__hash__`, `__lt__`, etc. Prefer over hand-written `__init__` for any class that primarily holds data.

```python
from dataclasses import dataclass, field
from typing import ClassVar

@dataclass
class Point:
    x: float
    y: float

    def distance_to(self, other: "Point") -> float:
        return ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5

# frozen=True — immutable value object (also makes it hashable)
@dataclass(frozen=True)
class Color:
    r: int
    g: int
    b: int

    def __post_init__(self):
        for v in (self.r, self.g, self.b):
            if not 0 <= v <= 255:
                raise ValueError(f"Channel value {v} out of range 0-255")

# order=True — generates __lt__, __le__, etc. based on field order
@dataclass(order=True)
class Version:
    major: int
    minor: int
    patch: int

# field() for defaults and metadata
@dataclass
class Order:
    id:    str
    items: list = field(default_factory=list)  # mutable defaults require field()
    total: float = field(default=0.0)
    _internal: str = field(default="", repr=False, compare=False)  # excluded from repr/eq

    # ClassVar — not an instance field, excluded from __init__
    TAX_RATE: ClassVar[float] = 0.08
```

### __post_init__

Runs after generated `__init__`. Use for validation and derived fields.

```python
@dataclass
class Rectangle:
    width:  float
    height: float
    area:   float = field(init=False)  # not in __init__

    def __post_init__(self):
        if self.width <= 0 or self.height <= 0:
            raise ValueError("Dimensions must be positive")
        self.area = self.width * self.height
```

---

## Abstract Base Classes

`ABC` enforces that subclasses implement required methods at instantiation time.

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

    @abstractmethod
    def perimeter(self) -> float: ...

    # Concrete method — shared behavior
    def describe(self) -> str:
        return f"{type(self).__name__}: area={self.area():.2f}"

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        return 3.14159 * self.radius ** 2

    def perimeter(self) -> float:
        return 2 * 3.14159 * self.radius

# Shape()      # TypeError — can't instantiate abstract class
# Circle()     # OK — implements all abstract methods
```

### Abstract Properties

```python
class Animal(ABC):
    @property
    @abstractmethod
    def sound(self) -> str: ...

    def speak(self) -> str:
        return f"The {type(self).__name__} says {self.sound}"

class Dog(Animal):
    @property
    def sound(self) -> str:
        return "woof"
```

---

## Protocols (Structural Subtyping)

`Protocol` defines an interface without requiring inheritance. Any class that implements the required methods satisfies the protocol — no `isinstance` check needed, no base class required.

```python
from typing import Protocol, runtime_checkable

class Drawable(Protocol):
    def draw(self) -> None: ...

class Resizable(Protocol):
    def resize(self, factor: float) -> None: ...

# No inheritance required
class Circle:
    def draw(self) -> None:
        print("Drawing circle")
    def resize(self, factor: float) -> None:
        self.radius *= factor

def render(shape: Drawable) -> None:
    shape.draw()

render(Circle())  # Works — Circle satisfies Drawable structurally

# runtime_checkable — enables isinstance() at runtime
@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...

isinstance(open("f"), Closeable)  # True at runtime
```

**ABC vs Protocol**:
- ABC: nominal — subclasses must explicitly inherit and implement
- Protocol: structural — any class with the right methods qualifies
- Use ABC when you control the implementors and want forced inheritance
- Use Protocol when you want duck typing with type safety

---

## Properties

```python
class Temperature:
    def __init__(self, celsius: float) -> None:
        self._celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < -273.15:
            raise ValueError("Below absolute zero")
        self._celsius = value

    @celsius.deleter
    def celsius(self) -> None:
        del self._celsius

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9/5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value: float) -> None:
        self.celsius = (value - 32) * 5/9  # delegates to celsius setter
```

---

## Dunder Methods

| Method | Called by | Use for |
|--------|-----------|---------|
| `__init__` | `ClassName()` | Initialization |
| `__repr__` | `repr()`, debugger | Unambiguous string representation |
| `__str__` | `str()`, `print()` | Human-readable string |
| `__eq__` | `==` | Equality |
| `__hash__` | `hash()`, dict key | Hashability (must define if `__eq__` defined) |
| `__lt__` | `<`, `sorted()` | Comparison (define all or use `@functools.total_ordering`) |
| `__len__` | `len()` | Collection size |
| `__getitem__` | `obj[key]` | Subscript access |
| `__setitem__` | `obj[key] = v` | Subscript assignment |
| `__contains__` | `x in obj` | Membership test |
| `__iter__` | `for x in obj`, `iter()` | Iteration |
| `__next__` | `next()` | Iterator protocol |
| `__enter__` | `with obj` | Context manager enter |
| `__exit__` | end of `with` | Context manager exit |
| `__call__` | `obj()` | Make instance callable |

```python
from functools import total_ordering

@total_ordering  # generates the rest from __eq__ + __lt__
class Version:
    def __init__(self, major, minor, patch):
        self.major, self.minor, self.patch = major, minor, patch

    def __repr__(self) -> str:
        return f"Version({self.major}, {self.minor}, {self.patch})"

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Version): return NotImplemented
        return (self.major, self.minor, self.patch) == (other.major, other.minor, other.patch)

    def __lt__(self, other: "Version") -> bool:
        if not isinstance(other, Version): return NotImplemented
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

    def __hash__(self) -> int:
        return hash((self.major, self.minor, self.patch))
```

---

## Method Resolution Order (MRO)

Python uses C3 linearization. `Class.__mro__` shows the lookup order.

```python
class A:
    def hello(self): return "A"

class B(A):
    def hello(self): return "B"

class C(A):
    def hello(self): return "C"

class D(B, C):
    pass

D.__mro__  # => [D, B, C, A, object]
D().hello()  # => "B" — first class in MRO that defines it
```

### super() and MRO

`super()` follows the MRO — it does NOT mean "parent class." In multiple inheritance, `super()` calls the next class in the MRO.

```python
class Mixin:
    def save(self):
        print("Mixin.save")
        super().save()  # calls next in MRO — may not be Mixin's direct parent

class Model:
    def save(self):
        print("Model.save")

class TimestampedModel(Mixin, Model):
    pass

# MRO: [TimestampedModel, Mixin, Model, object]
TimestampedModel().save()
# prints: "Mixin.save" then "Model.save"
```

---

## Mixins

Mixins add behavior to classes without defining a usable standalone class.

```python
class LogMixin:
    def log(self, message: str) -> None:
        print(f"[{type(self).__name__}] {message}")

class SerializeMixin:
    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

    @classmethod
    def from_dict(cls, data: dict) -> "SerializeMixin":
        obj = cls.__new__(cls)
        obj.__dict__.update(data)
        return obj

class TimestampMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from datetime import datetime
        self.created_at = datetime.now()

class Order(TimestampMixin, LogMixin, SerializeMixin):
    def __init__(self, id: str, total: float):
        super().__init__()
        self.id    = id
        self.total = total

order = Order("o_1", 99.99)
order.log("Created")
order.to_dict()  # => {'id': 'o_1', 'total': 99.99, 'created_at': ...}
```

---

## Class Methods and Static Methods

```python
class User:
    _instances: dict = {}

    def __init__(self, id: int, name: str):
        self.id   = id
        self.name = name

    # classmethod — receives class, not instance. Use for factory methods.
    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(data["id"], data["name"])

    @classmethod
    def from_email(cls, email: str) -> "User":
        # Alternative constructor
        id = hash(email)
        return cls(id, email.split("@")[0])

    # staticmethod — no class or instance. Utility that belongs here logically.
    @staticmethod
    def validate_email(email: str) -> bool:
        return "@" in email and "." in email.split("@")[1]

User.from_dict({"id": 1, "name": "Alice"})
User.validate_email("alice@example.com")
```

---

## Anti-Patterns

### Mutable Default Arguments

```python
# WRONG — list is created once at function definition
def append_to(item, to=[]):
    to.append(item)
    return to

append_to(1)  # [1]
append_to(2)  # [1, 2] — reuses same list!

# RIGHT
def append_to(item, to=None):
    if to is None:
        to = []
    to.append(item)
    return to
```

### Checking type() Instead of isinstance()

```python
# WRONG — fails for subclasses
if type(x) == str: ...

# RIGHT — works for subclasses
if isinstance(x, str): ...
```

### Not Implementing __hash__ When __eq__ Is Defined

If you define `__eq__`, Python sets `__hash__ = None` (unhashable). If the object should be hashable:

```python
@dataclass(frozen=True)  # handles both __eq__ and __hash__
class Point: ...

# or manually
class MyClass:
    def __eq__(self, other): ...
    def __hash__(self): return hash(self.id)  # must define
```
