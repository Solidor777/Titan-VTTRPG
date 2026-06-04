# Session Handoff — 2026-06-04 (follow-up B shipped)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory.

## ✅ Shipped this session — follow-up B (merged to `main`)

**Item DataModels now build their `system` schema from the shared shape templates** (single source of
truth — the item schema and the item chat-card schema can no longer drift). Branch
`feat/chat-message-subtypes-phase2-item-dm-templates`, fast-forwarded into `main` and pushed.

- **Approach C (user decision):** instead of per-field config overrides, `buildSchemaFromShape` was
  generalized so a template array literal IS the field's default contents (cloned into `initial`) with an
  untyped `ObjectField` element. The templates therefore express every current item-schema default:
  weapon's seeded default `attack`, the empty dynamic arrays (`check`/`customTrait`/`aspect`/
  `customAspect`/`trait`/`rulesElement`), and spell/ability `xpCost` (templates call `defaultXpCost*()`).
- Every item DataModel's `_defineDocumentSchema()` is now
  `{ ...super._defineDocumentSchema(), ...buildSchemaFromShape(<template>) }` — NO hand-written fields.
  `documentVersion` still comes ONLY from `super` (base `TitanDataModel`, a non-integer `NumberField`);
  it is never templatized.
- **DATA-INTEGRITY SENSITIVE — gated by a byte-exact characterization test:**
  `tests/unit/ItemDataModelSchemaEquivalence.test.js` is a golden master of all 7 current item schemas
  (field kind + required/nullable/integer + resolved initials; it intentionally omits an `ArrayField`
  element's own initial, which is inert). The refactor passes it byte-for-byte → proven equivalent.
- **Verified:** unit **124**, full e2e **365** at parity (incl. socket-sync A1–A5, all 7 render-smokes,
  every reactive-* item spec, item-cards ×7), `npm run build` clean (single chunk, no dynamic imports,
  probe-free). Independent code review: no critical/important behavioral issues.
- **Plan:** `docs/superpowers/plans/2026-06-04-chat-subtypes-followup-B-item-dm-templates.md`.
- **KEY LEARNING for D / future template work:** `buildSchemaFromShape` now means "an array literal =
  the field's default contents; object array elements are untyped `ObjectField` bags; primitive array
  elements keep their typed field; non-array plain objects stay typed `SchemaField`." A setting-driven
  default can live in a template by calling the setting helper at schema-build time (e.g. `xpCost`).

## ⏳ PENDING — follow-up D, then Phases 3–4 (the chat-message-subtypes roadmap)

- **(D) Build the *check* chat schemas from the check template objects** via `buildSchemaFromShape` (the
  check-side reparenting is already merged at `a12efb50`). Investigate whether explicit check
  parameter/result template objects exist or shapes need a runtime capture; **preserve check component
  read paths** (`system.parameters.X` / `system.results.X`); the point is that resistance's shape
  genuinely diverges from the attribute-shaped checks. Lower risk than B (chat-message schemas are
  ephemeral snapshots, not real document data). Verify unit + check e2e (`interaction-rolls`, `checks-*`).
- **Phase 3 (reports ×13)** and **Phase 4 (effect + delete the legacy `OnRenderChatMessageHTML` mount +
  the `ChatMessageShell.svelte` switch)** — not yet specced. Reuse the proven item pattern.
- Backlog detail: `docs/TODO.md` ("Chat message subtypes" section).

## How to resume
1. `git checkout main` (B is merged; start D from a fresh branch off `main`).
2. Load skills: `foundry-vtt`, `titan-codebase`, `foundry-data-models` (+ `svelte-5`/`foundry-svelte` if a
   spec touches `.svelte`). Route `.js`/`.svelte` edits through the `titan-svelte-dev` subagent.
3. Spec/start **follow-up D** (check chat schemas from templates), then spec Phase 3 / Phase 4.

## Rules (CLAUDE.md, non-negotiable)
No test/e2e code in shipping builds; test/e2e → `test/build/` self-cleaning; no dynamic imports in
shipping; no stub fixes (fix root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`; project
`.claude/CLAUDE.md` supersedes all; route `.js`/`.svelte` to `titan-svelte-dev`. **NEVER `git add packs/`**
(live-world LevelDB churn — stage explicit paths only). e2e is **world-launch-gated** (`:30000`); test
source = `tests/` (plural), built artifacts = `test/build/` (singular, gitignored).
