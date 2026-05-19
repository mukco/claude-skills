# React State Management Reference

## State Location Decision Tree

```
Who needs this state?
├── Only this component → useState / useReducer in that component
├── This component and direct children → Pass as props
├── Cousins (siblings' children) → Lift to nearest common ancestor
├── Many components, distant in tree → Context or external store
└── Server data (async, cached, paginated) → React Query / SWR / RTK Query
```

---

## Local State

```tsx
// Single value
const [isOpen, setIsOpen] = useState(false)

// Form state — object with functional update
const [form, setForm] = useState({ name: "", email: "", role: "user" })
const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
  setForm(prev => ({ ...prev, [field]: e.target.value }))

// Complex state — useReducer
type CartAction =
  | { type: "add";    item: CartItem }
  | { type: "remove"; id: string }
  | { type: "clear" }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add":    return [...state, action.item]
    case "remove": return state.filter(i => i.id !== action.id)
    case "clear":  return []
  }
}

const [cart, dispatch] = useReducer(cartReducer, [])
```

---

## Lifting State

When siblings need to share state, lift it to the nearest common ancestor.

```tsx
// BEFORE — each child has its own state, they can't coordinate
function FilterPanel() { const [search, setSearch] = useState("") ... }
function ItemList()    { /* can't see FilterPanel's search */ }

// AFTER — parent owns the state, children receive it as props
function ProductPage() {
  const [search, setSearch] = useState("")

  return (
    <>
      <FilterPanel search={search} onSearchChange={setSearch} />
      <ItemList items={filteredItems(search)} />
    </>
  )
}
```

---

## Context API

Use for state that many components at different nesting levels need: theme, auth, locale, feature flags.

**When NOT to use Context**: frequent updates (causes all consumers to re-render), data that only 1-2 components need (just pass props).

```tsx
// Pattern: context + provider + named hook
interface ThemeContextValue {
  theme:     "light" | "dark"
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const toggleTheme = useCallback(() => setTheme(t => t === "light" ? "dark" : "light"), [])

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}

// Usage — clean, no prop drilling
function Button() {
  const { theme } = useTheme()
  return <button className={`btn btn--${theme}`}>Click</button>
}
```

### Splitting Contexts to Prevent Over-rendering

```tsx
// One context for data that changes often → every consumer re-renders
const AppContext = createContext({ user, theme, cart, notifications })

// Split into separate contexts
const UserContext    = createContext<User | null>(null)
const ThemeContext   = createContext<Theme>("light")
const CartContext    = createContext<CartState>({ items: [] })

// Components that use only theme don't re-render when cart changes
```

---

## useReducer for Complex State

```tsx
// Finite state machine pattern
type AuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "error"; error: string }

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; user: User }
  | { type: "LOGIN_FAILURE"; error: string }
  | { type: "LOGOUT" }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":   return { status: "loading" }
    case "LOGIN_SUCCESS": return { status: "authenticated", user: action.user }
    case "LOGIN_FAILURE": return { status: "error", error: action.error }
    case "LOGOUT":        return { status: "idle" }
    default:              return state
  }
}

function useAuth() {
  const [state, dispatch] = useReducer(authReducer, { status: "idle" })

  const login = useCallback(async (credentials: Credentials) => {
    dispatch({ type: "LOGIN_START" })
    try {
      const user = await authService.login(credentials)
      dispatch({ type: "LOGIN_SUCCESS", user })
    } catch (e) {
      dispatch({ type: "LOGIN_FAILURE", error: e.message })
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    dispatch({ type: "LOGOUT" })
  }, [])

  return { state, login, logout }
}
```

---

## External Stores

### Zustand (Lightweight)

```tsx
import { create } from "zustand"

interface CartStore {
  items:  CartItem[]
  add:    (item: CartItem) => void
  remove: (id: string) => void
  clear:  () => void
  total:  () => number
}

const useCart = create<CartStore>((set, get) => ({
  items: [],
  add:    (item) => set(s => ({ items: [...s.items, item] })),
  remove: (id)   => set(s => ({ items: s.items.filter(i => i.id !== id) })),
  clear:  ()     => set({ items: [] }),
  total:  ()     => get().items.reduce((sum, i) => sum + i.price, 0)
}))

// In component
function CartSummary() {
  const { items, total, remove } = useCart()
  return <div>{items.length} items — ${total()}</div>
}
```

### React Query (Server State)

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Fetching
function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn:  () => fetchUser(id),
    staleTime: 5 * 60 * 1000,  // 5 minutes
  })
}

// Mutating + invalidating
function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUser,
    onSuccess:  (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.id] })
    }
  })
}

function UserProfile({ id }: { id: string }) {
  const { data: user, isLoading, error } = useUser(id)
  const { mutate: updateUser } = useUpdateUser()

  if (isLoading) return <Spinner />
  if (error)     return <Error />
  return <div>{user.name}</div>
}
```

---

## Derived State

Always compute derived state during render — never duplicate it in useState.

```tsx
// WRONG — duplicate state, can become inconsistent
const [items, setItems] = useState<Item[]>([])
const [total, setTotal] = useState(0)  // must be kept in sync manually

// RIGHT — derive during render
const [items, setItems] = useState<Item[]>([])
const total = items.reduce((sum, i) => sum + i.price, 0)  // always accurate

// If derivation is expensive — useMemo
const sortedFilteredItems = useMemo(
  () => items.filter(i => i.active).sort((a, b) => a.name.localeCompare(b.name)),
  [items]
)
```

---

## URL as State

For shareable state (filters, pagination, search), use the URL.

```tsx
// URL search params as state — shareable, bookmarkable
function useSearchParams() {
  const [params, setParams] = useSearchParams()

  const query = params.get("q") ?? ""
  const page  = parseInt(params.get("page") ?? "1")

  const setQuery = (q: string) => setParams(p => { p.set("q", q); p.set("page", "1"); return p })
  const setPage  = (n: number) => setParams(p => { p.set("page", String(n)); return p })

  return { query, page, setQuery, setPage }
}
```

---

## Anti-Patterns

| Anti-Pattern | Solution |
|--------------|----------|
| Derived state in useState | Compute during render |
| useEffect to sync state with state | Derive instead |
| One giant context for everything | Split by update frequency |
| All state in one global store | Local state for local concerns |
| Prop drilling 4+ levels | Context or co-location |
| setState(obj) losing fields | Functional update with spread |
