# JavaScript Async Patterns Reference

## The Event Loop

JavaScript is single-threaded. The event loop processes tasks from queues:

```
Call Stack → (empty) → Microtask Queue → Macrotask Queue → render → repeat
```

| Queue | Examples | Priority |
|-------|----------|----------|
| Microtask | Promise `.then`, `queueMicrotask`, `MutationObserver` | High (runs to exhaustion before next macrotask) |
| Macrotask | `setTimeout`, `setInterval`, I/O, `requestAnimationFrame` | Low |

```js
console.log("1")                    // synchronous
setTimeout(() => console.log("2"), 0)  // macrotask
Promise.resolve().then(() => console.log("3"))  // microtask
console.log("4")                    // synchronous
// Output: 1, 4, 3, 2
```

---

## Promises

A Promise represents an eventual value — it is either pending, fulfilled, or rejected.

```js
// Creating a Promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve("done"), 1000)
})

// Consuming with .then/.catch/.finally
promise
  .then(value => console.log("Got:", value))
  .catch(err  => console.error("Failed:", err))
  .finally(()  => console.log("Always runs"))

// Promise.resolve / Promise.reject — create settled promises
const immediate = Promise.resolve(42)
const failed    = Promise.reject(new Error("oops"))
```

### Promise Combinators

```js
// Promise.all — all must succeed; fails fast on first rejection
const [users, products] = await Promise.all([fetchUsers(), fetchProducts()])

// Promise.allSettled — all settle regardless of success/failure
const results = await Promise.allSettled([p1, p2, p3])
results.forEach(r => {
  if (r.status === "fulfilled") use(r.value)
  else                           log(r.reason)
})

// Promise.race — first to settle wins (fulfilled or rejected)
const first = await Promise.race([fetch1(), fetch2()])

// Promise.any — first to FULFILL wins; rejects with AggregateError if all fail
const fastest = await Promise.any([cdn1.fetch(url), cdn2.fetch(url)])
```

---

## async / await

`async` functions always return a Promise. `await` pauses execution until the Promise settles.

```js
// Basic pattern
async function fetchUser(id) {
  const res  = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

// Always handle errors
async function loadUser(id) {
  try {
    const user = await fetchUser(id)
    return user
  } catch (err) {
    console.error("Failed to load user:", err)
    throw err  // re-throw unless you can recover
  }
}
```

### Sequential vs Parallel

```js
// SEQUENTIAL — total time = A + B + C
async function sequential() {
  const a = await fetchA()  // wait for A
  const b = await fetchB()  // then wait for B
  const c = await fetchC()  // then wait for C
  return [a, b, c]
}

// PARALLEL — total time = max(A, B, C)
async function parallel() {
  const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()])
  return [a, b, c]
}

// PARALLEL with individual error handling
async function parallelWithFallbacks() {
  const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()])
  return results.map(r => r.status === "fulfilled" ? r.value : null)
}
```

### Async in Loops

```js
// WRONG — sequential (each awaits before next starts)
for (const id of ids) {
  const user = await fetchUser(id)  // one at a time
  process(user)
}

// PARALLEL — all start simultaneously
const users = await Promise.all(ids.map(id => fetchUser(id)))
users.forEach(process)

// PARALLEL with concurrency limit
async function withConcurrency(items, fn, limit = 5) {
  const results = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    results.push(...await Promise.all(batch.map(fn)))
  }
  return results
}

// forEach does NOT await — use for...of or Promise.all
arr.forEach(async item => await process(item))  // WRONG — fire and forget
```

---

## Error Handling

### Typed Error Handling

```js
class ApiError extends Error {
  constructor(message, statusCode, body) {
    super(message)
    this.name       = "ApiError"
    this.statusCode = statusCode
    this.body       = body
  }
}

class NetworkError extends Error {
  constructor(message, cause) {
    super(message, { cause })
    this.name = "NetworkError"
  }
}

async function fetchWithTypedErrors(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(`Request failed`, res.status, body)
    }
    return await res.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new NetworkError("Network request failed", err)
  }
}
```

