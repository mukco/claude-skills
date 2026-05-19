# JavaScript Design Patterns Reference

Classic patterns in modern JavaScript idioms. JavaScript's first-class functions collapse many patterns to simpler forms than their Java counterparts.

Pattern catalog from [refactoring.guru](https://refactoring.guru/design-patterns).

---

## Strategy

Algorithms as first-class functions — no class hierarchy needed.

```js
// Strategies are just functions
const strategies = {
  bubble: (arr) => { /* bubble sort */ return arr },
  quick:  (arr) => { /* quick sort */  return arr },
  merge:  (arr) => { /* merge sort */  return arr }
}

function sort(data, strategy = "quick") {
  return strategies[strategy]([...data])
}

// Or inject as a parameter
function processPayment(amount, gateway) {
  return gateway(amount)  // gateway is the strategy
}

processPayment(100, stripeGateway)
processPayment(100, paypalGateway)
```

---

## Observer

```js
class EventEmitter {
  #listeners = new Map()

  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set())
    this.#listeners.get(event).add(handler)
    return () => this.off(event, handler)  // returns unsubscribe fn
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler)
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(h => h(...args))
  }

  once(event, handler) {
    const wrapper = (...args) => { handler(...args); this.off(event, wrapper) }
    return this.on(event, wrapper)
  }
}

const bus = new EventEmitter()

const unsubscribe = bus.on("user:login", user => console.log("Login:", user))
bus.emit("user:login", { id: 1, name: "Alice" })
unsubscribe()  // clean up
```

---

## Factory Method

```js
// Factory function — simpler than a class with a static method
function createNotification(type, config) {
  const builders = {
    email: ({ to, subject }) => new EmailNotification(to, subject),
    sms:   ({ to, body })    => new SmsNotification(to, body),
    push:  ({ token, title }) => new PushNotification(token, title)
  }

  const builder = builders[type]
  if (!builder) throw new Error(`Unknown notification type: ${type}`)
  return builder(config)
}

createNotification("email", { to: "alice@example.com", subject: "Hello" })
```

---

## Decorator (Function Decorator)

In JavaScript, function decorators are natural and widely used.

```js
// Compose behavior onto functions
function memoize(fn) {
  const cache = new Map()
  return function(...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

function logCalls(fn, label = fn.name) {
  return function(...args) {
    console.log(`[${label}] called with`, args)
    const result = fn.apply(this, args)
    console.log(`[${label}] returned`, result)
    return result
  }
}

function retry(fn, times = 3) {
  return async function(...args) {
    for (let i = 0; i < times; i++) {
      try { return await fn.apply(this, args) }
      catch (e) { if (i === times - 1) throw e }
    }
  }
}

// Stack decorators
const fetchUser = retry(logCalls(memoize(async id => api.get(id))))
```

---

## Proxy

Intercept and customize operations on objects — the native JavaScript pattern for Decorator on objects.

```js
// Validation proxy
function createValidated(target, validators) {
  return new Proxy(target, {
    set(obj, key, value) {
      if (validators[key] && !validators[key](value)) {
        throw new TypeError(`Invalid value for ${String(key)}: ${value}`)
      }
      obj[key] = value
      return true
    }
  })
}

const user = createValidated({}, {
  age:   v => typeof v === "number" && v >= 0,
  email: v => typeof v === "string" && v.includes("@")
})

user.age   = 25     // ✓
user.email = "bad"  // TypeError

// Readonly proxy
const config = new Proxy({ timeout: 30 }, {
  set() { throw new Error("Config is read-only") }
})
```

---

## Command

```js
// Commands are objects with execute and undo
class CommandHistory {
  #history = []

  execute(command) {
    command.execute()
    this.#history.push(command)
    return this
  }

  undo() {
    const command = this.#history.pop()
    command?.undo()
    return this
  }
}

// Command as plain object
function createAddItemCommand(cart, item) {
  return {
    execute() { cart.items.push(item) },
    undo()    { cart.items = cart.items.filter(i => i !== item) }
  }
}

const history = new CommandHistory()
history
  .execute(createAddItemCommand(cart, item1))
  .execute(createAddItemCommand(cart, item2))
  .undo()  // removes item2
```

---

## Builder

```js
class QueryBuilder {
  #conditions = []
  #orderBy    = null
  #limit      = null
  #offset     = null

  where(condition) {
    this.#conditions.push(condition)
    return this  // fluent interface
  }

  orderBy(field, direction = "ASC") {
    this.#orderBy = `${field} ${direction}`
    return this
  }

  limit(n)  { this.#limit  = n; return this }
  offset(n) { this.#offset = n; return this }

  build() {
    const where  = this.#conditions.length ? `WHERE ${this.#conditions.join(" AND ")}` : ""
    const order  = this.#orderBy ? `ORDER BY ${this.#orderBy}` : ""
    const limit  = this.#limit  !== null ? `LIMIT ${this.#limit}`   : ""
    const offset = this.#offset !== null ? `OFFSET ${this.#offset}` : ""
    return ["SELECT *", "FROM users", where, order, limit, offset]
      .filter(Boolean).join(" ")
  }
}

