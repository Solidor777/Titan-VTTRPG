# Chat Message Subtypes — Phase 1 (Infrastructure + Checks)

- **Date:** 2026-06-03
- **Status:** Approved (design); ready for implementation plan
- **Scope:** Phase 1 of a phased refactor. This spec is implemented and verified on its
  own before the later families are specced.

## Context

Today every TITAN chat message is a plain Foundry `ChatMessage` (`type: "base"`/`"other"`)
that carries its payload in `flags.titan`, with a single discriminator string at
`flags.titan.type` (~26 leaf values across four families: checks ×5, item cards ×7,
reports ×13, effect ×1). A global `renderChatMessageHTML` hook
(`src/hooks/OnRenderChatMessageHTML.js`) pattern-matches that string, wraps the message in a
`ReactiveDocument`, and mounts `ChatMessageShell.svelte`, which holds a ~95-line hardcoded
`type → component` switch.

Foundry v14 supports first-class `ChatMessage` subtypes: a manifest `documentTypes.ChatMessage`
entry + a typed `DataModel` registered in `CONFIG.ChatMessage.dataModels`, and — critically —
`ChatMessage#renderHTML` delegates to `this.system.renderHTML()` when the typed model defines
it (`C:\FoundryVTT\V14\foundry\client\documents\chat-message.mjs:391`). This lets a chat
message render *itself* through its data model instead of through a global hook.

We are moving to that model: real subtypes, typed `system` payloads, and document-owned
(self-) rendering.

## Goals

- One Foundry subtype per current leaf type (`attributeCheck`, `attackCheck`, … `weapon`,
  `damageReport`, `effect`), keyed identically to today's `flags.titan.type` strings.
