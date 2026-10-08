# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

- Conditions rework to the 2026-09-26 rules, remaining part. Plan B
  (`docs/superpowers/plans/2026-09-29-conditions-rework.md`) has Tasks 1 to 4 complete and Task 5 implemented. Read in
  `src/system/Conditions.js`: the quarter-of-base penalties for Blinded, Contaminated, Prone, Restrained and Stunned,
  the new Off-Balance condition, Frightened as Disadvantage on every check, and the Prone and Sleeping speed and
  Awareness rules exist. Remaining plan B work is Tasks 6 to 17:
  - Tasks 6 and 7: one rules-element operation registry and one source list (behaviour-preserving);
  - Tasks 8 to 11: the `immunity` rules element, the engine, the suppressed-condition markers and the Immunity
    Handling setting;
  - Tasks 12 and 13: targeting and distance helpers and target-aware attack checks, which carry the Prone
    attacker modifier (+1/4 of base within 1 space, -1/4 per 10 spaces beyond 10 spaces);
  - Task 14: Unconscious applies Prone and Incapacitated and drops held gear;
  - Tasks 15 and 16: the Rules journal typos (Blinded reads "--1/4 of their total" instead of "-1/4 of their base
    value"; Prone's "1 space" wording) and Metal Attunement and Effulgent Gaze granting condition immunity (compendium
    module);
  - Task 17: documentation, skill, memory and full verification.
  Task 5's fix round 4 is parked (see below).

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
  - Metal Attunement and Effulgent Gaze: `removeCondition` where the rules grant immunity (plan B Task 16).
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

- Plan B Task 5 fix round 4, parked by the user on 2026-10-01 until the test-suite rewrite is done. The plan
  (`.superpowers/sdd/2026-09-29-conditions-rework/task-5-fix4-plan.md`, revision 2) and its unreconciled reviews
  (`buddy-task5-fix4-plan-*.md`) are in that directory. It covers these items, from
  `buddy-task5-fix3-code-agreed.md`:
  - **D1:** orphan comments, and a `token.baseActor` guard in `createTokenTarget` for the Scene-pack race.
  - **D4, D5, D8, D9:** evidence wording.
  - **D6:** a truthful message when a base actor failed to load.
  - **A single record per core fact, with a check that enforces it.**

- Document inheritance campaign (user, 2026-10-01): a future campaign covering how documents inherit from their
  definitions. It covers OPEN_BUGS #110 (a condition effect a GM edited is treated as stale and overwritten by the next
  migration).

- Report world documents that fail to load (user ruling 2026-10-01: no systemic fix now). Foundry leaves an invalid
  actor, scene or item out of its world collection (`invalidDocumentIds`), so the migration scan never sees one that
  holds pending work. A token whose base actor is invalid is reported as orphaned ("its base actor is gone").

- Apply effects to targets when a spell or ability is cast, with values derived from the caster and each target (user
  ruling 2026-09-27). First consumer: Abjuration of the Arbiter's dice penalty, "your Soul minus the target's Soul, to a
  minimum of 1" (rules 09_26 line 7696), which until then ships as a -1 default the GM edits per target.

- Extend immunity beyond effects and conditions (user ruling 2026-09-27): immunity to abilities, damage and other
  things by trait. The first cut covers effect/condition immunity by condition id or effect name only; it is plan B
  Tasks 8 to 11 and has not been started.

- Remove or sync `.agents/skills/titan-codebase/`, a tracked copy of `.claude/skills/titan-codebase/` that differs in every
  reference file (last touched by commit `5526adee`). Measured 2026-10-02: no file in the repo, script or config reads
  it (`grep -rn "\.agents"` finds only the note in `docs/POST_WORK_FINDINGS.md`); whether an external agent tool reads
  `.agents/skills/` is not verified. `.agents/skills/graphify/` is separate.
- Export shared constants for vocabularies that tests still hold as literals. `tests/unit/EffectPackSource.test.js` keeps
  `DURATION_TYPES` (turnStart, turnEnd, initiative, permanent, custom), the `'all'` stat key and the `setSum` modes
  (set, min, max) as literal lists: no `src` constant exists for them. The effect duration options live in a
  component-local array at `src/document/types/active-effect/sheet/ActiveEffectSheetHeader.svelte:17-23`, and the
  `setSum` modes are a `switch` in `src/helpers/utility-functions/ComputeSetSumDelta.js` and a local list in
  `ItemSheetSetSumSettings.svelte`. A change to any of them would not fail the pack-source lint, so the test can drift.
  Fix: export one constant per vocabulary from `src/system/` and import it in the sheet and the test. Needs the
  user's approval because the test-suite plan (section 7.5) allows no other `src` change.
