# Chat-message mount keying + clone-then-update — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorm 2026-06-06).
**Closes:** `docs/TODO.md` #10 (chat-message Svelte mount keyed per-document, not per-element) and #11 (check chat
components mutate the live DataModel before `update()`).
**Predecessor:** the chat-message-subtypes conversion (Phases 1-4 + follow-ups B/D, shipped). Both items were found
by the Opus code-quality reviews of Phase 1 (Tasks 3 and 5) and deferred as out of parity scope; the single-slot
mount pattern predates the conversion (the deleted legacy `OnRenderChatMessageHTML` hook used the same slot).

---

## 1. Problem & root cause

### #10 — single mount slot vs. up to three rendered elements per message

`TitanChatMessage` (`src/document/types/chat-message/ChatMessage.js`) tracks ONE `_svelteComponent =
{ handle, bridge }` per message document, and `renderHTML` tears down the slot before every mount. But Foundry v14
renders one message into up to THREE elements (verified in
`C:\FoundryVTT\V14\foundry\client\applications\sidebar\tabs\chat.mjs`):

- the main chat log (`ChatLog#postOne`),
- the notification pane (`ChatLog#postNotification` — when `core.uiConfig.chatNotifications === 'cards'` and the
  chat tab is not visible; the pane element `#chat-notifications` is created ONCE per session in `_onFirstRender`
  and appended to `#ui-right-column-1`, outside the sidebar),
- the chat popout (`this.popout?.postOne` — a second `ChatLog` instance).

Each surface calls `message.renderHTML()`, and `ChatLog#updateMessage` re-renders every surface that holds the
message. With a single slot, each later render unmounts the EARLIER surface's still-live mount, leaving its
`.message-content` blank until the next re-render of that surface (the user-visible bug: post a message while the
chat tab is inactive → the main-log card is blank).

The leak half: elements are removed with NO removal signal — notification auto-dismissal/manual close
(`#dismissNotification` → `element.remove()`) and update replacement (`#rerenderMessage` →
`existing.replaceWith(replacement)`). A mount whose element is silently removed is never unmounted, so its
`ReactiveDocument` subscriber stays registered. `ReactiveDocument.destroy()` is a no-op — `createSubscriber`
self-cleans only on actual `unmount()` — and each live subscriber holds SEVEN Foundry hook registrations
(`updateChatMessage` + the six embedded item/effect CRUD hooks, which run on every item/effect CRUD world-wide).
Only message deletion has teardown today (`preDeleteChatMessage` → `_teardownComponent`).

### #11 — check chat components mutate the live DataModel before `update()`

`CheckChatMessageDie.svelte`, `CheckChatResetExpertiseButton.svelte`, and
`CastingCheckChatMessageScalingAspect.svelte` mutate `document.data.system.results` / `.parameters` (and `die.*`)
in place on the live prepared `system` instance, then persist via
`document.data.update({ system: { results: structuredClone(...) } })`. Not a corruption bug (`update()` diffs
against `_source`, and the remount on `updateChatMessage` discards the transient state), but the pattern is the
opposite of the clean clone-then-update exemplar already used in `src/hooks/OnGetChatLogEntryContext.js`
(`message.system.toObject()` → mutate the local clone → `update()`). Grep confirms these three components are the
only live-model mutators.

## 2. Decisions (brainstorm outcomes)

| Decision | Choice |
| --- | --- |
| Scope | #10 + #11 in one spec (one subsystem, one verification cycle); ALL THREE render surfaces in scope, including the popout |
| Mount tracking | **Element-keyed registry + sweeps + one MutationObserver** on the notification container (approach B): deterministic teardown on every removal path |
| Bridge ownership | Registry stores the mount `handle` only; the `ReactiveDocument` bridge self-cleans on unmount (`destroy()` stays a documented no-op) |
| #11 pattern | Build the payload from `document.data.system.toObject()`, mutate only the clone, `update()`; the live model is never written; redundant `structuredClone` calls drop |
| Verification | New e2e spec drives the notification pane AND the popout, with `Hooks.events.updateChatMessage.length` deltas as the public-API leak probe; registry semantics unit-tested |

## 3. Mount registry (#10)

