# TypeScript Narrowing Reference

Narrowing is how TypeScript refines a broad type to a specific type within a conditional branch. The compiler tracks which type is possible at each point in the control flow.

## Control Flow Analysis

TypeScript tracks types through conditions, assignments, and returns.

```ts
function process(value: string | number | null) {
  // Type: string | number | null
  if (value === null) {
    return "null"                  // Type: null
  }
  // Type: string | number (null eliminated)
  if (typeof value === "string") {
    return value.toUpperCase()     // Type: string
  }
  // Type: number
  return value.toFixed(2)         // Type: number
}
```

---

## Narrowing Techniques

### typeof

```ts
function format(value: string | number | boolean) {
  if (typeof value === "string")  return value.trim()
  if (typeof value === "number")  return value.toFixed(2)
  if (typeof value === "boolean") return value ? "yes" : "no"
  value  // type: never — all cases handled
}

// typeof checks: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "function" | "object"
// Note: typeof null === "object" — always check null separately
```

### instanceof

```ts
class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    console.error(`API ${error.statusCode}: ${error.message}`)  // statusCode available
    return
  }
  if (error instanceof Error) {
    console.error(error.message)
    return
  }
  console.error("Unknown error:", error)
}
```

### in — Property Check

```ts
interface Cat  { meow: () => void }
interface Dog  { bark: () => void; fetch: () => void }

function interact(animal: Cat | Dog) {
  if ("meow" in animal) {
    animal.meow()   // Cat
  } else {
    animal.bark()   // Dog
    animal.fetch()
  }
}
```

### Discriminated Unions

The most powerful narrowing. A shared literal-type field acts as the discriminant.

```ts
type Shape =
  | { kind: "circle";    radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle";  base: number;  height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":    return Math.PI * shape.radius ** 2
    case "rectangle": return shape.width * shape.height
    case "triangle":  return (shape.base * shape.height) / 2
  }
}

// Exhaustive check — if you add a new shape, the compiler will error here
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":    return Math.PI * shape.radius ** 2
    case "rectangle": return shape.width * shape.height
    case "triangle":  return (shape.base * shape.height) / 2
    default:          return assertNever(shape)  // type error if case is missing
  }
}
```

### Equality Narrowing

```ts
function process(x: string | number, y: string | boolean) {
  if (x === y) {
    // x and y must both be string (the only type they share)
    x.toUpperCase()  // string
    y.toUpperCase()  // string
  }
}

// Null/undefined narrowing
function greet(name: string | null | undefined) {
  if (name == null) {
    // name is null | undefined
    return "Anonymous"
  }
  // name is string
  return `Hello, ${name}`
}
```

### Truthiness Narrowing

```ts
function process(value: string | null | undefined | 0 | false) {
  if (value) {
    // value is string (with length > 0) — 0, false, null, undefined excluded
    value.toUpperCase()
  }
}

// Prefer explicit null checks for strings to avoid empty string being falsy
function process(name: string | null) {
  if (name !== null) {    // better than: if (name)
    doSomething(name)
  }
}
```

---

## Custom Type Guards

User-defined predicates that tell the compiler about a type.

### Type Predicates (value is T)

```ts
interface User    { id: number; name: string }
interface Product { id: number; price: number }

function isUser(value: User | Product): value is User {
  return "name" in value
}

function isProduct(value: User | Product): value is Product {
  return "price" in value
}

function display(item: User | Product) {
  if (isUser(item)) {
    console.log(item.name)   // narrowed to User
  } else {
    console.log(item.price)  // narrowed to Product
  }
}

// Validate unknown — parse external data
function parseUser(data: unknown): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as any).id === "number" &&
    typeof (data as any).name === "string"
  )
}

const raw: unknown = await fetchUser(id)
if (parseUser(raw)) {
  raw.name  // safely narrowed to User
}
```

### Assertion Functions (asserts value is T)

Throws on failure — narrows all subsequent code.

```ts
function assertUser(value: unknown): asserts value is User {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as any).id !== "number" ||
    typeof (value as any).name !== "string"
  ) {
    throw new TypeError("Expected User")
  }
}

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value == null) throw new Error("Expected defined value")
}

// Usage — narrows after the assertion (no if needed)
const data: unknown = await fetchRaw()
assertUser(data)
data.name  // string — narrowed

const user = findUser(id)
assertDefined(user)
user.name  // narrowed — no longer null/undefined
```

---

## Narrowing with Generics

```ts
// TypeGuard helper for checking array element types
function isArrayOf<T>(arr: unknown, guard: (v: unknown) => v is T): arr is T[] {
  return Array.isArray(arr) && arr.every(guard)
}

function isString(v: unknown): v is string { return typeof v === "string" }

const data: unknown = JSON.parse(input)
if (isArrayOf(data, isString)) {
  data.join(", ")  // string[]
}
```

---

## The never Type

`never` is the bottom type — a value of type `never` can never exist. Used for:
1. Exhaustive checks in switch statements
2. Functions that never return
3. Impossible intersections

```ts
// Exhaustive switch
type Color = "red" | "green" | "blue"

function toHex(color: Color): string {
  switch (color) {
    case "red":   return "#ff0000"
    case "green": return "#00ff00"
    case "blue":  return "#0000ff"
    default: {
      const _exhaustive: never = color  // type error if Color gets a new variant
      return _exhaustive
    }
  }
}

// Functions that never return
function fail(msg: string): never {
  throw new Error(msg)
}

function infinite(): never {
  while (true) {}
}

// Impossible intersection
type ImpossibleType = string & number  // never
```

---

## Anti-Patterns

### Overusing as (Type Assertion)

```ts
// WRONG — silences compiler instead of narrowing properly
const user = data as User  // data might not actually be User!

// RIGHT — validate before asserting
if (isUser(data)) {
  const user = data  // User — type-safe
}

// Use as only when you have certainty the compiler can't verify:
// e.g., DOM queries with known structure
const canvas = document.getElementById("canvas") as HTMLCanvasElement
```

### Non-null Assertion on Unknown Values

```ts
// WRONG — ! asserts non-null but doesn't check
const user = getUser()!  // crashes if getUser returns null

// RIGHT — guard properly
const user = getUser()
if (!user) throw new Error("User not found")
user.name  // safely narrowed
```

### Missing Default in switch

```ts
// WRONG — adding "purple" to Color causes silent fallthrough
function process(color: Color) {
  switch (color) {
    case "red":   return 0
    case "green": return 1
    case "blue":  return 2
    // no default, no exhaustive check
  }
}

// RIGHT — exhaustive check catches new variants at compile time
function process(color: Color): number {
  switch (color) {
    case "red":   return 0
    case "green": return 1
    case "blue":  return 2
    default:      return assertNever(color)
  }
}
```
