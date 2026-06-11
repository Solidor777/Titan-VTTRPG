# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

## UX/UI redesign

### 26. Redesign surface passes (after the theming foundation ships)

- **What:** Per-surface refinement passes on top of the redesign foundation
  (`specs/2026-06-10-ux-redesign-foundation-design.md`): character sheet layout, item/effect
  sheets, chat cards in detail, dialogs, Effect Tray/HUD. Each pass is its own spec, prototyped
  in the visual companion first, executed one at a time. These passes are also the gap-finder
  for TODO #12's retheme-driven shared-component increments.
- **Why deferred:** The foundation (token contract, ThemeManager, four built-in themes, theme
  editor, shared-primitive restyle, chat visibility treatment) shipped on `feature/theme-foundation`
  (2026-06-10); the passes apply the language it defines, surface by surface.

## Active Effects conversion — related items

The "Effects → TitanActiveEffect" effort (specced in
`specs/2026-05-30-titan-active-effects-conversion-design.md`) has shipped; these are its
surviving deferrals.

### 2. Seeded standard-effects compendium (sub-project B)

- **What:** Ship a seeded *standard effects* compendium for the Effect Tray. Needs a
  pack-build pipeline (foundryvtt-cli `compilePack` or ClassicLevel) and the effect content
  (a future rulebook-scrape script). The tray already works against the empty scratch pack
  and user packs; B just fills a pack with shipped defaults.
- **Why deferred:** Content + pipeline work, independent of the tray feature that shipped.

## Chat message subtypes — related items

The "first-class ChatMessage subtypes" effort (Phases 1-4 + follow-ups B/D) has shipped — all 26
chat messages are self-rendering subtypes. Specs/plans under `specs/2026-06-03-chat-message-subtypes-*`
and successors. (Note: NPC `overkillDamage` (`NPCDataModel.js:47`) is written-but-never-read and
schema-stripped — harmless dead data, a candidate for producer cleanup.)

### 12. Chat-message ↔ document path parity (standing strategy; verified inventory CLOSED)

- **Status (2026-06-10, pre-retheme wrap-up):** the component-driven strategy's verified
  duplicated-display inventory is **fully converged**. Shipped increments: `CheckTags` (item sheet
  sidebar / character-sheet check rows / item chat cards), `AttackTags` (weapon sheet /
  character-sheet weapon rows / weapon chat card), `CastingCheckTags` (spell chat card /
  character-sheet spell row / spell sheet sidebar), and per-type stats components replacing every
  sheet-footer ↔ chat-stats duplicate: shared `ItemStats` (weapon + equipment), `AbilityStats`,
  `ArmorStats`, `ShieldStats`, `SpellStats`, `CommodityStats`, `EffectStats` — each ONE component
  reading the nearest `'document'` context at parity `system.*` paths on both surfaces (spec
  `specs/2026-06-10-pre-retheme-wrapup-design.md`).
- **Logged rejects** (inventoried and deliberately NOT converged): weapon attack rows
  (`CharacterSheetWeaponAttack` shows actor-derived dice the snapshot card intentionally lacks —
  same shape as the locked chat-CheckRow non-goal; `AttackTags` is already shared); item-sheet
  sidebar traits (`ItemSheetSidebarTraits` — edit affordances, a different abstraction); effect-HUD
  inline duration (`EffectHudRow` — layout-specific use of the shared `DurationTag` primitive).
- **Strategy (standing, component-driven):** each future increment converges one duplicated
  cross-surface display onto a shared component reading parity paths; schema work only where a
  target surface lacks parity. Future increments are RETHEME-DRIVEN — the retheme is the next
  gap-finder; no proactive sweeps are queued.
- **North-star (open):** progressively move all fields on all documents onto consistent `system.*`
  paths via `buildSchemaFromShape` (one canonical shape feeding both the source document schema and
  the chat-message snapshot schema; chat cards stay historical snapshots, no migration).
- **Origin:** branched off the embedded-document-stores design —
  `specs/2026-06-03-embedded-document-stores-design.md` (Follow-up work → "Chat-message path
  parity"); strategy locked in `specs/2026-06-09-path-parity-strategy-and-checktags-chat-design.md`.
