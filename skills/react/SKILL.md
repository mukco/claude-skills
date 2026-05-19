---
name: react
description: "React component patterns, hooks (useState, useEffect, useCallback, useMemo, custom hooks), state management, performance (memo, lazy, Suspense), composition patterns, and controlled/uncontrolled components."
---

# React Patterns

Comprehensive guidance for idiomatic React. Covers functional components, the full hooks API, composition patterns, state management strategies, and performance optimization. Class components are legacy — not covered here.

## Quick Reference

### Component Anatomy

```tsx
// Standard functional component
interface Props {
  title: string
  onClose: () => void
  children?: React.ReactNode
}

function Modal({ title, onClose, children }: Props) {
  // Hooks at the top, unconditionally
  const [isAnimating, setIsAnimating] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Effects after state/refs
  useEffect(() => {
    setIsAnimating(true)
    return () => setIsAnimating(false)  // cleanup
  }, [])

  // Handlers — useCallback when passed to memoized children
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }, [onClose])

  // Derived state — compute from existing state, no extra useState
  const animationClass = isAnimating ? "modal--open" : "modal--closed"

  return (
    <div ref={modalRef} className={animationClass}>
      <h2>{title}</h2>
      <button onClick={onClose}>×</button>
      {children}
    </div>
  )
}
```

### Hooks Quick Reference

```tsx
// State
const [value, setValue] = useState<string>("")
const [state, dispatch] = useReducer(reducer, initialState)

// Refs — mutable value, DOM node, or previous value
const inputRef  = useRef<HTMLInputElement>(null)
const prevCount = useRef(count)

// Effects
useEffect(() => { /* on mount or deps change */ return () => { /* cleanup */ } }, [deps])
useLayoutEffect(() => { /* synchronous, before paint */ }, [deps])

// Memoization
const expensive   = useMemo(() => compute(a, b), [a, b])
const stableHandler = useCallback(() => doSomething(id), [id])

// Context
const theme = useContext(ThemeContext)

// Imperative handle (expose methods to parent via ref)
useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), [])

// Sync external store (preferred over useEffect for subscriptions)
const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

// Transition (non-urgent updates)
const [isPending, startTransition] = useTransition()
startTransition(() => setSearchQuery(value))

// Deferred value (low-priority re-render)
const deferredQuery = useDeferredValue(query)
```

### State Decision Tree

```
Where does this state live?
├── Only one component needs it → useState in that component
├── Parent + children need it → Lift to nearest common ancestor
├── Many distant components need it → Context or external store
└── Server state (async, cached) → React Query / SWR / RTK Query

Is this state derived from other state?
├── Yes → Compute it during render (no useState!)
└── No → useState or useReducer

Is state complex / multiple related fields / has transitions?
├── Yes → useReducer
└── No → useState
```

## Hooks

### useState Rules

```tsx
// WRONG — derived state — always stale or requires extra sync
const [fullName, setFullName] = useState(`${firstName} ${lastName}`)

// RIGHT — compute during render
const fullName = `${firstName} ${lastName}`

// WRONG — object spread to update one field (lose other fields)
setState({ name: "Alice" })

// RIGHT — functional update for dependent changes
setState(prev => ({ ...prev, name: "Alice" }))

// WRONG — setState in render
if (someCondition) setState(x)  // infinite loop

// RIGHT — setState only in effects or handlers
```

### useEffect Rules

```tsx
// WRONG — missing dependency
useEffect(() => {
  fetchData(userId)  // userId not in deps array
}, [])              // stale closure — never re-runs when userId changes

// RIGHT
useEffect(() => {
  fetchData(userId)
}, [userId])

// WRONG — no cleanup for subscriptions
useEffect(() => {
  const sub = store.subscribe(handler)
  // memory leak — sub never cleaned up
}, [])

// RIGHT — always return cleanup
useEffect(() => {
  const sub = store.subscribe(handler)
  return () => sub.unsubscribe()
}, [handler])

// WRONG — async function directly in useEffect
useEffect(async () => {   // returns Promise, React ignores it
  const data = await fetch(url)
}, [url])

// RIGHT — async inside
useEffect(() => {
  let cancelled = false
  async function load() {
    const data = await fetch(url)
    if (!cancelled) setData(data)
  }
  load()
  return () => { cancelled = true }
}, [url])
```

### Custom Hooks

Extract stateful logic into custom hooks when:
- The same stateful pattern appears in 2+ components
- A component's logic is getting complex and named extraction helps
- Side-effectful logic deserves isolation and testing

```tsx
// Custom hook — extracts fetch + loading + error pattern
function useUser(id: string) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchUser(id)
      .then(u  => { if (!cancelled) { setUser(u); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e); setLoading(false) } })
    return () => { cancelled = true }
  }, [id])

  return { user, loading, error }
}

// Usage — clean component, no fetch logic visible
function UserProfile({ id }: { id: string }) {
  const { user, loading, error } = useUser(id)
  if (loading) return <Spinner />
  if (error)   return <Error message={error.message} />
  return <div>{user?.name}</div>
}
```

## Component Patterns

### Controlled vs Uncontrolled

