# React Component Reference

## Component Design Principles

### Single Responsibility

Each component has one reason to change. If you can't name a component without "and," extract.

```tsx
// WRONG — fetches data AND renders AND handles pagination
function UserTable() {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  useEffect(() => { fetchUsers(page).then(setUsers) }, [page])
  return (
    <div>
      <table>...</table>
      <Pagination page={page} onPageChange={setPage} />
    </div>
  )
}

// RIGHT — separate concerns
function useUsers(page: number) {
  const [users, setUsers] = useState<User[]>([])
  useEffect(() => { fetchUsers(page).then(setUsers) }, [page])
  return users
}

function UserTable({ users }: { users: User[] }) {
  return <table>...</table>
}

function UserTablePage() {
  const [page, setPage] = useState(1)
  const users = useUsers(page)
  return (
    <>
      <UserTable users={users} />
      <Pagination page={page} onPageChange={setPage} />
    </>
  )
}
```

---

## Props Design

### Interface Segregation

Don't pass more than a component needs.

```tsx
// WRONG — passes entire user object when only name is needed
function Greeting({ user }: { user: User }) {
  return <div>Hello, {user.name}</div>  // only uses user.name
}

// RIGHT — pass only what's needed
function Greeting({ name }: { name: string }) {
  return <div>Hello, {name}</div>
}
```

### Children Over Prop

Use `children` for content that the parent owns, not a `content` prop.

```tsx
// WRONG — caller passes content as prop
<Card title="Hello" content={<p>World</p>} footer={<Button>OK</Button>} />

// RIGHT — children, composable
<Card>
  <Card.Title>Hello</Card.Title>
  <p>World</p>
  <Card.Footer><Button>OK</Button></Card.Footer>
</Card>
```

### Boolean Props for Toggle States

```tsx
// WRONG — string enum for two-state
<Button variant="disabled" />
<Button variant="loading" />

// RIGHT — boolean props
<Button disabled />
<Button loading />

// But use string enum for multiple exclusive variants
<Button variant="primary" />
<Button variant="ghost" />
<Button variant="danger" />
```

---

## Controlled vs Uncontrolled

| | Controlled | Uncontrolled |
|--|-----------|--------------|
| State owner | Parent (via props) | Component itself |
| Value source | `value` prop | `defaultValue` + DOM |
| Sync mechanism | `onChange` callback | `ref` to read |
| Use when | Validation, formatting, conditional enabling | File inputs, performance, integrating non-React |

```tsx
// Controlled
function ControlledInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />
}

// Uncontrolled
function UncontrolledForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(new FormData(formRef.current!))
  }
  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input name="email" type="email" defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  )
}
```

---

## forwardRef

When a parent needs direct access to a child's DOM node (focus, scroll, measurement).

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger"
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", loading, children, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn("btn", `btn--${variant}`, loading && "btn--loading")}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    )
  }
)

// Parent usage
const buttonRef = useRef<HTMLButtonElement>(null)
<Button ref={buttonRef} variant="primary">Click</Button>
buttonRef.current?.focus()
```

---

## Component File Organization

```tsx
// Standard file structure for a component
// Button/Button.tsx

import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import styles from "./Button.module.css"

// 1. Types / interfaces
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost"
  size?:    "sm" | "md" | "lg"
}

// 2. Component
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(styles.btn, styles[variant], styles[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

// Button/index.ts
export { Button } from "./Button"
export type { ButtonProps } from "./Button"
```

---

## Accessibility Fundamentals

```tsx
// Semantic HTML first — gives accessibility for free
<button onClick={handleClick}>Submit</button>  // ✓ keyboard + screen reader
<div onClick={handleClick}>Submit</div>        // ✗ not focusable, no role

// When using non-semantic elements — add ARIA
<div
  role="button"
  tabIndex={0}
  aria-label="Close dialog"
  onClick={handleClose}
  onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleClose()}
>
  ×
</div>

// Images — always alt
<img src={avatar} alt={`${user.name}'s avatar`} />
<img src={decorativeImage} alt="" />  // decorative — empty alt

// Form labels
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Or aria-label for icon buttons
<button aria-label="Delete item">🗑</button>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Focus management for modals
useEffect(() => {
  if (isOpen) {
    firstFocusableRef.current?.focus()
    return () => previousActiveElement.current?.focus()  // restore on close
  }
}, [isOpen])
```

---

## Anti-Patterns

### Index as Key in Dynamic Lists

```tsx
// WRONG — index changes when list reorders or items are removed
{items.map((item, i) => <Item key={i} data={item} />)}

// RIGHT
{items.map(item => <Item key={item.id} data={item} />)}
```

### Inline Component Definition

```tsx
// WRONG — component is redefined on every render → always remounts
function Parent() {
  function Child() { return <div>Child</div> }  // new function every render
  return <Child />
}

// RIGHT — define outside
function Child() { return <div>Child</div> }
function Parent() { return <Child /> }
```

### Boolean Logic in JSX

```tsx
// WRONG — renders "0" when count is 0 (truthy/falsy gotcha)
{count && <Badge count={count} />}

// RIGHT — explicit boolean
{count > 0 && <Badge count={count} />}
// or
{Boolean(count) && <Badge count={count} />}
```

### Spreading Unknown Props to DOM Elements

```tsx
// WRONG — unknown props cause React warnings / DOM errors
function Card({ isHighlighted, ...props }) {
  return <div className={isHighlighted ? "highlight" : ""} {...props} />  // isHighlighted passed to DOM!
}

// RIGHT — consume custom props, spread only DOM-safe props
function Card({ isHighlighted, className, ...domProps }) {
  return <div className={cn(isHighlighted && "highlight", className)} {...domProps} />
}
```
