# titan-codebase Knowledge Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project-local, self-updating Claude skill that maps the TITAN Foundry VTT codebase, loaded before writing code so the agent knows what exists and how new work fits in.

**Architecture:** A skill at `.claude/skills/titan-codebase/` with a lean `SKILL.md` (orientation map + table of contents + self-update protocol) and four `references/*.md` files (architecture, abstractions, data-flow, conventions). Reference files are bootstrapped by scanning `src/`. The skill points outward to the TyphonJS + Svelte-4 + `foundry-*` sibling skills for framework/API knowledge rather than duplicating it.

**Tech Stack:** Markdown skill files. The documented codebase uses TyphonJS runtime (`@typhonjs-fvtt/runtime`), Svelte 4, Vite 5, Foundry v13 (foundry-vtt-types v13), with `#runtime/*` and `#standard/*` import maps.

**Note on format:** This is a documentation-authoring plan. The deliverables are markdown files, so "verification" steps check artifact correctness (frontmatter validity, required sections present, cross-references resolve, scan coverage) rather than running unit tests. Each reference-file task is a *scan-then-write* procedure: the exact inputs to read and the exact output structure are specified; the prose is generated from the live scan and must be verified against actual code (project memory is point-in-time and may be stale).

---

## File Structure

```
.claude/skills/titan-codebase/
├── SKILL.md                      # Created in Task 1; architecture section backfilled in Task 6
└── references/
    ├── architecture.md           # Task 2
    ├── abstractions.md           # Task 3
    ├── data-flow.md              # Task 4
    └── conventions.md            # Task 5
```

Spec reference: `docs/superpowers/specs/2026-05-24-titan-codebase-knowledge-skill-design.md`.

---

## Task 1: Scaffold directory and author SKILL.md

**Files:**
- Create: `.claude/skills/titan-codebase/SKILL.md`
- Create (dir): `.claude/skills/titan-codebase/references/`

- [ ] **Step 1: Create the directory structure**

Run:
```bash
mkdir -p .claude/skills/titan-codebase/references
```

- [ ] **Step 2: Write SKILL.md with the exact content below**

Write `.claude/skills/titan-codebase/SKILL.md`:

```markdown
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
```

- [ ] **Step 3: Verify the file exists and frontmatter is well-formed**

Run:
```bash
test -f .claude/skills/titan-codebase/SKILL.md && head -5 .claude/skills/titan-codebase/SKILL.md
```
Expected: prints the YAML frontmatter opening `---`, the `name: titan-codebase` line, and the start of `description:`.

- [ ] **Step 4: Verify name and description keys are present**

Run:
```bash
grep -E '^(name|description):' .claude/skills/titan-codebase/SKILL.md
```
Expected: exactly two lines — `name: titan-codebase` and the `description:` line.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase/SKILL.md
git commit -m "Add titan-codebase skill scaffold and SKILL.md"
```

---

## Task 2: Bootstrap references/architecture.md

**Files:**
- Create: `.claude/skills/titan-codebase/references/architecture.md`
- Scan (read-only): `src/` tree

- [ ] **Step 1: Map the src/ tree**

Run (or use the Glob tool):
```bash
find src -type d | sort
```
Then list the top-level files in each major directory. Capture the real directory layout — do not
rely on memory.

- [ ] **Step 2: Read the entry points and top-level files**

Read these to confirm module boundaries (paths are starting points; follow what actually exists):
- `src/system/` — all JS files (system init, registration, hooks wiring).
- `src/hooks/` — all files (which Foundry hooks are registered and what they do).
- `vite.config.*` and `system.json` at the repo root — build inputs/outputs and manifest wiring.

- [ ] **Step 3: Write architecture.md with this exact section structure**

Write `.claude/skills/titan-codebase/references/architecture.md` using these headings, filling each
with verified facts from the scan:

```markdown
# Architecture & Directory Map

## Top-level src/ layout
<!-- One bullet per major directory under src/, each with a one-line statement of its responsibility.
     Cover at least: check/, document/, helpers/, hooks/, system/. -->

## Module boundaries
<!-- How the major areas depend on each other. What is the entry point (system init)? What does
     hooks/ wire up? What does helpers/ provide to the rest? -->

## Build and output
<!-- Vite build: src/ is the source; output goes to the repo root. Manifest (system.json) wiring,
     esmodule/styles entry points. -->