New module `src/document/types/chat-message/ChatMessageMountRegistry.js`:

- **State:** module-level `Map<HTMLElement, { handle, messageId, seen }>` — key is the rendered chat-card root
  (the `li` returned by `renderHTML`); `handle` is the Svelte mount handle; `seen` is whether the element has been
  observed connected at least once.
- **`registerMount(element, messageId, handle)`** — adds the entry (`seen: false`); lazily attaches the
  notification observer (idempotent — attaches only if `#chat-notifications .chat-log` exists and is a different
  element instance than the currently observed one; skipped silently when absent, e.g. stream view).
- **`sweepStaleMounts()`** — for every entry: if its element `isConnected`, set `seen = true`; else if `seen`,
  unmount (`outro: false`) and drop it. Never-connected entries are skipped — they are pending insertion
  (`ChatLog##doRenderBatch` renders an entire batch, awaiting each message, BEFORE inserting any element, so a
  sweep can fire mid-batch; the `seen` guard makes that race harmless). Per-entry `try/catch` + `console.error`;
  the entry is dropped even if its unmount throws.
- **`teardownMessageMounts(messageId)`** — unmounts and drops ALL entries for one message, connected or not
  (same per-entry isolation).
- **Observer** — a single `MutationObserver` on `#chat-notifications .chat-log`, `childList` only. For each
  removed node: unmount a registry-tracked element directly, plus any tracked `[data-message-id]` descendants
  (subtree removals). Untracked nodes (dummy/spacer elements) are ignored. This covers notification dismissal —
  the only removal path with no adjacent render.

Coverage by removal path:

| Removal path | Teardown signal |
| --- | --- |
| Update replacement (`#rerenderMessage` `replaceWith`) | post-render rAF sweep (same frame) |
| Notification auto-dismissal / manual close | MutationObserver (immediate) |
| Message delete (`#deleteMessage`) | `preDeleteChatMessage` → `teardownMessageMounts` |
| Popout close / sidebar re-render | next render's entry sweep |

Steady-state stale mounts: zero.

## 4. `TitanChatMessage.renderHTML` + hook changes (#10)

- `renderHTML` calls `sweepStaleMounts()` at entry (every render — TITAN subtype or not — is a sweep
  opportunity), mounts as today, registers via `registerMount(html, this.id, handle)` (NO pre-teardown of a
  previous mount — that is the bug being removed), then schedules `requestAnimationFrame(sweepStaleMounts)` to
  reap the predecessor `li` that Foundry `replaceWith`s right after the render returns. Multiple rAF sweeps per
  frame are idempotent and O(registry size); no debounce.
- The `_svelteComponent` field and `_teardownComponent()` are DELETED; the stale "the chat log replaces the
  element on every update" comment goes with them.
- `src/hooks/OnPreDeleteChatMessage.js` calls `teardownMessageMounts(message.id)` instead of
  `_teardownComponent()`.
- The per-mount `ReactiveDocument` construction in `renderHTML` is unchanged (one bridge per mounted element).

## 5. Clone-then-update refactors (#11)

All three components: build the payload from `document.data.system.toObject()` (a detached source clone —
equivalent to prepared data for check chat DMs, which derive nothing over `parameters`/`results`; the
`OnGetChatLogEntryContext` exemplar already relies on this), mutate only the clone, then
`document.data.update({ system: { … } })`. Handler guards read the clone (same values); display reads
(`$derived`s) stay on the live model. `structuredClone` calls drop (`toObject()` is already detached;
`recalculateCheckResults` returns a fresh object).

- `CheckChatMessageDie.svelte` — gains an `idx` prop; `applyExpertise()` addresses `clone.results.dice[idx]`,
  bumps `final`/`expertiseApplied`, decrements `clone.results.expertiseRemaining`, recalculates, updates.
  `CheckChatMessageDice.svelte` passes it (`{#each dice as die, idx}` — `die` stays for display; the each block
  stays unkeyed, the array is replaced wholesale on update).
- `CheckChatResetExpertiseButton.svelte` — clone; loop `clone.results.dice` resetting `final`/`expertiseApplied`;
  restore `expertiseRemaining` from `clone.parameters.totalExpertise`; recalculate; update.
