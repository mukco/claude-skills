# Python Functional Patterns Reference

## Comprehensions

Comprehensions are the idiomatic Python replacement for `map`/`filter`/loops that build collections.

### List Comprehensions

```python
# Basic
squares = [x**2 for x in range(10)]

# With condition
evens = [x for x in range(20) if x % 2 == 0]

# Transform + filter
active_names = [u.name.upper() for u in users if u.active]

# Nested (reads left-to-right like nested for loops)
flat = [item for row in matrix for item in row]
pairs = [(x, y) for x in range(3) for y in range(3) if x != y]

# When NOT to use: more than one condition + transformation → use a loop
# This is unreadable:
result = [transform(x) for x in data if condition1(x) if condition2(x) if condition3(x)]
# Use a loop instead — clarity wins
```

### Dict and Set Comprehensions

```python
# Dict comprehension
by_id  = {user.id: user for user in users}
counts = {word: text.count(word) for word in unique_words}

# Invert a dict (assumes unique values)
inverted = {v: k for k, v in original.items()}

# Set comprehension — automatically deduplicates
domains = {email.split("@")[1] for email in emails}
```

### Generator Expressions

Generator expressions are lazy — they compute values on demand. Use when:
- You only iterate once
- The dataset is large (avoids building the full list in memory)
- You're passing to a function that consumes an iterable (`sum`, `any`, `all`, `max`, etc.)

```python
# Lazy — computes each value as needed
total    = sum(x**2 for x in range(1_000_000))   # never builds a list
any_over = any(x > 100 for x in data)             # short-circuits
all_pos  = all(x > 0 for x in numbers)            # short-circuits

# Generator expression vs list comprehension
gen  = (x**2 for x in range(10))   # generator object — lazy
lst  = [x**2 for x in range(10)]   # list — eager, all in memory

# Consume a generator
for value in gen:
    process(value)

# Convert to list when needed
values = list(gen)
```

---

## Generator Functions

Generator functions use `yield` to produce a sequence lazily. They retain state between calls.

```python
def fibonacci():
    a, b = 0, 1
    while True:      # infinite generator — callers control stopping
        yield a
        a, b = b, a + b

# Take first n from any iterable (generators included)
from itertools import islice
first_10_fibs = list(islice(fibonacci(), 10))

# Finite generator
def read_chunks(file_path: str, chunk_size: int = 4096):
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            yield chunk

# Use as context manager
def managed_connection(dsn: str):
    conn = db.connect(dsn)
    try:
        yield conn
    finally:
        conn.close()

# yield from — delegate to sub-generator
def chain(*iterables):
    for it in iterables:
        yield from it
```

### Generator Pipeline

Chain generators for efficient data processing pipelines — each stage is lazy.

```python
def read_lines(path):
    with open(path) as f:
        yield from f

def parse(lines):
    for line in lines:
        yield line.strip().split(",")

def filter_valid(rows):
    for row in rows:
        if len(row) == 3:
            yield row

def to_dict(rows):
    for row in rows:
        yield {"name": row[0], "age": int(row[1]), "email": row[2]}

# Compose — nothing executes until consumed
pipeline = to_dict(filter_valid(parse(read_lines("users.csv"))))
for record in pipeline:
    save(record)
```

---

## itertools