- Every subtype's `DataModel` inherits from a single **universal base**,
  `TitanChatMessageDataModel` (which itself extends the project's `TitanDataModel`).
- Payloads live in the typed `message.system`, not `flags.titan`.
- Documents render themselves via `system.renderHTML()`; no global type-switch hook in the
  final state.
- Delivered in four phases, each regression-free in the working tree.

## Non-goals

- **No backward compatibility for pre-existing messages.** Old `flags.titan`-based messages are
  fully deprecated; after the final cleanup phase they render as plain/empty cards. We do not
  write a world migration for historical chat messages (chat is semi-ephemeral).
- No change to the downstream `getContext('document').data` contract — components keep reading
  a `ReactiveDocument`; only the *path* changes (`flags.titan.X` → `system.X`).
- No deep typing of check `parameters`/`results` in Phase 1 (see Typing policy).

## Key decisions

1. **Granularity:** per-leaf subtypes (~26), built with inheritance so leaves stay thin.
2. **Data home:** typed `message.system`.
3. **Render seam:** self-rendering via `system.renderHTML()`.
4. **Universal base:** all subtype data models inherit from `TitanChatMessageDataModel`, which
   defines `renderHTML` / mount / teardown exactly once.
5. **No legacy fallback** for old messages.
6. **Phased coexistence** (below) so each phase ships without interim render regressions.

### Typing policy

Move payloads into `system` and type the flat, component-read fields with real schema fields —
this pays off most for reports and item snapshots (later phases). The genuinely opaque check
internals (`parameters`, `results`), which `TitanCheck` produces wholesale and components consume
as a blob, start as `ObjectField` to bound scope. They can be tightened to structured schemas
later without changing the public path. (They are already plain-serializable today because they
round-trip through `flags`.)

## Lifecycle facts (verified against v14 source)

- **`renderHTML` must return the full `<li class="message" data-message-id=…>` chrome.** The
  chat log and context menu locate messages by that selector
  (`chat.mjs:1376`, `chat.mjs:338`). So the universal base re-renders
  `CONFIG.ChatMessage.template` for the chrome, then mounts Svelte into its `.message-content`.
- **Updates replace the whole element.** `ChatLog#updateMessage → #rerenderMessage`
  (`chat.mjs:1120`) does `existing.replaceWith(replacement)` on every `updateChatMessage`, calling
  `renderHTML` fresh. Consequences:
  - A report's "apply" button calling `document.update(...)` simply triggers a clean re-render;
    the card is effectively a fresh static mount each time.
  - `ReactiveDocument`'s in-place reactivity is largely redundant for chat, but we **keep it** so
    the `getContext('document').data` contract (and the ~95 components) need no change.
  - The base unmounts any prior `parent._svelteComponent` before mounting the replacement, to
    avoid re-render leaks. Teardown on delete continues via `OnPreDeleteChatMessage`.
- **The `renderChatMessageHTML` hook still fires** in the self-render path
  (`chat-message.mjs:393`), so existing styling hooks survive.

## Architecture

### DataModel hierarchy (target end-state)

```
TitanDataModel                     (existing project base: documentVersion, components, migrate)
└─ TitanChatMessageDataModel       (NEW universal base: renderHTML + mount/teardown + component contract)
   ├─ CheckChatMessageDataModel    (parameters, results, failuresReRolled, message)
   │   ├─ AttributeCheckChatMessageDataModel
   │   ├─ ResistanceCheckChatMessageDataModel
   │   ├─ AttackCheckChatMessageDataModel
   │   ├─ CastingCheckChatMessageDataModel
   │   └─ ItemCheckChatMessageDataModel
   ├─ ItemChatMessageDataModel     (Phase 2)
   ├─ ReportChatMessageDataModel   (Phase 3)
   └─ EffectChatMessageDataModel   (Phase 4)
```

`renderHTML` and mount/teardown are defined **once** on `TitanChatMessageDataModel`. Family bases
add schema via the project's `_defineDocumentSchema()` override convention
(`{ ...super._defineDocumentSchema(), … }`). Leaves are thin: they override `get component()`
(and only add schema where a family member genuinely diverges).

### The universal base — `TitanChatMessageDataModel`

`src/document/types/chat-message/ChatMessageDataModel.js`

Responsibilities:
- `static _defineDocumentSchema()` → base chat schema (just inherits `documentVersion` for now).
- `get component()` → abstract contract; base throws (or returns `undefined`) so a leaf must
  declare its Svelte component.
- `async renderHTML({ canDelete, canClose = false, ...rest } = {})` (instance method; `this` is
  the system model, `this.parent` is the `ChatMessage`):
  1. `canDelete ??= game.user.isGM`.
  2. Build `messageData` equivalent to core (`chat-message.mjs:397–421`): `parent.toObject(false)`,
     enriched (empty) content, `speakerActor`, `alias`, `cssClass`, whisper info, `canDelete`,
     `canClose`, `...rest`. (Our messages are not roll-type, so the roll-content branch is skipped.)
  3. `html = parseHTML(await renderTemplate(CONFIG.ChatMessage.template, messageData))`.
  4. Add classes: `titan`; `owner` when `parent.isOwner`; dark-mode per `darkModeChatMessages()`
     (`~/helpers/Settings/DarkModeChatMessages.js`, as the old hook does today).
  5. If `parent._svelteComponent?.handle` exists, `unmount` it and `bridge?.destroy()`
     (re-render teardown).
  6. `bridge = new ReactiveDocument(parent)`;
     `handle = mount(ChatMessageContent, { target: html.querySelector('.message-content'),
     props: { documentStore: bridge } })`.
  7. `parent._svelteComponent = { handle, bridge }`; `return html`.

### The thin content shell — `ChatMessageContent.svelte`

`src/document/types/chat-message/ChatMessageContent.svelte` (~15 lines)

- `const { documentStore } = $props(); setContext('document', documentStore);`
- `const document = getContext('document');`
- `SelectedComponent = (game.user.isGM || !document.data.blind) ? document.data.system.component
  : PrivateRollChatMessage`.
- Render `<SelectedComponent />` when present.

The existing `ChatMessageShell.svelte` (with the big switch) is **left untouched** in Phase 1 — it
still serves the old hook for unmigrated families. It is deleted in the final cleanup phase.

### Check family

`src/check/chat-message/CheckChatMessageDataModel.js` — `extends TitanChatMessageDataModel`:

```
_defineDocumentSchema() → {
  ...super._defineDocumentSchema(),
  parameters: ObjectField,
  results: ObjectField,
  failuresReRolled: BooleanField (initial false),
  message: StringField (nullable, optional),
}
```

Schema fields are constructed via the project's `create*Field` helper convention where one
exists (the base uses `createNumberField`); the plan picks the exact helpers.

Five leaves, colocated with their components under
`src/check/types/<check>/chat-message/<Check>ChatMessageDataModel.js`, each overriding
`get component()` to return its existing `.svelte`:
`AttributeCheck`, `ResistanceCheck`, `AttackCheck`, `CastingCheck`, `ItemCheck`.

## Coexistence strategy (regression-free phasing)

Phase 1 adds the self-render path **alongside** the existing hook+shell, which keep serving
unmigrated families. The paths never collide, by construction:

| Message | `flags.titan` | subtype | Renders via |
|---|---|---|---|
| New check (post-Phase 1) | none | `attributeCheck`… | `system.renderHTML` (self) |
| Item/report (unmigrated) | yes | `base`/`other` | old hook → old shell |
| Pre-existing old check | yes | `base`/`other` | old hook → old shell |

- New subtyped messages have no `flags.titan`, so the old hook's
  `TITAN_CHAT_MESSAGE_TYPES.has(flags.titan?.type)` test is `false` and it skips them — no
  double-mount. An explicit `if (message.system instanceof TitanChatMessageDataModel) return;`
  guard is added to the old hook as belt-and-suspenders.
- The old hook + old `ChatMessageShell.svelte` are removed **only in the final cleanup phase**.
  There is no interim where any actively-created message renders blank.

## File inventory — Phase 1

### New

- `src/document/types/chat-message/ChatMessageDataModel.js` — `TitanChatMessageDataModel`.
- `src/document/types/chat-message/ChatMessageContent.svelte` — thin content shell.
- `src/check/chat-message/CheckChatMessageDataModel.js` — check family base.
- `src/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js`
- `src/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js`
- `src/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js`
- `src/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js`
- `src/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js`

### Modified

- `src/hooks/OnceInit.js` — add `CONFIG.ChatMessage.dataModels = { attributeCheck, resistanceCheck,
  attackCheck, castingCheck, itemCheck }` next to the existing `documentClass = TitanChatMessage`.
- `system.json` — add the 5 check keys under `documentTypes.ChatMessage`.
- `lang/en.json` — add a `TYPES.ChatMessage` block with the 5 labels (sibling of `TYPES.Actor`,
  `TYPES.Item`, `TYPES.ActiveEffect`).
- `src/check/Check.js` — `sendToChat` builds `{ type: this._getCheckType(), system: { parameters,
  results, failuresReRolled, message? } }` instead of `flags: { titan: messageData }`. (The
  `ChatMessage.applyRollMode` wrapping is retained.) Subclass `_getCheckType()` values become the
  subtype keys (already match).
- `src/hooks/OnRenderChatMessageHTML.js` — add the `instanceof` guard at the top; otherwise
  unchanged.
- `src/hooks/OnPreDeleteChatMessage.js` — relax the teardown guard from `message?.flags.titan` to
  `svelteComponent?.handle` (subtyped messages carry no `flags.titan`).
- Check Svelte components (~14 files under `src/check/`) — mechanical sweep of
  `document.data.flags.titan.X` → `document.data.system.X`. Known sites include
  `AttributeCheckChatMessage.svelte:20,38,41`; the implementation plan enumerates the full set via
  grep.

## Test plan

- **Unit** (per check DataModel): schema round-trips a representative `parameters`/`results`
  payload; `get component()` resolves to the expected `.svelte`; `renderHTML()` returns an
  `<li.message.titan>` with a `data-message-id` and a populated `.message-content`.
- **e2e:** roll each of the 5 checks; assert `message.type === '<leaf>'`, the card content renders,
  and attack damage buttons appear for attack checks. Update any existing check e2e that asserts on
  `flags.titan.type`.
- Full unit + e2e suites green before merge (per the project's two-stage review rhythm).

## Risks & mitigations

- **Subtype registration needs a Foundry restart.** `documentTypes` manifest changes only register
  after a restart (noted in project memory). Call this out in the plan's verification steps.
- **`renderHTML` couples us to Foundry's card template.** Rebuilding `messageData` mirrors core
  internals; isolated to the one base method and added to the v15 intake checklist in
  `foundry-versioning` follow-ups.
- **Re-render / notification double-mount (DEFERRED, pre-existing).** The mount handle is stored in
  a single per-document slot (`_svelteComponent`), and `renderHTML` tears down the prior mount before
  mounting. This is correct for the ordinary single-element re-render path, but Foundry renders one
  message into TWO elements when chat notifications are active (the main log via
  `ChatLog#postOne`/`#updateMessage` AND the notifications pane via `ChatLog#postNotification`). With a
  single slot, the second render unmounts the first element's component (its `.message-content` goes
  blank until the next re-render) and the notification-pane mount + bridge can leak. This is
  **pre-existing legacy behavior** — the old `OnRenderChatMessageHTML` hook uses the identical
  single-slot `message._svelteComponent` pattern — so Phase 1 preserves parity rather than regressing.
  The per-element fix is tracked in `docs/TODO.md` (#10).
- **`ObjectField` cleaning.** Confirm `parameters`/`results` survive `ObjectField` ingestion (they
  already serialize through `flags`, so expected to be safe; verified in unit tests).

## Phased roadmap (later phases — outline only)

2. **Item cards** — `ItemChatMessageDataModel` + 7 leaves; migrate the item-to-chat producer;
   sweep item chat components.
3. **Reports** — `ReportChatMessageDataModel` + 13 leaves (typed report payloads); migrate
   `CharacterDataModel._whisperOwners` + the ~13 report builders; sweep report components.
4. **Effect + cleanup** — `EffectChatMessageDataModel`; delete `OnRenderChatMessageHTML` mounting
   and the old `ChatMessageShell.svelte` switch; final full e2e pass; update the `titan-codebase`
   skill.

Each later phase is its own spec → plan → implement cycle, reusing the pattern proven here.
