---
name: titan-codebase
description: Orientation map of the TITAN Foundry VTT system codebase — load this BEFORE building, adding, or modifying anything under systems/titan to learn what already exists, where it lives, the core abstractions and how they relate, and how new work should fit in. Covers the src/ layout, key classes (Check, TitanActor, DataModels, chat-message reports, rules-elements, sheets), data/control flow, and conventions (#runtime / #standard import maps, SCSS mixins, assert()). This skill is descriptive — a map, not a rulebook — and self-updating: reconcile its knowledge against what you learned at the end of each task.
---

# TITAN Codebase Map

Load this skill before writing or changing code under `systems/titan`. It tells you what already
exists, where it lives, and how to fit new work in. It is **descriptive, not prescriptive**:

- For *how code should be written* (style, formatting, typing, documentation rules), the authority
  is `.claude/CLAUDE.md`. This skill does not restate those rules.
- For *Foundry / Svelte framework APIs*, route to the sibling skills listed below.

## Stack at a glance

- TyphonJS runtime (`@typhonjs-fvtt/runtime`) + `@typhonjs-fvtt/standard`, reached via the
  `#runtime/*` and `#standard/*` import maps.
- Svelte **4** (not 5). Foundry **v13** (`foundry-vtt-types` v13).
- Build: Vite 5. Source lives in `src/`; build output goes to the repo root.

## Sibling skills — route here for framework/API knowledge

- `foundry-svelte-typhonjs` — the Svelte + Foundry UI layer this project actually uses.
- `svelte-4` — Svelte syntax. **Do NOT use `svelte-5`.**
- `foundry-vtt` (router) plus `foundry-data-models`, `foundry-applications`, `foundry-hooks`,
  `foundry-dice-chat`, `foundry-combat`, `foundry-config` — Foundry v13 API shape.

`foundry-svelte` (the no-middleware Svelte 5 path) and `svelte-5` do **NOT** apply to this codebase.

## Knowledge map — open the file you need

- `references/architecture.md` — the `src/` directory layout, module boundaries, build → root output.
- `references/abstractions.md` — the core classes and how they relate.
- `references/data-flow.md` — lifecycles and control/data flow (a check from dialog to chat report,
  sheet render, migration, combat turns).
- `references/conventions.md` — import maps, TyphonJS patterns in use, SCSS mixins, `assert()`,
  gotchas, and the pointer to `.claude/CLAUDE.md` for style rules.

## High-level architecture

<!-- BACKFILL: populated in Task 6 from the bootstrapped reference files. -->

## Self-update protocol — run at the end of every task in this codebase

When you finish a task where this skill was active, reconcile its knowledge:

1. **Gap check** — Did you have to read code to answer something this map should have told you but
   didn't? Add it to the right reference file.
2. **Stale check** — Did you change code that makes a documented fact here wrong? Correct it.

Before writing any entry, it must clear ALL of:

- **Durable & general** — a lasting fact about the codebase, not about this one task.
- **Verified** — confirmed against actual code, not assumed.
- **Non-duplicate** — not already covered elsewhere in the skill.
- **Concise** — tight phrasing, no narration.

Then edit the relevant `references/*.md` file directly and **report in your final message what you
added or changed**, one line per entry. The user reviews the change via the git diff. Do not prompt
for per-task confirmation.
