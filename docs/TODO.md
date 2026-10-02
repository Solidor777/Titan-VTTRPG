# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

- One checked-in XLSX test fixture is still needed from the user: a `.xlsx` exported by real Google
  Sheets, derived from this feature's real `titan.effects` export, added as
  `tests/fixtures/spreadsheet/google-sheets-edited.xlsx` with a matching test in `Xlsx.test.js` (see the
  existing "decodes an .xlsx file ... re-saved by real Microsoft Excel" test for the pattern to follow).
  The Excel half is done: `tests/fixtures/spreadsheet/excel-edited.xlsx` was produced by exporting
  titan.effects, editing one cell's value in real Excel 16.0 via COM automation, and re-saving, with a
  passing round-trip test. Google Sheets requires a real Google account signed into a browser, which
  this agent has no access to and should not be given credentials for; the user needs to do this step
  themselves: open the exported .xlsx in Google Sheets, edit one cell's data (not the format), then
  File > Download > Microsoft Excel (.xlsx), and hand the resulting file over.

- Conditions rework to the 2026-09-26 rules (`src/system/Conditions.js`; the compendium Rules journal already has the
  new text). Blinded, Contaminated, Prone, Restrained and Stunned move from a flat -1 to "-1/4 of base value, rounded
  up" (Prone: attackers within 1 space get +1/4, beyond 10 spaces -1/4 per 10 spaces; Prone/Sleeping speed and
  Awareness use "1/2, rounded up"). Frightened becomes Disadvantage on all checks, and Off-Balance is a new condition
  (-1/4 of base Accuracy, Awareness, Melee, Defense, rounded up) that needs a definition, icon and localization.
  Open design question: how a rules element expresses "-1/4 of base, rounded up". The journal text also has an
  unfixed source typo (Blinded reads "--1/4 of their total" instead of "-1/4 of their base value").

- Compendium audit findings awaiting a rules decision (2026-09-27; module `src/packs`, rules 2026-09-26):
  - Force Slow: `mulBase` halves only the base speed and rounds down; the text gives no rounding.
  - Parch: -5 speed "to a minimum of 1"; the clamp is 0.
  - Blood Frenzy: text grants +5 Speed; the effect has only a turn message.
  - Force Speed and the three Elder Sibling effects: +5 to every speed grants Fly/Swim/Burrow/Climb 5 to creatures
    without them; no operation can condition on a non-zero speed.
  - Aether Blades, Inferno Blades, Radiant Blade, Sacred Arms of the Arbiter (Weapon): "+1 Damage" to chosen weapons
    has no element; a conditional modifier would apply to every attack.
  - Jade Perception: Awareness +1/2 Metaphysics Training has no element.
  - Lord of Black Flames: roll message keyed to a custom trait "Unarmed" that no item carries.
  - Empower Soul: roll message carries Aether Blades text.
  - Blue Magister: casting roll message lacks its name prefix.
  - Urderic Glaivegun: Strike range 2 versus no range in the rules.
  - Light Attunement: custom trait "Attunement" versus the rules' "Light" trait.
  - Shockwave: radius 5 versus "each creature adjacent to you".
  - Metal Attunement and Effulgent Gaze: `removeCondition` where the rules grant immunity.
  - Missing spell aspects: Charm Creature, Dominate Creature, Infiltrate Dreams, Enlarge/Reduce Creature (resistance),
    Create Fissure (damage), Grasping Earth (duration), Abyssal Darkness (Defense/Reflexes +2), Chained Bolts (extra
    targets).
  - Urderic Gunshield: document name versus the rules' "Urderic Gun Shield".
  - Stray `type` fields on rules elements and trait entries (harmless, overwritten or unread).
  - Tough: "add your Resilience to maximum Stamina" is a flat +1 placeholder; no operation adds one stat to another.
  - Blood Probe, Conjurer of Urdokai, Pull of Urdokai, Warding of Urdokai: the text describes a check; no check entry.
  - Hunger of Urdokai: description says "Range: 10 spaces"; the rules say Touch.
  - Stormcaller's Tempest: flagged as an action; The Dragon Awakens and Being of Urdokai, which work the same way, are
    passive.

- No synthetic documents in tests (user rule 2026-10-01, retroactive to every test). Foundry changes and processes
  documents during and after creation, so every document a test needs must be made through the real Foundry user
  flow and deleted when the test is done. Documents include actors, items, effects, tokens, scenes and folders. Real
  flows include the sidebar create, sheet edits, a canvas drop, the unlink toggle with the sheet reopened, and combat
  turns to expire effects. Document-API fixtures (`Actor.create`, `createEmbeddedDocuments`, raw token data) are not
  allowed. Synthetic data is allowed only for tests of UI elements or document-agnostic operations, such as
  localization. Scope:
  - the whole e2e suite, including the `tests/e2e/world.js` fixture helpers;
  - unit-test fakes of Foundry documents.

  Every result gated by a synthetic-document test is unconfirmed until it is re-run the real way. That covers the
  live gates in `docs/CLOSED_BUGS.md`, and #102 in `docs/OPEN_BUGS.md`.

- Plan B Task 5 fix round 4, parked by the user on 2026-10-01 until the test-suite rewrite is done. The plan
  (`.superpowers/sdd/2026-09-29-conditions-rework/task-5-fix4-plan.md`, revision 2) and its unreconciled reviews
  (`buddy-task5-fix4-plan-*.md`) are in that directory. It covers these items, from
  `buddy-task5-fix3-code-agreed.md`:
  - **D1:** orphan comments, and a `token.baseActor` guard in `createTokenTarget` for the Scene-pack race.
  - **D4, D5, D8, D9:** evidence wording.
  - **D6:** a truthful message when a base actor failed to load.
  - **A single record per core fact, with a check that enforces it.**

  These go to the test rewrite: the unit-fake fixes D2, D7 and D10; the inventory of earlier results to re-run (D3);
  and the orphan e2e's precondition comment (D11).

- Document inheritance campaign (user, 2026-10-01): a future campaign covering how documents inherit from their
  definitions. It covers OPEN_BUGS #110 (a condition effect a GM edited may be treated as stale and overwritten) and
  #111 (a condition's edited description is ignored by the HUD and reports).

- Report world documents that fail to load (user ruling 2026-10-01: no systemic fix now). Foundry leaves an invalid
  actor, scene or item out of its world collection (`invalidDocumentIds`), so the migration scan never sees one that
  holds pending work. A token whose base actor is invalid is reported as orphaned ("its base actor is gone").

- Apply effects to targets when a spell or ability is cast, with values derived from the caster and each target (user
  ruling 2026-09-27). First consumer: Abjuration of the Arbiter's dice penalty, "your Soul minus the target's Soul, to a
  minimum of 1" (rules 09_26 line 7696), which until then ships as a -1 default the GM edits per target.

- Extend immunity beyond effects and conditions (user ruling 2026-09-27): immunity to abilities, damage and other
  things by trait. The first cut covers effect/condition immunity by condition id or effect name only.

- Remove or sync `.agents/skills/titan-codebase/`, a tracked copy of `.claude/skills/titan-codebase/` that differs in every
  reference file (last touched by commit `5526adee`). Measured 2026-10-02: no file in the repo, script or config reads
  it (`grep -rn "\.agents"` finds only the note in `docs/POST_WORK_FINDINGS.md`); whether an external agent tool reads
  `.agents/skills/` is not verified. `.agents/skills/graphify/` is separate.
