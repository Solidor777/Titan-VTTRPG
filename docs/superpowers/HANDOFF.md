# Session Handoff — 2026-06-09 (chat mount keying + clone-then-update merged; NEXT = #23 → #12)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory.

## ✅ Last session — TODO #10 + #11 — DONE + MERGED + PUSHED

`main` is at **`a48d1445`** (fast-forward merged and **pushed to origin**; feature branch `chat-mount-keying`
deleted). Subagent-driven (6 plan tasks, fresh `titan-svelte-dev` implementers + two-stage review each + a final
dual holistic review: senior reviewer **and** `feature-dev:code-reviewer`, both cleared it with zero blocking
findings). **Verified: unit 221 (39 files) / full e2e green (3 foreground shards).**

Spec `specs/2026-06-06-chat-mount-keying-and-clone-update-design.md`, plan
`plans/2026-06-06-chat-mount-keying-and-clone-update.md`. Shipped:

- **#10 — per-element chat mount keying:** new `src/document/types/chat-message/ChatMessageMountRegistry.js`
  (`Map<HTMLElement,{handle,messageId,seen}>`); `TitanChatMessage.renderHTML` sweeps at entry + schedules a
  post-render `requestAnimationFrame(sweepStaleMounts)`; a `MutationObserver` on `#chat-notifications .chat-log`
  tears down dismissed notification cards; `registerMount` guards double-registration. Fixes the
  notification-pane/popout double-render blank card + the orphaned-mount hook leak across all three surfaces.
  `_svelteComponent`/`_teardownComponent` deleted.
- **Hook swap (user-approved spec amendment):** teardown moved from `preDeleteChatMessage` (initiator-only,
  pre-confirmation) → **`deleteChatMessage`** (`src/hooks/OnDeleteChatMessage.js`, all clients, confirmed
  deletions). Verified in `client-backend.mjs`.
- **#11 — clone-then-update:** the 3 check chat components (`CheckChatMessageDie`,
  `CheckChatResetExpertiseButton`, `CastingCheckChatMessageScalingAspect`; `CheckChatMessageDice` passes `idx`)
  build payloads from `system.toObject()`, mutate the clone, `update()`; the live DataModel is never written
  (12 mutation lines removed; `structuredClone` dropped).
- **2 opportunistic fixes (logged in `docs/CLOSED_BUGS.md`):** #1 `CastingCheckResults.js` roll-time auto-max now
  scales damage/healing by the aspect increment `delta*max(initialValue,1)` (was `delta` — divergence only with
  `initialValue>1` aspects), TDD'd. #2 fast-healing apply-confirm e2e read-race (was OPEN_BUGS #4) — the test
  polled the actor's stamina but one-shot-read the message's `confirmed`, which `confirm()` writes a SECOND await
  later; fix polls the message. Both pre-existing, unrelated to the branch.
- **New latent bug logged `docs/OPEN_BUGS.md` #8:** `TitanDataModel._migrateComponentData` /
  `_prepareComponentDerivedData` iterate `Object.entries(...)` treating the `[key,value]` pair as the component →
  component hooks can never run (dead path today; fix = `Object.values`).
- Docs/skill: TODO #10/#11 deleted; titan-codebase `abstractions.md`/`data-flow.md`/`conventions.md`/
  `architecture.md` updated; `docs/POST_WORK_FINDINGS.md` created (records the clone-then-update last-write-wins
  window).

## 🆕 Config change this session — Fable-class working-style layer (CLAUDE.md)

Added a model-conditioned override layer, **active only on Fable-class models** (`claude-fable-5`,
`claude-mythos-5`); inert on Opus 4.8 and others:

- **Global `~/.claude/CLAUDE.md`** — new `## Working style (Fable-class models)` section: Scope discipline,
  Assessment vs. action, Checkpoints (keeps design-decision consent), Finishing a turn, Subagents, Context budget.
- **Project `.claude/CLAUDE.md` (this repo)** AND **`C:\Dev\Titan\CLAUDE.md` (the separate Rust engine)** — each
  got a `## Fable-class models` section that defers to the global one. The project "Project Precedence" rule was
  left untouched (the project-authored deferral activates the global layer cleanly). On Fable, the single real
  project-rule override is context-budget (no 80% pause); Consent required + No unilateral spec/plan changes stay
  in force.
- Also present: the earlier-added global `### Plan execution on Fable-class models` rule (use the
  `mainline-plan-execution` skill instead of `subagent-driven-development`/`executing-plans`; subagent dispatch
  reserved for genuinely parallel work). These CLAUDE.md edits are **uncommitted** (config files, user-managed —
  do not stage them).

## ▶ NEXT — remaining TODO batch, user-approved order: #23 → #12

1. **#23** — extract the shared check-row presentation from `CharacterSheetItemCheck.svelte` /
   `CharacterSheetEffectCheck.svelte` (byte-identical template + styles after the CheckTags extraction; only the
   options-building script differs). Needs its own small pass (touches roll wiring).
2. **#12** — chat ↔ document path parity north-star (brainstorm strategy + first increment), informed by the
   path friction the chat-hygiene work surfaced.

Planning rules: load `foundry-vtt` + `titan-codebase` (+ `svelte-5`/`foundry-svelte` for Svelte specs).

## ⚠ Carried-forward OUTSTANDING (from the prior handoff)

User still owes the **manual deep-path pack-conversion verification** (run a COPY of a pre-conversion world with a
packed actor + world actor carrying legacy effect Items against current `main`; pass signal = a SECOND load with
zero red errors + zero conversion lines). Independent of this session's work.

## Gotchas (new this session)

- Leak probe for chat mounts = `Hooks.events.updateChatMessage?.length` deltas (1 registration per mounted card).
- The e2e world boots with the sidebar **COLLAPSED**; programmatic `ui.sidebar.changeTab` never expands it (only
  the user-click path does) — Playwright clicks on chat cards need `ui.sidebar.expand()` or they fail "outside the
  viewport".
- Notification-pane e2e must raise `ChatLog.NOTIFY_DURATION` (read live each ticker tick; `#rerenderMessage`
  carries `_lifeSpan` to the replacement, so an update does NOT reset the 5s auto-dismiss clock).
- Notification posting needs `core.uiConfig.chatNotifications === 'cards'` AND (collapsed sidebar with sufficient
  viewport width, or the chat tab not visible); a RENDERED popout suppresses posting entirely.
- `calculateCastingCheckResults` auto-maximizes a SOLE affordable scaling aspect at roll time (spends all extra
  successes; `extraSuccessesRemaining` → 0 for a cost-1 aspect).
- Per the user's live `.claude` edits, on **Fable-class models** use the `mainline-plan-execution` skill (inline
  compliance + single final branch review), NOT per-task subagent-driven review — even when a plan header names
  the older skills.

## Repo state at handoff

- `main` @ `a48d1445`, pushed; `origin/main` in sync. Working tree dirty only with the sanctioned never-stage
  noise (`packs/effects/*`, `.claude/settings.local.json`, `.claude/scheduled_tasks.lock`) **plus the uncommitted
  CLAUDE.md Fable-layer edit** (project `.claude/CLAUDE.md`). Do not stage `packs/` or `.claude/*`.
- Branches left: `development`, `chore/build-output-dist`, `chore/e2e-sleep-removal`,
  `feat/chat-message-subtypes-phase2-item-dm-templates` (older; not this session's concern).
