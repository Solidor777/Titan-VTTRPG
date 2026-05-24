# Design: `titan-codebase` — a self-updating codebase knowledge skill

- **Date:** 2026-05-24
- **Status:** Approved (design); pending implementation plan
- **Author:** brainstormed with Claude

## 1. Purpose

Create a project-local Claude skill that holds **descriptive knowledge of the TITAN
Foundry VTT system codebase** — a map of the territory, not a rulebook. It exists so that
Claude (and any teammate's Claude) can orient quickly in this specific codebase instead of
re-deriving its structure from scratch each session.

The skill is a **living document**: it updates its own knowledge as it is used.

## 2. Non-goals

- **Not prescriptive.** It does not tell anyone how code *should* be written. Style and
  formatting rules already live authoritatively in `.claude/CLAUDE.md`; this skill points to
  that file rather than restating or competing with it.
- **Not a Foundry/Svelte API reference.** It does not duplicate framework knowledge. It
  references the existing Foundry/Svelte skills for API shape and framework patterns.
- **Not a task log.** It captures durable, general facts about the codebase, not notes about
  any single task.

## 3. Stack context (verified)

From `package.json`:

- `@typhonjs-fvtt/runtime` `^0.3.0-next.4` and `@typhonjs-fvtt/standard` `^0.3.0-next.4`
- Svelte `^4.2.19` (Svelte **4**, not 5)
- Vite `^5.4.10`, `@sveltejs/vite-plugin-svelte` `^3.1.2`
- `@league-of-foundry-developers/foundry-vtt-types` `^13.x` (Foundry **v13**)
- Import maps: `#runtime/*` → `@typhonjs-fvtt/runtime/*`, `#standard/*` → `@typhonjs-fvtt/svelte-standard/*`

This stack determines which sibling skills are correct references (see §7).

## 4. Location & structure

A project-local skill, **committed to the repo**:

```
.claude/skills/titan-codebase/
├── SKILL.md                      # Concise map + table of contents + the self-update protocol
└── references/
    ├── architecture.md           # src/ layout, module boundaries, build → root output
    ├── abstractions.md           # Core classes & how they relate
    ├── data-flow.md              # Lifecycles and control/data flow
    └── conventions.md            # Import maps, TyphonJS patterns, SCSS mixins, assert(), gotchas + CLAUDE.md pointer
```

Rationale: `SKILL.md` is loaded on every activation, so it stays lean (the map and the
protocol). Detail lives in reference files that are read only when relevant, keeping each use
context-light. Per-area files (rather than per-subsystem) match the knowledge categories the
user chose and keep the file count low. Committing to the repo means self-updates appear as
reviewable git changes that travel with the code.

## 5. SKILL.md contents

### 5.1 Frontmatter / triggering

`name: titan-codebase`

`description` (descriptive, triggers on orientation tasks): a map of the TITAN Foundry VTT
system codebase — where things live, the core abstractions and how they relate, data/control
flow through checks and chat reports, and non-obvious conventions. Use when working anywhere
under `systems/titan` and you need to orient instead of re-deriving structure; self-updating,
so reconcile its knowledge at the end of each task.

The final wording is produced during implementation and tuned for trigger accuracy; it must
make clear the skill is (a) descriptive, (b) TITAN-specific, and (c) self-updating.

### 5.2 Body

- A high-level architecture overview (a few paragraphs) — the one-screen mental model.
- A table of contents pointing to the four reference files, each with a one-line description
  of what it covers, so Claude knows which to open.
- Explicit cross-references to the sibling skills (see §7).
- The self-update protocol (see §6).

## 6. Self-update protocol

Defined in `SKILL.md` so it is always in context when the skill is active.

**Trigger:** At the end of any task where the skill was active / the codebase was worked in.

**Reconciliation — two checks:**

1. **Gap:** Did you have to read code to answer something this map should have told you but
   didn't? → add it.
2. **Stale:** Did you change code that makes a documented fact wrong? → correct it.

**Quality bar (every entry must clear all before being written):**

- Durable and general — a lasting fact about the codebase, not specific to this one task.
- Verified against actual code, not assumed.
- Not already covered elsewhere in the skill.
- Concise — tight phrasing, no narration.

**Write behavior:** Edit the relevant reference file directly (auto-write). Then report in the
final message what was added/changed, one line per entry. Changes are reviewed by the user via
the git diff and committed alongside their work. No per-task confirmation prompt.

**Reliability note:** Enforcement rests on the protocol being in-context via `SKILL.md`; it is a
model-followed instruction, not a hard harness gate. A `Stop` hook could reinforce it later if
adherence proves unreliable — explicitly out of scope for the first version (YAGNI).

## 7. Cross-references to sibling skills

The skill points outward for framework/API knowledge rather than duplicating it. Scoped to the
verified stack:

- **`foundry-svelte-typhonjs`** — the Svelte + Foundry UI layer (this project's actual path).
- **`svelte-4`** — Svelte syntax. **NOT `svelte-5`.**
- **`foundry-vtt`** (router) and the relevant `foundry-*` API skills (data-models,
  applications, hooks, dice-chat, combat, config) — Foundry v13 API shape.

The skill will **explicitly note that `foundry-svelte` (the no-middleware Svelte 5 path) and
`svelte-5` do NOT apply** to this codebase, to prevent routing to the wrong stack.

> Open flag for user review: the user originally mentioned all three Svelte skills (svelte,
> foundry-svelte, foundry-svelte-typhonjs). This design narrows that to the two correct for the
> stack. If the user wants all listed regardless, widen §7.

## 8. Relationship to CLAUDE.md

`conventions.md` *describes that* the codebase follows a set of style/formatting rules and
**points to `.claude/CLAUDE.md` as the single source of truth**, without restating them. This
keeps one authority and prevents drift between the two documents.

## 9. Bootstrap / seeding plan

The skill ships **populated**, not empty. During implementation:

1. Perform a structured scan of `src/` (directory tree + reading key files) to establish the
   current architecture, core abstractions, and principal data flows.
2. Seed the four reference files with verified, current facts. Known structural anchors from
   existing project memory provide a starting outline, but every fact written is confirmed
   against the live code during the scan (memory is point-in-time and may be stale).
3. Seed `conventions.md` with the import maps, the move to SCSS mixins (away from global
   styles), the `assert()` usage, the migration system, and the build/output layout — plus the
   CLAUDE.md pointer.

Result: useful on day one, and it grows via the self-update protocol thereafter.

## 10. Resolved decisions

| Decision | Choice |
|---|---|
| Knowledge scope | Architecture/directory map, key abstractions & relations, data flow & lifecycles, conventions & non-obvious facts, plus a descriptive pointer to style rules |
| Update trigger | Both gap-driven and change-driven, reconciled at end of task |
| Structure | Index `SKILL.md` + per-area reference files |
| Write behavior | Auto-write + report; reviewed via git diff |
| Location | In the repo, committed (`.claude/skills/titan-codebase/`) |
| Seeding | Bootstrap with a structured `src/` scan |
| Reference scope | TyphonJS + Svelte-4 skills only (flagged for review) |

## 11. Out of scope (this version)

- A `Stop` hook (or any harness-level enforcement) for the self-update protocol.
- Auto-generated, exhaustive per-file documentation. The skill is a navigable map, not a
  generated API dump.
- Any change to `.claude/CLAUDE.md` itself.
