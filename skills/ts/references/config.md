# TypeScript Configuration Reference

## Essential tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,

    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## moduleResolution Options

| Value | When to use |
|-------|-------------|
| `Bundler` | Vite, esbuild, Webpack 5 — allows extensionless imports |
| `NodeNext` | Node.js with ESM — requires `.js` extensions |
| `Node16` | Node.js with CJS or mixed — requires extensions for ESM |
| `Node` | Legacy CJS Node.js |

## Path Aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*":        ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@lib/*":     ["./src/lib/*"],
      "@types/*":   ["./src/types/*"]
    }
  }
}
```

Configure the bundler to match:

```js
// vite.config.ts
import { defineConfig } from "vite"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  }
})
```

## Project References (Monorepo)

```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declarationDir": "./dist"
  }
}

// packages/app/tsconfig.json
{
  "references": [{ "path": "../shared" }]
}
```

Build in dependency order:

```sh
tsc --build          # builds all projects in dependency order
tsc --build --watch  # incremental watch mode
tsc --build --clean  # clean all outputs
```

## Declaration Files

```ts
// Augmenting global types
declare global {
  interface Window {
    analytics: AnalyticsInstance
  }

  interface Array<T> {
    first(): T | undefined
  }
}

// Module augmentation
declare module "express" {
  interface Request {
    user?: User
  }
}

// Ambient module declaration (for JS files or assets)
declare module "*.svg" {
  const url: string
  export default url
}

declare module "*.css" {
  const styles: Record<string, string>
  export default styles
}
```

## Import Types

```ts
// Type-only import — erased at compile time, no runtime cost
import type { User, Order } from "./types"
import type { FC } from "react"

// Inline type import
import { type User, fetchUser } from "./api"

// verbatimModuleSyntax enforces import type for type-only imports
// Prevents accidentally importing types as values (which causes runtime errors)
```

## Strict Flag Effects

| Flag | What changes |
|------|-------------|
| `strictNullChecks` | `null` and `undefined` are distinct types — must handle explicitly |
| `noImplicitAny` | Untyped parameters and variables are an error |
| `strictFunctionTypes` | Function parameter types are contravariant (catches unsound assignments) |
| `noUncheckedIndexedAccess` | `arr[0]` returns `T \| undefined` — prevents index-out-of-bounds crashes |
| `exactOptionalPropertyTypes` | `{ name?: string }` cannot be assigned `{ name: undefined }` |
| `noUnusedLocals` | Unused local variables are errors |
| `noImplicitReturns` | All code paths in non-void functions must return a value |
