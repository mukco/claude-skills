# JavaScript Modules Reference

## ESM (ES Modules) — The Standard

ESM is static — imports are analyzed at parse time, enabling tree-shaking and better tooling.

```js
// Named exports — multiple per file
export const PI = 3.14159
export function area(r) { return PI * r * r }
export class Circle { ... }

// Default export — one per file (avoid when possible)
export default class Router { ... }

// Export at end — shows public API clearly
const _internal = () => {}
export function public1() {}
export function public2() {}
export { public1, public2 }  // alternative grouped form

// Re-export from another module
export { User, Order } from "./models.js"
export { default as Router } from "./router.js"
export * from "./utils.js"
```

### Imports

```js
// Named imports
import { area, PI } from "./math.js"

// Default import
import Router from "./router.js"

// Both
import Router, { createRoute } from "./router.js"

// Rename on import
import { area as calculateArea } from "./math.js"

// Namespace import — import all named exports as object
import * as Math from "./math.js"
Math.area(5)

// Side-effect only import
import "./setup.js"
```

---

## Dynamic Imports

Load modules on demand — lazy loading for performance.

```js
// Basic dynamic import
const module = await import("./heavy-library.js")
module.heavyFn()

// With destructuring
const { parse, stringify } = await import("./json-utils.js")

// Conditional loading
async function loadLocale(lang) {
  const { messages } = await import(`./locales/${lang}.js`)
  return messages
}

// Lazy route loading (React pattern)
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"))

// Feature detection + lazy load
async function processImage(file) {
  if (file.size > 1_000_000) {
    const { compress } = await import("./compression.js")  // load only when needed
    return compress(file)
  }
  return file
}
```

---

## Module Resolution

Node.js ESM resolves imports in this order:
1. Relative paths (`./`, `../`) — exact file path required (extension mandatory)
2. `node_modules` packages
3. `package.json#exports` field
4. Built-in modules (`node:fs`, `node:path`)

```js
// Extensions are required in Node.js ESM
import { helper } from "./utils.js"     // ✓
import { helper } from "./utils"        // ✗ in Node ESM (ok with bundlers)

// Package exports field controls what's importable
// package.json:
{
  "exports": {
    ".":         "./dist/index.js",
    "./utils":   "./dist/utils.js",
    "./internal": null  // explicitly block access
  }
}
```

---

## CommonJS (Legacy — Node.js)

```js
// CommonJS — require/module.exports
const fs = require("fs")
const { join } = require("path")

module.exports = { myFunction, myClass }
module.exports = function main() {}  // default export style

// Dynamic require
const plugin = require(`./plugins/${name}`)

// Interop: import CJS from ESM
import pkg from "./legacy.cjs"
const { thing } = pkg
```

---

## Barrel Files

A barrel file (`index.js`) re-exports from a module group, providing a clean public API.

```
components/
├── index.js      ← barrel
├── Button.jsx
├── Input.jsx
└── Modal.jsx
```

```js
// components/index.js
export { Button } from "./Button.jsx"
export { Input }  from "./Input.jsx"
export { Modal }  from "./Modal.jsx"

// Callers use clean import
import { Button, Modal } from "./components"
// Not: import { Button } from "./components/Button.jsx"
```

**Caution**: Barrel files can hurt tree-shaking and slow bundler startup when they re-export large subtrees. Keep them at feature/domain boundaries, not deeply nested.

---

## Circular Dependencies

ESM handles circular dependencies by giving modules a live binding to their dependencies — the binding exists at parse time, the value is populated at runtime.

```js
// a.js
import { b } from "./b.js"
export const a = "A"
console.log(b)  // may be undefined if b.js hasn't set it yet

// b.js
import { a } from "./a.js"
export const b = "B"
```

**Circular imports are a design smell**. Fix by:
1. Extracting shared code to a third module
2. Passing values as parameters instead of importing them
3. Using dynamic imports to break the cycle at runtime

---

## package.json Module Fields

```json
{
  "type": "module",          // treat .js as ESM (default is CJS)
  "main": "./dist/index.js", // CJS entry point (legacy)
  "module": "./dist/index.mjs", // ESM entry point (bundlers)
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types":   "./dist/index.d.ts"
    }
  },
  "sideEffects": false       // enables tree-shaking — declare if package has side effects
}
```

---

## Best Practices

- Prefer named exports over default exports — better refactoring, better autocomplete
- Always include file extensions in Node.js ESM imports
- Use barrel files at domain boundaries, not for every folder
- Avoid circular dependencies — they signal a design problem
- Mark `"sideEffects": false` in `package.json` if your package is pure — enables tree-shaking
- Use `import type { Foo }` in TypeScript for type-only imports (erased at compile time)
- Use dynamic imports for routes, heavy libraries, and optional features
