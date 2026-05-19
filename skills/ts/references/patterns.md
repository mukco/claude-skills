# TypeScript Patterns Reference

## Builder Pattern with Type Safety

Track which fields have been set using generics.

```ts
type RequiredFields = { url: string; method: string }

class RequestBuilder<T extends Partial<RequiredFields> = {}> {
  private config: Partial<RequiredFields> & Record<string, unknown> = {}

  url(url: string): RequestBuilder<T & { url: string }> {
    return Object.assign(Object.create(RequestBuilder.prototype), {
      config: { ...this.config, url }
    }) as any
  }

  method(method: string): RequestBuilder<T & { method: string }> {
    return Object.assign(Object.create(RequestBuilder.prototype), {
      config: { ...this.config, method }
    }) as any
  }

  // build() only available when both required fields are set
  build(this: RequestBuilder<RequiredFields>): Request {
    return new Request(this.config.url, { method: this.config.method })
  }
}

const builder = new RequestBuilder()
builder.build()                                 // TypeScript error — url and method missing
builder.url("/api").build()                     // TypeScript error — method missing
builder.url("/api").method("GET").build()       // ✓ — both set
```

---

## Result Type

Explicit error handling without exceptions.

```ts
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E }

function ok<T>(value: T): Result<T>              { return { ok: true, value } }
function err<E = Error>(error: E): Result<never, E> { return { ok: false, error } }

// Use in functions that can fail predictably
async function parseUser(raw: unknown): Promise<Result<User, string>> {
  if (!isUser(raw)) return err("Invalid user data")
  return ok(raw)
}

// Chain results
function mapResult<T, U, E>(result: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

// Usage
const result = await parseUser(data)
if (result.ok) {
  display(result.value)
} else {
  log(result.error)
}
```

---

## Discriminated Union State Machine

Model state transitions as a discriminated union.

```ts
type AsyncState<T, E = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error";   error: E }

// Reducer for the state machine
function asyncReducer<T>(
  state: AsyncState<T>,
  action: { type: "start" } | { type: "success"; data: T } | { type: "error"; error: string }
): AsyncState<T> {
  switch (action.type) {
    case "start":   return { status: "loading" }
    case "success": return { status: "success", data: action.data }
    case "error":   return { status: "error", error: action.error }
  }
}

// Render switch — exhaustive
function renderState<T>(state: AsyncState<T>, render: (data: T) => ReactNode): ReactNode {
  switch (state.status) {
    case "idle":    return null
    case "loading": return <Spinner />
    case "error":   return <ErrorMessage message={state.error} />
    case "success": return render(state.data)
    default:        return state satisfies never
  }
}
```

---

## Readonly Patterns

Enforce immutability at the type level.

```ts
// Readonly interface
interface Config {
  readonly apiUrl:  string
  readonly timeout: number
  readonly retries: number
}

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

type ImmutableState = DeepReadonly<AppState>

// Readonly arrays — prevent push/pop/splice
function processItems(items: ReadonlyArray<Item>) {
  items.push(newItem)   // TypeScript error — ReadonlyArray has no push
  items[0] = newItem    // TypeScript error — index access is readonly
  return [...items, newItem]  // ✓ — spread creates new array
}

// const assertion — deepest immutability
const routes = ["/", "/about", "/contact"] as const
// type: readonly ["/", "/about", "/contact"]
// routes.push("/new")  // TypeScript error

type Route = typeof routes[number]  // "/" | "/about" | "/contact"
```

---

## Dependency Injection with Interfaces

```ts
// Define interfaces for dependencies
interface Logger {
  info(msg: string): void
  error(msg: string, err?: Error): void
}

interface Cache {
  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttl?: number): void
}

interface Database {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
}

// Service depends on interfaces, not implementations
class UserService {
  constructor(
    private readonly db:     Database,
    private readonly cache:  Cache,
    private readonly logger: Logger
  ) {}

  async findById(id: string): Promise<User | null> {
    const cached = this.cache.get<User>(`user:${id}`)
    if (cached) return cached

    this.logger.info(`Fetching user ${id} from DB`)
    const [user] = await this.db.query<User>("SELECT * FROM users WHERE id = $1", [id])
    if (user) this.cache.set(`user:${id}`, user, 300)
    return user ?? null
  }
}

// Wire real implementations in production
const service = new UserService(postgresDb, redisCache, consoleLogger)

// Wire test doubles in tests
const service = new UserService(mockDb, nullCache, nullLogger)
```

---

## Mapped Type Utilities

Useful type utilities beyond the built-in set.

```ts
// Deep partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

// Require specific keys
type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>
// RequireKeys<User, "email"> — makes email required, rest optional

// Make some keys optional
type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
// PartialKeys<User, "role" | "avatar"> — makes those fields optional

// Non-nullable specific keys
type NonNullableKeys<T, K extends keyof T> = T & {
  [P in K]-?: NonNullable<T[P]>
}

// Flatten intersection types for readability
type Flatten<T> = { [K in keyof T]: T[K] }
type MergedUser = Flatten<User & { extra: string }>
// Shows all properties in one object type instead of an intersection
```

---

## Type-Safe Event System

```ts
interface EventMap {
  "user:login":  { userId: string; timestamp: Date }
  "user:logout": { userId: string }
  "order:placed": { orderId: string; total: number }
}

class TypedEventEmitter {
  private handlers = new Map<keyof EventMap, Set<Function>>()

  on<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void
  ): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.handlers.get(event)?.forEach(h => h(payload))
  }
}

const emitter = new TypedEventEmitter()

emitter.on("user:login", ({ userId, timestamp }) => {
  // userId: string, timestamp: Date — fully typed!
  console.log(`${userId} logged in at ${timestamp.toISOString()}`)
})

emitter.emit("user:login", { userId: "u_1", timestamp: new Date() })  // ✓
emitter.emit("user:login", { userId: "u_1" })  // ✗ — missing timestamp
emitter.emit("unknown:event", {})              // ✗ — not in EventMap
```

---

## Conditional Types for Type Utilities

```ts
// Check if type is never
type IsNever<T> = [T] extends [never] ? true : false

// Check if two types are equal
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
  ? true
  : false

// Check if type is a union
type IsUnion<T, U = T> = [T] extends [never]
  ? false
  : T extends any
  ? [U] extends [T]
    ? false
    : true
  : false

// Flatten nested arrays
type FlatArray<T> = T extends ReadonlyArray<infer U>
  ? FlatArray<U>
  : T

type Flat = FlatArray<string[][]>  // string
```

---

## tsconfig Strict Mode Reference

```json
{
  "compilerOptions": {
    "strict": true,                        // enables all strict flags

    // Individual strict flags (included in strict: true)
    "strictNullChecks": true,              // null/undefined must be handled explicitly
    "strictFunctionTypes": true,           // function parameter types are checked contravariantly
    "strictPropertyInitialization": true,  // class properties must be initialized in constructor
    "noImplicitAny": true,                 // implicit any is an error
    "noImplicitThis": true,                // this must be typed

    // Additional recommended flags
    "noUncheckedIndexedAccess": true,      // arr[i] returns T | undefined
    "exactOptionalPropertyTypes": true,    // distinguishes absent from undefined
    "noImplicitReturns": true,             // all code paths must return
    "noFallthroughCasesInSwitch": true,    // switch cases must break/return
    "noUnusedLocals": true,                // unused variables are errors
    "noUnusedParameters": true,            // unused parameters are errors
    "forceConsistentCasingInFileNames": true
  }
}
```
