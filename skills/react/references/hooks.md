# React Hooks Reference

## Rules of Hooks

1. Only call hooks at the top level — never inside conditions, loops, or nested functions
2. Only call hooks from React functions (components or custom hooks)
3. Custom hooks must start with `use`

---

## useState

```tsx
// Basic
const [count, setCount] = useState(0)
const [text,  setText]  = useState<string>("")
const [user,  setUser]  = useState<User | null>(null)

// Lazy initialization — fn runs only on first render
const [data, setData] = useState(() => parseLocalStorage())

// Functional update — use when new state depends on previous
setCount(prev => prev + 1)   // safe in async contexts
setCount(prev => prev - 1)

// Object state — always spread, never mutate
const [form, setForm] = useState({ name: "", email: "" })
setForm(prev => ({ ...prev, name: "Alice" }))  // update one field

// State resets when key changes — useful for resetting forms
<Form key={userId} />
```

### When NOT to Use useState

```tsx
// WRONG — derived state out of sync
const [fullName, setFullName] = useState(`${firstName} ${lastName}`)
// fullName becomes stale when firstName or lastName changes

// RIGHT — compute during render
const fullName = `${firstName} ${lastName}`

// WRONG — redundant state for loading from props
const [name, setName] = useState(props.name)  // out of sync when prop changes

// RIGHT — if you need local editing, reset with useEffect or key prop
```

---

## useReducer

Prefer over multiple related `useState` calls, or when next state depends on the action type.

```tsx
type State = { count: number; loading: boolean; error: string | null }
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset"; payload: number }
  | { type: "setLoading"; payload: boolean }
  | { type: "setError"; payload: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment":   return { ...state, count: state.count + 1 }
    case "decrement":   return { ...state, count: state.count - 1 }
    case "reset":       return { ...state, count: action.payload }
    case "setLoading":  return { ...state, loading: action.payload }
    case "setError":    return { ...state, error: action.payload, loading: false }
    default:            return state
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, loading: false, error: null })

dispatch({ type: "increment" })
dispatch({ type: "reset", payload: 10 })
```

---

## useEffect

```tsx
// Mount only — empty deps array
useEffect(() => {
  analytics.pageView(path)
}, [])

// On specific dep changes
useEffect(() => {
  document.title = `${count} items`
}, [count])

// Always provide cleanup for subscriptions and timers
useEffect(() => {
  const handler = () => setWindowWidth(window.innerWidth)
  window.addEventListener("resize", handler)
  return () => window.removeEventListener("resize", handler)
}, [])

// Async pattern — inner function + cancellation
useEffect(() => {
  let cancelled = false

  async function loadData() {
    try {
      setLoading(true)
      const result = await fetchData(id)
      if (!cancelled) setData(result)
    } catch (err) {
      if (!cancelled) setError(err)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  loadData()
  return () => { cancelled = true }
}, [id])

// AbortController for fetch cancellation
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(e => { if (e.name !== "AbortError") setError(e) })
  return () => controller.abort()
}, [url])
```

---

## useLayoutEffect

Fires synchronously after DOM mutations but before the browser paints. Use for:
- Reading DOM layout (element size, position)
- Making DOM changes that must be reflected before paint

```tsx
useLayoutEffect(() => {
  // Measure DOM before paint
  const { width, height } = ref.current.getBoundingClientRect()
  setDimensions({ width, height })
}, [])
```

---

## useRef

Three uses: DOM nodes, mutable values that don't trigger re-renders, previous value tracking.

```tsx
// 1. DOM node reference
const inputRef = useRef<HTMLInputElement>(null)
useEffect(() => { inputRef.current?.focus() }, [])
return <input ref={inputRef} />

// 2. Mutable value — doesn't trigger re-render when changed
const renderCount = useRef(0)
renderCount.current++  // increment on every render — no re-render triggered

const isFirstRender = useRef(true)
useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return }
  doSomething()
})

// 3. Previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => { ref.current = value })
  return ref.current
}

const prevCount = usePrevious(count)
```

---

## useMemo and useCallback

Only optimize when you've measured. Don't add these speculatively.

```tsx
// useMemo — cache expensive computation
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.priority - b.priority),
  [items]  // recomputes only when items changes
)

// useCallback — stable function reference for memoized children
const handleSubmit = useCallback(
  (data: FormData) => {
    dispatch(submitForm(data, userId))
  },
  [dispatch, userId]  // recreates only when these change
)

// Without useCallback, MemoizedChild re-renders every time Parent re-renders
// because handleSubmit is a new function reference each time
<MemoizedChild onSubmit={handleSubmit} />
```

---

## useContext

```tsx
// Define context with a default
const ThemeContext = createContext<Theme>("light")

// Provide
function App() {
  const [theme, setTheme] = useState<Theme>("light")
  return (
    <ThemeContext.Provider value={theme}>
      <Router />
    </ThemeContext.Provider>
  )
}

// Consume — wrap in custom hook to validate usage
function useTheme() {
  const ctx = useContext(ThemeContext)
  if (ctx === undefined) throw new Error("useTheme must be inside ThemeProvider")
  return ctx
}
```

---

## useTransition and useDeferredValue

Mark state updates as non-urgent to keep the UI responsive during expensive renders.

```tsx
// useTransition — wrap the state update
const [isPending, startTransition] = useTransition()

function handleSearch(query: string) {
  setInputValue(query)  // urgent — update input immediately
  startTransition(() => {
    setSearchQuery(query)  // non-urgent — defer the expensive filter
  })
}

// useDeferredValue — defer re-rendering with a new value
const deferredQuery = useDeferredValue(searchQuery)
// deferredQuery lags behind searchQuery — renders with old value while new value processes
const results = useMemo(() => filterItems(items, deferredQuery), [items, deferredQuery])
```

---

## useSyncExternalStore

Subscribe to external stores (Redux, Zustand, browser APIs) in a concurrent-safe way.

```tsx
function useWindowWidth() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback)
      return () => window.removeEventListener("resize", callback)
    },
    () => window.innerWidth,        // getSnapshot — must be pure, return same ref if unchanged
    () => 1024                      // getServerSnapshot — for SSR
  )
}
```

---

## useImperativeHandle + forwardRef

Expose a limited imperative API from a component to its parent's ref.

```tsx
interface InputHandle {
  focus: () => void
  clear: () => void
}

const FancyInput = forwardRef<InputHandle, InputProps>(
  function FancyInput({ className, ...props }, ref) {
    const innerRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => innerRef.current?.focus(),
      clear: () => { if (innerRef.current) innerRef.current.value = "" }
    }), [])

    return <input ref={innerRef} className={`fancy ${className}`} {...props} />
  }
)

// Parent
const inputRef = useRef<InputHandle>(null)
<FancyInput ref={inputRef} />
<button onClick={() => inputRef.current?.focus()}>Focus</button>
```

---

## Custom Hook Patterns

```tsx
// useLocalStorage — persistent state
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? initialValue }
    catch { return initialValue }
  })

  const setAndPersist = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof newValue === "function" ? (newValue as Function)(prev) : newValue
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])

  return [value, setAndPersist] as const
}

// useDebounce — debounce a value
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// useEventListener — type-safe event binding
function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
) {
  const handlerRef = useRef(handler)
  useLayoutEffect(() => { handlerRef.current = handler })

  useEffect(() => {
    const fn = (e: WindowEventMap[K]) => handlerRef.current(e)
    window.addEventListener(type, fn, options)
    return () => window.removeEventListener(type, fn, options)
  }, [type])
}
```
