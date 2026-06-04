# Build-Output Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit the Vite build into `dist/` (self-cleaning) instead of the repo root, repoint the Foundry manifest, and clear the ~154 stale loose build artifacts cluttering the root.

**Architecture:** Change `build.outDir` to `dist/` with `emptyOutDir: true` so each build wipes and repopulates a dedicated folder; point `system.json` `esmodules`/`styles` at `dist/`; update the few consumers that name the old root paths (dev proxy, release zip, eslint ignore, live skill docs); then delete the orphaned root artifacts. Verified by a build + a Foundry relaunch smoke (manifest change) + a check e2e spec.

**Tech Stack:** Vite 8 (Rolldown) lib build, Foundry v14 system manifest, Playwright e2e.

---

## Ground rules

- **Source is in `src/`; build output currently lands at the repo root** (`build.outDir: __dirname`). This plan moves it to `<repo>/dist/`. `dist/` is already gitignored (`.gitignore:6`) and already in the eslint ignore list (`eslint.config.js:81`).
- **The root build artifacts are gitignored** — deleting them produces **no git diff**; it is a local working-tree tidy. The committed changes are the config/doc edits.
- **`system.json` is the manifest Foundry reads at world load.** Changing `esmodules`/`styles` paths **requires a full Foundry restart** to take effect (same constraint as `documentTypes`).
- **e2e is world-launch-gated** and runs against the *built* output via the real Foundry on `:30000` (not the Vite dev server). So the e2e gate validates the `dist/` production path. The Vite dev server (`npm run dev`, port 30001) is a *separate* interactive workflow — its proxy is updated here but verified by a manual smoke, not the e2e gate.
- **Implement on a branch** (e.g. `chore/build-output-dist`), then merge per the usual flow.
- Commands: build `npm run build`; e2e build `npm run build:e2e`; a single e2e spec `npx playwright test tests/e2e/<file>`.

## File Structure

| File | Change |
|---|---|
| `vite.config.mjs` | `build.outDir` → `dist/`; `emptyOutDir` → `true`; dev `server.proxy` `style.css` → `dist/style.css`. |
| `system.json` | `esmodules: ["dist/index.js"]`, `styles: ["dist/style.css"]`. |
| `.github/workflows/main.yml` | Release zip: drop root `index.js index.js.map style.css` (now inside `dist/`, which is already zipped). |
| `eslint.config.js` | Remove the now-moot `'index.js'` ignore (`dist/` already ignored). |
| `.claude/skills/titan-codebase/references/architecture.md` | Update build-output facts: root → `dist/`. |
| `.claude/skills/titan-codebase/references/conventions.md` | Update build-output / `style.css`-path facts: root → `dist/`. |
| *(local fs)* repo-root loose build artifacts | Delete `index.js`, `index.js.map`, `style.css`, and hashed `*-<hash>.js[.map]` chunks — **preserving** `eslint.config.js`, `vite.config.mjs`, `fix-comments.js`, `count-long.cjs`. |

`.gitignore` is intentionally **left unchanged**: its root build-output lines (8–13) are harmless once the root is clean, and line 12 (`/*-????????.js`) incidentally also ignores `fix-comments.js` — removing it would surface that file. (`module.json` references in the release workflow are a pre-existing module-template leftover, unrelated to build output — out of scope.)

---

## Task 1: Redirect build output to `dist/` and repoint the manifest

**Files:**
- Modify: `vite.config.mjs` (build block ~82–98; dev proxy line 73)
- Modify: `system.json` (esmodules/styles, lines 18–23)

- [ ] **Step 1: Point the build at `dist/` and enable self-cleaning**

In `vite.config.mjs`, in the `build:` block, change these two lines:

```javascript
         outDir: __dirname,
         emptyOutDir: false,
```
to:
```javascript
         outDir: path.join(__dirname, 'dist'),
         emptyOutDir: true,
```

(`path` is already imported at the top of the file. `emptyOutDir: true` is safe because `dist/` is a dedicated, gitignored folder — Vite wipes it each build, so stale chunks can no longer accumulate.)

- [ ] **Step 2: Follow the dev-server proxy to `dist/style.css`**

In `vite.config.mjs`, the `server.proxy` rule (line ~73) currently reads:

```javascript
            [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]: 'http://localhost:30000',
```
Change the `style.css` token to `dist/style.css`:
```javascript
            [`^(/${s_PACKAGE_ID}/(assets|lang|packs|dist/style.css))`]: 'http://localhost:30000',
```

(This only affects `npm run dev`; it is smoke-tested in Task 4, not by the e2e gate.)

