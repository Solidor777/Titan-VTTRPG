# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

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
