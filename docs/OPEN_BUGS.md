# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. `MoveEffectToFolderDialogShell.svelte` captures `initialValue` non-reactively (lint error)

- **What:** `src/sidebar/tray/MoveEffectToFolderDialogShell.svelte:22` does
  `let selectedFolderId = $state(initialValue);`. Svelte's `state_referenced_locally` rule flags this
  as an **error** (`svelte/valid-compile`): `$state(initialValue)` captures only the prop's INITIAL
  value, so if `initialValue` changes after mount the local state won't track it.
- **Severity:** Low / latent. It is the system's only ESLint **error** (surfaced during follow-up D's
  verification) and a matching build-time `[vite-plugin-svelte]` warning. The dialog works in practice
  because `initialValue` does not change during its lifetime.
- **Pre-existing:** present on `main`; NOT introduced by follow-up D (which never touched
  `src/sidebar/tray/`). Out of D's scope.
- **To do:** if the initial-only capture is intended, suppress the rule locally with a comment
  explaining why; otherwise derive it reactively (e.g. `$derived`) or initialize in an effect.

<!--
Recently resolved: the socket-sync A1/A2 full-run timeout flake was fixed by the e2e Phase 2
shared-world harness (per-file `clearChat` keeps the world lean). Verified: `socket-sync.spec.js`
A1–A5 all passed within a full `npm run test:e2e` run (358 passed, 15.1 min). See `docs/TODO.md` #15.
-->
