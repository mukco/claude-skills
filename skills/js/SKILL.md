---
name: js
description: "JavaScript idioms, closures, async patterns (Promises/async-await), OOP, functional programming, ES modules, and design patterns (refactoring.guru) in modern JS."
---

# JavaScript Patterns

Comprehensive guidance for modern, idiomatic JavaScript (ES2020+). Covers the language's unique characteristics — closures, the event loop, prototypal inheritance — and how classic patterns map onto JS idioms.

Key references: [refactoring.guru](https://refactoring.guru/design-patterns) for pattern catalog. MDN Web Docs for API accuracy.

## Quick Reference

### Modern Syntax Essentials

```js
// Destructuring
const { name, age, role = "user" } = user       // object, with default
const [first, second, ...rest] = items           // array
const { address: { city } } = user              // nested

// Spread / rest
const merged = { ...defaults, ...overrides }     // merge objects
const copy   = [...original, newItem]            // append to array copy
function log(...args) { console.log(args) }      // rest params

// Optional chaining & nullish coalescing
const city  = user?.address?.city               // undefined if any null/undefined
const label = value ?? "default"                // only falls back on null/undefined
const count = obj?.items?.length ?? 0

// Short-circuit assignment (ES2021)
user.name  ||= "Anonymous"   // assign if falsy
user.cache ??= {}            // assign if null/undefined
user.count &&= user.count + 1 // assign if truthy

// Template literals
const msg = `Hello, ${name}! You have ${count} message${count !== 1 ? "s" : ""}.`

// Tagged template (DSL pattern)
const query = gql`query { user { name } }`
```

### Object Patterns

```js
// Computed property names
const key = "dynamic"
const obj = { [key]: value, [`${key}Id`]: 42 }

// Shorthand properties and methods
const x = 1, y = 2
const point = { x, y, toString() { return `(${this.x}, ${this.y})` } }

// Object.freeze for immutable constants
const CONFIG = Object.freeze({ timeout: 30, retries: 3 })

// Object.entries / fromEntries for transforms
const doubled = Object.fromEntries(
  Object.entries(prices).map(([k, v]) => [k, v * 2])
)
```

### Array Quick Reference

```js
arr.map(fn)                        // transform → new array
arr.filter(fn)                     // keep matching
arr.find(fn)                       // first match or undefined
arr.findIndex(fn)                  // index of first match or -1
arr.some(fn)                       // any match?
arr.every(fn)                      // all match?
arr.reduce((acc, x) => ..., init)  // fold
arr.flat()                         // flatten one level
arr.flatMap(fn)                    // map + flatten one level
arr.includes(value)                // membership check
arr.at(-1)                         // last element (ES2022)
arr.toSorted()                     // sort without mutating (ES2023)
arr.toSpliced(i, n, ...items)      // splice without mutating (ES2023)
[...new Set(arr)]                  // deduplicate
```

### Async Quick Reference

```js
// async/await — always handle rejections
async function fetchUser(id) {
  try {
    const res  = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error("fetchUser failed:", err)
    throw err  // re-throw unless you can recover
  }
}

// Promise combinators
const [a, b]    = await Promise.all([fetchA(), fetchB()])   // fail-fast
const results   = await Promise.allSettled([p1, p2, p3])    // all finish
const first     = await Promise.race([fast(), slow()])      // first settles
const winner    = await Promise.any([p1, p2])               // first fulfilled
```

## Closures and Scope

### let / const Over var

```js
// var — function-scoped, hoisted, mutable → avoid
// let — block-scoped, not hoisted to usable, mutable → use for counters
// const — block-scoped, binding is immutable → default choice

const MAX = 100        // constant binding
let count = 0          // needs reassignment
count++

// const doesn't freeze objects
const user = { name: "Alice" }
user.name = "Bob"      // fine — mutates object, not binding
```

### Closure Pattern

```js
// Factory with private state via closure
function createCounter(initial = 0) {
  let count = initial   // private — not accessible from outside

  return {
    increment() { count++ },
    decrement() { count-- },
    value()     { return count },
    reset()     { count = initial }
  }
}

const counter = createCounter(10)
counter.increment()
counter.value()   // => 11
```

### Module Pattern (prefer ESM)

```js
// ESM — static, tree-shakeable, the standard
export const PI = 3.14159
export function area(r) { return PI * r * r }
export default class Circle { ... }

// Named imports
import { area } from "./math.js"
import Circle from "./circle.js"

// Dynamic import (lazy loading)
const { parse } = await import("./csv-parser.js")
```

## OOP

### Classes

```js
class EventEmitter {
  #listeners = new Map()  // private field (ES2022)

  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, [])
    this.#listeners.get(event).push(handler)
    return this  // allow chaining
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(h => h(...args))
    return this
  }

  off(event, handler) {
    const handlers = this.#listeners.get(event) ?? []
    this.#listeners.set(event, handlers.filter(h => h !== handler))
    return this
  }
}
```

### Mixins (Composition over Inheritance)

```js
// Mixin factory — compose behavior without deep inheritance
const Serializable = (Base) => class extends Base {
  serialize()   { return JSON.stringify(this) }
  static deserialize(json) { return Object.assign(new this(), JSON.parse(json)) }
}

const Timestamped = (Base) => class extends Base {
  constructor(...args) {
    super(...args)
    this.createdAt = new Date()
  }
}

class User extends Timestamped(Serializable(EventEmitter)) {
  constructor(name) {
    super()
    this.name = name
  }
}
```

## Functional Patterns

### Pure Functions and Immutability

```js
// WRONG — mutates input
function addItem(cart, item) {
  cart.items.push(item)      // mutation!
  cart.total += item.price
  return cart
}

// RIGHT — returns new value
function addItem(cart, item) {
  return {
    ...cart,
    items: [...cart.items, item],
    total: cart.total + item.price
  }
}
```

### Function Composition

```js
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x)
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x)

const process = pipe(
  str => str.trim(),
  str => str.toLowerCase(),
  str => str.replace(/\s+/g, "-")
)

process("  Hello World  ")  // => "hello-world"
```

### Currying

```js
const curry = fn => {
  const arity = fn.length
  return function curried(...args) {
    if (args.length >= arity) return fn(...args)
    return (...more) => curried(...args, ...more)
  }
}

const add = curry((a, b) => a + b)
const add5 = add(5)
add5(3)   // => 8
[1, 2, 3].map(add(10))  // => [11, 12, 13]
```

## Best Practices

### Do

- Use `const` by default, `let` when reassignment is needed, never `var`
- Use optional chaining (`?.`) and nullish coalescing (`??`) over manual null checks
- Always handle Promise rejections — `try/catch` with `async/await`, `.catch()` with chains
- Use `Object.freeze()` for constant configuration objects
- Prefer named exports over default exports for better refactoring and IDE support
- Use `Array.isArray()` to check for arrays, not `instanceof Array`
- Use `===` (strict equality) always — never `==`
- Use `structuredClone()` for deep cloning (not `JSON.parse(JSON.stringify(...))`)
- Use private class fields (`#field`) to enforce encapsulation

### Don't

- Don't use `var` — it leaks to function scope and hoists confusingly
- Don't mutate function arguments
- Don't use `arguments` — use rest parameters (`...args`)
- Don't use `==` — coercion is a footgun
- Don't swallow errors in empty catch blocks
- Don't use `for...in` for arrays — use `for...of` or array methods
- Don't rely on `this` outside of class methods without binding — use arrow functions
- Don't use `delete` on object properties in performance-critical paths
- Don't mix `.then()` chains and `async/await` in the same flow

## Anti-Patterns Quick List

| Anti-Pattern | Solution |
|--------------|----------|
| `var` declarations | `const` / `let` |
| `== null` checks | `=== null` or `?? default` |
| Mutating function args | Return new values with spread |
| `arguments` object | Rest parameters `...args` |
| `.then().then().catch()` soup | `async/await` with `try/catch` |
| Unhandled Promise rejections | Always `.catch()` or `try/catch` |
| `for...in` on array | `for...of` or `.forEach()` |
| `JSON.parse(JSON.stringify(x))` | `structuredClone(x)` |
| Deep inheritance chains | Mixin composition |
| Callback hell | `async/await` |

## Additional Resources

### Reference Files

- **`references/closures_scope.md`** — Closures, scope chain, IIFE legacy, module pattern, `this` binding, arrow functions
- **`references/async.md`** — Event loop, Promises, async/await, error handling, concurrency patterns, AbortController
- **`references/oop.md`** — Prototypal inheritance, classes, private fields, mixins, composition over inheritance
- **`references/functional.md`** — Pure functions, immutability, map/filter/reduce, composition, currying, memoization
- **`references/design_patterns.md`** — GoF patterns in JS: Strategy, Observer, Decorator, Factory, Command, Proxy, etc.
- **`references/modules.md`** — ESM, dynamic imports, tree-shaking, barrel files, circular dependencies
