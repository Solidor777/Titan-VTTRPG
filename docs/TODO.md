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

- Parch: clamp Speed at 1, as the rules say "to a minimum of 1" (user ruling 2026-10-08); tabled by the user on
  2026-10-09, so the compendium Parch keeps its five reductions with no floor. Plan C Task 7 designed the clamp as an
  optional `minimum` on Flat Modifier (`docs/superpowers/plans/2026-10-09-compendium-rulings.md`): it limits a reduction
  to the room above the minimum and never raises a stat, since a Flat Modifier of -5 floors at 0 and `setSum` with `min`
  1 would raise a speed the creature lacks. It is a new public rules-element field, so it needs the user's approval.
  Read from `CharacterDataModel`, not measured: `_applyArmorAndShields` runs after the rules elements and lowers a
  Heavy-armored character's non-zero speeds by 1, so a floor of 1 would end at 0 under Heavy armor; settle whether the
  floor holds after armor. Check how the clamp applies to Fly, Swim, Burrow and Climb when implementing.
- Weapon-targeted effects (user ruling 2026-10-08; design spec C3): Aether Blades (R:6305), Inferno Blades (R:5408),
  Radiant Blade (R:7338) and Sacred Arms of the Arbiter (Weapon) (R:7880) grant "+1 Damage" and traits to the attacks of
  one chosen weapon (rules lines in `docs/TITAN Rules Compendium - Source - 09_26_2026.md`). Their "+1 Damage" conditional
  modifier stays a placeholder in the compendium; the target is a modifier that applies to every attack the chosen
  weapon makes. Spec C3 records the design: a `weapon` selector on `conditionalCheckModifier` keyed by weapon name, a
  `grantAttackProperty` operation, an Ignore Armor attack option, and a drop-on-weapon-row fill.

- Spell radius "adjacent" (design spec C4): Shockwave's text applies to "each creature adjacent to you" (R:5129), and
  `SpellAspects.js` `radius` offers only 5 and 10 (read), so the compendium Shockwave has no radius aspect. A radius
  option of 1 needs a cost the rules do not publish.

- Rules-source differences found by the compendium audit (the user owns the rules text; the compendium follows the
  user's rulings): Urderic Glaivegun's Strike lists no range (R:2926-2929; the compendium's Strike range 2 stands);
  Hunger of Urdokai's header says Range: Touch while its text says "within 10 spaces" (R:9759, R:9765); Shockwave's
  header says Range: 10 spaces while its text says "each creature adjacent to you" (R:5122, R:5129); Light Attunement
  lists only the Light trait (R:7305) and Metal Attunement only Metal (R:5625 onward) where the rulings give every
  Attunement the Attunement trait; an untitled block (Cost: 1 Resolve, Traits: Path, Mystwalker) at R:9723-9733, between
  Conjurer of Urdokai and Mirror of Urdokai, repeats the text of Fangs of Urdokai (R:9772-9782).

- Mid-word `<strong>` splits in compendium descriptions (for example "<strong>Sou</strong>l"): 26 pack sources at the
  module's commit `a5db712` hold a bold run that starts or ends inside a word (measured 2026-10-09:
  `grep -rlE '\w</strong>[a-z]|[a-z]<strong>\w' src/packs` in the module, run in `src/packs`). Cosmetic; the compendium
  rulings plan fixed only the two the design spec names (Aether Blades, Inferno Blades).
- Review the compendium module for other effects whose text grants condition immunity: the plan B Task 16 review
  searched `src/packs` by text and its output omitted very long lines.
- Lord of Black Flames: no change by ruling (the custom trait "Unarmed" in its roll message is a placeholder). The
  plan C Tasks 4-6 reviewer noted that its flags differ from the spec's "passive only" (reported, not re-checked);
  confirm the ruling covers the flags.
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
  editor, the derivation, suppression and refusal); only the extension by trait remains deferred. Compendium texts that
  grant such an immunity (read by hand 2026-10-09): Fire Attunement (damage from heat and flames), Force Attunement
  (being pushed, shoved or moved), Earth Attunement (Shoved), Fox's Cunning (effects that force the truth), Path of the
  Stormcaller (effects based on pain), Control Light (creatures that see in the dark).

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

- Dying condition (user, 2026-10-09, in the user's words: "auto granted when a character reaches 0 toughness and has
  wounds"). Tempest Herald's immunity to all conditions except Dying depends on it. The rules compendium
  (`docs/TITAN Rules Compendium.md`, line 1433) words the start of Dying differently: "You start **Dying** when you take
  damage in excess of your maximum **Wounds** and **Stamina**";
  lines 1860 and 1919 say Dying starts when Wounds would go above their maximum. The trigger is settled when the
  condition is built. Tempest Herald (R:9251) carries one `immunity` element for each condition id except `dead`
  (user ruling 2026-10-09 for the immunities; the exception for Dead is a controller judgement, inferred: Dying leads to
  Dead, so Dead must stay possible), so when Dying exists the effect needs no element for it. The list is written by
  hand: a condition added to `src/system/Conditions.js` later is not covered until the effect gains its own element
  (the user accepted this gap on 2026-10-09; no selector or guard is built). Tempest Herald's "If you start Dying, you
  are not stunned", Diehard's "you are not Stunned" at zero Stamina, and the "no longer Dying" lines of Dark Side and
  Deathsinger's Rebirth wait for this condition.

- Immunity by trait (user ruling 2026-10-09; extends the entry above for the rules that need it): Light Attunement,
  Brightness ("cannot be Blinded by bright light", conditional on the source being a Light effect); Presence of the
  Arbiter (immunity to Charmed or Frightened for the caster and allies within 5 spaces) and Animate Corpse (immune to
  mind-affecting conditions) wait for a trait covering mind control and similar effects, which the user will make
  later. Cleansing Shroud ("immune to the chosen Condition") needs a way to choose the condition; not yet ruled. Mountain King Style (the effect and the combat-style ability:
  "you cannot be knocked Prone unless you choose to be") needs an immunity that can carry a voluntary exception, or a
  ruling to convert it to an unconditional Prone immunity; both documents keep their text until then.

- Specs that switch the active scene within about 2 seconds of a condition change can fail with the core
  `createScrollingText` error (CLOSED_BUGS #114; measured for `unconscious.spec.js` when a scene was already active,
  fixed there by reloading and restoring the scene through `activateScene`). Search the e2e specs for other scene
  switches that follow a condition or effect change, and give each the same reload; none has been observed failing.

- Tempest Herald's duration ends when the caster becomes Incapacitated (rules 09_26 line 9251-9256), and the
  compendium effect now grants immunity to Incapacitated (user ruling 2026-10-09, plan C Task 1), so that end
  condition cannot occur through the system. Decide with the Dying condition work whether the immunity list should
  exclude Incapacitated or the end condition is dropped.
- Conjurer of Urdokai's check has `resolveCost` 0 because the ability's 2 Resolve is its activation cost, while other
  sacred-art checks carry their ability's Cost as `resolveCost` (controller ruling during plan C Task 3, inferred
  from the plan; confirm with the user).

- `docs/TITAN Rules Compendium.md` (user-owned, untracked) disagrees with the code in two places the user ruled the code
  right on (2026-10-10): the Willpower section (line 1477) says Soul plus half of Body, rounded down, while
  `_calculateBaseResistances` and the user's ruling are Soul plus half of Mind; the Penetrating sentence (line 2246)
  says it ignores 1 point of Armor, while `ComputeDamageResistance.js` ignores half of the Armor, rounded up (rules
  revision `a233d07c`, 2026-09-28). Fix the two sentences in the compendium; the specs assert the code's numbers.
