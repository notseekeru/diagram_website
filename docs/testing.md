# Backend Testing

## Stack

- Runner: [Vitest](https://vitest.dev)
- Language: TypeScript, ESM (`"type": "module"`), NodeNext resolution
- Import style: extensioned relative imports (`../src/validate.js`)

## Scope

Current coverage is **pure validators only** — no database, HTTP, or heavy
Express harness yet. The tested module `backend/src/validate.ts` has no
side effects and no env/DB coupling, so tests run standalone with no config.

| Unit | Module | Behavior under test |
|------|--------|---------------------|
| `validUuid`   | `src/validate.ts` | accepts canonical/dashed UUID-shaped strings; rejects non-strings, off-format, and out-of-charset input |
| `validMermaid` | `src/validate.ts` | accepts 1..10,000-char trimmed diagrams; rejects empty, whitespace-only, and oversized input |

## Running

From `backend/`:

```bash
npm install          # once, installs devDeps incl. vitest
npm test             # single run
npm run test:watch   # watch mode
```

## Layout

- `backend/test/*.test.ts` — test files (auto-discovered, excluded from the
  `tsc` build via `tsconfig.json` `include: ["src"]`)
- `backend/src/validate.ts` — standalone pure module kept free of imports
  that would pull in `pg`/env (see `db.ts`/`server.ts` which throw on import
  when `DATABASE_URL`/`API_KEY` are unset)

## Adding a case

Add another `it(...)` in the relevant `describe` group, or pull out the next
pure helper (e.g. request pagination clamping in `server.ts`) into
`src/validate.ts`-style modules and cover them the same way.
