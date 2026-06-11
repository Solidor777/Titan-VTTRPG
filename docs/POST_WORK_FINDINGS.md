# Post-Work Findings

Living record of post-work review issues — gotchas, accepted limitations, and issues that deserve
attention. NOT a to-do list (deferred work goes to `docs/TODO.md`; bugs go to `docs/OPEN_BUGS.md`).

### Player HUD: the shell's `options` prop is a mount-time snapshot (2026-06-11)

`TitanPlayerHud.#mountActors` passes `playerHudOptions()` as a plain prop into `PlayerHudShell`;
elements and `buildActionMenuModel` read it non-reactively. It stays correct ONLY because every
settings write goes through `game.settings.set('titan', 'playerHudOptions', …)`, whose `onChange`
calls `refresh({ force: true })` and remounts the shell with a fresh snapshot. Any future path that
changes HUD options without `game.settings.set` (or that removes the `onChange`) leaves the mounted
HUD silently stale — no error surfaces. Flagged by the 2026-06-11 final branch review of
`feature/player-hud` as an accepted tradeoff matching the codebase's shell patterns.

### Foundry v14 core: CombatTracker render throws on non-viewed combat updates (2026-06-10)

Core's `CombatTracker._onRender` (`client/applications/sidebar/tabs/combat-tracker.mjs:185-188`)
does `data = renderData.find(d => d._id === this.viewed?.id)` and then `"turn" in data` — when an
`updateCombat` render arrives for a combat the tracker is NOT viewing (e.g. a combat bound to a
non-viewed scene), the `find` returns `undefined` and the render throws an uncaught
`Cannot use 'in' operator to search for 'turn' in undefined` on every round/turn update. Core bug,
not ours (we have no engine fork). Mitigation in our harness: `tests/shared/combat.js`
`seedCombatEncounter` sets `ui.combat.viewed` to the seeded combat (the posture of a GM actually
running the encounter) and `teardownCombatEncounter` clears it. The mitigation is PER-CLIENT: it
covers only the page that evaluated the seeder, so a multi-client spec that attaches page-error
assertions to a NON-seeding client must set `ui.combat.viewed` on that client too (today
`socket-sync.spec.js` does not assert page errors on the remote client, so the throw is unobserved
there); likewise any combat-driving e2e that bypasses the shared seeder. Surfaced by the
`effectsExpiredReport` e2e (TODO #13).

### Clone-then-update chat handlers: last-write-wins window (TODO #11 refactor, 2026-06-06)

The check chat-card handlers snapshot `system.toObject()` at click time and replace `results`
wholesale, so two rapid clicks on DIFFERENT targets within one update round-trip are
last-write-wins — the second click's payload silently reverts the first (the old live-mutation flow
accumulated same-client clicks instead). Accepted limitation: the window is one update round-trip,
the revert is visually self-evident and recoverable by re-clicking, and the new flow eliminates the
old flow's invalid-state (compounding double-click) and dirty-model-on-rejected-update hazards. If
it ever bites in play, the principled fix is a per-message serial queue around
`document.data.update(...)`.

## 2026-06-10 — Theming foundation visual pass

- Light-theme input identity diverged from the approved mockups during contrast tuning: Heritage
  Light inputs are now a soft lavender tint (`#eae6fc`/`#23184d`) rather than white, and Clean
  Neutral inputs a gray tint (`#eef1f5`), because white inputs were indistinguishable from white
  panels. Sanctioned by the spec's "guidelines, not hard rules" mandate; revisit during the
  character-sheet surface pass if the lavender reads too strong.
- The chat-card commit `a556e592` also carries the Task 6 primitives restyle (the mixin work was
  staged when the fix batch landed) — one-task-one-commit was not held there.
- `ui.chat.render()` on the `themeCoreMessages` onChange re-renders the chat log but NOT the chat
  notification pane's previously posted cards; they restyle on their next natural re-render.
