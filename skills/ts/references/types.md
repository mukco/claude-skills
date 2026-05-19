# TypeScript Types Reference

## interface vs type

```ts
// interface — extendable, declaration-mergeable, for object shapes
interface User {
  id:    number
  name:  string
  email: string
}

interface AdminUser extends User {
  permissions: string[]
  superAdmin:  boolean
}

// Declaration merging — useful for augmenting library types
interface Window {
  analytics: AnalyticsInstance  // adds to the global Window type
}

// type — for unions, intersections, aliases, computed types
type Status    = "pending" | "active" | "archived"
type ID        = string | number
type Nullable<T> = T | null
type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date }

// Rule of thumb
// interface → public object shapes that will be extended or merged
// type      → everything else
```

---

## Utility Types

### Structural Transformations

```ts
interface User { id: number; name: string; email: string; role: string }

Partial<User>                  // all props optional
Required<User>                 // all props required (removes ?)
Readonly<User>                 // all props readonly

// Picking and omitting
Pick<User, "id" | "name">      // { id: number; name: string }
Omit<User, "role">             // { id: number; name: string; email: string }

// Key/value mapping
Record<string, number>          // { [key: string]: number }
Record<"small" | "medium" | "large", number>  // exact keys
```

### Function Types

```ts
function fetchUser(id: number, options?: RequestInit): Promise<User> { ... }

Parameters<typeof fetchUser>                 // [id: number, options?: RequestInit]
ReturnType<typeof fetchUser>                 // Promise<User>
Awaited<ReturnType<typeof fetchUser>>        // User

// Constructor
class Service { constructor(url: string, timeout: number) {} }
ConstructorParameters<typeof Service>        // [url: string, timeout: number]
InstanceType<typeof Service>                 // Service
```

### Nullability

```ts
type MaybeString = string | null | undefined

NonNullable<MaybeString>    // string
NonNullable<string | null>  // string
```

### Union Manipulation

```ts
type Role = "admin" | "editor" | "viewer" | "guest"

Extract<Role, "admin" | "viewer">   // "admin" | "viewer"
Exclude<Role, "admin" | "viewer">   // "editor" | "guest"
```

---

## Generics

### Constrained Type Parameters

```ts
// Constraint — T must have these properties
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// Multiple constraints
function merge<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b }
}

// Constraint to a specific shape
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id)
}
```

### Default Type Parameters

```ts
interface ApiResponse<T = unknown> {
  data:    T
  status:  number
  message: string
}

// Without explicit type — T defaults to unknown
const response: ApiResponse = { data: null, status: 200, message: "ok" }

// With explicit type
const userResponse: ApiResponse<User> = { data: user, status: 200, message: "ok" }
```

### Generic Classes

```ts
class Repository<T extends { id: string }> {
  private items: T[] = []

  add(item: T): void           { this.items.push(item) }
  findById(id: string): T | undefined { return this.items.find(i => i.id === id) }
  getAll(): T[]                { return [...this.items] }
  remove(id: string): boolean  {
    const i = this.items.findIndex(i => i.id === id)
    if (i < 0) return false
    this.items.splice(i, 1)
    return true
  }
}

const users  = new Repository<User>()
const orders = new Repository<Order>()
```

### infer — Extract Types

```ts
// Extract the type from a Promise
type Awaited<T> = T extends Promise<infer U> ? U : T
type A = Awaited<Promise<string>>  // string
type B = Awaited<number>           // number

// Extract array element type
type ElementOf<T> = T extends (infer U)[] ? U : never
type C = ElementOf<string[]>   // string
type D = ElementOf<number[]>   // number

// Extract function return type
type Return<T> = T extends (...args: any[]) => infer R ? R : never
type E = Return<() => string>  // string

// Extract first argument
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never
type F = FirstArg<(n: number, s: string) => void>  // number
```

---

## TypedDict — TypedDict Equivalents

TypeScript has several constructs that serve the same role as Python's `TypedDict`:

```ts
// Interface — the most common
interface UserDTO {
  id:    number
  name:  string
  email: string
}

// With optional fields
interface UpdateUserDTO {
  name?:  string
  email?: string
  role?:  string
}

// Strict optional — only when field is explicitly passed (requires exactOptionalPropertyTypes)
interface PatchDTO {
  name?:  string
  email?: string
}
// With exactOptionalPropertyTypes: { name: "Alice" } and {} are valid, { name: undefined } is not
```

---

## Indexed Access Types

Access a property type from another type.

```ts
interface User {
  id:      number
  name:    string
  address: { city: string; country: string }
  tags:    string[]
}

type UserId      = User["id"]            // number
type UserName    = User["name"]          // string
type UserAddress = User["address"]       // { city: string; country: string }
type UserCity    = User["address"]["city"] // string
type TagItem     = User["tags"][number]  // string — element type

// Combine with keyof
type UserKeys    = keyof User            // "id" | "name" | "address" | "tags"
type UserValues  = User[keyof User]      // number | string | { city: string; country: string } | string[]
```

---

## Recursive Types

```ts
// JSON type
type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json }

// Tree structure
interface TreeNode<T> {
  value:    T
  children: TreeNode<T>[]
}

// Deep partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
```

---

## Variance

TypeScript uses structural typing with covariance for most positions.

```ts
// Covariance — subtypes flow in the same direction as the generic
// Array<Dog> is assignable to Array<Animal> if Dog extends Animal

// Contravariance — function parameters are contravariant
// (fn: (a: Animal) => void) is assignable to (fn: (d: Dog) => void)

// in/out markers (TypeScript 4.7+)
interface Producer<out T> { get(): T }    // covariant — T only in output
interface Consumer<in T>  { set(v: T): void }  // contravariant — T only in input
```

---

## Best Practices

- Prefer `interface` for object shapes that will be extended or that library consumers will augment
- Prefer `type` for unions, intersections, utility-derived types, and aliases
- Use `unknown` instead of `any` for values whose type you don't know yet
- Enable `strictNullChecks` — it catches an entire class of null-related bugs
- Use `noUncheckedIndexedAccess` — array index access returns `T | undefined`, preventing crashes
- Use `exactOptionalPropertyTypes` — distinguishes `{ name: undefined }` from `{}`
- Prefer `Readonly<T>` or `readonly` properties for values that shouldn't be mutated
- Derive types from sources of truth with `typeof`, `ReturnType`, `Parameters` — don't duplicate
