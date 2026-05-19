# JavaScript Closures and Scope Reference

## Variable Declarations

| Keyword | Scope | Hoisted | Reassignable | TDZ |
|---------|-------|---------|--------------|-----|
| `var` | Function | Yes (undefined) | Yes | No |
| `let` | Block | Yes (unusable) | Yes | Yes |
| `const` | Block | Yes (unusable) | No (binding) | Yes |

**TDZ** = Temporal Dead Zone — accessing `let`/`const` before declaration throws `ReferenceError`.

```js
// var — function-scoped, hoisted, avoid
function example() {
  console.log(x)  // undefined — hoisted but not initialized
  var x = 5
  console.log(x)  // 5
}

// let — block-scoped
{
  let y = 10
}
console.log(y)  // ReferenceError — out of scope

// const — block-scoped, binding immutable, object contents mutable
const config = { timeout: 30 }
config.timeout = 60   // ✓ — mutates object
config = {}           // ✗ — reassigns binding

// Use const by default, let when reassignment is needed, never var
```

---

## Hoisting

```js
// Function declarations — fully hoisted
greet("Alice")          // works — function is hoisted
function greet(name) { return `Hello, ${name}` }

// Function expressions and arrow functions — NOT hoisted
sayHi()                 // ReferenceError
const sayHi = () => "Hi"

// var — declaration hoisted, initialization not
console.log(n)          // undefined
var n = 5
```

---

## Closures

A closure is a function that retains access to variables from its defining scope, even after that scope has exited.

```js
function createCounter(initial = 0) {
  let count = initial  // captured in closure

  return {
    increment() { return ++count },
    decrement() { return --count },
    value()     { return count },
    reset()     { count = initial }
  }
}

const counter = createCounter(10)
counter.increment()  // 11
counter.increment()  // 12
counter.value()      // 12
counter.reset()
counter.value()      // 10
```

### Closures Capture Variables, Not Values

```js
// Classic pitfall with var in loops
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// prints: 3, 3, 3 — all closures share the same `i`

// Fix 1 — use let (block-scoped, new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// prints: 0, 1, 2

// Fix 2 — IIFE (legacy)
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i)
}
```

### Closure for Private State

```js
function createCache() {
  const store = new Map()  // private — not exposed

  return {
    get(key) { return store.get(key) },
    set(key, value) { store.set(key, value); return this },
    has(key) { return store.has(key) },
    delete(key) { return store.delete(key) },
    size() { return store.size }
  }
}

const cache = createCache()
cache.set("user:1", { name: "Alice" })
cache.get("user:1")  // { name: "Alice" }
// store is completely private
```

---

## this Binding

`this` depends on *how* a function is called, not where it's defined (except arrow functions).

| Call form | `this` value |
|-----------|-------------|
| `obj.method()` | `obj` |
| `fn()` (standalone) | `undefined` (strict) / global |
| `new Fn()` | new object |
| `fn.call(ctx, args)` | `ctx` |
| `fn.apply(ctx, [args])` | `ctx` |
| `fn.bind(ctx)` | `ctx` (permanently) |
| Arrow function `() => {}` | Lexical — inherits enclosing `this` |

```js
class Timer {
  constructor() {
    this.count = 0
  }

  // WRONG — loses `this` when passed as callback
  startBroken() {
    setInterval(function() {
      this.count++  // `this` is undefined in strict mode
    }, 1000)
  }

  // RIGHT 1 — arrow function captures lexical this
  start() {
    setInterval(() => {
      this.count++  // `this` is the Timer instance
    }, 1000)
  }

  // RIGHT 2 — bind
  startBound() {
    const tick = function() { this.count++ }.bind(this)
    setInterval(tick, 1000)
  }
}
```

---

## Arrow Functions

Arrow functions have no own `this`, `arguments`, `super`, or `new.target`. They inherit `this` from the enclosing lexical scope.

```js
// Cannot be used as constructor
const Foo = () => {}
new Foo()  // TypeError

// No `arguments` — use rest params
const sum = (...nums) => nums.reduce((a, b) => a + b, 0)

// Returning object literal — wrap in parens to avoid ambiguity with block
const toObj = (x, y) => ({ x, y })

// Implicit return for single expressions
const double = x => x * 2
const greet  = name => `Hello, ${name}`
```

---

## Scope Chain and Lexical Scope

JavaScript uses lexical (static) scope — the scope is determined by where the function is written, not where it's called.

```js
const x = "global"

function outer() {
  const x = "outer"

  function inner() {
    const x = "inner"
    console.log(x)   // "inner" — local scope wins
  }

  function middle() {
    console.log(x)   // "outer" — walks up scope chain, finds outer's x
  }

  inner()   // "inner"
  middle()  // "outer"
}

outer()
```

---

## Module Pattern (Legacy — prefer ESM)

Before ESM, the module pattern used IIFEs to create private scope.

```js
// IIFE — Immediately Invoked Function Expression
const Counter = (() => {
  let count = 0  // private

  return {
    increment() { return ++count },
    value()     { return count }
  }
})()

Counter.increment()
Counter.value()  // 1
// count is inaccessible from outside
```

Modern code uses ESM modules instead — each file has its own scope.

---

## Currying and Partial Application

```js
// Manual curry
const curry = (fn) => {
  const arity = fn.length
  return function curried(...args) {
    if (args.length >= arity) return fn(...args)
    return (...more) => curried(...args, ...more)
  }
}

const add    = curry((a, b, c) => a + b + c)
const add5   = add(5)       // partially applied
const add5_3 = add5(3)      // partially applied
add5_3(2)                    // 10

// Partial application with bind
function multiply(a, b) { return a * b }
const double = multiply.bind(null, 2)
double(5)  // 10
```

---

## WeakMap for Private Data

Alternative to closures for per-instance private data in classes.

```js
const _private = new WeakMap()

class Person {
  constructor(name, age) {
    _private.set(this, { name, age })
  }

  get name() { return _private.get(this).name }
  get age()  { return _private.get(this).age }

  birthday() {
    _private.get(this).age++
  }
}

// Prefer private class fields (#) instead — cleaner and standard
class Person {
  #name
  #age
  constructor(name, age) { this.#name = name; this.#age = age }
  get name() { return this.#name }
}
```

---

## Anti-Patterns

### var in Block Scope

```js
// WRONG — var leaks out of if block
if (true) {
  var x = 5  // accessible outside if block
}
console.log(x)  // 5 — surprising

// RIGHT
if (true) {
  const x = 5
}
console.log(x)  // ReferenceError — correctly scoped
```

### this in Callbacks Without Arrow Function

```js
class Component {
  data = [1, 2, 3]

  // WRONG
  logDataBroken() {
    this.data.forEach(function(item) {
      console.log(this, item)  // this is undefined in strict mode
    })
  }

  // RIGHT
  logData() {
    this.data.forEach(item => console.log(this, item))  // this is Component
  }
}
```
