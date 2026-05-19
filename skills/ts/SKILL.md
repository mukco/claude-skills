---
name: ts
description: "TypeScript type system — interface vs type, generics, utility types, discriminated unions, type guards, narrowing, branded types, conditional/mapped/template literal types, and TypeScript-specific patterns."
---

# TypeScript Patterns

Comprehensive guidance for TypeScript's type system and TS-specific patterns. The goal: types that are precise enough to catch real bugs, not so complex they become obstacles. Use TypeScript to make illegal states unrepresentable.

Pair with `js` for runtime patterns. This skill is purely about the type layer.

## Quick Reference

### interface vs type

```ts
// interface — for object shapes, extendable, declaration-mergeable
interface User {
  id:    number
  name:  string
  email: string
}
interface AdminUser extends User {
  permissions: string[]
}

// type — for unions, intersections, computed types, aliases
type Status     = "pending" | "active" | "archived"
type ID         = string | number
type UserOrAdmin = User | AdminUser
type WithId<T>  = T & { id: string }

// Rule of thumb:
// interface → object shapes you'll extend or that libraries will augment
// type      → everything else (unions, intersections, utilities, primitives)
```

### Utility Types Quick Reference

```ts
// Structural transformations
Partial<T>           // all props optional
Required<T>          // all props required
Readonly<T>          // all props readonly
Record<K, V>         // object with keys K and values V

// Picking and omitting
Pick<T, "a" | "b">  // keep only listed keys
Omit<T, "a" | "b">  // remove listed keys

// Function types
Parameters<typeof fn>         // tuple of param types
ReturnType<typeof fn>         // return type
ConstructorParameters<typeof C> // constructor params

// Promise / awaited
Awaited<Promise<string>>      // => string

// Nullability
NonNullable<string | null | undefined>  // => string

// Extract / Exclude from union
Extract<"a" | "b" | "c", "a" | "c">   // => "a" | "c"
Exclude<"a" | "b" | "c", "a" | "c">   // => "b"
```

### Generics Quick Reference

```ts
// Function generic
function identity<T>(value: T): T { return value }

// Constrained generic
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// Default type parameter
interface ApiResponse<T = unknown> {
  data:    T
  status:  number
  message: string
}

// Multiple constraints
function merge<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b }
}
```

### Type Narrowing Quick Reference

```ts
// typeof
function process(value: string | number) {
  if (typeof value === "string") value.toUpperCase()  // string here
  else                           value.toFixed(2)     // number here
}

// instanceof
function handle(error: Error | ApiError) {
  if (error instanceof ApiError) error.statusCode  // ApiError here
}

// in — check for property existence
function render(shape: Circle | Rectangle) {
  if ("radius" in shape)      return Math.PI * shape.radius ** 2
  return shape.width * shape.height
}

// Discriminated union — narrow via literal field
type Result<T> =
  | { success: true;  data:  T }
  | { success: false; error: string }

function handle<T>(result: Result<T>) {
  if (result.success) result.data   // T here
  else                result.error  // string here
}
```

## The Type System

### Make Illegal States Unrepresentable

Model your domain so invalid combinations cannot be constructed.

```ts
// WRONG — allows invalid states (loading + error + data all set simultaneously)
interface FetchState {
  loading: boolean
  error:   string | null
  data:    User | null
}

// RIGHT — discriminated union — each state is explicit
type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error";   error: string }
  | { status: "success"; data:  T }

// Exhaustive check — compiler errors when a new state is added
function render(state: FetchState<User>) {
  switch (state.status) {
    case "idle":    return <Empty />
    case "loading": return <Spinner />
    case "error":   return <ErrorMessage msg={state.error} />
    case "success": return <UserCard user={state.data} />
    default:        return state satisfies never  // ensures all cases handled
  }
}
```

### Discriminated Unions

The most powerful narrowing tool. A shared literal field acts as the discriminant.

```ts
type PaymentMethod =
  | { type: "credit_card"; cardNumber: string; cvv: string; expiry: string }
  | { type: "bank_transfer"; routingNumber: string; accountNumber: string }
  | { type: "crypto"; walletAddress: string; network: "ethereum" | "bitcoin" }

function processPayment(method: PaymentMethod) {
  switch (method.type) {
    case "credit_card":    return chargeCreditCard(method.cardNumber, method.cvv)
    case "bank_transfer":  return initiateTransfer(method.routingNumber)
    case "crypto":         return broadcastTx(method.walletAddress, method.network)
  }
}
```

### Type Guards

Custom narrowing functions that inform the compiler of a type at a call site.

```ts
// Type predicate — `value is T`
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  )
}

// Assertion function — throws if not valid
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new TypeError("Expected User")
}

// Usage
const data: unknown = await fetchUser(id)
if (isUser(data)) data.name          // narrowed to User
assertUser(data)
data.name                            // narrowed after assertion
```

## Advanced Types

### Conditional Types

```ts
// Basic conditional
type IsString<T> = T extends string ? true : false
type A = IsString<string>  // true
type B = IsString<number>  // false

// Infer — extract a type from a structure
type UnpackPromise<T> = T extends Promise<infer U> ? U : T
type C = UnpackPromise<Promise<string>>  // string
type D = UnpackPromise<number>          // number

// Distributive conditional (distributes over union)
type Flatten<T> = T extends Array<infer U> ? U : T
type E = Flatten<string[] | number>  // string | number

// Practical: filter a union
type StringsOnly<T> = T extends string ? T : never
type F = StringsOnly<"a" | 1 | "b" | true>  // "a" | "b"
```