- [ ] **Step 3: Repoint the Foundry manifest at `dist/`**

In `system.json`, change:

```json
   "esmodules": [
      "index.js"
   ],
   "styles": [
      "style.css"
   ],
```
to:
```json
   "esmodules": [
      "dist/index.js"
   ],
   "styles": [
      "dist/style.css"
   ],
```

- [ ] **Step 4: Build and verify output lands in `dist/`**

Run: `npm run build`
Expected: `✓ built` with no errors. Then verify:

Run: `Test-Path dist/index.js, dist/style.css`
Expected: `True` then `True` (both files exist under `dist/`).

Run: `Get-ChildItem dist -File | Measure-Object | Select-Object -ExpandProperty Count`
Expected: a positive count (entry + css + hashed chunks + maps).

- [ ] **Step 5: Commit**

```bash
git add vite.config.mjs system.json
git commit -m "build: emit Vite output to dist/ (emptyOutDir) and repoint system.json"
```

---

## Task 2: Update peripheral consumers (release zip + eslint ignore)

**Files:**
- Modify: `.github/workflows/main.yml` (line 33)
- Modify: `eslint.config.js` (ignore list, line ~88)

- [ ] **Step 1: Drop the root build names from the release zip**

In `.github/workflows/main.yml`, line 33 currently reads:

```yaml
      - run: zip -r ./module.zip module.json index.js index.js.map style.css assets/ dist/ lang/ packs/ LICENSE AUTHORS
```
Change it to (remove `index.js index.js.map style.css`; keep `dist/`, which now contains them):
```yaml
      - run: zip -r ./module.zip module.json assets/ dist/ lang/ packs/ LICENSE AUTHORS
```

(Leave `module.json` as-is — it is a pre-existing module-template leftover, unrelated to this change.)

- [ ] **Step 2: Remove the moot `index.js` eslint ignore**

In `eslint.config.js`, the `ignores` array contains (line ~88):

```javascript
         'index.js',
```
Delete that single line. (`dist/` is already in the ignore list at line ~81, so the moved build output stays ignored; `fix-comments.js` and `count-long.cjs` remain in the list — leave them.)

- [ ] **Step 3: Verify eslint still runs clean on source**

Run: `npm run eslint`
Expected: no new errors introduced by the ignore change (pre-existing warnings on build artifacts are unaffected; touched source files are clean).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/main.yml eslint.config.js
git commit -m "build: update release zip + eslint ignore for dist/ output"
```

---

## Task 3: Update the live skill docs

**Files:**
- Modify: `.claude/skills/titan-codebase/references/architecture.md` (~lines 135–148)
- Modify: `.claude/skills/titan-codebase/references/conventions.md` (~lines 353–356)

- [ ] **Step 1: Update `architecture.md` build-output facts**

Read `architecture.md` around lines 135–148. Update the build-output description so it reflects the new `dist/` target. Specifically:
- "Output format: ES module … output file named `index` → `index.js` at repo root." → "… → `dist/index.js`."
- "CSS is extracted and emitted as `style.css` at repo root …" → "… as `dist/style.css` (build `outDir` is `dist/` with `emptyOutDir: true`) …".
- "`\"esmodules\": [\"index.js\"]` — Foundry loads the compiled ES module from the repo root." → "`\"esmodules\": [\"dist/index.js\"]` — Foundry loads the compiled ES module from `dist/`."
- "`\"styles\": [\"style.css\"]` — Foundry loads the compiled CSS from the repo root." → "`\"styles\": [\"dist/style.css\"]` — … from `dist/`."

- [ ] **Step 2: Update `conventions.md` build-output facts**

