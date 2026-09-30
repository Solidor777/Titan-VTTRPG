# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 80. Every report tag tooltip leads with the Custom-duration text

- **What:** `EffectTag.svelte` always prefixes `effect.custom.desc` ("Effect lasts for a Custom duration."), so condition
  tags and Permanent / Turn Start / Turn End / Initiative / Expired effect tags all claim a Custom duration. The
  per-type `effect.*.desc` keys in `lang/en.json` have no reader since the six tag components were merged into
  `EffectTag`.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Status:** being fixed in plan B Task 5's fix round.

### 81. Legacy base-type condition effects are inert and never migrated

- **What:** condition Active Effects created before the conditions became the `condition` subtype are `base`-type
  effects flagged `flags.titan.type: 'condition'`. They show on tokens but apply no rules (`getConditions` and the
  rules-element pass read only the `condition` subtype), and the condition sync skips them.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Status:** being fixed in plan B Task 5's fix round (recreated as the `condition` subtype).

### 82. The legacy effect-item converter runs on every GM load regardless of Migration Mode

- **What:** `onceReady` runs `convertEffectItemsToActiveEffects()` before the Migration Mode is resolved, so
  "Disabled" still scans and can write world data, and "Prompt" writes before its dialog appears. It also materializes
  every unlinked token's actor on each load.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Status:** being fixed in plan B Task 5's fix round (the converter joins the migration pipeline).

### 83. Condition sync and effect-item converter miss actors stored in world Scene and Adventure packs

- **What:** the sync covers world actors and scene tokens; the converter also covers world Actor packs. Neither reaches
  unlinked-token deltas in world Scene packs or the actors and scenes in world Adventure packs, and the sync does not
  reach world Actor packs, so stored copies stay stale and re-import stale data.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Status:** being fixed in plan B Task 5's fix round (one shared walker over every stored actor source).

### 84. Report text reaches tooltips and rich text as unsanitized HTML

- **What:** report chat data stores HTML in `StringField` / `ObjectField` values, which bypass core's `HTMLField`
  sanitization, then renders it through `tooltipAction` (tippy `allowHTML: true`) and `RichText.svelte`
  (`enrichHTML` then `{@html}`); a message author could inject markup into other users' clients.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Status:** being fixed in plan B Task 5's fix round (`cleanHTML` at both sinks, before `enrichHTML`).

### 85. Turn-start and turn-end report messages render blank

- **What:** `ChatMessageRichTextMessages.svelte` passes `text={message}` to `RichText`, which reads only `value`, so
  every report message renders `enrichHTML(undefined)`, an empty string. Found by reading the code; not yet reproduced
  live.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Status:** being fixed in plan B Task 5's fix round, together with #84 (fixing the prop enables the unsafe sink).
