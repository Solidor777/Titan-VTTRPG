---
name: titan-codebase
description: Orientation map of the TITAN Foundry VTT system codebase — load this BEFORE building, adding, or modifying anything under systems/titan to learn what already exists, where it lives, the core abstractions and how they relate, and how new work should fit in. Covers the src/ layout, key classes (Check, TitanActor, DataModels, chat-message reports, rules-elements, sheets), data/control flow, and conventions (the `~/` import alias, SCSS mixins, assert()). This skill is descriptive — a map, not a rulebook — and self-updating: reconcile its knowledge against what you learned at the end of each task.
---

# TITAN Codebase Map

Load this skill before writing or changing code under `systems/titan`. It tells you what already
exists, where it lives, and how to fit new work in. It is **descriptive, not prescriptive**:

- For *how code should be written* (style, formatting, typing, documentation rules), the authority
  is `.claude/CLAUDE.md`. This skill does not restate those rules.
- For *Foundry / Svelte framework APIs*, route to the sibling skills listed below.

## Stack at a glance

- TyphonJS runtime (`@typhonjs-fvtt/runtime`) + `@typhonjs-fvtt/standard`, imported via bare
  `@typhonjs-fvtt/...` specifiers directly. The `#runtime/*` and `#standard/*` subpath maps are
  declared in `package.json` but are **not** used in `src/`. Intra-project imports use the `~/`
  Vite alias (resolves to `src/`).
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

Every document in TITAN — actor, item, chat message, combat — is a pair: a Foundry document class
(`TitanActor`, `TitanItem`, `TitanChatMessage`, `TitanCombat`) and a `TitanDataModel` subclass that owns the
schema, field validation, and derived-data logic. `TitanDataModel` introduces a frozen `#components` map for
composable derived-data, a `documentVersion` field, and version-aware `migrateData`. Actor data models form a
hierarchy (`TitanActorDataModel` → `CharacterDataModel` → `PlayerDataModel` / `NPCDataModel`); item data models
branch at `RulesElementItemDataModel` for the six item types that carry rules elements (Ability, Armor, Effect,
Equipment, Shield, Weapon).

When a character performs a check, `CharacterDataModel` reads derived stats built from owned items' rules
elements, constructs a typed `CheckParameters` object, optionally opens a `TitanDialog`-based check dialog for
user options, then instantiates the appropriate `TitanCheck` subclass (`AttributeCheck`, `AttackCheck`, etc.)
and calls `evaluateCheck()`. The check rolls dice, applies expertise, and computes type-specific results; all
output travels in `flags.titan` when `ChatMessage.create` is called. The `OnRenderChatMessageHTML` hook wraps
the resulting message in a `TJSDocument` store and mounts `ChatMessageShell.svelte`, which dispatches to the
correct check or report Svelte component based on the `flags.titan.type` flag.

All sheets follow a three-layer TyphonJS pattern: a JS application class extending `SvelteApplication`
(`TitanDocumentSheet` and its subclasses) wraps the Foundry document in a `TJSDocument` reactive store and
mounts `DocumentSheetShell.svelte`; the shell sets `document` and `applicationState` stores into Svelte context
so every descendant component can subscribe reactively via `$document`; the innermost components read and write
back through `document.update(...)` or the `refreshSystemDocument` snapshot helper. The `~/` Vite alias (→
`src/`) is the only intra-project import mechanism; TyphonJS packages are imported as bare `@typhonjs-fvtt/...`
specifiers.

Report chat messages close the loop between automation and actor state: confirm/apply buttons in report Svelte
components call back into `CharacterDataModel` methods (routed via `SocketManager` when the acting user does not
own the document) to commit outcomes like damage or healing, then update `flags.titan` on the chat document to
reflect the final resource state. `ActionQueue` serialises concurrent async mutations within data-model
automation paths; `SocketManager` mirrors Foundry Hooks across all connected clients via the `system.titan`
socket so turn-start/end effects, Fast Healing, Persistent Damage, and Resolve Regain are processed uniformly
regardless of who advanced the combat turn.

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
