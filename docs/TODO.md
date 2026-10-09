# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

- Unconscious drops held gear (equipped weapons and the shield are unequipped when a Character falls Unconscious);
  tabled by the user on 2026-10-09 during plan B Task 14. The intended behavior: when `fallUnconscious` runs on the
  creating client, after the Prone and Incapacitated toggles, every owned weapon with `system.equipped` true is
  unequipped with one `updateEmbeddedDocuments('Item', ...)` setting `system.equipped` to false, and a Character
  holding a shield runs `unEquipShield()`; nothing is updated when nothing is held. Rules text: "An Unconscious creature
  immediately drops anything it is holding, falls Prone, and is Incapacitated" (`docs/TITAN Rules Compendium.md`,
  "Unconscious"). The design spec records the ruling as an as-built amendment of its §1 and §4.

- Compendium audit rulings (plan C; module `src/packs`, rules 2026-09-26). User rulings of 2026-10-08. General rule:
  round down unless the text states otherwise. To do in plan C:
  - Force Slow: no change (it already rounds down).
  - Blood Frenzy: add the +5 Speed effect.
  - Aether Blades, Inferno Blades, Radiant Blade, Sacred Arms of the Arbiter (Weapon): the "+1 Damage" conditional
    modifier stays a placeholder; the target is a modifier that applies to every attack the chosen weapon makes.
  - Missing spell aspects (Charm Creature, Dominate Creature, Infiltrate Dreams, Enlarge/Reduce Creature (resistance),
    Create Fissure (damage), Grasping Earth (duration), Abyssal Darkness (Defense/Reflexes +2), Chained Bolts (extra
    targets)): add the aspects where the existing mechanics allow; no new mechanics.
  - Blood Probe, Conjurer of Urdokai, Pull of Urdokai, Warding of Urdokai: add the check entries.
  - Force Speed and the three Elder Sibling effects: no change to the granted speeds; granting speeds the creature
    lacks is intended. The Elder Sibling effects also gain immunity to Contaminated (user ruling 2026-10-09).
  - Urderic Glaivegun: the rules text gains a range (the compendium's Strike range 2 stands).
  - Light Attunement: carry both the "Attunement" and "Light" traits.
  - Shockwave: match the rules ("each creature adjacent to you").
  - Hunger of Urdokai: match the description (Range: 10 spaces).
  - Urderic Gunshield: rename the document to the rules' "Urderic Gun Shield".
  - Stormcaller's Tempest: mark passive, like The Dragon Awakens and Being of Urdokai.
  - Empower Soul: replace the Aether Blades text in its roll message.
  - Blue Magister: add the name prefix to the casting roll message.
  - Stray `type` fields on rules elements and trait entries: strip them.
  - Condition immunities the rules grant (user rulings 2026-10-09; Metal Attunement and Effulgent Gaze are built in
    plan B Task 16): Elder Sibling Body/Mind, Mind/Soul and Body/Soul gain an `immunity` element for Contaminated;
    Blessing of the Arbiter, Sleepless gains Sleeping and Unconscious. Tempest Herald ("immune to all conditions
    except Dying") gains one `immunity` element per existing condition id except `dead` (controller judgement,
    inferred: Dying leads to Dead, so Dead must stay possible); add the Dying exception when the Dying condition exists.
  - Review the compendium module for other effects whose text grants condition immunity: the plan B Task 16 review
    searched `src/packs` by text and its output omitted very long lines.
  - Parch: clamp Speed at 1, as the rules say "to a minimum of 1" (user ruling 2026-10-08). Check how the clamp
    applies to Fly, Swim, Burrow and Climb when implementing.
  - No change: Lord of Black Flames (the custom trait "Unarmed" in its roll message is a placeholder).
- Operation that adds one stat to another (user ruling 2026-10-08): not in this campaign. Tough ("add your Resilience to
  maximum Stamina") and Jade Perception (Awareness +1/2 Metaphysics Training) keep their placeholders until it exists.

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
  things by trait. The first cut, immunity to a condition by id or to an effect by name, is built (the element and
  editor, the derivation, suppression and refusal); only the extension by trait remains deferred.

- Remove or sync `.agents/skills/titan-codebase/`, a tracked copy of `.claude/skills/titan-codebase/` that differs in every
  reference file (last touched by commit `5526adee`). Measured 2026-10-02: no file in the repo, script or config reads
  it (`grep -rn "\.agents"` finds only the note in `docs/POST_WORK_FINDINGS.md`); whether an external agent tool reads
  `.agents/skills/` is not verified. `.agents/skills/graphify/` is separate.

- Field-scoped document updates instead of the whole-system read-modify-write in `refreshSystemDocument` (long-term
  shape named by the bug batch 1 review, 2026-10-09). Read in
  `src/helpers/utility-functions/RefreshSystemDocumentData.js`: every document-bound input event sends
  `structuredClone(document.system)` and `document.flags`, so one edit carries every other field of the live model.
  Inferred, not measured: an update built from a model that is behind the stored data can overwrite a newer stored
  value. The check-list mutators edit the model before their update resolves and take the edit back when it does not
  commit (`commitCheckUpdate` in `CheckListMixin.js`) because the next edit sends the whole `system`; CLOSED_BUGS
  #147 and #148 were found on this shape. Target: each input sends only its own field path, and the mutators send only
  their own array.

- UI-only controls usable by read-only viewers. On a sheet the viewer cannot edit, core disables every control of the
  window content at each render, and TITAN keeps that rule (the view-only tab strips and row expand toggles are
  re-enabled in `TitanDocumentSheet._toggleDisabled`). Controls that change no document state, such as the Filter
  inputs of the Skills tab and of the item sheet lists, are disabled with the rest. Idea: let observers and limited
  viewers use such controls (filter a long list they can read). Needs a ruling on which controls count as UI-only and a
  marker like `[data-view-controls]` for them, since `DocumentSheetV2` disables by form membership. Read from the
  code, not measured: a tab first shown after a sheet turned read-only mounts its controls after the render that
  disabled the rest, so its Filter would be usable by an observer while the Filter of the tab shown at the first
  render is not.

- Dying condition (user, 2026-10-09): a condition granted automatically when a Character reaches 0 Toughness while it
  has wounds. Tempest Herald's immunity to all conditions except Dying depends on it.

- Immunity by trait (user ruling 2026-10-09; extends the entry above for the rules that need it): Light Attunement,
  Brightness ("cannot be Blinded by bright light", conditional on the source being a Light effect); Presence of the
  Arbiter (immunity to Charmed or Frightened for the caster and allies within 5 spaces) and Animate Corpse (immune to
  mind-affecting conditions) wait for a trait covering mind control and similar effects, which the user will make
  later. Cleansing Shroud ("immune to the chosen Condition") needs a way to choose the condition; not yet ruled.