```python
import itertools

# Infinite iterators
itertools.count(10, 2)         # 10, 12, 14, ...
itertools.cycle([1, 2, 3])     # 1, 2, 3, 1, 2, 3, ...
itertools.repeat("x", 3)       # "x", "x", "x"

# Finite iterators
itertools.chain([1,2], [3,4])             # 1, 2, 3, 4
itertools.chain.from_iterable([[1,2],[3]])  # flatten one level
itertools.islice(range(100), 10, 20)       # elements 10-19
itertools.takewhile(lambda x: x < 5, count())  # while predicate true
itertools.dropwhile(lambda x: x < 5, count())  # skip while predicate true
itertools.filterfalse(str.isdigit, "a1b2")    # "a", "b"
itertools.compress("ABCDEF", [1,0,1,0,1,1])  # "A", "C", "E", "F"

# Grouping (input must be sorted by key)
for key, group in itertools.groupby(sorted_data, key=lambda x: x["dept"]):
    print(key, list(group))

# Combinatorics
itertools.product("AB", repeat=2)          # AA, AB, BA, BB
itertools.permutations([1,2,3], 2)         # (1,2),(1,3),(2,1),(2,3),(3,1),(3,2)
itertools.combinations([1,2,3], 2)         # (1,2),(1,3),(2,3)
itertools.combinations_with_replacement("ABC", 2)  # AA, AB, AC, BB, BC, CC

# Accumulate (running totals, running max, etc.)
itertools.accumulate([1,2,3,4])            # 1, 3, 6, 10
itertools.accumulate([1,2,3,4], max)       # 1, 2, 3, 4 (running max)

# Sliding windows
itertools.pairwise([1,2,3,4])             # (1,2),(2,3),(3,4) — Python 3.10+

# Batching
itertools.batched([1,2,3,4,5], 2)         # (1,2),(3,4),(5,) — Python 3.12+
```

---

## functools

```python
from functools import (
    reduce, partial, lru_cache, cache,
    wraps, singledispatch, total_ordering
)

# reduce — fold
from functools import reduce
total = reduce(lambda acc, x: acc + x, numbers, 0)

# partial — fix arguments
def power(base, exp): return base ** exp
square = partial(power, exp=2)
cube   = partial(power, exp=3)
square(4)  # 16

# lru_cache — memoize with bounded cache
@lru_cache(maxsize=256)
def fib(n: int) -> int:
    return n if n < 2 else fib(n-1) + fib(n-2)

fib.cache_info()   # CacheInfo(hits=..., misses=..., maxsize=256, currsize=...)
fib.cache_clear()  # clear cache

# cache — unbounded lru_cache (Python 3.9+)
@cache
def expensive(n: int) -> int: ...

# wraps — preserve metadata when writing decorators
def my_decorator(fn):
    @wraps(fn)  # copies __name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

# singledispatch — function overloading by type
@singledispatch
def process(value):
    raise NotImplementedError(f"Cannot process {type(value)}")

@process.register(str)
def _(value: str):
    return value.upper()

@process.register(int)
def _(value: int):
    return value * 2

@process.register(list)
def _(value: list):
    return [process(v) for v in value]

process("hello")  # "HELLO"
process(5)        # 10
process([1, "a"]) # [2, "A"]
```

---

## Decorators

Decorators are functions that wrap other functions (or classes). They follow the Decorator design pattern.

### Function Decorators

```python
import functools
import time

def timer(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start  = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{fn.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function(): ...
# equivalent to: slow_function = timer(slow_function)
```

### Decorator with Arguments

```python
def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay * (2 ** attempt))  # exponential backoff
        return wrapper
    return decorator

@retry(max_attempts=5, delay=0.5)
def call_api(): ...
```

### Class Decorators

```python
def singleton(cls):
    instances = {}
    @functools.wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance

@singleton
class DatabaseConnection: ...
```

---

## Closures

```python
def make_multiplier(factor: int):
    def multiply(x: int) -> int:
        return x * factor   # captures factor from enclosing scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
double(5)  # 10
triple(5)  # 15

# nonlocal — modify enclosing scope variable
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    def reset():
        nonlocal count
        count = 0
    return increment, reset

inc, rst = make_counter()
inc()  # 1
inc()  # 2
rst()
inc()  # 1
```

---

## Anti-Patterns

### Unnecessary map/filter (use comprehensions)

```python
# WRONG — harder to read
names = list(map(lambda u: u.name, users))
active = list(filter(lambda u: u.active, users))

# RIGHT
names  = [u.name for u in users]
active = [u for u in users if u.active]
```

### Forgetting generators are exhausted

```python
gen = (x**2 for x in range(5))
list(gen)  # [0, 1, 4, 9, 16]
list(gen)  # [] — already consumed!

# RIGHT — recreate or use list
values = [x**2 for x in range(5)]  # reusable
```

### Mutable default in functools.partial

```python
# WRONG — shared mutable default
add_to = partial(list.append, [])  # shares the same list
```
