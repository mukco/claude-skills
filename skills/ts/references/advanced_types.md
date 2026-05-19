# TypeScript Advanced Types Reference

## Conditional Types

```ts
// Basic conditional
type IsString<T> = T extends string ? true : false
type A = IsString<string>  // true
type B = IsString<number>  // false

// Distributive over union — each union member is checked separately
type IsString<T> = T extends string ? "yes" : "no"
type C = IsString<string | number>  // "yes" | "no"

// Prevent distribution with tuple wrapping
type IsStringExact<T> = [T] extends [string] ? "yes" : "no"
type D = IsStringExact<string | number>  // "no"

// Practical: filter a union
type StringsOnly<T> = T extends string ? T : never
type E = StringsOnly<"a" | 1 | "b" | true>  // "a" | "b"

type NumbersOnly<T> = T extends number ? T : never
type F = NumbersOnly<"a" | 1 | 2 | true>  // 1 | 2
```

### infer with Conditional Types

```ts
// Unwrap Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T  // recursive for nested

// First element of tuple
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never
type G = Head<[string, number, boolean]>  // string

// Tail of tuple
type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never
type H = Tail<[string, number, boolean]>  // [number, boolean]

// Function parameters and return
type Params<T> = T extends (...args: infer P) => any ? P : never
type Return<T> = T extends (...args: any[]) => infer R ? R : never

// Extract constructor instance type
type Instance<T> = T extends new (...args: any[]) => infer I ? I : never
```

---

## Mapped Types

Transform all properties of a type.

```ts
// Basic mapped type
type Readonly<T> = { readonly [K in keyof T]: T[K] }
type Partial<T>  = { [K in keyof T]?: T[K] }
type Required<T> = { [K in keyof T]-?: T[K] }  // -? removes optional

// Value transformation
type Stringify<T>    = { [K in keyof T]: string }
type Promisify<T>    = { [K in keyof T]: Promise<T[K]> }
type Nullable<T>     = { [K in keyof T]: T[K] | null }
type Mutable<T>      = { -readonly [K in keyof T]: T[K] }  // remove readonly

// Key remapping with as
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
// Getters<{ name: string; age: number }>
// => { getName: () => string; getAge: () => number }

// Filter keys by value type
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}
// PickByValue<{ a: string; b: number; c: string }, string>
// => { a: string; c: string }

// Optional getters — remove undefined from values
type DefinedGetters<T> = {
  [K in keyof T as NonNullable<T[K]> extends T[K] ? K : never]: T[K]
}
```

---

## Template Literal Types

Construct string literal types at the type level.

```ts
// Basic
type Greeting = `Hello, ${string}!`  // any string matching the pattern
const g: Greeting = "Hello, world!"   // ✓
const b: Greeting = "Goodbye"         // ✗

// With union — distributes over each member
type EventName = "click" | "focus" | "blur"
type HandlerName = `on${Capitalize<EventName>}`
// => "onClick" | "onFocus" | "onBlur"

// CSS generation
type Side = "top" | "right" | "bottom" | "left"
type Spacing = "margin" | "padding"
type SpacingProp = `${Spacing}-${Side}`
// => "margin-top" | "margin-right" | ... | "padding-left"

// Route typing
type Route = "/users" | "/users/:id" | "/posts" | "/posts/:id"
type ExtractParam<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParam<Rest>
    : T extends `${string}:${infer Param}`
    ? Param
    : never

type UserIdParam = ExtractParam<"/users/:id">           // "id"
type PostParams  = ExtractParam<"/users/:userId/posts/:postId">  // "userId" | "postId"

// String manipulation types
Uppercase<"hello">       // "HELLO"
Lowercase<"HELLO">       // "hello"
Capitalize<"hello">      // "Hello"
Uncapitalize<"Hello">    // "hello"
```

---

## Recursive Types

```ts
// JSON
type Json =
  | string | number | boolean | null
  | Json[]
  | { [key: string]: Json }

// Deep operations
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

// Path extraction — all dot-separated paths in an object
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], `${P}${P extends "" ? "" : "."}${K}`>
    : `${P}${P extends "" ? "" : "."}${K}`
}[keyof T & string]

// Paths<{ a: { b: string }; c: number }>  => "a.b" | "c"
```

---

## Variance Annotations (TypeScript 4.7+)

Explicitly annotate type parameter variance for better performance and clarity.

```ts
// out — covariant (T appears only in output positions)
interface Provider<out T> {
  get(): T
}

// in — contravariant (T appears only in input positions)
interface Consumer<in T> {
  set(value: T): void
}

// Both — invariant (T appears in both)
interface Transformer<in In, out Out> {
  transform(input: In): Out
}
```

---

## Opaque / Branded Types

Prevent mixing structurally compatible but semantically different values.

```ts
// Branded type pattern
declare const __brand: unique symbol
type Brand<T, B extends string> = T & { readonly [__brand]: B }

type UserId   = Brand<string, "UserId">
type OrderId  = Brand<string, "OrderId">
type EmailAddress = Brand<string, "EmailAddress">

// Constructor functions — only way to create the branded type
const UserId       = (raw: string): UserId       => raw as UserId
const OrderId      = (raw: string): OrderId      => raw as OrderId
const EmailAddress = (raw: string): EmailAddress => {
  if (!raw.includes("@")) throw new TypeError(`Invalid email: ${raw}`)
  return raw as EmailAddress
}

function getUser(id: UserId): User { ... }

const uid = UserId("u_123")
const oid = OrderId("o_456")

getUser(uid)  // ✓
getUser(oid)  // ✗ TypeScript error: OrderId is not UserId
getUser("u_123" as UserId)  // ✓ but you lose the guarantee
```

---

## Phantom Types

Add type information that doesn't exist at runtime.

```ts
// State machine with phantom types
type StateMachine<State extends string> = { readonly _state: State }

type Draft    = StateMachine<"draft">
type Review   = StateMachine<"review">
type Published = StateMachine<"published">

function createDraft(): Draft { return { _state: "draft" } }
function submitForReview(draft: Draft): Review { return { _state: "review" } }
function publish(review: Review): Published { return { _state: "published" } }

// Can't publish a draft directly — type system enforces the workflow
const draft = createDraft()
publish(draft)  // TypeScript error — Draft is not Review
```

---

## Satisfies Operator

Validate that a value matches a type without widening it.

```ts
type Palette = Record<string, [number, number, number] | string>

// Without satisfies — type is Palette, loses literal key info
const palette: Palette = {
  red:   [255, 0, 0],
  green: "#00ff00"
}
palette.red    // type: [number, number, number] | string
palette.mauve  // type: string (no error!)

// With satisfies — validates AND preserves specific types
const palette = {
  red:   [255, 0, 0],
  green: "#00ff00"
} satisfies Palette

palette.red    // type: [number, number, number] ✓
palette.green  // type: string ✓
palette.mauve  // TypeScript error ✓

// Great for config objects
const routes = {
  home:     "/",
  about:    "/about",
  users:    "/users",
  userById: "/users/:id"
} satisfies Record<string, `/${string}`>
```
