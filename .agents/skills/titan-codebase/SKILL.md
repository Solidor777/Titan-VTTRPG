---
name: titan-codebase
description: >-
  Orientation map of the TITAN Foundry VTT system codebase. Load before
  building, adding, or modifying anything under systems/titan to learn what
  already exists, where it lives, core abstractions, data flow, and conventions.
  This skill is descriptive and self-updating; reconcile its knowledge against
  what you learn at the end of each task.
---

# TITAN Codebase Map

Load this skill before writing or changing code under `systems/titan`. It tells you what already
exists, where it lives, and how to fit new work in. It is **descriptive, not prescriptive**:

- For *how code should be written* (style, formatting, typing, documentation rules), the authority
  is `.Codex/AGENTS.md`. This skill does not restate those rules.
- For *Foundry / Svelte framework APIs*, route to the sibling skills listed below.

## Stack at a glance

- **Pure Svelte 5 (runes)** mounted directly into Foundry **v14** `ApplicationV2` — no UI
  middleware. TyphonJS was fully removed in the v14 migration. Intra-project imports use the `~/`
  Vite alias (resolves to `src/`); `$fonts/` aliases the repo `fonts/` directory.
- Foundry **v14** (`system.json` compatibility: minimum 13 / verified 14 / maximum 14). Editor types
  come from the live Foundry install — `jsconfig.json` includes `../../../../foundry/common/**` and
  `foundry/public/scripts/**`; there is no `foundry-vtt-types` dependency.
- Build: Vite 8 (Rolldown-based) with `@sveltejs/vite-plugin-svelte`. Source lives in `src/`; build
  output goes to the repo root. The Svelte plugin sets `configFile: false` (inline `preprocess`, no
  `svelte.config.js`); node-module resolution is native (no `@rollup/plugin-node-resolve`).

## Sibling skills — route here for framework/API knowledge

- `foundry-svelte` — the no-middleware **pure Svelte 5 + ApplicationV2** UI layer this project
  actually uses.
- `svelte-5` — Svelte syntax (runes, snippets, `mount()`).
- `foundry-vtt` (router) plus `foundry-data-models`, `foundry-applications`, `foundry-hooks`,
  `foundry-dice-chat`, `foundry-combat`, `foundry-config` — Foundry API shape.

`foundry-svelte-typhonjs` and `svelte-4` (the TyphonJS / Svelte 4 path) do **NOT** apply to this
codebase — that stack was removed in the v14 migration.

## Knowledge map — open the file you need

- `references/architecture.md` — the `src/` directory layout, module boundaries, build → root output.
- `references/abstractions.md` — the core classes and how they relate.
- `references/data-flow.md` — lifecycles and control/data flow (a check from dialog to chat report,
  sheet render, migration, combat turns).
- `references/conventions.md` — import maps, application & reactivity patterns, SCSS mixins,
  `assert()`, gotchas, and the pointer to `.Codex/AGENTS.md` for style rules.

## High-level architecture

Every document in TITAN — actor, item, chat message, combat — is a pair: a Foundry document class
(`TitanActor`, `TitanItem`, `TitanChatMessage`, `TitanCombat`) and a `TitanDataModel` subclass that owns the
schema, field validation, and derived-data logic. `TitanDataModel` introduces a frozen `#components` map for
composable derived-data, a `documentVersion` field, and version-aware `migrateData`. Actor data models form a
hierarchy (`TitanActorDataModel` → `CharacterDataModel` → `PlayerDataModel` / `NPCDataModel`); item data models
branch at `RulesElementItemDataModel` for the five item types that carry rules elements (Ability, Armor,
Equipment, Shield, Weapon). Effects are native Active Effects, not items: `TitanActiveEffectDataModel` carries
rules elements via the same shared `RulesElementMixin`, and `TitanActiveEffect` is registered as
`CONFIG.ActiveEffect.documentClass`.

When a character performs a check, `CharacterDataModel` reads derived stats built from owned items' rules
elements, constructs a typed `CheckParameters` object, optionally opens a `TitanDialog`-based check dialog for
user options, then instantiates the appropriate `TitanCheck` subclass (`AttributeCheck`, `AttackCheck`, etc.)
and calls `evaluateCheck()`. The check rolls dice, applies expertise, and computes type-specific results; all
output travels in `message.system` as a first-class `ChatMessage` subtype when `ChatMessage.create` is called.
ALL TITAN chat messages — the 5 checks, the 7 item cards, the 13 report cards, and the `effect` card — are
first-class self-rendering subtypes via `TitanChatMessage#renderHTML` (which mounts `ChatMessageContent.svelte`
and dispatches on the leaf DataModel's `get component()`); no chat payload travels in `flags.titan`, and there
is no legacy chat render hook or shell. `TitanActiveEffectDataModel` and the effect card's
`EffectChatMessageDataModel` build their schemas from the shared `createEffectSystemTemplate()` single source.

All sheets follow a three-layer pattern: a JS application class extending Foundry v14 `DocumentSheetV2`
(`TitanDocumentSheet` and its subclasses) builds a `ReactiveDocument` bridge around the Foundry document and
mounts `DocumentSheetShell.svelte` with Svelte 5's `mount()` on first render; the shell sets the `document`
bridge and the `applicationState` store into Svelte context so every descendant reads
`const document = getContext('document')` and accesses live, reactive data via `document.data.system.*`
(`'document'` may be shadowed by `EmbeddedDocumentProvider` for embedded subtrees; `'sheetDocument'` is the
never-shadowed top-level bridge); the
innermost components write back through `document.data.update(...)` or the `refreshSystemDocument` snapshot
helper. The `~/` Vite alias (→ `src/`) is the intra-project import mechanism; no TyphonJS packages remain.

Report chat messages close the loop between automation and actor state: apply/confirm buttons in report Svelte
components call back into `CharacterDataModel` methods (routed via `SocketManager` when the acting user does not
own the document) to commit outcomes like fast healing or persistent damage, then update `message.system` on the
chat document (a typed report subtype) to reflect the final resource state. `ActionQueue` is a serial task queue
for sequencing racy async mutations,
lazily created per actor but currently without callers; `SocketManager` mirrors Foundry Hooks across all
connected clients via the `system.titan` socket so turn-start/end effects, Fast Healing, Persistent Damage, and
Resolve Regain are processed uniformly regardless of who advanced the combat turn.

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