### Unhandled Rejections

```js
// Browser
window.addEventListener("unhandledrejection", event => {
  console.error("Unhandled rejection:", event.reason)
  event.preventDefault()  // suppresses console error
})

// Node.js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason)
  process.exit(1)
})
```

---

## AbortController

Cancel fetch requests and other async operations.

```js
function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  return fetch(url, { signal: controller.signal })
    .then(res => {
      clearTimeout(timer)
      return res.json()
    })
    .catch(err => {
      clearTimeout(timer)
      if (err.name === "AbortError") throw new Error("Request timed out")
      throw err
    })
}

// Cancel on component unmount (React pattern)
useEffect(() => {
  const controller = new AbortController()

  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(err => { if (err.name !== "AbortError") setError(err) })

  return () => controller.abort()
}, [url])
```

---

## Generators for Async Iteration

```js
// Async generator — yields values asynchronously
async function* paginate(url) {
  let next = url
  while (next) {
    const res  = await fetch(next)
    const data = await res.json()
    yield* data.items
    next = data.nextPage
  }
}

// Consume with for await...of
for await (const item of paginate("/api/items")) {
  process(item)
}

// ReadableStream — native async iteration (modern browsers/Node 16+)
async function processStream(response) {
  for await (const chunk of response.body) {
    handleChunk(chunk)
  }
}
```

---

## Common Patterns

### Retry with Exponential Backoff

```js
async function retry(fn, { attempts = 3, delay = 1000, backoff = 2 } = {}) {
  let lastError
  let wait = delay
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, wait))
        wait *= backoff
      }
    }
  }
  throw lastError
}

const user = await retry(() => fetchUser(id), { attempts: 5, delay: 500 })
```

### Debounce and Throttle

```js
function debounce(fn, delay) {
  let timer
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

function throttle(fn, interval) {
  let last = 0
  return function(...args) {
    const now = Date.now()
    if (now - last >= interval) {
      last = now
      return fn.apply(this, args)
    }
  }
}

const debouncedSearch = debounce(search, 300)   // fires 300ms after last keystroke
const throttledScroll = throttle(onScroll, 100) // fires at most once per 100ms
```

### Promise Queue (Concurrency Limiter)

```js
class PromiseQueue {
  #queue = []
  #running = 0
  #limit

  constructor(limit) { this.#limit = limit }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ fn, resolve, reject })
      this.#run()
    })
  }

  #run() {
    while (this.#running < this.#limit && this.#queue.length) {
      const { fn, resolve, reject } = this.#queue.shift()
      this.#running++
      fn()
        .then(resolve, reject)
        .finally(() => { this.#running--; this.#run() })
    }
  }
}

const queue = new PromiseQueue(3)  // max 3 concurrent
const results = await Promise.all(urls.map(url => queue.add(() => fetch(url))))
```

---

## Anti-Patterns

### Async Without Await (Fire and Forget)

```js
// WRONG — errors are lost
async function saveAll(items) {
  items.forEach(async item => await save(item))  // forEach doesn't await
}

// RIGHT
async function saveAll(items) {
  await Promise.all(items.map(item => save(item)))
}
```

### New Promise Antipattern

```js
// WRONG — unnecessary Promise wrapping
function delay(ms) {
  return new Promise(resolve => {
    Promise.resolve().then(() => setTimeout(resolve, ms))  // pointless
  })
}

// RIGHT — Promise is already a Promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// WRONG — wrapping an async fn that already returns a Promise
function fetchUser(id) {
  return new Promise(async (resolve, reject) => {  // async executor — avoid
    try { resolve(await api.get(id)) }
    catch (e) { reject(e) }
  })
}

// RIGHT
async function fetchUser(id) {
  return api.get(id)
}
```