### Mapped Types

```ts
// Make all properties optional and nullable
type MakeNullable<T> = { [K in keyof T]: T[K] | null }

// Readonly deep
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

// Remap keys
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
// Getters<{ name: string }> => { getName: () => string }

// Filter keys by value type
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}
// PickByValue<{ a: string; b: number; c: string }, string> => { a: string; c: string }
```

### Template Literal Types

```ts
type EventName = "click" | "focus" | "blur"
type HandlerName = `on${Capitalize<EventName>}`
// => "onClick" | "onFocus" | "onBlur"

type CssProperty = "margin" | "padding"
type CssDirection = "top" | "right" | "bottom" | "left"
type CssBoxProp = `${CssProperty}-${CssDirection}`
// => "margin-top" | "margin-right" | ... | "padding-left"

// Parsing route params
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${string}:${infer Param}`
    ? Param
    : never

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">
// => "userId" | "postId"
```

## TypeScript-Specific Patterns

### Branded Types

Prevent mixing up values of the same primitive type (e.g., userId vs orderId).

```ts
declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

type UserId  = Brand<string, "UserId">
type OrderId = Brand<string, "OrderId">

function createUserId(raw: string): UserId   { return raw as UserId }
function createOrderId(raw: string): OrderId { return raw as OrderId }

function getUser(id: UserId): User { ... }

const userId  = createUserId("u_123")
const orderId = createOrderId("o_456")

getUser(userId)   // ✓
getUser(orderId)  // ✗ TypeScript error — OrderId is not UserId
```

### const Assertions

```ts
// Without const — widened to string[]
const directions = ["north", "south", "east", "west"]
// type: string[]

// With const — tuple of literals
const directions = ["north", "south", "east", "west"] as const
// type: readonly ["north", "south", "east", "west"]

type Direction = typeof directions[number]
// => "north" | "south" | "east" | "west"

// Object const assertion
const CONFIG = {
  timeout:  30,
  retries:  3,
  endpoint: "/api"
} as const
// All values become readonly literals — CONFIG.timeout: 30 (not number)
```

### satisfies Operator

Validate that a value matches a type without widening it.

```ts
type ColorMap = Record<string, string>

// Without satisfies — type is ColorMap, loses literal key info
const colors: ColorMap = { red: "#ff0000", green: "#00ff00" }
colors.red       // type: string
colors.purplish  // type: string (no error — all strings are valid)

// With satisfies — validates AND preserves narrow type
const colors = {
  red:   "#ff0000",
  green: "#00ff00"
} satisfies ColorMap

colors.red       // type: string ✓
colors.purplish  // TypeScript error — key doesn't exist ✓
```

### Builder Pattern with Generics

Type-safe builder where the return type tracks which fields have been set.

```ts
type Defined<T> = { [K in keyof T]-?: NonNullable<T[K]> }

class QueryBuilder<T extends object, Selected extends Partial<T> = {}> {
  private params: Partial<T> = {}

  where<K extends keyof T>(key: K, value: T[K]): QueryBuilder<T, Selected & Pick<T, K>> {
    this.params[key] = value
    return this as any
  }

  build(): Selected { return this.params as Selected }
}
```

## Best Practices

### Do

- Start with `unknown` for external data (API responses, JSON.parse) — never `any`
- Use discriminated unions to model states — eliminates impossible state combinations
- Use `as const` for fixed arrays/objects you'll derive types from
- Use `satisfies` when you want validation without widening
- Use branded types for IDs and domain primitives to prevent mixing
- Prefer `interface` for public library APIs (allows declaration merging)
- Prefer `type` for unions, intersections, and computed types
- Use `readonly` and `Readonly<T>` for values that should not be mutated
- Add `strictNullChecks`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` to tsconfig
- Use exhaustive checks with `never` in switch statements

### Don't

- Don't use `any` — use `unknown` and narrow it
- Don't use type assertions (`as`) unless you have strong certainty and a comment explaining why
- Don't use `!` non-null assertion liberally — it silences the compiler, not the bug
- Don't make everything `Partial<T>` — model optionality explicitly
- Don't write types wider than needed — precision catches more bugs
- Don't use `object` or `{}` as a type — use specific shapes or `Record<string, unknown>`
- Don't use `Function` type — use specific callable types `(arg: T) => R`
- Don't fight the compiler with assertions — if a type is wrong, fix the model

## Anti-Patterns Quick List

| Anti-Pattern | Solution |
|--------------|----------|
| `any` | `unknown` + narrowing |
| `as SomeType` everywhere | Fix the model; narrow properly |
| `!` non-null assertion | Optional chaining `?.` or guard |
| `interface` for unions | `type` |
| `boolean` flags for exclusive states | Discriminated union |
| Nullable fields for loading/error state | Status discriminated union |
| `object` / `{}` / `Function` types | Specific shapes / callable types |
| Casting API response directly | `unknown` + validation / Zod |
| `Partial<T>` for optional config | Explicit optional fields |
| No `strict` mode | Enable `strict: true` in tsconfig |

## Additional Resources

### Reference Files

- **`references/types.md`** — interface vs type in depth, generics, constraints, utility types, infer
- **`references/narrowing.md`** — typeof, instanceof, in, discriminated unions, type predicates, assertion functions, control flow narrowing
- **`references/advanced_types.md`** — Conditional types, mapped types, template literal types, recursive types, variance
- **`references/patterns.md`** — Branded types, const assertions, satisfies, builder pattern, opaque types, phantom types
- **`references/config.md`** — tsconfig strictness flags, module resolution, paths, project references, declaration files
