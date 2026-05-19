# JavaScript OOP Reference

## Classes

ES6 classes are syntactic sugar over JavaScript's prototype system. The behavior is identical to constructor functions but the syntax is cleaner and less surprising.

```js
class Animal {
  // Public class field (ES2022)
  kingdom = "Animalia"

  // Private class field — enforced by engine, not convention
  #name
  #sound

  constructor(name, sound) {
    this.#name  = name
    this.#sound = sound
  }

  // Getter — accessed as property
  get name() { return this.#name }

  // Instance method
  speak() { return `${this.#name} says ${this.#sound}` }

  // Static method — on the class, not instances
  static kingdom() { return "Animalia" }

  // Private method
  #validate() { return this.#name.length > 0 }
}

class Dog extends Animal {
  #tricks = []

  constructor(name) {
    super(name, "woof")  // must call super before using this
  }

  learn(trick) {
    this.#tricks.push(trick)
    return this  // allow chaining
  }

  perform() {
    return this.#tricks.map(t => `${this.name} performs: ${t}`)
  }
}

const dog = new Dog("Rex")
dog.learn("sit").learn("shake").perform()
```

---

## Prototypal Inheritance

Under the hood, classes use the prototype chain.

```js
// Every object has a prototype
const obj = {}
Object.getPrototypeOf(obj) === Object.prototype  // true

// Prototype chain lookup
const arr = [1, 2, 3]
// arr -> Array.prototype -> Object.prototype -> null
arr.map      // found on Array.prototype
arr.toString // found on Object.prototype

// Class syntax compiles to prototype assignment
class Foo { greet() { return "hi" } }
// equivalent to:
function Foo() {}
Foo.prototype.greet = function() { return "hi" }
```

---

## Composition over Inheritance

Deep inheritance hierarchies are brittle. Compose behavior from small functions and mixins.

```js
// Deep inheritance — inflexible
class Vehicle { }
class MotorVehicle extends Vehicle { }
class Car extends MotorVehicle { }
class ElectricCar extends Car { }  // what if we need ElectricBike?

// Composition with mixin factories
const Serializable = (Base) => class extends Base {
  serialize()   { return JSON.stringify(this) }
  static deserialize(json) { return Object.assign(new this(), JSON.parse(json)) }
}

const Validatable = (Base) => class extends Base {
  validate() {
    return Object.entries(this.constructor.rules ?? {}).every(([k, rule]) => rule(this[k]))
  }
}

const Timestamped = (Base) => class extends Base {
  constructor(...args) {
    super(...args)
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }
  touch() { this.updatedAt = new Date() }
}

// Compose freely
class User extends Timestamped(Validatable(Serializable(EventTarget))) {
  static rules = {
    name:  v => typeof v === "string" && v.length > 0,
    email: v => typeof v === "string" && v.includes("@")
  }

  constructor(name, email) {
    super()
    this.name  = name
    this.email = email
  }
}
```

---

## Private Class Fields vs WeakMap

Prefer native private fields (`#field`) — they are enforced by the engine.

```js
// Native private (ES2022) — preferred
class Counter {
  #count = 0

  increment() { return ++this.#count }
  get value() { return this.#count }
}

// WeakMap (legacy approach)
const _count = new WeakMap()
class Counter {
  constructor() { _count.set(this, 0) }
  increment() { _count.set(this, _count.get(this) + 1); return this }
  get value() { return _count.get(this) }
}
```

---

## Static Members

```js
class IdGenerator {
  static #nextId = 1

  static generate() { return IdGenerator.#nextId++ }
  static reset()    { IdGenerator.#nextId = 1 }
}

class Registry {
  static #instances = new Map()

  static register(key, value) { this.#instances.set(key, value) }
  static get(key)             { return this.#instances.get(key) }
  static has(key)             { return this.#instances.has(key) }
}
```

---

## toString, valueOf, Symbol.iterator

```js
class Money {
  constructor(amount, currency) {
    this.amount   = amount
    this.currency = currency
  }

  // Used in string interpolation and String()
  toString() { return `${this.amount} ${this.currency}` }

  // Used in arithmetic and numeric contexts
  valueOf() { return this.amount }

  // Make iterable — for...of, spread, destructuring
  [Symbol.iterator]() {
    return [this.amount, this.currency][Symbol.iterator]()
  }

  // Custom inspection in Node.js
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `Money(${this.amount} ${this.currency})`
  }
}

const price = new Money(9.99, "USD")
`Price: ${price}`         // "Price: 9.99 USD"
price * 2                 // 19.98
const [amount, currency] = price  // destructuring via Symbol.iterator
```

---

## Object.create and Prototypal Patterns

```js
// Object.create — explicit prototype setting
const animal = {
  speak() { return `${this.name} makes a sound` }
}

const dog = Object.create(animal)
dog.name  = "Rex"
dog.speak()  // "Rex makes a sound"

// Object.create(null) — no prototype (pure hash map)
const map = Object.create(null)
map.toString  // undefined — no Object.prototype
map["key"]  = "value"

// Factory function — no new required
function createPoint(x, y) {
  return Object.freeze({
    x, y,
    distanceTo(other) {
      return Math.hypot(this.x - other.x, this.y - other.y)
    }
  })
}

const p = createPoint(0, 0)  // no new needed
```

---

## Anti-Patterns

### Subclassing Just for Code Reuse

```js
// WRONG — inherits everything even if you only want one method
class Utils { formatDate(d) { ... } }
class UserService extends Utils { }  // UserService IS NOT a Utils

// RIGHT — use a function or module
import { formatDate } from "./date-utils.js"
class UserService { ... }
```

### Exposing Internals via Naming Convention

```js
// WRONG — _prefix is a convention, not enforcement
class Wallet {
  _balance = 0  // "private" by convention — anyone can access it
}

// RIGHT — private field
class Wallet {
  #balance = 0  // enforced by engine
}
```

### Constructor Side Effects

```js
// WRONG — constructor does async work or has side effects
class DataLoader {
  constructor() {
    this.data = fetchSync(url)  // blocking! or
    fetch(url).then(r => this.data = r)  // async in constructor — problematic
  }
}

// RIGHT — use factory async method
class DataLoader {
  static async create(url) {
    const loader = new DataLoader()
    loader.data = await fetch(url).then(r => r.json())
    return loader
  }
}

const loader = await DataLoader.create(url)
```
