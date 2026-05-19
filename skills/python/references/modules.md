# Python Modules and Packages Reference

## Module Basics

A module is any `.py` file. A package is a directory with an `__init__.py`.

```
myapp/
├── __init__.py          # makes myapp a package
├── models/
│   ├── __init__.py
│   ├── user.py
│   └── order.py
├── services/
│   ├── __init__.py
│   ├── payment.py
│   └── notification.py
└── utils.py
```

---

## Import Styles

```python
# Absolute imports — always prefer
import myapp.models.user
from myapp.models.user import User
from myapp.services import payment

# Relative imports — only inside a package
from . import utils           # sibling module
from .models import User      # sibling package
from ..services import payment  # parent package

# Alias — for long names or collision avoidance
import numpy as np
from myapp.models.user import User as UserModel

# Import multiple names
from myapp.models import User, Order, Product
```

---

## __init__.py — Package Public API

Use `__init__.py` to define what's exported from a package. This creates a clean public interface.

```python
# myapp/models/__init__.py
from .user  import User
from .order import Order, LineItem

# Callers use the clean path:
from myapp.models import User, Order
# Not: from myapp.models.user import User

# __all__ — explicit export list (used by star imports and IDEs)
__all__ = ["User", "Order", "LineItem"]
```

---

## __all__

Controls what `from module import *` exports. Also signals to IDEs and linters what's public.

```python
# utils.py
__all__ = ["format_currency", "parse_date"]  # only these are "public"

def format_currency(amount: float) -> str: ...
def parse_date(s: str) -> date: ...
def _internal_helper(): ...  # not in __all__, not exported
```

---

## Lazy Imports

Defer imports that are slow or have side effects until they're actually needed.

```python
def process_image(path: str):
    from PIL import Image  # imported only when function is called
    img = Image.open(path)
    return img.thumbnail((100, 100))

# For optional dependencies
def send_email(to: str, body: str):
    try:
        import sendgrid
    except ImportError:
        raise RuntimeError("sendgrid package required: pip install sendgrid")
    sendgrid.send(to, body)
```

---

## importlib — Dynamic Imports

```python
import importlib

# Dynamic import by string name
module = importlib.import_module("myapp.services.payment")
PaymentService = getattr(module, "PaymentService")

# Reload a module (useful in REPL / development)
importlib.reload(module)

# Plugin pattern — load all modules in a directory
import pkgutil
import myapp.plugins

def load_plugins():
    plugins = {}
    for importer, name, ispkg in pkgutil.iter_modules(myapp.plugins.__path__):
        module = importlib.import_module(f"myapp.plugins.{name}")
        if hasattr(module, "register"):
            plugins[name] = module.register()
    return plugins
```

---

## Namespace Packages (PEP 420)

Packages without `__init__.py` — allows splitting a package across directories.

```
# Namespace package — no __init__.py needed
mylib/
    core.py
    utils.py

# Both installed separately, merged into same namespace
mylib-core/mylib/core.py
mylib-utils/mylib/utils.py

from mylib import core, utils  # works if both are on sys.path
```

---

## Module-Level Code

Code at module level runs once when the module is first imported.

```python
# config.py
import os

# Module-level initialization — runs on import
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///dev.db")

# __name__ guard — only runs when script is executed directly
if __name__ == "__main__":
    print("Running as script")
    # setup, argparse, etc.
```

---

## sys.path and Import Resolution

Python searches for modules in:
1. The directory containing the script
2. `PYTHONPATH` environment variable directories
3. Installation-dependent defaults

```python
import sys

# Add a directory to the path (prefer package structure instead)
sys.path.insert(0, "/path/to/my/modules")

# Inspect where a module was found
import mymodule
print(mymodule.__file__)

# See the full search path
print(sys.path)
```

---

## Circular Import Avoidance

Circular imports cause `ImportError` or partially-initialized modules.

```python
# PROBLEM — a.py imports b.py, b.py imports a.py

# Solution 1 — move the import inside the function
# a.py
def get_b_value():
    from . import b      # deferred — only imports when called
    return b.value

# Solution 2 — use TYPE_CHECKING guard for type-only imports
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .models import User  # only imported by type checker, not at runtime

def process(user: "User") -> None: ...

# Solution 3 — restructure: extract shared code to a third module
# a.py and b.py both import from shared.py — no cycle
```

---

## Best Practices

- Keep `__init__.py` files thin — import and re-export, don't define logic
- Use absolute imports in application code; relative imports only inside packages
- Define `__all__` in every module that has a public API
- Never use star imports in application code (`from module import *`)
- Guard scripts with `if __name__ == "__main__":`
- Use lazy imports for optional dependencies and slow-loading libraries
- Avoid circular imports — if you have them, restructure
