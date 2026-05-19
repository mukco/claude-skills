# React Component Patterns Reference

## Composition over Configuration

Build flexible components by composing rather than adding boolean flags.

```tsx
// WRONG — boolean explosion
<Modal
  showHeader
  showFooter
  showCloseButton
  headerTitle="Confirm"
  footerCancelLabel="Cancel"
  footerConfirmLabel="OK"
/>

// RIGHT — composable
<Modal>
  <Modal.Header>Confirm</Modal.Header>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
    <Button variant="primary" onClick={onConfirm}>OK</Button>
  </Modal.Footer>
</Modal>
```

---

## Compound Components

Components that share implicit state through Context. The API looks like HTML.

```tsx
const AccordionContext = createContext<{
  activeId: string | null
  toggle: (id: string) => void
} | null>(null)

function useAccordion() {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error("Must be used inside Accordion")
  return ctx
}

function Accordion({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const toggle = useCallback((id: string) => {
    setActiveId(prev => prev === id ? null : id)
  }, [])

  return (
    <AccordionContext.Provider value={{ activeId, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { activeId, toggle } = useAccordion()
  const isOpen = activeId === id

  return (
    <div className="accordion-item">
      <button
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        onClick={() => toggle(id)}
      >
        {title}
      </button>
      <div id={`panel-${id}`} role="region" hidden={!isOpen}>
        {children}
      </div>
    </div>
  )
}

Accordion.Item = AccordionItem  // attach as sub-component

// Usage
<Accordion>
  <Accordion.Item id="a" title="First">Content A</Accordion.Item>
  <Accordion.Item id="b" title="Second">Content B</Accordion.Item>
</Accordion>
```

---

## Provider Pattern

Encapsulate context + state + logic into a self-contained provider.

```tsx
// All auth concerns live here — components just call useAuth()
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  const login = useCallback(async (credentials: Credentials) => {
    setStatus("loading")
    try {
      const u = await authService.login(credentials)
      setUser(u)
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth outside AuthProvider")
  return ctx
}
```

---

## Controlled Abstractions

Expose control to callers via props, with smart defaults.

```tsx
// Uncontrolled — component manages its own state
function DatePicker({ defaultValue, onChange }: { defaultValue?: Date; onChange?: (d: Date) => void }) {
  const [value, setValue] = useState(defaultValue)
  const handleChange = (d: Date) => { setValue(d); onChange?.(d) }
  return <input type="date" value={toISO(value)} onChange={e => handleChange(new Date(e.target.value))} />
}

// Controlled — caller owns the state
function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  return <input type="date" value={toISO(value)} onChange={e => onChange(new Date(e.target.value))} />
}

// Best of both — controlled when value is provided, uncontrolled otherwise
function DatePicker({ value, defaultValue, onChange }: DatePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const controlled = value !== undefined
  const currentValue = controlled ? value : internalValue

  const handleChange = (d: Date) => {
    if (!controlled) setInternalValue(d)
    onChange?.(d)
  }
  return <input type="date" value={toISO(currentValue)} onChange={e => handleChange(new Date(e.target.value))} />
}
```

---

## Headless Components

Separate behavior (state, accessibility, keyboard) from rendering (markup, styles). Callers own the UI.

```tsx
// Headless Toggle — provides behavior, renders nothing itself
function useToggle(defaultValue = false) {
  const [on, setOn] = useState(defaultValue)
  const toggle  = useCallback(() => setOn(v => !v), [])
  const turnOn  = useCallback(() => setOn(true), [])
  const turnOff = useCallback(() => setOn(false), [])
  return { on, toggle, turnOn, turnOff }
}

// Callers own the markup
function LightSwitch() {
  const { on, toggle } = useToggle(false)
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className={on ? "switch--on" : "switch--off"}
    >
      {on ? "ON" : "OFF"}
    </button>
  )
}

function FeatureFlag({ feature }: { feature: string }) {
  const { on, toggle } = useToggle(featureFlags.get(feature))
  return <Checkbox checked={on} onChange={toggle} label={feature} />
}
```

---

## ErrorBoundary

Catch render errors in a subtree and show a fallback.

```tsx
// Class component — required for error boundaries
class ErrorBoundary extends React.Component<
  { fallback: ReactNode; onError?: (err: Error) => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error)
    console.error("Boundary caught:", error, info.componentStack)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// Usage
<ErrorBoundary
  fallback={<ErrorPage message="Something went wrong" />}
  onError={err => reportToSentry(err)}
>
  <FeatureSection />
</ErrorBoundary>

// react-error-boundary library simplifies this
import { ErrorBoundary } from "react-error-boundary"
<ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
  <App />
</ErrorBoundary>
```

---

## Portals

Render children into a DOM node outside the component's tree — useful for modals, tooltips, and dropdowns.

```tsx
import { createPortal } from "react-dom"

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        {children}
        <button aria-label="Close" onClick={onClose}>×</button>
      </div>
    </div>,
    document.getElementById("modal-root")!
  )
}

// HTML — add the portal target
// <div id="modal-root"></div>
```

---

## Render Props (Legacy — prefer hooks)

Pass a function as a prop to share stateful logic. Superseded by custom hooks in most cases.

```tsx
// Render prop — still useful for cross-cutting visual concerns
function WithTooltip({ content, children }: { content: string; children: (props: TooltipProps) => ReactNode }) {
  const [visible, setVisible] = useState(false)
  const anchorRef = useRef<HTMLElement>(null)

  return (
    <>
      {children({
        ref: anchorRef,
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false)
      })}
      {visible && <Tooltip anchor={anchorRef} content={content} />}
    </>
  )
}

// Better as a hook for most cases
function useTooltip(content: string) {
  const [visible, setVisible] = useState(false)
  const anchorRef = useRef<HTMLElement>(null)
  return {
    ref: anchorRef,
    visible,
    handlers: {
      onMouseEnter: () => setVisible(true),
      onMouseLeave: () => setVisible(false)
    }
  }
}
```

---

## Polymorphic Components

A component that renders as different HTML elements based on an `as` prop.

```tsx
type AsProp<C extends ElementType> = { as?: C }
type PropsToOmit<C extends ElementType, P> = keyof (AsProp<C> & P)
type PolymorphicProps<C extends ElementType, Props = {}> =
  React.ComponentPropsWithRef<C> & Props & AsProp<C>

function Text<C extends ElementType = "span">({
  as,
  children,
  className,
  ...rest
}: PolymorphicProps<C, { className?: string }>) {
  const Component = as ?? "span"
  return <Component className={cn("text", className)} {...rest}>{children}</Component>
}

<Text>Default span</Text>
<Text as="h1" className="heading">Heading</Text>
<Text as="p">Paragraph</Text>
<Text as="a" href="/link">Link with anchor props</Text>
```
