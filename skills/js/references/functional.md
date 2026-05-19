# JavaScript Functional Patterns Reference

## Pure Functions

A pure function: given the same inputs, always returns the same output and has no side effects.

```js
// IMPURE — reads external state, has side effects
let total = 0
function addToTotal(amount) {
  total += amount      // side effect — modifies external state
  return total         // output depends on external state
}

// PURE — output depends only on input, no side effects
function add(a, b) { return a + b }
function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}
```

---

## Immutability

Never mutate objects or arrays — always return new values.

```js
// Objects
const user = { name: "Alice", age: 30, role: "user" }

// WRONG — mutates
user.role = "admin"

// RIGHT — new object
const admin = { ...user, role: "admin" }

// Nested update — spread each level
const state = { user: { profile: { name: "Alice" } } }
const updated = {
  ...state,
  user: {
    ...state.user,
    profile: { ...state.user.profile, name: "Bob" }
  }
}

// Arrays
const nums = [1, 2, 3, 4, 5]

// WRONG — mutates
nums.push(6)
nums.splice(2, 1)
nums.sort()

// RIGHT — new arrays
const appended  = [...nums, 6]
const removed   = nums.filter((_, i) => i !== 2)
const sorted    = [...nums].sort()
const prepended = [0, ...nums]

// Object.freeze — prevent mutation (shallow)
const CONFIG = Object.freeze({ timeout: 30, retries: 3 })
CONFIG.timeout = 60  // silently fails (or throws in strict mode)

// structuredClone — deep clone
const deep = structuredClone(complex)
```

---

## Higher-Order Functions

Functions that take functions as arguments or return functions.

```js
// map — transform each element
const doubled  = [1, 2, 3].map(x => x * 2)        // [2, 4, 6]
const names    = users.map(u => u.name)             // ["Alice", "Bob"]
const withTax  = prices.map(p => ({ ...p, total: p.price * 1.1 }))

// filter — keep matching elements
const actives  = users.filter(u => u.active)
const evens    = nums.filter(n => n % 2 === 0)

// reduce — fold to single value
const sum      = nums.reduce((acc, n) => acc + n, 0)
const byId     = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})
const grouped  = users.reduce((acc, u) => {
  const key = u.role
  return { ...acc, [key]: [...(acc[key] ?? []), u] }
}, {})

// flatMap — map then flatten one level
const tags     = posts.flatMap(p => p.tags)
const pairs    = [1, 2, 3].flatMap(n => [n, n * 2])  // [1,2,2,4,3,6]

// some / every / find / findIndex / includes
const hasAdmin = users.some(u => u.role === "admin")
const allValid = items.every(i => i.price > 0)
const alice    = users.find(u => u.name === "Alice")
```

---

## Function Composition

```js
// Pipe — left to right
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x)

// Compose — right to left
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x)

const process = pipe(
  str => str.trim(),
  str => str.toLowerCase(),
  str => str.replace(/\s+/g, "-"),
  str => str.replace(/[^a-z0-9-]/g, "")
)

process("  Hello, World!  ")  // "hello-world"

// With async functions
const pipeAsync = (...fns) => x => fns.reduce(async (v, f) => f(await v), x)

const processUser = pipeAsync(
  id  => fetchUser(id),
  u   => enrichProfile(u),
  u   => ({ ...u, displayName: `${u.firstName} ${u.lastName}` })
)
```

---

## Currying

```js
const curry = fn => {
  const arity = fn.length
  return function curried(...args) {
    if (args.length >= arity) return fn(...args)
    return (...more) => curried(...args, ...more)
  }
}

// Manual curried functions (more common in practice)
const filterBy = key => value => arr => arr.filter(item => item[key] === value)
const sortBy   = key => arr => [...arr].sort((a, b) => a[key] < b[key] ? -1 : 1)
const limit    = n => arr => arr.slice(0, n)

const getActiveAdmins = pipe(
  filterBy("role")("admin"),
  filterBy("active")(true),
  sortBy("name"),
  limit(10)
)

getActiveAdmins(users)
```

---

## Memoization

Cache expensive function results. Pure functions are safe to memoize.

```js
function memoize(fn) {
  const cache = new Map()
  return function(...args) {
    const key = JSON.stringify(args)
    if (!cache.has(key)) cache.set(key, fn.apply(this, args))
    return cache.get(key)
  }
}

const expensiveCalc = memoize((n) => {
  // simulate expensive computation
  return Array.from({ length: n }, (_, i) => i).reduce((a, b) => a + b, 0)
})

expensiveCalc(1000)  // computed
expensiveCalc(1000)  // cached
```

---

## Transducers (Advanced)

Compose transformations without creating intermediate arrays.

```js
// Without transducers — 3 intermediate arrays
const result = data
  .filter(x => x > 0)
  .map(x => x * 2)
  .filter(x => x < 100)

// With reduce — single pass, no intermediate arrays
const result = data.reduce((acc, x) => {
  if (x <= 0) return acc
  const doubled = x * 2
  if (doubled >= 100) return acc
  return [...acc, doubled]
}, [])
```

---

## Option / Maybe Pattern

Handle nullable values functionally without null checks scattered everywhere.

```js
class Maybe {
  static of(value)  { return value == null ? new Nothing() : new Just(value) }
  static empty()    { return new Nothing() }
}

class Just extends Maybe {
  #value
  constructor(value) { super(); this.#value = value }
  map(fn)      { return Maybe.of(fn(this.#value)) }
  flatMap(fn)  { return fn(this.#value) }
  getOrElse(_) { return this.#value }
  isNothing()  { return false }
}

class Nothing extends Maybe {
  map(_)       { return this }
  flatMap(_)   { return this }
  getOrElse(d) { return d }
  isNothing()  { return true }
}

// Usage — chain operations safely
const getCity = user =>
  Maybe.of(user)
    .flatMap(u => Maybe.of(u.address))
    .flatMap(a => Maybe.of(a.city))
    .getOrElse("Unknown")

getCity({ address: { city: "Paris" } })  // "Paris"
getCity({ address: null })               // "Unknown"
getCity(null)                            // "Unknown"
```

---

## Anti-Patterns

### Mutating Parameters

```js
// WRONG — mutates input
function addDiscount(cart, discount) {
  cart.total *= (1 - discount)  // mutates caller's cart
  return cart
}

// RIGHT — return new value
function addDiscount(cart, discount) {
  return { ...cart, total: cart.total * (1 - discount) }
}
```

### forEach for Data Transformation

```js
// WRONG — forEach should be for side effects only
const names = []
users.forEach(u => names.push(u.name))  // anti-pattern

// RIGHT
const names = users.map(u => u.name)
```

### Impure reduce

```js
// WRONG — modifying accumulator (mutation)
const byId = users.reduce((acc, u) => {
  acc[u.id] = u  // mutates acc
  return acc
}, {})

// This actually works fine for performance and is idiomatic in JS
// Pure alternative (slower for large datasets):
const byId = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})
// For large datasets, the mutation form is acceptable — the acc is internal to reduce
```
