# Python Type Hints Reference

## Basic Annotations

```python
# Variables
name:  str   = "Alice"
age:   int   = 30
ratio: float = 0.75
flag:  bool  = True

# Collections (use built-in types in Python 3.9+, not typing.List etc.)
names:    list[str]         = []
scores:   dict[str, int]   = {}
unique:   set[int]          = set()
pair:     tuple[int, str]  = (1, "a")
fixed:    tuple[int, ...]  = (1, 2, 3)  # homogeneous tuple of any length

# Functions
def greet(name: str, times: int = 1) -> str:
    return f"Hello, {name}! " * times

# No return value
def log(message: str) -> None: ...

# Function that never returns
def crash(message: str) -> Never:
    raise RuntimeError(message)
```

---

## Union Types

```python
# Python 3.10+ — use | syntax
def process(value: int | str) -> str:
    return str(value)

# Python 3.9 and earlier — use Union
from typing import Union
def process(value: Union[int, str]) -> str:
    return str(value)

# Optional (value or None)
# Python 3.10+
def find(id: int) -> User | None: ...

# Python 3.9 and earlier
from typing import Optional
def find(id: int) -> Optional[User]: ...

# Never use Optional for "might not be provided" — use default value
def greet(name: str, greeting: str = "Hello") -> str: ...
# Not:   greeting: Optional[str] = None
```

---

## Generics

```python
from typing import TypeVar, Generic

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# Generic function
def first(items: list[T]) -> T:
    return items[0]

def get(mapping: dict[K, V], key: K, default: V) -> V:
    return mapping.get(key, default)

# Bounded TypeVar — T must be a subtype of Comparable
from typing import Protocol
class Comparable(Protocol):
    def __lt__(self, other: "Comparable") -> bool: ...

CT = TypeVar("CT", bound=Comparable)
def minimum(items: list[CT]) -> CT:
    return min(items)

# Generic class
class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

    def peek(self) -> T:
        return self._items[-1]

stack: Stack[int] = Stack()
stack.push(1)
stack.pop()   # type: int
```

---

## TypedDict

For dicts with known structure — useful for API responses and config objects.

```python
from typing import TypedDict, Required, NotRequired

class UserDict(TypedDict):
    id:    int
    name:  str
    email: str

# With optional keys
class CreateUserRequest(TypedDict, total=False):
    name:  str  # all keys optional when total=False
    email: str

# Mix required and optional (Python 3.11+)
class UpdateUserRequest(TypedDict):
    id:    Required[int]       # always required
    name:  NotRequired[str]    # optional
    email: NotRequired[str]

user: UserDict = {"id": 1, "name": "Alice", "email": "alice@example.com"}
```

---

## Protocol

Duck typing with type safety — no inheritance required.

```python
from typing import Protocol, runtime_checkable

class Serializable(Protocol):
    def to_dict(self) -> dict: ...

    @classmethod
    def from_dict(cls, data: dict) -> "Serializable": ...

class Renderable(Protocol):
    def render(self) -> str: ...

# Combine protocols
class RenderableAndSerializable(Serializable, Renderable, Protocol): ...

# runtime_checkable enables isinstance at runtime
@runtime_checkable
class HasName(Protocol):
    name: str

class User:
    name = "Alice"

isinstance(User(), HasName)  # True
```

---

## Literal

Restrict to specific values — stronger than `str` or `int`.

```python
from typing import Literal

Status  = Literal["pending", "active", "archived"]
HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH"]
Priority = Literal[1, 2, 3]

def set_status(new_status: Status) -> None: ...
def request(method: HttpMethod, url: str) -> dict: ...

set_status("active")  # ✓
set_status("deleted") # Type error — not in Literal
```

---

## Callable

```python
from collections.abc import Callable

# Callable[[arg_types], return_type]
def apply(fn: Callable[[int, int], int], a: int, b: int) -> int:
    return fn(a, b)

# Variable args
Transformer = Callable[..., str]  # any args, returns str

# No args
Thunk = Callable[[], None]

# Higher-order
def compose(f: Callable[[B], C], g: Callable[[A], B]) -> Callable[[A], C]:
    return lambda x: f(g(x))
```

---

## TypeGuard and assert_type

```python
from typing import TypeGuard, assert_type

def is_list_of_str(val: list) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in val)

def process(items: list[str | int]) -> None:
    if is_list_of_str(items):
        # items narrowed to list[str] here
        " ".join(items)

# assert_type — verify at type-check time, no runtime effect
def debug(x: int) -> None:
    assert_type(x, int)  # type checker verifies this
```

---

## Overload

Define multiple signatures for the same function.

```python
from typing import overload

@overload
def process(value: str) -> str: ...
@overload
def process(value: int) -> int: ...
@overload
def process(value: list) -> list: ...

def process(value):
    if isinstance(value, str):
        return value.upper()
    elif isinstance(value, int):
        return value * 2
    else:
        return list(reversed(value))
```

---

## ParamSpec and Concatenate

Preserve parameter types through decorators.

```python
from typing import ParamSpec, Concatenate
from collections.abc import Callable

P = ParamSpec("P")
T = TypeVar("T")

def logged(fn: Callable[P, T]) -> Callable[P, T]:
    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        print(f"Calling {fn.__name__}")
        return fn(*args, **kwargs)
    return wrapper

@logged
def add(x: int, y: int) -> int:
    return x + y

add(1, 2)   # type: int — preserved through decorator
```

---

## TYPE_CHECKING Guard

Avoid circular imports in type annotations.

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from myapp.models import User  # only imported during type checking

def process(user: "User") -> None:  # or just: user: User with __future__ annotations
    ...
```

---

## Best Practices

- Prefer built-in collection types (`list[str]`, `dict[str, int]`) over `typing.List`, `typing.Dict` (deprecated in Python 3.9+)
- Use `X | None` over `Optional[X]` in Python 3.10+
- Use `Protocol` for duck-typed interfaces — avoids forcing inheritance
- Use `TypedDict` for external data shapes (API payloads, config files)
- Use `Literal` for string/int enums instead of bare `str`
- Use `Final` for constants that should never be reassigned
- Enable `mypy --strict` or `pyright` in strict mode for maximum type safety
