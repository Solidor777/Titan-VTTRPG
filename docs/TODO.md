# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

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
and successors. These are its surviving deferrals. (Note: NPC `overkillDamage` (`NPCDataModel.js:47`)
is written-but-never-read and schema-stripped — harmless dead data, a candidate for producer cleanup.)

### 12. Chat-message ↔ document path parity (schema-from-shape)

- **Update (2026-06-09):** strategy locked **component-driven** (spec
  `specs/2026-06-09-path-parity-strategy-and-checktags-chat-design.md`): each increment converges
  one duplicated cross-surface display onto a shared component reading parity paths; schema work
  only where parity is missing. Increment 1 shipped — `ItemChatMessageItemChecks` renders intrinsic
  check tags via the shared `CheckTags` (zero schema change). Increment 2 = #25 (CastingCheckTags).
- **Update (2026-06-05):** the embedded-document-stores spec shipped
  (`specs/2026-06-03-embedded-document-stores-design.md`): `EmbeddedDocument` +
  `EmbeddedDocumentProvider` + the two-context convention (`'document'` nearest/shadowed,
  `'sheetDocument'` top-level/never shadowed), with the shared `AttackTags` component rendering
  identically across the weapon sheet, the character sheet (through the provider), and the weapon
  chat card (snapshot path parity) — the component-reuse proof this item envisioned now exists. The
  remaining north-star (ALL fields on ALL documents on consistent `system.*` paths) stays open; see
  also "Embedded document contexts — follow-ups" below for the decomposed sheet-side reuse items.
- **What:** Bring chat messages to **path parity** with their source documents so
  the same display/edit components are reusable across item sheets, character
  sheets, and chat — e.g. the weapon **item** card shows attacks via
  `document.data.system.attack[index]` (parity with the weapon item document),
  and the attack-**check** chat message gains parity with the attack check
  (deep `parameters` / `results` schemas instead of opaque `ObjectField`s).
- **Mechanism:** a `buildSchemaFromShape(shape)` helper that recursively converts
  a canonical plain-object shape into an appropriate Foundry schema (string →
  `StringField`, number → `NumberField`, bool → `BooleanField`, array →
  `ArrayField`, nested object → `SchemaField`). One shape feeds both the source
  document schema and the chat-message document schema; differentiating fields
  are added/overridden on top of the base shape.
- **No migration:** chat cards are historical snapshots — new messages carry the
  parity shape; historical messages are not retrofitted, and the source document
  is *not* resolved live (a card must not mutate when the weapon is later edited
  or deleted).
- **North-star:** progressively move all fields on all documents onto consistent
  `system.*` paths via the helper.
- **Depends on / sequencing:** the chat-message-subtypes conversion shipped; the remaining
  north-star is incremental.
- **Origin:** branched off the embedded-document-stores design —
  `specs/2026-06-03-embedded-document-stores-design.md` (Follow-up work →
  "Chat-message path parity").

### 25. CastingCheckTags: extract the shared casting-check tag display

- **What:** The casting-check tag display (AttributeCheckTag + stats) is hand-rendered on three
  spell surfaces: `SpellChatMessage.svelte` (snapshot paths `item.castingCheck.*`),
  `CharacterSheetSpellCastingCheck.svelte` (engine `checkParameters.*`), and
  `SpellSheetSidebarCastingCheck.svelte` (spell document config paths).
- **To do:** Extract a shared casting-check tag component per the component-driven path-parity
  strategy (increment 2 of #12); the actor-context consumer passes resolved overrides, document
  consumers read config paths.
- **Found by:** #12 increment-1 gap inventory (2026-06-09).