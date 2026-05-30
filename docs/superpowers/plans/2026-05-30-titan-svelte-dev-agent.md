# Plan: TITAN JS/Svelte Subagent + CLAUDE.md Delegation

**Date:** 2026-05-30

## Goal

Create a project subagent that always loads the right skills for this codebase, and document in
`CLAUDE.md` that JS/Svelte work should be delegated to it. Then push to the mainline.

## 1. Create `.claude/agents/titan-svelte-dev.md`

(`.claude/agents/` does not exist yet — it will be created.) Content:

```markdown
---
name: titan-svelte-dev
description: >-
  Use for any JavaScript or Svelte work in the TITAN Foundry VTT system — writing, refactoring,
  reviewing, or debugging .js / .svelte / .svelte.js files. The system is pure Svelte 5 (runes)
  mounted into Foundry v14 ApplicationV2 (no TyphonJS).
---

You are an expert developer for the TITAN Foundry VTT system: pure Svelte 5 (runes) mounted into
Foundry v14 ApplicationV2, with no TyphonJS / UI middleware.

## Mandatory first step

Before writing or changing ANY code, invoke these skills via the Skill tool, in order:

1. `svelte-5` — the Svelte 5 syntax authority (runes, snippets, `mount()`).
2. `foundry-vtt` — the Foundry v14 API router; it points you to the right `foundry-*` specialty
   skill for the task.
3. `foundry-svelte` — the no-middleware Svelte 5 + ApplicationV2 integration patterns this project
   uses.

Then consult the project's `titan-codebase` skill for the codebase map (architecture, abstractions,
data flow, conventions) before locating where new work fits.

## Rules

- Follow `.claude/CLAUDE.md` exactly: 120-column wrap; fully typed and commented declarations;
  `{}`-wrapped types with `[]` for optionals and a `-` between type and name; multiline objects
  (>1 property), arrays (>1 entry), and Svelte components (>1 prop, with `>`/`/>` on a new line);
  no `:global` selectors.
- This codebase is pure Svelte 5 + Foundry v14. NEVER reintroduce TyphonJS, `TJSDocument`,
  `SvelteApplication`, `ApplicationShell`, `$document`, `export let`, `$:`, `createEventDispatcher`,
  or `<svelte:component>`. Use runes, `mount()`/`unmount()`, the `ReactiveDocument` bridge
  (`document.data.*` via `getContext('document')`), and `{@const}` dynamic dispatch.
- Source lives in `src/`; the build output goes to the repo root (do not hand-edit build artifacts).
```

(No `tools` field → the agent inherits all tools, including the Skill tool it needs. No `model`
field → inherits the session model.)

## 2. Update `.claude/CLAUDE.md`

a. **Fix the stale TyphonJS line** in "Project Resources":
   - Current: "It makes particular use of the TyphonJS Runtime Library Foundry VTT, documented at
     https://typhonjs-fvtt-lib.github.io/api-docs/."
   - New: "It is built with pure Svelte 5 (runes) mounted directly into Foundry v14 ApplicationV2
     (no TyphonJS / UI middleware)."

b. **Add a delegation section:**

```markdown
# Delegating JavaScript & Svelte work

For any JavaScript or Svelte work in this project — writing, refactoring, reviewing, or debugging
`.js` / `.svelte` / `.svelte.js` files — use the `titan-svelte-dev` subagent
(`.claude/agents/titan-svelte-dev.md`). It always loads the `svelte-5`, `foundry-vtt`, and
`foundry-svelte` skills before working, and follows the code-style rules above.
```

## 3. Commit (on `development`)

One commit: `chore(agents): add titan-svelte-dev subagent + CLAUDE.md delegation`.

## 4. Push to mainline

"master" does not exist in this repo; the default branch is `main` (`origin/HEAD → main`).
`development` is ahead of `origin/development` by 12 commits and also carries:
- the **a11y work** (8 commits) whose in-Foundry visual gate was never completed (code-review
  APPROVED; cascade analysis says safe; not eyeballed),
- the **dead-dependencies** cleanup (3 commits),
- this **agent** work.

Pushing to `main` integrates ALL of it. Method + scope to be confirmed with the user (see the
open question).
```
