# Design: Remove Dead Dependencies

**Date:** 2026-05-30
**Status:** Approved (design) — pending spec review

## Problem

`package.json` declares several dependencies that nothing in the project consumes — no source
import, no config-file reference, no npm script, and no CI step. They inflate `node_modules`, the
lockfile, and the audit surface, and one (`foundry-vtt-types`) actively misleads (the titan-codebase
skill documents it as a "v13 vs v14 runtime mismatch" when in fact it provides nothing — `jsconfig.json`
sources Foundry types from the live v14 install).

Goal: remove every dead dependency, leaving the project building and linting exactly as before.

## Audit (verified against the codebase)

**Confirmed dead** — appear ONLY in `package.json` (grep across `*.js`/`*.mjs`/`*.json`, excluding
`node_modules` and `package-lock.json`, finds no other reference; `.github/workflows/main.yml` does
not use them):

- `@league-of-foundry-developers/foundry-vtt-types` — `jsconfig.json` includes the live Foundry
  install (`../../../../foundry/common/**`, `foundry/public/scripts/**`) for editor types; nothing
  references this package. No `tsconfig`, no `/// <reference>`, no type-check script.
- `@typhonjs-config/eslint-config` — `eslint.config.js` (flat config) imports only
  `eslint-plugin-svelte` and `eslint-plugin-jsdoc`; this config is never referenced.
- `@typhonjs-fvtt/eslint-config-foundry.js` — same; not referenced by `eslint.config.js`.
- `esdoc`, `esdoc-ecmascript-proposal-plugin`, `esdoc-standard-plugin` — no `.esdoc.json`/`esdoc.json`,
  no `esdoc` npm script, no CI step. (esdoc is also long-unmaintained.)

**Confirmed used (keep):**

- Runtime `dependencies`: `short-unique-id` (`src/helpers/utility-functions/GenerateUUID.js`),
  `tippy.js` (`src/helpers/svelte-actions/TooltipAction.js`).
- Build: `vite`, `@sveltejs/vite-plugin-svelte`, `svelte`, `svelte-preprocess`, `sass-embedded`,
  `autoprefixer`, `@rollup/plugin-node-resolve` — all imported/used in `vite.config.mjs`.
- Lint: `eslint`, `eslint-plugin-svelte`, `eslint-plugin-jsdoc` (`eslint.config.js`); `stylelint`,
  `stylelint-config-standard-scss`, `stylelint-config-html` (`.stylelintrc.json` `extends`).

**Borderline — empirically verify, default keep:**

- `@types/node` — provides ambient Node types for the `.mjs` config files in the editor (`jsconfig.json`
  includes `**/*.mjs`); no explicit reference. Removal has no build/lint impact but may reduce editor
  hints in `vite.config.mjs`.
- `postcss-html`, `postcss-scss` — Stylelint custom syntaxes. `.stylelintrc.json` does not set
  `customSyntax` directly; the `stylelint-config-html/svelte` and `stylelint-config-standard-scss`
  shareable configs pull these in. They are likely transitive (so the direct entries are redundant),
  but Stylelint's `.svelte`/`.scss` parsing breaks if they are NOT available — so removal must be
  proven by running `npm run stylelint`.

## Approach

Remove the 6 confirmed-dead entries outright. For each of the 3 borderline entries, remove it, run the
gate that would exercise it, and restore it only if a gate breaks. Re-sync the tracked
`package-lock.json` with `npm install`. Update the skill note. Verify all three project gates still
pass.

## Changes

### A. `package.json`

Delete from `devDependencies` (confirmed dead):
`@league-of-foundry-developers/foundry-vtt-types`, `@typhonjs-config/eslint-config`,
`@typhonjs-fvtt/eslint-config-foundry.js`, `esdoc`, `esdoc-ecmascript-proposal-plugin`,
`esdoc-standard-plugin`.

Then attempt to also delete the borderline entries (`@types/node`, `postcss-html`, `postcss-scss`),
keeping each only if the verification gates pass without it (see Verification).

### B. `package-lock.json`

Run `npm install` after editing `package.json` so the lockfile drops the removed packages and any
now-orphaned transitive deps. Confirm the lockfile diff is limited to the removed subtrees.

### C. titan-codebase skill

Update the `foundry-vtt-types` "version mismatch" note. Affected location: `SKILL.md` "Stack at a
glance" (the bullet noting `foundry-vtt-types` is still v13 / a known mismatch). Replace with: editor
types come from the live Foundry v14 install via `jsconfig.json`; there is no `foundry-vtt-types`
dependency. (Grep the skill for `foundry-vtt-types` to catch any other mention — e.g. `references/*`.)

### D. Unchanged

`jsconfig.json`, `eslint.config.js`, `.stylelintrc.json`, and all of `src/` — none reference the
removed packages.

## Verification

After the edits + `npm install`:

1. `npm run build` succeeds (Vite build to repo root). Proves no build dep was removed.
2. `npm run eslint` runs and reports the same 0 errors as before (pre-existing warnings unchanged).
   Proves the removed eslint configs were unused.
3. `npm run stylelint` is clean. This is the decisive gate for `postcss-html`/`postcss-scss`: if
   Stylelint can no longer parse a `.svelte` or `.scss` file, restore the offending package.
4. `grep -nE "foundry-vtt-types|typhonjs-config|eslint-config-foundry|esdoc" package.json` → no
   output (confirmed-dead all gone).
5. `grep` the same names in `package-lock.json` → no output (or only inside unrelated integrity
   hashes — verify each remaining hit is not a real dependency entry).
6. Skill grep: `grep -rn "foundry-vtt-types" .claude/skills/titan-codebase/` returns only the new,
   corrected wording (no "mismatch").

## Scope / commits

Per-task commits on `development`: (1) remove confirmed-dead + borderline-verified from `package.json`
& re-sync lockfile, (2) skill note fix. (Grouping may be adjusted by the plan.) No `src/` changes; no
behavioral change — purely dependency hygiene.

## Out of scope

- Reclassifying `dependencies` vs `devDependencies` for kept packages.
- Upgrading any kept package's version.
- The a11y work and the visual gate (separate, parked on `development`).
