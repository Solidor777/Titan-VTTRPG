# Task Execution Plan — Drive Build + JSDoc Warnings to Zero

Date: 2026-05-30
Status: Approved, executing

## Goal

Eliminate all Vite/Svelte build warnings and all 394 ESLint JSDoc warnings (0 errors)
across `src/` **and** `tests/`. Target: `npx eslint .` reports 0 warnings and
`npm run build` is clean except the structural `outDir`-is-parent-of-root notice.

## Decisions (from brainstorming)

- **`@extends` stays** — configure ESLint to accept it rather than rewriting to
  `@augments`. `@extends` is the more common modern form (mirrors ES `class extends`)
  and is mandated by CLAUDE.md. Config follows the code.
- **True zero** — no content rules disabled; genuinely missing docs get real,
  succinct, complete-sentence descriptions.
- **Remove redundant build pieces** — dead TRL `optimizeDeps` block and the
  `@rollup/plugin-node-resolve` plugin + devDependency.
- **Include tests** — `tests/e2e/*.spec.js` JSDoc is fixed too.
- **`outDir` warning left as-is** — structural (source in `src/`, bundle to repo root).

## Phases

### Phase 1 — ESLint config (`eslint.config.js`)
- Add `settings.jsdoc.tagNamePreference` mapping `augments -> extends` (keep `@extends`).
  Clears all 54 `check-tag-names`. Sweep for other alias conflicts (`@return`/`@prop`).
- No rule disabling.

### Phase 2 — Auto-fix formatting
- `eslint . --fix` clears ~234 mechanical warnings (line-alignment, indentation,
  hyphens, sort-tags, multi-asterisks, tag-lines). Re-run for the true manual baseline.

### Phase 3 — Hand-write remaining content docs (~106; src/ + tests/)
- `require-description`, `informative-docs`, `require-param`, `require-jsdoc`,
  `require-returns`, `check-types`, `check-param-names`, `check-property-names`, etc.
- Real, succinct, complete-sentence descriptions.

### Phase 4 — Build config (`vite.config.mjs` + `package.json`)
- Remove dead `optimizeDeps.esbuildOptions` block (TRL/TyphonJS removed).
- Remove `@rollup/plugin-node-resolve` import + `plugins` entry + devDependency.
- Extract inline `preprocess` into `src/svelte.config.js` (auto-loaded at Vite root)
  to silence "no Svelte config found".
- Leave the `outDir` notice.

### Phase 5 — Svelte compiler warnings
- Delete 2 stale `<!-- svelte-ignore missing-declaration -->` comments in
  `CastingCheckChatMessage.svelte`.
- Delete ~17 unused CSS selectors across 7 sheet/item files (verify not applied
  dynamically before removing).

### Phase 6 — Verify
- `npx eslint .` -> 0 warnings.
- `npm run build` -> clean (save structural outDir line).
- `npm test` -> no regressions.

## Execution routing
Per CLAUDE.md, `.js`/`.svelte`/`.mjs` development edits route through the
`titan-svelte-dev` subagent (with `svelte-5`, `foundry-vtt`, `foundry-svelte`
loaded); orchestration, tooling runs, and verification handled at top level.