Read `conventions.md` around lines 353–356. Update so it reflects:
- Build artifacts now land in `dist/` (build `outDir: path.join(__dirname, 'dist')`, `emptyOutDir: true`), **not** the repo root. (Replace the "(`__dirname`), not a `dist/` folder … build artifacts such as `index.js` land at the [root]" statement.)
- "CSS must be emitted as `style.css` — `system.json` (`styles: [\"style.css\"]`) and the dev-server proxy both reference `style.css`" → reference `dist/style.css` in both `system.json` (`styles: ["dist/style.css"]`) and the dev proxy; `build.lib.cssFileName` stays pinned to `'style'` (so the emitted file is `dist/style.css`).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/titan-codebase/references/architecture.md .claude/skills/titan-codebase/references/conventions.md
git commit -m "docs(skill): record dist/ build-output location"
```

---

## Task 4: Clear stale root artifacts + verification gate

**Files:** none committed (local fs cleanup + verification). World-launch-gated — coordinate the relaunch with the user.

- [ ] **Step 1: Delete the orphaned root build artifacts (preserving dev scripts/config)**

This deletes the old root build output while sparing the intentional root files. Note `fix-comments.js` matches the chunk glob `*-????????.js`, so do **not** glob-delete — use the keep-list filter:

Run:
```powershell
$keep = @('eslint.config.js', 'vite.config.mjs', 'fix-comments.js', 'count-long.cjs')
Get-ChildItem -File | Where-Object {
   ($_.Name -like '*.js' -or $_.Name -like '*.js.map' -or $_.Name -eq 'style.css') -and
   ($keep -notcontains $_.Name)
} | Remove-Item -Verbose
```
Expected: removes `index.js`, `index.js.map`, `style.css`, and every `<Name>-<hash>.js` / `.js.map` chunk from the repo root; prints each removed file.

- [ ] **Step 2: Confirm the root is clean and the keep-list survived**

Run:
```powershell
(Get-ChildItem -File | Where-Object { ($_.Name -like '*.js' -or $_.Name -like '*.js.map' -or $_.Name -eq 'style.css') -and (@('eslint.config.js','vite.config.mjs','fix-comments.js','count-long.cjs') -notcontains $_.Name) } | Measure-Object).Count
```
Expected: `0` (no loose build artifacts remain in root).

Run: `Test-Path eslint.config.js, vite.config.mjs, fix-comments.js, count-long.cjs`
Expected: `True` ×4 (the dev scripts/config were preserved).

- [ ] **Step 3: e2e build + Foundry relaunch (manifest change)**

Run: `npm run build:e2e`
Expected: `✓ built`; `dist/index.js` + `dist/style.css` exist; root stays clean.

Then **the user fully restarts Foundry** (the `system.json` `esmodules`/`styles` change only registers on restart) and launches the test world.

- [ ] **Step 4: Smoke — system loads from `dist/`**

With the world launched, confirm in the browser console / UI that the system loaded (no "failed to load esmodule" / missing-style errors): open a character sheet and post a check to chat — both render styled and error-free. (Styling rendering confirms `dist/style.css` resolved; the sheet/chat Svelte confirms `dist/index.js` resolved.)

- [ ] **Step 5: e2e regression — a check spec (loads the system end-to-end)**

Run: `npx playwright test tests/e2e/checks-dialog.spec.js`
Expected: PASS (the system loaded from `dist/` and a check rolls/renders). Optionally run the full suite (`npm run test:e2e`) for full regression; it should stay green at parity.

- [ ] **Step 6: (Optional) Dev-server smoke**

Out of the e2e gate, but if the `npm run dev` workflow is used: run `npm run dev`, open the proxied game, and confirm the system + styles load via the dev server. If the entry/proxy path needs more than the Task 1 Step 2 proxy tweak, capture it as a follow-up TODO rather than blocking this plan.

---

## Self-Review

**Spec coverage (Workstream B of the e2e-suite-speedup spec):**
- `outDir` → `dist/` + `emptyOutDir: true` → Task 1 Step 1. ✓
- `system.json` esmodules/styles → `dist/` (+ restart note) → Task 1 Step 3, Task 4 Step 3. ✓
- Dev proxy → `dist/style.css` → Task 1 Step 2 (+ smoke Task 4 Step 6). ✓
- Release workflow zip → drop root names, keep `dist/` → Task 2 Step 1. ✓
- eslint ignore → drop `index.js` (dist/ already ignored) → Task 2 Step 2. ✓
- Live skill docs → `dist/` → Task 3. ✓
- Delete 154 stale root artifacts, **build output only**, preserving dev scripts/config → Task 4 Steps 1–2 (keep-list filter; `fix-comments.js` explicitly spared). ✓
- `.gitignore` intentionally unchanged (rationale in File Structure). ✓ (spec said "can be removed"; this plan keeps it to avoid surfacing `fix-comments.js` — a deliberate, documented deviation toward safety.)
- Success criteria (clean root, Foundry loads from `dist/`, e2e green, release zip runnable) → Task 4 Steps 2–5. ✓

**Placeholder scan:** No TBD/TODO. Skill-doc edits (Task 3) specify the exact before→after wording with "read first" since they are prose; all config/manifest edits show exact before/after code.

**Consistency:** `dist/index.js` / `dist/style.css` used consistently across vite.config, system.json, workflow, eslint, and skill docs. The keep-list (`eslint.config.js`, `vite.config.mjs`, `fix-comments.js`, `count-long.cjs`) is identical in Task 4 Steps 1 and 2.
