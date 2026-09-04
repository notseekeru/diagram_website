# Testing

Automated tests run with [Vitest](https://vitest.dev) in both packages, driven via
the Makefile and GitHub Actions CI. There is no global test config; each package
owns its Vitest setup.

Run everything from the repo root (requires the dev stack up: `make up`):

```bash
make test                # vitest single run on frontend, then backend
make exec                # test + lint + typecheck + audit + prune (both services)
```

Or in a single package:

```bash
cd frontend && npm test        # or: npm run test:watch
cd backend  && npm test
```

See [README.md](../README.md) for the full set of `make` targets.

---

## Backend (`backend/`)

### Stack

- Runner: Vitest (same version as the frontend)
- Language: TypeScript, ESM (`"type": "module"`), NodeNext resolution
- Import style: extensioned relative imports (`../src/validate.js`)

### Scope

Current coverage is **pure validators only** — no database, HTTP, or heavy
Express harness yet. The tested module `backend/src/validate.ts` has no
side effects and no env/DB coupling, so tests run standalone with no config.

| Unit | Module | Behavior under test |
|------|--------|---------------------|
| `validUuid`   | `src/validate.ts` | accepts canonical/dashed UUID-shaped strings; rejects non-strings, off-format, and out-of-charset input |
| `validMermaid` | `src/validate.ts` | accepts 1..10,000-char trimmed diagrams; rejects empty, whitespace-only, and oversized input |

### Layout

- `backend/test/*.test.ts` — test files (auto-discovered; `tsconfig.json`
  `include: ["src"]` keeps them out of the `tsc` build)
- `backend/src/validate.ts` — standalone pure module kept free of imports
  that would pull in `pg`/env (see `db.ts`/`server.ts` which throw on import
  when `DATABASE_URL`/`API_KEY` are unset)

---

## Frontend (`frontend/`)

### Stack

- Runner: Vitest in a `jsdom` environment (configured via a `test` block in
  `vite.config.js`, so tests reuse the Vite React plugin for TSX transform)
- DOM helpers: `@testing-library/react` (+ `@testing-library/dom`)
- Language: TypeScript, ESM

### Scope

A **smoke render** of the top-level `<App/>`: mounts the component and checks
that the core editor surfaces render. Because the app has no API key at first
render it issues no network requests, so no API mocking is needed.

| Case | What it asserts |
|------|-----------------|
| editor mounts | the `X-API-Key` password field and the `Mermaid source` textarea are present |
| default title  | the title input starts at `Untitled Diagram` |

### Mocks & shims

- `src/test/setup.ts` (loaded via Vitest `setupFiles`) provides two globals
  jsdom lacks: a no-op `ResizeObserver` and a `window.matchMedia` stub that
  always reports "not desktop". It runs before every test file.
- `src/App.test.tsx` mocks the `mermaid` and `@mermaid-js/layout-elk` modules
  because `PreviewPanel` renders charts at module load; the smoke test only
  verifies the editor tree, so the SVG renderer is stubbed to resolve a minimal
  SVG. Nothing production code imports a real test-path dependency.

### Layout

- `frontend/src/*.test.tsx` — colocated with the code under test
  (auto-discovered by Vitest). The test and its setup live under `src/`, so
  they are covered by `tsc --noEmit` typecheck too (included, not excluded).
- `frontend/src/test/setup.ts` — environment shims

---

## Adding a case

- **Backend:** add another `it(...)` in the relevant `describe` group, or pull
  out the next pure helper (e.g. request pagination clamping in `server.ts`)
  into `src/validate.ts`-style modules and cover them the same way.
- **Frontend:** add a component/behaviour test next to the source (see the
  smoke render), stubbing external renderers like `mermaid` when the unit under
  test does not exercise them.

> AI HERE: there is no coverage threshold gate (`coverage.v8` provider is not
> installed). Upgrade path: add `@vitest/coverage-v8` and a coverage minimum in
> each package's Vitest config when the surface grows.