```tsx
// Controlled — React owns the value
function ControlledInput() {
  const [value, setValue] = useState("")
  return <input value={value} onChange={e => setValue(e.target.value)} />
}

// Uncontrolled — DOM owns the value, ref to read it
function UncontrolledForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleSubmit = () => console.log(inputRef.current?.value)
  return <input ref={inputRef} defaultValue="" />
}

// Use controlled when: validation, formatting, conditional enabling
// Use uncontrolled when: file inputs, performance-critical forms, integrating with non-React
```

### Compound Components

Build components that share implicit state through Context — the API feels like HTML.

```tsx
interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
}
const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("Must be used inside <Tabs>")
  return ctx
}

function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabs()
  return (
    <button
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  )
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab } = useTabs()
  return activeTab === id ? <div role="tabpanel">{children}</div> : null
}

// Usage — clean, composable API
<Tabs defaultTab="overview">
  <Tab id="overview">Overview</Tab>
  <Tab id="details">Details</Tab>
  <TabPanel id="overview"><Overview /></TabPanel>
  <TabPanel id="details"><Details /></TabPanel>
</Tabs>
```

### Provider Pattern

Wrap context + state into a self-contained provider with a companion hook.

```tsx
interface AuthContextValue {
  user: User | null
  login:  (credentials: Credentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (credentials: Credentials) => {
    const u = await authService.login(credentials)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Named hook — throws if used outside provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
```

## Performance

### Memoization Decision Tree

```
Is a component re-rendering unnecessarily?
├── Profile first — don't optimize speculatively
└── Yes, confirmed expensive re-render
    └── Does the component receive stable props?
        ├── Yes → React.memo(Component)
        └── No — parent creates new functions/objects on every render
            ├── Functions passed as props → useCallback in parent
            └── Objects/arrays passed as props → useMemo in parent

Is a computation expensive?
├── No (< 1ms) → Don't useMemo — overhead isn't worth it
└── Yes, confirmed slow → useMemo with correct deps
```

```tsx
// React.memo — skip re-render when props haven't changed
const ExpensiveList = React.memo(function ExpensiveList({ items }: { items: Item[] }) {
  return <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>
})

// useCallback — stable function reference for memoized children
function Parent({ id }: { id: string }) {
  const handleClick = useCallback((itemId: string) => {
    updateItem(id, itemId)
  }, [id])  // only recreates when id changes

  return <ExpensiveList items={items} onItemClick={handleClick} />
}

// useMemo — expensive computation
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.priority - b.priority),
  [items]
)
```

### Code Splitting

```tsx
// Lazy load heavy routes or components
const Dashboard = lazy(() => import("./Dashboard"))
const Settings  = lazy(() => import("./Settings"))

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
      </Routes>
    </Suspense>
  )
}
```

## Best Practices

### Do

- Keep components small and focused — one reason to change
- Derive state from existing state during render rather than syncing with `useEffect`
- Use `key` correctly — stable, unique id, not array index for dynamic lists
- Use TypeScript interfaces for all props
- Co-locate state as close as possible to where it's used
- Use `useReducer` for complex state with multiple sub-values or transitions
- Always provide an `aria-*` attribute when a visual cue replaces semantic HTML
- Wrap Context + hooks in a provider module — never use raw `useContext` in leaf components
- Test behavior, not implementation — fire events, assert DOM state

### Don't

- Don't sync state with `useEffect` — compute it during render
- Don't use array index as `key` for lists that reorder or add/remove items
- Don't call hooks conditionally or inside loops
- Don't pass down more props than a component needs (prop drilling signal — use context)
- Don't use `useEffect` for event handlers — wire them directly
- Don't reach for `useRef` for state that should trigger re-renders
- Don't memoize everything — profile first, then optimize
- Don't put business logic in components — extract to custom hooks or services

## Anti-Patterns Quick List

| Anti-Pattern | Solution |
|--------------|----------|
| `useEffect` to sync derived state | Compute during render |
| Index as list `key` | Stable unique id |
| Prop drilling 3+ levels | Context + provider hook |
| Business logic in component body | Custom hook or service |
| `useState` for each form field | Single object state or form library |
| `useCallback` / `useMemo` everywhere | Profile first — add only where needed |
| Inline object/array props | Define outside render or useMemo |
| `useEffect` with no cleanup for subscriptions | Always return cleanup fn |
| Multiple unrelated `useEffect`s | Split into custom hooks |
| Async directly in `useEffect` | Inner async function + cancellation flag |

## Additional Resources

### Reference Files

- **`references/hooks.md`** — Complete hooks API: useState, useEffect, useReducer, useRef, useCallback, useMemo, useContext, useTransition, useDeferredValue, useSyncExternalStore, useImperativeHandle
- **`references/components.md`** — Controlled/uncontrolled, compound components, render props, HOC (legacy), forwardRef, ErrorBoundary
- **`references/state.md`** — Local state, lifting state, Context API, useReducer patterns, external stores (Zustand, Redux Toolkit)
- **`references/performance.md`** — React.memo, useCallback, useMemo, profiler, lazy/Suspense, transitions, deferred values, key prop
- **`references/patterns.md`** — Provider pattern, composition, polymorphic components, headless components, portals, controlled abstractions