- `CastingCheckChatMessageScalingAspect.svelte` — already has `idx`; `increaseAspect`/`decreaseAspect`/
  `resetAspect` mutate `clone.results.scalingAspect[idx]` plus `extraSuccessesRemaining`/`damage`/`healing` on the
  clone; update. (These handlers do not call `recalculateCheckResults` today; unchanged.)

## 6. Error handling & edge cases

- Sweep/teardown per-entry isolation (`try/catch` + `console.error`), mirroring the converter's per-entry pattern;
  a corrupt handle cannot strand other teardowns.
- Observer callback acts only on registry-tracked elements; attach is lazy and idempotent (re-checked on each
  `registerMount`), so a missing `#chat-notifications` (stream view, pre-first-render) is harmless.
- Missing `.message-content`: unchanged assumption from current code (Foundry's card chrome provides it for every
  visible message); no new guard.
- #11 update failures: `update()` rejection behavior is unchanged — and since the live model is no longer
  pre-mutated, a failed update leaves NO transient divergence between prepared data and `_source` (strictly better
  than the status quo).

## 7. Testing

**Unit — `tests/unit/ChatMessageMountRegistry.test.js`:** registry semantics with stub handles and fake elements
(`isConnected` toggles): register; sweep reaps only seen-then-disconnected entries; never-connected entries
survive sweeps (batch-render race); per-message teardown (connected or not); double-teardown safety; per-entry
error isolation. Svelte's `unmount` is mocked at the module boundary.

**e2e — new `tests/e2e/chat-message-mounts.spec.js`:** leak probe = `Hooks.events.updateChatMessage.length`
deltas (each mounted chat card's bridge holds exactly one `updateChatMessage` registration while mounted). All
assertions are delta-based with other apps closed (existing `closeAllApps` discipline) to isolate the count.

1. **Notification pane:** set `core.uiConfig.chatNotifications = 'cards'` (restored in `finally`), activate a
   non-chat sidebar tab, create a check message → main-log `li .message-content` has rendered content AND the
   notification card does (the #10 regression assertion — pre-fix the main-log card is blank) → hook count rose
   by 2 → update the message → both surfaces still render → dismiss the notification → hook count drops by 1
   (`expect.poll`; observer teardown) → delete the message → baseline restored.
2. **Popout:** open the chat popout, post a message → main log AND popout both render content (pre-fix the
   main-log card blanks; the popout renders second) → hook count rose by 2 → close the popout, trigger one
   render → hook count drops by 1 via sweep (`expect.poll`) → delete the message → baseline restored. (Exact
   popout-open API — `ui.chat.renderPopout()` — verified at plan time.)
3. **#11 interactions:** behavior-preserving and guarded by the existing checks e2e
   (`checks-integration.spec.js` / `checks-dialog.spec.js` already exercise expertise); at plan time, check
   coverage of die-click apply-expertise, reset-expertise, and scaling-aspect increment/decrement/reset, and add
   only the missing interactions to the existing check specs.

**Full verification cycle:** `npm run build` → unit suite (`npm test`) → full 3-shard foreground e2e
(`npm run test:e2e -- --shard=N/3`) on the launched `:30000` world, per standing rules.

## 8. Documentation & closeout

- Delete `docs/TODO.md` #10 and #11 (delete-on-completion rule).
- `titan-codebase` skill: record the mount registry in `references/abstractions.md` and the render flow change in
  `references/data-flow.md`; add the convention "chat components never mutate the live DataModel — clone via
  `system.toObject()`, mutate, `update()`" to `references/conventions.md`; correct the stale single-mount claim.
- `docs/OPEN_BUGS.md` / `docs/CLOSED_BUGS.md`: untouched (these are TODO items, not logged bugs).

## 9. Out of scope / accepted limitations

- A mount whose render succeeded but whose element was never inserted (e.g. a message render that throws
  downstream of `renderHTML` inside `##doRenderBatch`'s per-message `try/catch`) stays registered until its
  message is deleted or the page reloads — never-connected entries are deliberately unsweepable. Rare, bounded,
  and reaped by `teardownMessageMounts` on delete.
- TODO #23 (shared check-row presentation) and #12 (chat ↔ document path parity) remain separate follow-ups, next
  in the user-approved order.
