# React Performance Reference

## Profiling First

Never optimize speculatively. Profile first.

1. Open React DevTools Profiler
2. Record an interaction
3. Find components with long render times (flame graph)
4. Optimize the specific bottleneck — not the whole tree

```tsx
// Built-in profiling
import { Profiler } from "react"

<Profiler
  id="ItemList"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} (${phase}): ${actualDuration.toFixed(1)}ms`)
  }}
>
  <ItemList items={items} />
</Profiler>
```

---

## React.memo

Skip re-rendering when props haven't changed (shallow comparison).

```tsx
// Opt-in — wrap in React.memo
const ItemRow = React.memo(function ItemRow({ item, onSelect }: ItemRowProps) {
  return (
    <tr onClick={() => onSelect(item.id)}>
      <td>{item.name}</td>
      <td>{item.price}</td>
    </tr>
  )
})

// Custom comparison — for expensive prop comparison or partial equality
const ItemRow = React.memo(function ItemRow(props: ItemRowProps) {
  return <tr>...</tr>
}, (prev, next) => prev.item.id === next.item.id && prev.item.price === next.item.price)

// React.memo is only effective if:
// 1. The component renders often
// 2. With the same props
// 3. The render is expensive
// Otherwise the comparison overhead isn't worth it
```

### Stable Props Are Required

React.memo is useless if parent creates new references on every render.

```tsx
// PROBLEM — new function reference every render, memo is bypassed
function Parent() {
  const items = useMemo(() => computeItems(), [])

  // New function on every render!
  return <MemoizedList items={items} onSelect={(id) => select(id)} />
}

// FIX — stable reference with useCallback
function Parent() {
  const items    = useMemo(() => computeItems(), [])
  const onSelect = useCallback((id: string) => select(id), [])

  return <MemoizedList items={items} onSelect={onSelect} />
}
```

---

## useCallback

Stabilize function references to prevent memo bypass and avoid effect re-runs.

```tsx
// Only wrap when:
// 1. Passed to a React.memo component as a prop
// 2. Used in useEffect deps to prevent unwanted re-runs
// 3. Returned from a custom hook

function SearchPage() {
  const [query, setQuery] = useState("")

  // Without useCallback — new fn every render → SearchResults always re-renders
  const handleResultClick = useCallback((id: string) => {
    router.push(`/items/${id}`)
  }, [router])  // stable — only recreates when router changes

  return <MemoizedSearchResults query={query} onResultClick={handleResultClick} />
}
```

---

## useMemo

Cache expensive computations. The result is reused until dependencies change.

```tsx
// Worth memoizing — genuinely expensive
const processedData = useMemo(() => {
  return largeDataset
    .filter(row => row.active && row.region === selectedRegion)
    .map(row => ({ ...row, total: row.quantity * row.price }))
    .sort((a, b) => b.total - a.total)
}, [largeDataset, selectedRegion])

// NOT worth memoizing — fast computation
const fullName = useMemo(() => `${first} ${last}`, [first, last])
// Just write: const fullName = `${first} ${last}`

// Stable object reference for context or memo children
const contextValue = useMemo(
  () => ({ user, login, logout }),
  [user, login, logout]  // login/logout should be useCallback
)
```

---

## Code Splitting with lazy and Suspense

```tsx
import { lazy, Suspense } from "react"

// Lazy-load heavy components
const RichTextEditor = lazy(() => import("./RichTextEditor"))
const PDFViewer      = lazy(() => import("./PDFViewer"))
const HeavyChart     = lazy(() => import("./HeavyChart"))

// Suspense provides the fallback while loading
function ArticleEditor() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <RichTextEditor />
    </Suspense>
  )
}

// Route-level splitting (React Router)
const Dashboard  = lazy(() => import("./pages/Dashboard"))
const Settings   = lazy(() => import("./pages/Settings"))
const Analytics  = lazy(() => import("./pages/Analytics"))

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  )
}
```

---

## The key Prop

`key` tells React how to match components across renders. Wrong keys cause unnecessary unmount/mount cycles or missed updates.

```tsx
// Use stable, unique IDs — never array index for dynamic lists
// WRONG — index changes when items reorder or are removed
{items.map((item, i) => <ItemRow key={i} item={item} />)}

// RIGHT — stable unique identity
{items.map(item => <ItemRow key={item.id} item={item} />)}

// Intentional reset — change key to unmount and remount
// Useful for: resetting form, restarting animation, clearing state
<ExpensiveForm key={formVersion} initialData={data} />

// key for virtualized lists — always required
{visibleItems.map(item => (
  <VirtualRow key={item.id} item={item} style={getStyle(item.index)} />
))}
```

---

## List Virtualization

For long lists (100+ items), render only visible rows.

```tsx
import { FixedSizeList as List } from "react-window"

function VirtualizedList({ items }: { items: Item[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ItemRow item={items[index]} />
    </div>
  )

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

---

## Transitions for Non-Urgent Updates

```tsx
const [isPending, startTransition] = useTransition()

// Keep urgent update synchronous, defer expensive re-render
function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value
  setInputValue(value)           // urgent — updates input immediately
  startTransition(() => {
    setFilterQuery(value)        // non-urgent — React can interrupt and restart
  })
}

// Show pending indicator during transition
{isPending && <Spinner size="sm" />}
```

---

## Avoiding Common Performance Mistakes

### Creating Objects/Arrays in JSX Props

```tsx
// WRONG — new array reference every render → child always re-renders
<FilteredList exclude={["admin", "system"]} />

// RIGHT — stable reference
const EXCLUDED_ROLES = ["admin", "system"]
<FilteredList exclude={EXCLUDED_ROLES} />

// WRONG — new style object every render → browser recalculates layout
<div style={{ margin: 16, padding: 8 }} />

// RIGHT — defined outside component or memoized
const styles = { container: { margin: 16, padding: 8 } }
<div style={styles.container} />
```

### Expensive Work in Render

```tsx
// WRONG — runs on every render
function SlowComponent({ data }) {
  const sorted = data.sort((a, b) => a.score - b.score)  // O(n log n) every render!
  return <List items={sorted} />
}

// RIGHT — memoize expensive work
function SlowComponent({ data }) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.score - b.score),
    [data]
  )
  return <List items={sorted} />
}
```

### Over-memoizing

```tsx
// POINTLESS — string comparison is fast, memo overhead isn't worth it
const greeting = useMemo(() => `Hello, ${name}!`, [name])

// POINTLESS — cheap component that renders infrequently
const Logo = React.memo(function Logo() {
  return <img src="/logo.svg" alt="Logo" />
})

// POINTFUL — expensive render + receives stable props + renders often
const DataGrid = React.memo(DataGridComponent)
```