```

- [ ] **Step 4: Verify required sections are present**

Run:
```bash
grep -E '^## ' .claude/skills/titan-codebase/references/architecture.md
```
Expected: three headings — `## Top-level src/ layout`, `## Module boundaries`, `## Build and output`.

- [ ] **Step 5: Verify no scan placeholders remain**

Run:
```bash
grep -nE '<!-- One bullet|<!-- How the|<!-- Vite build|TODO|TBD' .claude/skills/titan-codebase/references/architecture.md || echo "CLEAN"
```
Expected: `CLEAN` (the instructional HTML comments were replaced with real content).

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/titan-codebase/references/architecture.md
git commit -m "Bootstrap architecture.md for titan-codebase skill"
```

---

## Task 3: Bootstrap references/abstractions.md

**Files:**
- Create: `.claude/skills/titan-codebase/references/abstractions.md`
- Scan (read-only): document, check, chat-message, rules-element, sheet, helpers source

- [ ] **Step 1: Read the core abstraction sources**

Read these (follow real paths; confirm names against the code):
- `src/document/data-model/` — `TitanDataModel.js`, `TitanActorDataModel.js` (base data models).
- `src/document/types/actor/` — `TitanActor.js`, actor data models, character/player/npc subtypes.
- `src/document/types/item/` — item document, `types/` (ability, armor, commodity, effect,
  equipment, shield, spell, weapon), `rules-element/`.
- `src/check/` — `Check.js`, `CheckResults.js`, and the check subtypes.
- `src/document/types/chat-message/` — chat message document, `report/`, `components/`.
- `src/document/sheet/TitanDocumentSheet.js` and the actor/item sheet classes + Svelte shells.
- `src/helpers/` — `ActionQueue.js`, `SocketManager.js`, `utility-functions/`.

- [ ] **Step 2: Write abstractions.md with this exact section structure**

Write `.claude/skills/titan-codebase/references/abstractions.md`:

```markdown
# Core Abstractions & How They Relate

## Documents & data models
<!-- TitanActor, item documents, the DataModel hierarchy (TitanDataModel → TitanActorDataModel →
     CharacterDataModel → player/npc; item data models). What each is responsible for. -->

## Checks
<!-- Check, CheckResults, the check subtypes (attack, attribute, casting, etc.). What a Check
     represents and what CheckResults holds. -->

## Chat messages & reports
<!-- The chat message document, the report components, the apply/confirm button components. -->

## Rules elements
<!-- What a rules element is and the set of rules-element types. How they attach to items. -->

## Sheets
<!-- TitanDocumentSheet base, actor/item sheet classes, the TyphonJS Svelte app shells and the
     Svelte component trees. -->

## Shared helpers
<!-- ActionQueue, SocketManager, utility-functions, svelte-components, svelte-actions — what the
     rest of the system relies on them for. -->

## How they wire together
<!-- A short narrative connecting the above: an item carries rules elements; an actor's data model
     aggregates them; a Check reads actor/item data; results render as a chat report. -->
```

- [ ] **Step 3: Verify required sections are present**

Run:
```bash
grep -E '^## ' .claude/skills/titan-codebase/references/abstractions.md
```
Expected: seven headings (Documents & data models, Checks, Chat messages & reports, Rules elements, Sheets, Shared helpers, How they wire together).

- [ ] **Step 4: Verify no scan placeholders remain**

Run:
```bash
grep -nE '<!-- |TODO|TBD' .claude/skills/titan-codebase/references/abstractions.md || echo "CLEAN"
```
Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase/references/abstractions.md
git commit -m "Bootstrap abstractions.md for titan-codebase skill"
```

---

## Task 4: Bootstrap references/data-flow.md

**Files:**
- Create: `.claude/skills/titan-codebase/references/data-flow.md`
- Scan (read-only): check flow, sheet render, migration, combat

- [ ] **Step 1: Trace the key flows in code**

Read to trace each flow end-to-end (confirm the actual call paths):
- Check flow: the check dialog (`src/check/.../*DialogShell.svelte` + dialog JS) → `Check.js`
  (`evaluateCheck`/roll) → `CheckResults.js` → chat report (`src/document/types/chat-message/report/`)
  → apply/confirm buttons.
- Sheet render: how a TyphonJS `SvelteApp`/app shell mounts the Svelte component tree and binds to
  the document's reactive store (`TJSDocument`).