const query = new QueryBuilder()
  .where("active = true")
  .where("role = 'admin'")
  .orderBy("created_at", "DESC")
  .limit(10)
  .offset(20)
  .build()
```

---

## Singleton

```js
// Module scope — ESM modules are singletons by default
// config.js
export const config = Object.freeze({
  apiUrl:  process.env.API_URL,
  timeout: parseInt(process.env.TIMEOUT ?? "30")
})
// Every importer gets the same frozen object — natural singleton

// Explicit singleton class (rarely needed with ESM)
class Database {
  static #instance = null

  static getInstance() {
    if (!Database.#instance) Database.#instance = new Database()
    return Database.#instance
  }

  // private constructor via convention
  constructor() {
    if (Database.#instance) throw new Error("Use Database.getInstance()")
    this.conn = null
  }
}
```

---

## Null Object

```js
// Null implementations that do nothing
const NullLogger = {
  info:  () => {},
  warn:  () => {},
  error: () => {},
  debug: () => {}
}

const NullCache = {
  get:    (_key)        => null,
  set:    (_key, _val)  => {},
  delete: (_key)        => {}
}

class Service {
  constructor({ logger = NullLogger, cache = NullCache } = {}) {
    this.logger = logger
    this.cache  = cache
  }

  process(key) {
    this.logger.info(`Processing ${key}`)  // no null check needed
    const cached = this.cache.get(key)
    if (cached) return cached
    const result = this.#expensive(key)
    this.cache.set(key, result)
    return result
  }
}
```

---

## Adapter

```js
// Legacy API has different interface
class LegacyStorage {
  readItem(key)        { return localStorage.getItem(key) }
  writeItem(key, val)  { localStorage.setItem(key, val) }
  removeItem(key)      { localStorage.removeItem(key) }
}

// Modern interface our app expects
class StorageAdapter {
  #storage

  constructor(storage) { this.#storage = storage }

  get(key)         { return JSON.parse(this.#storage.readItem(key)) }
  set(key, value)  { this.#storage.writeItem(key, JSON.stringify(value)) }
  delete(key)      { this.#storage.removeItem(key) }
}

const store = new StorageAdapter(new LegacyStorage())
store.set("user", { id: 1, name: "Alice" })
store.get("user")  // { id: 1, name: "Alice" }
```

---

## Pattern Quick-Select

| Situation | Pattern |
|-----------|---------|
| Multiple algorithms, swap at runtime | Strategy (function) |
| Notify subscribers of events | Observer / EventEmitter |
| Which object to create depends on input | Factory function |
| Add behavior to functions | Function Decorator |
| Intercept object operations | Proxy |
| Encapsulate operations with undo | Command |
| Construct complex objects step-by-step | Builder |
| Single shared instance | ESM module export (natural singleton) |
| Eliminate null checks for optional deps | Null Object |
| Make incompatible interfaces work | Adapter |