- Migration: the migration system (recent commits "Added migration system", "Mad migration a
  system option") — where it lives, how it triggers, where the version is stored.
- Combat/turn flow: turn progression and the turn-revert reports/settings
  (`src/document/types/combat/` and related hooks).

- [ ] **Step 2: Write data-flow.md with this exact section structure**

Write `.claude/skills/titan-codebase/references/data-flow.md`:

```markdown
# Data & Control Flow

## A check, end to end
<!-- Dialog (gather parameters) → Check (evaluate/roll) → CheckResults → chat report render →
     apply/confirm buttons mutate actor state. Name the real files/classes at each hop. -->

## Sheet render lifecycle
<!-- How a SvelteApp/app shell mounts the Svelte tree, how it binds to the document via the
     reactive store, and how user edits flow back to the document. -->

## Migration system
<!-- Where migration lives, what triggers it (init/ready, version compare), where the world/system
     version is stored, and how a migration step is added. -->

## Combat & turn flow
<!-- Turn progression, the effects applied on turn change, and the turn-revert mechanism. -->
```

- [ ] **Step 3: Verify required sections are present**

Run:
```bash
grep -E '^## ' .claude/skills/titan-codebase/references/data-flow.md
```
Expected: four headings (A check, end to end; Sheet render lifecycle; Migration system; Combat & turn flow).

- [ ] **Step 4: Verify no scan placeholders remain**

Run:
```bash
grep -nE '<!-- |TODO|TBD' .claude/skills/titan-codebase/references/data-flow.md || echo "CLEAN"
```
Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase/references/data-flow.md
git commit -m "Bootstrap data-flow.md for titan-codebase skill"
```

---

## Task 5: Bootstrap references/conventions.md

**Files:**
- Create: `.claude/skills/titan-codebase/references/conventions.md`
- Scan (read-only): package.json, import usage, SCSS, assert usage; read `.claude/CLAUDE.md`

- [ ] **Step 1: Gather the convention facts**

Confirm against code:
- Import maps: `#runtime/*` → `@typhonjs-fvtt/runtime/*`, `#standard/*` →
  `@typhonjs-fvtt/svelte-standard/*` (from `package.json` `imports`). Find real usage examples.
- TyphonJS patterns actually used (`TJSDocument`, `SvelteApp`/app shell, `#standard` components).
- SCSS: the move away from `:global` toward mixins (recent commit "Removed use of global styles,
  and propagated the use of mixins"). Where the mixins live.
- `assert()`: imported from helpers, used instead of `game.titan.assert()`.
- Build/output layout (cross-link to architecture.md rather than repeating).
- Read `.claude/CLAUDE.md` so the pointer accurately summarizes what it governs.

- [ ] **Step 2: Write conventions.md with this exact section structure**

Write `.claude/skills/titan-codebase/references/conventions.md`:

```markdown
# Conventions & Non-Obvious Facts

> Descriptive only. For the authoritative style/formatting/documentation rules, see
> `.claude/CLAUDE.md` (summarized at the bottom of this file).

## Import maps
<!-- #runtime/* and #standard/* — what they resolve to and a real import example. -->

## TyphonJS patterns in use
<!-- TJSDocument reactive stores, SvelteApp / app shell mounting, #standard components. -->

## Styling
<!-- SCSS mixins are preferred over :global styles (a deliberate refactor). Where shared mixins
     live and how component styles consume them. -->

## assert()
<!-- assert() is imported from helpers and used instead of game.titan.assert(). -->

## Other gotchas
<!-- Anything non-obvious a newcomer would trip on. -->

## Style rules live in CLAUDE.md
<!-- One short paragraph: .claude/CLAUDE.md is the authority for code style (120-char wrap,
     multiline objects/arrays/components, strict typing with @type, JSDoc rules). This skill does
     not restate them — read CLAUDE.md before writing code. -->
```

- [ ] **Step 3: Verify the CLAUDE.md pointer is present**

Run:
```bash
grep -c 'CLAUDE.md' .claude/skills/titan-codebase/references/conventions.md
```
Expected: a count of 2 or more (front note + the dedicated section).

- [ ] **Step 4: Verify required sections are present and no placeholders remain**

Run:
```bash
grep -E '^## ' .claude/skills/titan-codebase/references/conventions.md && \
grep -nE '<!-- |TODO|TBD' .claude/skills/titan-codebase/references/conventions.md || echo "CLEAN"
```
Expected: six headings printed, then `CLEAN`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase/references/conventions.md
git commit -m "Bootstrap conventions.md for titan-codebase skill"
```

---

## Task 6: Backfill SKILL.md architecture section and run final validation

**Files:**
- Modify: `.claude/skills/titan-codebase/SKILL.md` (the `## High-level architecture` section)

- [ ] **Step 1: Replace the BACKFILL placeholder with a 2–4 paragraph overview**

In `.claude/skills/titan-codebase/SKILL.md`, replace:
```markdown
## High-level architecture

<!-- BACKFILL: populated in Task 6 from the bootstrapped reference files. -->
```
with a 2–4 paragraph synthesis drawn from the four reference files: the one-screen mental model of
how a TITAN system request flows (document + data model → sheet/Svelte UI → check → chat report →
apply), written so a reader gets oriented before opening any reference file.

- [ ] **Step 2: Verify the placeholder is gone**

Run:
```bash
grep -n 'BACKFILL' .claude/skills/titan-codebase/SKILL.md || echo "CLEAN"
```
Expected: `CLEAN`.

- [ ] **Step 3: Verify every referenced file exists**

Run:
```bash
for f in architecture abstractions data-flow conventions; do
  test -f ".claude/skills/titan-codebase/references/$f.md" && echo "ok $f" || echo "MISSING $f"
done
```
Expected: four `ok` lines, no `MISSING`.

- [ ] **Step 4: Verify the cross-referenced sibling skills are named correctly**

Run:
```bash
grep -oE 'foundry-svelte-typhonjs|svelte-4|foundry-vtt|svelte-5|foundry-svelte' .claude/skills/titan-codebase/SKILL.md | sort | uniq -c
```
Expected: `foundry-svelte-typhonjs`, `svelte-4`, and `foundry-vtt` appear; `svelte-5` and
`foundry-svelte` appear only in the "do NOT apply" lines (confirm by reading those lines in context).

- [ ] **Step 5: Verify all reference files are non-trivial (real content, not skeletons)**

Run:
```bash
wc -l .claude/skills/titan-codebase/references/*.md
```
Expected: each file has substantially more lines than its heading count (real prose was written).

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/titan-codebase/SKILL.md
git commit -m "Backfill high-level architecture in titan-codebase SKILL.md"
```

---

## Task 7: Manual trigger verification (user-run)

**Files:** none (verification only)

- [ ] **Step 1: Reload skills**

In a Claude Code session in this repo, confirm `titan-codebase` appears in the available skills list
(restart the session if skills are cached).

- [ ] **Step 2: Confirm it triggers on a build request**

Start a request like *"add a new item type to the TITAN system"* and confirm the agent loads the
`titan-codebase` skill to orient before writing code. If it does not trigger, tune the `description`
wording (the trigger phrases) and re-test.

- [ ] **Step 3: Confirm the self-update loop**

After a task that touched new ground, confirm the agent reports what it added/changed to the
reference files, and that the change is visible in `git diff`.

---

## Self-Review

**Spec coverage:**
- §4 location/structure → Task 1 (scaffold + SKILL.md), Tasks 2–5 (reference files). ✓
- §5 SKILL.md (frontmatter, body, TOC, self-update protocol) → Task 1; architecture overview → Task 6. ✓
- §6 self-update protocol (trigger, two checks, quality bar, write+report) → in SKILL.md (Task 1). ✓
- §7 cross-references scoped to TyphonJS + Svelte-4 + foundry-* with the "do NOT apply" note → SKILL.md (Task 1), validated Task 6 Step 4. ✓
- §8 CLAUDE.md relationship → conventions.md (Task 5), validated Task 5 Step 3. ✓
- §9 bootstrap via src/ scan → Tasks 2–5 scan-then-write procedures. ✓
- Use-case clarification (load before writing code) → reflected in the SKILL.md description (Task 1). ✓

**Placeholder scan:** Reference-file tasks ship instructional HTML comments that MUST be replaced; each task includes a grep step asserting `CLEAN` / no remaining `<!-- ` comments, so skeletons cannot survive to commit. ✓

**Type/name consistency:** File paths, skill names, and section headings are identical across tasks and validation steps (e.g., `foundry-svelte-typhonjs`, `references/conventions.md`, the four reference filenames). ✓
