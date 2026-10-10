# Compendium Audit Rulings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The compendium module's pack sources (`modules/titan-vttrpg-compendium/src/packs`) carry every correction the
user ruled on 2026-10-08 and 2026-10-09 for the 2026-09-26 rules audit, expressed with the rules elements, spell
aspects and check entries the system already has, plus the one system capability Parch's "to a minimum of 1" needs.

**Architecture:** Content-only edits to JSON pack sources, grouped by document kind: speed and condition-immunity
effects (Task 1), spell aspects (Task 2), check entries (Task 3), names, traits, flags and messages (Task 4), text
fixes the design spec lists and the backlog does not restate (Task 5), and the stray `type` fields (Task 6). A
git-ignored script proves every edited file equals the module's base commit with the intended change applied, and checks
the result against the system's own schema code read from source. Parch's clamp is not expressible with the existing
operations: Task 7 (system repo, gated on the user's approval of its design) adds an optional `minimum` to the Flat
Modifier element and Task 8 uses it. The live packs are recompiled once at the end (Task 9).

**Tech Stack:** JSON pack sources compiled by `@foundryvtt/foundryvtt-cli`, Node ESM scratch scripts, git. Task 7 also
uses JavaScript, Svelte 5 (runes), SCSS, Vitest, and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-compendium-rulings-design.md` (user-approved 2026-09-27), as narrowed by
the user's rulings in `docs/TODO.md` ("Compendium audit rulings" bullet, rulings of 2026-10-08 and 2026-10-09), which
bind where they differ. Executors read both. What the rulings drop from the spec: C1 (stat-referenced values: "Operation
that adds one stat to another ... not in this campaign"), C3 (weapon-targeted effects: the four weapon effects stay
placeholders), C4 (`radius` option 1: "no new mechanics" for spell aspects), and C2's `existingOnly` (Force Speed and
the Elder Sibling effects grant speeds the creature lacks by intent). C2's `minimum` is Task 7.

**Branches:** module repo `C:\FoundryVTT\V14\dev\foundryuserdata\Data\modules\titan-vttrpg-compendium`, branch
`conditions-and-rulings` at `a5db712` (plan B Tasks 15 and 16 are already committed on it); system repo
`C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan`, branch `conditions-and-rulings` (Tasks 7 and 9). Do not
switch branches. Both working trees carry changes that are not this plan's (the module's live `packs/**` LevelDB churn;
the system's `.claude/*`, deleted `CLAUDE.md` and `TITAN Rules Compendium.md`, two `Gemini_Generated_Image_*` images,
untracked `docs/TITAN Rules Compendium*.md`): never stage them. Stage only the files each task lists.

**Iron rule — every implementer, reviewer, and fix dispatch prompt the executor writes MUST contain this paragraph
verbatim:**

> Invoke the core skill immediately. The iron rule is no deferrals of existing work, or new work as it comes up - we fix this now unless I give my EXPRESS authorization. The only exception is if a bug or to-do has a genuine blocker that is already logged in a milestone in PLAN.md that has not been started yet. Another iron clad is rule is that when faced with a design fork, determine the best long term shape in keeping with our plans and goals, and implement accordingly. You only need to ask me if the question "what is the best long term shape in keeping with our plans and goals?" is not able to answer the question. Churn is not a concern. This paragraph must be copied verbatim to any agents dispatched in this campaign.

"The core skill" is the `titan-codebase` skill (`.claude/skills/titan-codebase/SKILL.md` + `references/*.md` in the
system repo). Every dispatch also loads `foundry-vtt`; Task 7 (Svelte) also loads `svelte-5` and `foundry-svelte`.

---

## Global Constraints

- **Rules decisions come only from the user's rulings in `docs/TODO.md`.** Every edit below names the ruling, the
  rules line (`R:`, in `docs/TITAN Rules Compendium - Source - 09_26_2026.md`), and the document it edits. An edit
  that comes from the design spec alone (Task 5) is marked as such; nothing is invented. An executor who finds an
  edit contradicting a ruling stops and reports it to the controller.
- **`packs/**` in the module is the live LevelDB** that Foundry holds open. Never stage, revert, `restore`, or compile
  into it while Foundry runs. Scratch compiles go to `.work/` (git-ignored) only. The one compile into the live packs is
  Task 9 Step 1, run by the controller with Foundry stopped.
- **No migrations.** The only world is the user's existing one; no migration, version step, or migration test is added or
  run. The edits change compendium sources only: documents already in the world keep the copies they hold.
- **Git:** no `git stash`, `reset`, `checkout`, `restore`, `commit --amend`, `push --force`, or history rewrite. Stage
  explicit paths only (`git add <path> ...`), never `git add -A`, `.`, or a directory. Before each commit run
  `git branch --show-current` (must print `conditions-and-rulings`) and `git status --short -- . ':(exclude)packs'`
  (module) or `git status --short` (system) and confirm only the task's files are staged. A concurrent user session may
  commit or switch branches under you: re-check before every commit.
- **Commit trailers, exactly:**

  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
  ```

- **JSON edits use the Edit tool only**, with the exact old and new text each task shows. Never a shell substitution,
  `sed`, `python`, or a script that writes pack content: those layers eat backslashes and rewrite layout. Every pack
  source stays in the canonical layout (2-space indent, trailing newline), which the verification script asserts.
- **Safe deletion only:** `trash <path>` for scratch output; never `rm`, `Remove-Item`, `rmdir`, or `shutil.rmtree`.
- **One commit per task**, made as soon as the task's verification is green.
- **Comments in code and docs state the present** (what the code does and why); no task IDs, plan references, or history.
  Project style for system code (Task 7): 120-character lines; braces on every conditional; objects with more than one
  property and arrays with more than one entry multi-line; trailing commas on multi-line literals; 3-space indent; every
  variable typed (`/** @type {T} ... */`) with a one-line description; every function has full JSDoc; no `:global` CSS;
  Svelte components with more than one prop are multi-line with `/>` on its own line.
- **Tests (Task 7):** the Foundry-free unit test builds a bare `CharacterDataModel` the way
  `tests/unit/ConditionMechanics.test.js` does (an intermediate computation on given inputs); the e2e test drives the
  editor through the real sheet. E2E rules: log in only as `E2E GM 1`/`E2E GM 2`/`E2E Player 1`/`E2E Player 2`; no poll
  or wait longer than 1000 ms; no fixed sleeps; every absence assertion is a presence-then-absence transition on the same
  resolved subject; serial execution (one working tree, one build, one Foundry).
- **Every module task ends in this order:** `node .work/verify-rulings.mjs <task>` (green), `npm run check:links`,
  `npm run packs:compile -- src/packs .work/compiled-rulings` (scratch; then `trash .work/compiled-rulings`), commit.

## Review Focus

The inputs and conditions the rulings imply that no task's exact-edit comparison exercises, most likely first. Each line
names the test that pins it.

1. **A creature that lacks a speed (Fly, Swim, Burrow, Climb at 0) under Parch.** A reduction "to a minimum of 1" must
   leave a speed the creature does not have at 0, never raise it to 1, and leave a speed already at 1 at 1. Pinned by
   `tests/unit/FlatModifierMinimum.test.js` (Task 7, bases Stride 4, Swim 3, Climb 1, Fly 0, Burrow 0) and by the
   in-world check on a real actor (Task 9 Step 1).
2. **Tempest Herald's immunity list is a hand list of condition ids.** "Immune to all conditions except Dying" ships as
   one `immunity` element per existing condition id except `dead`; a condition added to `buildConditionDefinitions`
   later is not covered until the effect gains its element. Pinned today by `.work/verify-rulings.mjs` (Task 1: the
   effect's immunity keys equal the condition ids except `dead`); no guard test exists in the system, and building one
   (or an "all conditions" selector) is a mechanism the plan does not invent (see Open questions 4).
3. **The `minimum` is measured against the running total at the element's turn.** Another speed bonus applied after
   Parch is added on top of the floor; applied before, it is reduced first. Pinned by the order test in
   `tests/unit/FlatModifierMinimum.test.js` (Task 7). Read from `CharacterDataModel.prepareDerivedData`, not measured:
   heavy armor's speed penalty is applied after the rules elements and can take a floor of 1 to 0 (Open questions 5).
4. **Applying an immunity effect to an actor that already has the condition.** With Immunity Handling at its default
   (Remove), the existing Contaminated, Sleeping, or Unconscious is deleted and a new one is refused. Pinned by the
   in-world check (Task 9 Step 1), which applies the condition first, then the effect.
5. **The Conjurer of Urdokai check's Damage "ignores Armor" only in its description.** The check entry has no
   ignore-Armor field (Fangs of Urdokai has none either); the chat card's Apply Damage (Ignore Armor) button applies it.
   Pinned by `.work/verify-rulings.mjs` (Task 3: the entry's fields equal the system's check template exactly, so no
   invented field can carry it).

---

## Rulings, sources, and tasks

Rules lines are in `docs/TITAN Rules Compendium - Source - 09_26_2026.md` (untracked, readable). "TODO" is the
"Compendium audit rulings (plan C ...)" bullet of `docs/TODO.md` (user rulings of 2026-10-08 and 2026-10-09).

| Ruling (TODO, user) | Rules line | Document edited (module `src/packs/`) | Task |
|---|---|---|---|
| Force Slow: no change (already rounds down) | R:6653 | none (`effects/Force_Slow_7tE1OuXQjwsrXikq.json` keeps `mulBase` 0.5, whose missing `rounding` rounds down) | - |
| Blood Frenzy: add the +5 Speed effect | R:8934 | `effects/Blood_Frenzy_KoHQ6jmewhn0uGjy.json` | 1 |
| Aether Blades, Inferno Blades, Radiant Blade, Sacred Arms of the Arbiter (Weapon): the "+1 Damage" modifier stays a placeholder | R:6305, R:5408, R:7338, R:7880 | none | - |
| Charm Creature, Dominate Creature, Infiltrate Dreams: Willpower resistance aspect | R:7403, R:7469, R:7492 | `spells/Charm_Creature_GSM53DP8by4LsNBm.json`, `spells/Dominate_Creature_CfcRpHzVY1gbwdVA.json`, `spells/Infiltrate_Dreams_fZXEe30h1sWcUgQG.json` | 2 |
| Enlarge/Reduce Creature: Resilience resistance | R:6955 | `spells/Enlarge_Reduce_Creature_3TX4Y4Iy29KijlWN.json` | 2 |
| Create Fissure: damage | R:5019 | `spells/Create_Fissure_Mg0sNtMnN5CcBeaL.json` | 2 |
| Grasping Earth: duration | R:5079 | `spells/Grasping_Earth_grpdCdpTwO44Y5ik.json` | 2 |
| Abyssal Darkness: Defense/Reflexes +2 | R:7078 | `spells/Abyssal_Darkness_JiHcQ7a7HnoUfFOk.json` | 2 |
| Chained Bolts: extra targets | R:6342 | `spells/Chained_Bolts_KWWVYuOv7Wz5KSql.json` | 2 |
| Shockwave: match the rules ("each creature adjacent to you") | R:5129 | `spells/Shockwave_2p9kAI0M6RMhiHQ2.json` | 2 |
| Blood Probe, Conjurer, Pull, Warding of Urdokai: add the check entries (4:1 Soul (Metaphysics), spec ruling 7) | R:8978, R:9721, R:9835, R:9895 | `sacred-arts/Blood_Probe_OnlfMxer8ImElwhR.json`, `sacred-arts/Conjurer_of_Urdokai_HS5DA4NpCDIRY6jb.json`, `sacred-arts/Pull_of_Urdokai_uibsE48NW0hbnMHl.json`, `sacred-arts/Warding_of_Urdokai_gr1c1ZoANmlLMIth.json` | 3 |
| Force Speed and the three Elder Sibling effects: no change to the granted speeds | R:6651, R:8499 | none | - |
| Elder Sibling Body/Mind, Mind/Soul, Body/Soul gain an `immunity` element for Contaminated (2026-10-09) | R:8501 | `effects/Elder_Sibling_Body_Mind__xDxaaDcOA9U2hS8w.json`, `effects/Elder_Sibling_Mind_Soul__a4T77yGj0BxyvAQg.json`, `effects/Elder_Sibling_Body_Soul__9bfEQTH9i9GaycNP.json` | 1 |
| Blessing of the Arbiter, Sleepless gains Sleeping and Unconscious (2026-10-09) | R:7748 | `effects/Blessing_of_the_Arbiter_Sleepless__P7roRvBbbTlSXNRT.json` | 1 |
| Tempest Herald: one `immunity` element per existing condition id except `dead` (2026-10-09, controller judgement) | R:9251 | `effects/Tempest_Herald_h1VBWeh2GTO9UAE4.json` | 1 |
| Urderic Glaivegun: the rules text gains a range; the compendium's Strike range 2 stands | R:2921-2929 | none (the rules source is the user's) | - |
| Light Attunement: carry both the "Attunement" and "Light" traits | R:7300-7305 | `spells/Light_Attunement_AfaeppVjow4HhIG5.json` (the two effects already carry both) | 4 |
| Hunger of Urdokai: match the description (Range: 10 spaces) | R:9765 | none (the pack description already reads "Range: 10 spaces") | - |
| Urderic Gunshield: rename to "Urderic Gun Shield" | R:2964 | `urderic-items/Urderic_Gunshield_TQJPW1rLHZUYfJpy.json` (renamed to `Urderic_Gun_Shield_...`) | 4 |
| Stormcaller's Tempest: passive, like The Dragon Awakens and Being of Urdokai | R:9208-9216 | `sacred-arts/Stormcaller_s_Tempest_4095TZGJVMJUv655.json` | 4 |
| Empower Soul: replace the Aether Blades text in its roll message | R:6376 | `effects/Empower_Soul_EfvhfVmnEwGO5TmZ.json` | 4 |
| Blue Magister: add the name prefix to the casting roll message | R:8294 | `effects/Blue_Magister_13pUdVwfDWS3FG0d.json` | 4 |
| (design spec pack ruling 10, user 2026-09-27, kept with this plan by the spec's "Delivered by the conditions rework"; not in the TODO) Every Attunement spell and effect carries the "Attunement" trait: the Metal Attunement spell and the Aether, Force, Metal and Void Attunement effects lack it | R:5625, R:6275, R:6486, R:6563 (the rules list no "Attunement" trait on Metal; the ruling governs) | `spells/Metal_Attunement_Om0Y1sDROHUR2Yjg.json`, `effects/{Metal,Aether,Force,Void}_Attunement_...` | 4 |
| Stray `type` fields on rules elements and trait entries: strip them | - | 62 fields in 34 files (found structurally by the script) | 6 |
| Review the module for other effects whose text grants condition immunity | - | result recorded below; no further convertible effect | 1 |
| Parch: clamp Speed at 1; check Fly, Swim, Burrow and Climb | R:5429 | `effects/Parch_AZWdUeIhXOOdUsBS.json` (needs Task 7) | 7, 8 |
| No change: Lord of Black Flames | - | none | - |
| Operation that adds one stat to another (Tough, Jade Perception): not in this campaign | - | none | - |
| (design spec only, not in the TODO) Aether Blades "+1 Damage and" bold slip, Inferno Blades "Actio\|n", Blue Magister custom traits, Abyssal Darkness redundant Reflexes message and the Stealth Greater Advantage | - | `effects/Aether_Blades_...`, `effects/Inferno_Blades_...`, `effects/Blue_Magister_...`, `effects/Abyssal_Darkness_4dn4CKsKPv7fkgXz.json` | 5 |

Judgements inside the rulings, each flagged for the controller (none is a rules ruling):

- **Shockwave:** the pack's `radius` aspect (5) contradicts "each creature adjacent to you" (R:5129) and `SpellAspects`
  offers only radius 5 and 10, so the aspect is removed and the description (already "adjacent") carries the area.
  A radius-1 option would be a new mechanic with a cost the rules do not publish (Not built, 2).
- **Charm, Dominate, Enlarge/Reduce, Infiltrate Dreams resistance:** no standard aspect carries a resistance except
  Damage, Decrease and Inflict, so the resistance is a custom aspect with `resistanceCheck`, the pattern Illusion,
  Irresistible Command, Beast Form and Truth-Sight already use. Infiltrate Dreams already has the custom aspect
  "10 Minutes"; its resistance is set (as Truth-Sight's is).
- **Create Fissure damage** is non-scaling with `resistanceCheck: "reflexes"`: the rules apply the 1 Damage only to a
  creature that fails the opposed Reflexes check and falls (R:5019), unlike Grasping Earth, whose Damage applies
  "regardless" (its aspect keeps `none`).
- **Empower Soul** becomes a `turnMessage` at turn start (design spec: "a turn-start message"), not a `rollMessage`
  keyed to attack checks, which would show on the wrong checks.
- **Blood Frenzy and Parch** use one `speed` element with key `all` (the engine expands it, `_expandAllKeyElements`,
  and the editor offers it) rather than five per-speed elements.

## Review of the module for other condition-immunity text

Two scans of every `description`, `system.description`, rules-element message, and embedded item description in all 801
pack sources (sentences with "immun", "cannot be", "cannot become", "unaffected" and similar; and sentences naming a
condition with a negation): 64 and 48 sentences, each read by hand on 2026-10-09 with its document. The Rules journal's
page text is rules prose that applies nothing and was not scanned. Result:

- **Converted by this plan:** Elder Sibling (three effects), Blessing of the Arbiter (Sleepless), Tempest Herald.
  **Converted earlier:** Metal Attunement, Effulgent Gaze.
- **Wait for immunity by trait (the user's ruling, `docs/TODO.md` "Immunity by trait"):** Light Attunement (Brightness)
  "cannot be Blinded by bright light", Presence of the Arbiter (effect and ability), Animate Corpse (effect and spell),
  Cleansing Shroud (Choose) (effect and spell).
- **Needs a ruling that is not in the TODO (Open questions 3):** Mountain King Style, effect and combat-style ability:
  "you cannot be knocked Prone unless you choose to be". `immunity` is unconditional, so a converted effect would also
  refuse a Prone the character chooses.
- **Immunity to something that is not a condition (the existing TODO "Extend immunity beyond effects and conditions"):**
  Fire Attunement (damage from heat and flames), Force Attunement (pushed, shoved, moved), Earth Attunement (Shoved),
  Fox's Cunning (effects that force the truth), Path of the Stormcaller (effects based on pain), Control Light
  (creatures that see in the dark).
- **Wait for the Dying condition (the existing TODO "Dying condition"):** Tempest Herald "If you start Dying, you are not
  stunned", Diehard "you are not Stunned" at zero Stamina, Dark Side and Deathsinger's Rebirth "no longer Dying".
- **Not an immunity:** Menacing (a target-specific "cannot be Frightened by you" for the encounter), Cautious Spell,
  Controlled Blast, Stormcaller's Grasp, Eye of the Arbiter (unaffected targets and per-target limits), Hunter ("cannot be
  surprised"), Invisibility ("cannot be seen"), Telekinesis, Black Chain of the Arbiter, Heart of Ice, Inferno Style,
  Reach Spell, Subtle Spell, Combat Repairs, Path of Red Faith, Telekinetic Bombardment, Urderic Mesh Suit, Cat Fall,
  Long Reach, Shield Master, Trade Winds, Call Tornado, Toxin Resistance, Keen Sense, Cleansing Light, Infiltrate Dreams,
  Kirin's Black Harvest, Eclipse Walker, Anatomical Anarchy.

## Not built (needs a mechanic)

The controller logs each in `docs/TODO.md` (Task 9 Step 3 writes the entries).

1. **Weapon-targeted effects** (Aether Blades R:6305, Inferno Blades R:5408, Radiant Blade R:7338, Sacred Arms of the
   Arbiter (Weapon) R:7880): "+1 Damage" and the granted traits apply to the chosen weapon's attacks. User ruling
   2026-10-08: the roll messages stay as placeholders; the target is a modifier that applies to every attack the chosen
   weapon makes (spec C3: `conditionalCheckModifier` selector `weapon`, a `grantAttackProperty` operation, a drop-on-
   weapon-row fill).
2. **Radius "adjacent" (1) aspect** (Shockwave R:5129): needs a `SpellAspects.radius` option and a cost the rules do not
   publish.
3. **Immunity by trait and to non-condition things** (Light Attunement Brightness, Presence of the Arbiter, Animate
   Corpse, Cleansing Shroud, Fire/Force/Earth Attunement, Fox's Cunning, Path of the Stormcaller): already in
   `docs/TODO.md`.
4. **Stat-referenced values** (Tough, Jade Perception): already in `docs/TODO.md` ("Operation that adds one stat to
   another").
5. **Per-target values** (Abjuration of the Arbiter): already in `docs/TODO.md`.
6. **Dying exceptions** (Tempest Herald, Diehard): already in `docs/TODO.md` ("Dying condition").

## Open questions for the user

These do not block the tasks; each names the default the plan implements.

1. **Task 7 is a system change (public data shape): approve the design?** An optional `minimum` on the Flat Modifier
   element (spec C2's `minimum`, without `existingOnly`), edited with a checkbox and an integer input, evaluated against
   the running total. With existing operations only, `setSum` mode `min` would raise a speed the creature lacks to 1
   (a creature without Fly would gain Fly 1), and the five speeds cannot be clamped separately for those that exist.
   The project's consent rule applies: the controller asks before Task 7 starts.
2. **Spec-only edits** are not in the TODO list: Task 5 (the Aether Blades and Inferno Blades text slips, Blue Magister's
   custom traits (R:8283), and Abyssal Darkness: the repeated Reflexes message removed, the Stealth message becomes a
   situational Greater Advantage "Remain Unseen") and the five Attunement-trait files of Task 4 (spec pack ruling 10,
   which the spec's "Delivered by the conditions rework" paragraph keeps with this plan). The plan includes them under
   the iron rule; strike them if they are not wanted.
3. **Mountain King Style** (effect and combat-style ability): convert "cannot be knocked Prone unless you choose to be"
   to a Prone immunity (which also refuses a Prone the character chooses), or leave it as text until immunity can carry
   a voluntary exception?
4. **Tempest Herald drift:** accept the per-condition list (and edit the effect when a condition is added), or build an
   "all conditions" selector or a guard test?
5. **Parch and heavy armor:** read from the code, not measured: heavy armor's speed penalty runs after the rules elements,
   so a heavily armored creature under Parch ends at 0. Should Parch's floor of 1 hold after armor?

---

## File structure

Module repo (`src/packs/`), by task:

- Task 1: `effects/Blood_Frenzy_...`, `effects/Elder_Sibling_{Body_Mind,Mind_Soul,Body_Soul}_...`,
  `effects/Blessing_of_the_Arbiter_Sleepless__...`, `effects/Tempest_Herald_...` (6 files).
- Task 2: `spells/{Charm_Creature,Dominate_Creature,Infiltrate_Dreams,Enlarge_Reduce_Creature,Create_Fissure,Grasping_Earth,Abyssal_Darkness,Chained_Bolts,Shockwave}_...` (9 files).
- Task 3: `sacred-arts/{Blood_Probe,Conjurer_of_Urdokai,Pull_of_Urdokai,Warding_of_Urdokai}_...` (4 files).
- Task 4: `spells/{Light,Metal}_Attunement_...`, `effects/{Metal,Aether,Force,Void}_Attunement_...`,
  `urderic-items/Urderic_Gunshield_... -> Urderic_Gun_Shield_...`, `sacred-arts/Stormcaller_s_Tempest_...`,
  `effects/Empower_Soul_...`, `effects/Blue_Magister_...` (10 files).
- Task 5: `effects/{Aether_Blades,Inferno_Blades,Blue_Magister,Abyssal_Darkness}_...` (4 files).
- Task 6: 34 files holding a stray `type` field (listed in the task).
- Task 8: `effects/Parch_...` (1 file).
- Scratch, never committed: `.work/verify-rulings.mjs`, `.work/live-check-rulings.mjs`.

System repo, Task 7: create `src/helpers/utility-functions/ComputeFlatModifierContribution.js`,
`tests/unit/ComputeFlatModifierContribution.test.js`, `tests/unit/FlatModifierMinimum.test.js`; modify
`src/document/types/actor/types/character/CharacterDataModel.js`, `src/document/types/item/rules-element/FlatModifier.js`,
`src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte`, `lang/en.json`,
`tests/e2e/rules-element-editor.spec.js`, `CHANGELOG.md`, `.claude/skills/titan-codebase/references/abstractions.md`.
Task 9: modify `docs/TODO.md`, `docs/POST_WORK_FINDINGS.md`, `docs/superpowers/specs/2026-09-27-compendium-rulings-design.md`.

---
## Tasks

Tasks 1-6 and 8 work in the module repo; Task 7 works in the system repo; Task 9 spans both. Tasks 1-6 are independent
of each other and of Task 7; Task 8 needs Task 7's commit; Task 9 runs last. Execute in order.

### Task 1: Speed and condition-immunity effects (module)

Blood Frenzy gains its +5 Speed effect; the three Elder Sibling effects, Blessing of the Arbiter (Sleepless), and Tempest
Herald gain `immunity` elements. Rulings: TODO "Blood Frenzy: add the +5 Speed effect" (R:8934) and "Condition
immunities the rules grant" (user rulings 2026-10-09; Elder Sibling R:8501, Sleepless R:7748, Tempest Herald R:9251).
This task also creates the verification script every later module task runs.

**Files:**
- Modify: `src/packs/effects/Blood_Frenzy_KoHQ6jmewhn0uGjy.json`,
  `src/packs/effects/Elder_Sibling_Body_Mind__xDxaaDcOA9U2hS8w.json`,
  `src/packs/effects/Elder_Sibling_Mind_Soul__a4T77yGj0BxyvAQg.json`,
  `src/packs/effects/Elder_Sibling_Body_Soul__9bfEQTH9i9GaycNP.json`,
  `src/packs/effects/Blessing_of_the_Arbiter_Sleepless__P7roRvBbbTlSXNRT.json`,
  `src/packs/effects/Tempest_Herald_h1VBWeh2GTO9UAE4.json`
- Test (scratch, git-ignored, never committed): `.work/verify-rulings.mjs`

**Interfaces:**
- Consumes: the `ImmunityElement` shape (system `src/document/types/item/rules-element/Immunity.js`):
  `{ operation: 'immunity', selector: 'condition', key: <condition id>, uuid }`; the condition ids of
  `buildConditionDefinitions` (`src/system/Conditions.js`): `blinded`, `contaminated`, `dead`, `deafened`, `frightened`,
  `incapacitated`, `offBalance`, `prone`, `restrained`, `stunned`, `sleeping`, `unconscious`; the Flat Modifier element
  `{ operation: 'flatModifier', selector, key, value, uuid }`, whose key `all` the engine expands to every key under the
  selector (`CharacterDataModel._expandAllKeyElements`, and `SpeedSelect` offers `allowAll`). Plan B Task 16 (module
  commit `a5db712`) is the pattern: the same four-field immunity element appended to an effect's `rulesElement`.
- Produces: `verify-rulings.mjs <n>`, which later tasks run with their own number (it checks tasks `1..n`), and these
  elements (uuids are `uuid(seed)` from the module's `tools/ids.mjs`, seeded `compendium-rulings:<document>:<element>`):
  Blood Frenzy `flatModifier speed all +5` (`4e440bcf-958e-4515-a6ef-8d644b1da8b2`), first in its `rulesElement`;
  `immunity contaminated` on each Elder Sibling effect; `immunity sleeping` and `immunity unconscious` on Sleepless;
  eleven `immunity` elements on Tempest Herald (every condition id except `dead`).

- [ ] **Step 1: Confirm the module branch and state**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git log --oneline -1
git status --short -- . ':(exclude)packs'
```

Expected: branch `conditions-and-rulings`, head `a5db712 feat(packs): Metal Attunement and Effulgent Gaze grant
condition immunity`, and no output from `git status` (the live `packs/` churn is excluded). If not, stop and report it
to the controller.

- [ ] **Step 2: Write the verification script**

With the Write tool (never a shell heredoc), create
`C:\FoundryVTT\V14\dev\foundryuserdata\Data\modules\titan-vttrpg-compendium\.work\verify-rulings.mjs` with exactly this
content. `.work/` is git-ignored scratch (it already holds earlier audit output; add nothing else there).

For each file a task edits, the script requires the file to equal the base commit `a5db712` with the intended change
applied (the `REGISTRY`, an independent statement of each edit), in the canonical JSON layout; requires every other pack
source to equal the base commit; and checks the edited documents against the system's schema code read from source
(`SpellAspects.js`, `ItemCheckTemplate.js`, `SpellCustomAspect.js`, `Immunity.js`, `FlatModifier.js`, `TurnMessage.js`,
`ConditionalCheckModifier.js`, `Conditions.js`).

```js
// Verifies the compendium ruling edits against the committed pack sources, without touching the live packs.
// Usage: node .work/verify-rulings.mjs <group>     (checks groups 1..<group>; `all` checks every group)
//
// For every file a group edits, the file must equal the module's base commit with the group's intended change applied
// (REGISTRY), in the canonical JSON layout (2-space indent), and every other pack source must equal the base commit.
// The edited documents are then checked against the TITAN system's own schema code, read from source: the spell aspect
// table, the item check template, the custom aspect template, the immunity, flat modifier and turn message element
// factories, and the condition ids.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string} The module repo root. */
const MODULE_ROOT = 'C:/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium';

/** @type {string} The TITAN system source root whose schema code the checks read. */
const SYSTEM_SRC = 'C:/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan/src';

/** @type {string} The module commit the edits start from (Metal Attunement and Effulgent Gaze immunity). */
const BASE_REF = 'a5db712';

/** @type {RegExp} A version-4 uuid, the shape every new rules element, check, aspect and trait entry carries. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** @type {string} The Urderic Gunshield's path at the base commit; the edits rename it. */
const GUNSHIELD_BASE = 'urderic-items/Urderic_Gunshield_TQJPW1rLHZUYfJpy.json';

/** @type {string} The Urderic Gun Shield's path after the rename. */
const GUNSHIELD_NOW = 'urderic-items/Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json';

/**
 * Runs a git command in the module repo.
 * @param {string[]} args - The git arguments.
 * @returns {string} The command's standard output.
 */
function git(args) {
   return execFileSync('git', args, {
      cwd: MODULE_ROOT,
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
   });
}

/**
 * Reads a pack source as it is at the base commit.
 * @param {string} rel - The path under `src/packs`.
 * @returns {object} The parsed document.
 */
function readBase(rel) {
   return JSON.parse(git(['show', `${BASE_REF}:src/packs/${rel}`]));
}

/**
 * Reads a pack source from the working tree.
 * @param {string} rel - The path under `src/packs`.
 * @returns {{raw: string, data: object}} The file text and its parsed document.
 */
function readNow(rel) {
   /** @type {string} The file text. */
   const raw = fs.readFileSync(path.join(MODULE_ROOT, 'src', 'packs', rel), 'utf8');
   return {
      data: JSON.parse(raw),
      raw,
   };
}

/**
 * Loads a TITAN system source file as a function scope, so its exports can be read without the Vite `~/` alias.
 * Import lines are dropped (the names they bind are passed in as stubs), `export default` binds `__default`, and other
 * `export` keywords are removed.
 * @param {string} relPath - The path under the system `src` directory.
 * @param {Record<string, *>} stubs - The identifiers the file's imports bind.
 * @returns {*} The file's default export.
 */
function loadDefaultExport(relPath, stubs) {
   /** @type {string} The file text with imports removed and exports turned into declarations. */
   const source = fs.readFileSync(path.join(SYSTEM_SRC, relPath), 'utf8')
      .replace(/^import .*;$/gm, '')
      .replace(/^export default /gm, 'const __default = ')
      .replace(/^export /gm, '');
   const factory = new Function(...Object.keys(stubs), `${source}\nreturn __default;`);
   return factory(...Object.values(stubs));
}

/**
 * Reads the condition ids from the system's condition definitions, and checks that every definition was found.
 * @returns {string[]} The condition ids in definition order.
 */
function loadConditionIds() {
   /** @type {string} The Conditions.js text. */
   const source = fs.readFileSync(path.join(SYSTEM_SRC, 'system/Conditions.js'), 'utf8');
   /** @type {string[]} The ids. */
   const ids = [...source.matchAll(/^ {9}id: '(\w+)',$/gm)].map((match) => match[1]);
   assert.equal(ids.length, [...source.matchAll(/^ {9}type: CONDITION_TYPE,$/gm)].length, 'every definition has an id');
   assert.ok(ids.includes('dead') && ids.includes('offBalance'), 'condition ids read');
   return ids;
}

/** @type {string[]} The system's condition ids. */
const CONDITION_IDS = loadConditionIds();

/** @type {Record<string, object>} The spell aspect table (SpellAspects.js). */
const SPELL_ASPECTS = loadDefaultExport('document/types/item/types/spell/SpellAspects.js', {
   deepFreeze: (value) => value,
});

/** @type {string[]} The resistances a check or aspect can name (the Decrease Resistance options). */
const RESISTANCES = SPELL_ASPECTS.decreaseResistance.settings.option;

/** @type {string[]} The skill keys (the Decrease Skill options). */
const SKILLS = SPELL_ASPECTS.decreaseSkill.settings.option;

/** @type {string[]} The attribute keys (the Decrease Attribute options). */
const ATTRIBUTES = SPELL_ASPECTS.decreaseAttribute.settings.option;

/** @type {object} A freshly built item check template (ItemCheckTemplate.js). */
const CHECK_TEMPLATE = loadDefaultExport('check/types/item-check/ItemCheckTemplate.js', {
   generateUUID: () => 'uuid',
   localize: (key) => key,
})();

/** @type {object} A freshly built spell custom aspect (SpellCustomAspect.js). */
const CUSTOM_ASPECT_TEMPLATE = loadDefaultExport('document/types/item/types/spell/SpellCustomAspect.js', {
   generateUUID: () => 'uuid',
   localize: (key) => key,
})();

/** @type {object} A freshly built immunity element (Immunity.js). */
const IMMUNITY_TEMPLATE = loadDefaultExport('document/types/item/rules-element/Immunity.js', {
   CONDITION_IDS,
   generateUUID: () => 'uuid',
})();

/** @type {object} A freshly built flat modifier element (FlatModifier.js). */
const FLAT_MODIFIER_TEMPLATE = loadDefaultExport('document/types/item/rules-element/FlatModifier.js', {
   generateUUID: () => 'uuid',
})();

/** @type {object} A freshly built turn message element (TurnMessage.js). */
const TURN_MESSAGE_TEMPLATE = loadDefaultExport('document/types/item/rules-element/TurnMessage.js', {
   DURATION_TURN_START: 'turnStart',
   generateUUID: () => 'uuid',
})();

/** @type {object} A freshly built conditional check modifier element (ConditionalCheckModifier.js). */
const CONDITIONAL_CHECK_MODIFIER_TEMPLATE = loadDefaultExport(
   'document/types/item/rules-element/ConditionalCheckModifier.js',
   { generateUUID: () => 'uuid' },
)();

/**
 * Builds an immunity element in the system's field order.
 * @param {string} key - The condition id.
 * @param {string} uuid - The element's uuid.
 * @returns {object} The element.
 */
function immunity(key, uuid) {
   return {
      operation: 'immunity',
      selector: 'condition',
      key,
      uuid,
   };
}

/**
 * Builds a custom trait entry in the system's field order.
 * @param {string} name - The trait name.
 * @param {string} uuid - The entry's uuid.
 * @returns {object} The entry.
 */
function trait(name, uuid) {
   return {
      name,
      description: '',
      uuid,
   };
}

/**
 * Builds a spell custom aspect that names a resistance, in the system's field order.
 * @param {string} label - The aspect label.
 * @param {string} resistanceCheck - The resistance that opposes it.
 * @param {string} uuid - The aspect's uuid.
 * @returns {object} The custom aspect.
 */
function resistedAspect(label, resistanceCheck, uuid) {
   return {
      label,
      scaling: false,
      initialValue: 0,
      cost: 1,
      resistanceCheck,
      isDamage: false,
      isHealing: false,
      uuid,
   };
}

/**
 * Builds an ability check entry modelled on Torment of Urdokai: Soul (Metaphysics) 4:1 against a resistance.
 * @param {object} fields - The entry's own fields.
 * @param {string} fields.label - The check label.
 * @param {number} fields.resolveCost - The Resolve the check costs.
 * @param {boolean} fields.isDamage - Whether the difference in successes is Damage.
 * @param {string} fields.resistanceCheck - The resistance that opposes the check.
 * @param {string} fields.damageReducedBy - 'resistanceCheck' for Damage equal to the difference, else 'none'.
 * @param {string} fields.uuid - The entry's uuid.
 * @returns {object} The check entry.
 */
function metaphysicsCheck({ label, resolveCost, isDamage, resistanceCheck, damageReducedBy, uuid }) {
   return {
      label,
      attribute: 'soul',
      skill: 'metaphysics',
      difficulty: 4,
      complexity: 1,
      resolveCost,
      isDamage,
      isHealing: false,
      initialValue: 1,
      scaling: true,
      resistanceCheck,
      opposedCheck: {
         enabled: false,
         attribute: 'body',
         skill: 'athletics',
      },
      damageReducedBy,
      uuid,
   };
}

/**
 * Removes the stray `type` field from every rules element, standard trait and custom trait entry of a document,
 * including those of embedded items. Rules elements and trait entries carry no `type`; the engine tags an element with
 * its source's type at runtime.
 * @param {*} node - The document, or any value inside it.
 * @returns {void}
 */
function stripStrayTypes(node) {
   if (Array.isArray(node)) {
      node.forEach(stripStrayTypes);
      return;
   }
   if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
         if (['rulesElement', 'trait', 'customTrait'].includes(key) && Array.isArray(value)) {
            for (const entry of value) {
               if (entry && typeof entry === 'object') {
                  delete entry.type;
               }
            }
         }
         stripStrayTypes(value);
      }
   }
}

/**
 * Lists the pack sources at the base commit that may hold a stray `type` field: those with a `"type"` line whose value
 * is one a rules element or trait entry was found carrying ("ability", "equipment" or "boolean"). A document without
 * such a line cannot hold one, and the structural strip decides the rest, so the full pack is not read file by file.
 * @returns {string[]} The paths under `src/packs`.
 */
function listBaseSources() {
   return git(['grep', '-l', '-E', '"type": "(ability|equipment|boolean)"', BASE_REF, '--', 'src/packs'])
      .split('\n')
      .filter((line) => line.endsWith('.json'))
      .map((line) => line.slice(`${BASE_REF}:src/packs/`.length));
}

/** @type {string[]} Name fragments of the effects whose rules elements the edits add or change. */
const ELEMENT_EDITED = [
   'Blood_Frenzy_',
   'Elder_Sibling_',
   'Blessing_of_the_Arbiter_Sleepless_',
   'Tempest_Herald_',
   'Empower_Soul_',
   'Abyssal_Darkness_4dn4',
   'Parch_',
];

/**
 * Lists every JSON pack source in the working tree.
 * @param {string} root - The `src/packs` directory.
 * @returns {string[]} The paths under it, with forward slashes.
 */
function walkWorkingSources(root) {
   /** @type {string[]} The paths found. */
   const found = [];
   for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
         found.push(path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
      }
   }
   return found;
}

/**
 * One intended change to one pack source.
 * @typedef {object} Change
 * @property {number} task - The group of edits that makes the change.
 * @property {string} file - The path under `src/packs` the file has after the change.
 * @property {string} [from] - The path at the base commit, when the change renames the file.
 * @property {function(object): void} mutate - Applies the change to the parsed document.
 */

/** @type {Change[]} Every intended change, in group order. */
export const REGISTRY = [
   // Group 1: speed and condition-immunity effects.
   {
      task: 1,
      file: 'effects/Blood_Frenzy_KoHQ6jmewhn0uGjy.json',
      mutate: (doc) => {
         doc.system.rulesElement.unshift({
            operation: 'flatModifier',
            selector: 'speed',
            key: 'all',
            value: 5,
            uuid: '4e440bcf-958e-4515-a6ef-8d644b1da8b2',
         });
      },
   },
   {
      task: 1,
      file: 'effects/Elder_Sibling_Body_Mind__xDxaaDcOA9U2hS8w.json',
      mutate: (doc) => {
         doc.system.rulesElement.push(immunity('contaminated', '1818c6ca-3d89-41df-a2cf-d180ac98385f'));
      },
   },
   {
      task: 1,
      file: 'effects/Elder_Sibling_Mind_Soul__a4T77yGj0BxyvAQg.json',
      mutate: (doc) => {
         doc.system.rulesElement.push(immunity('contaminated', '8541ffa2-fc51-496d-afa0-d64103251d19'));
      },
   },
   {
      task: 1,
      file: 'effects/Elder_Sibling_Body_Soul__9bfEQTH9i9GaycNP.json',
      mutate: (doc) => {
         doc.system.rulesElement.push(immunity('contaminated', '94f8765f-47b1-4fa3-a185-c84081a59d25'));
      },
   },
   {
      task: 1,
      file: 'effects/Blessing_of_the_Arbiter_Sleepless__P7roRvBbbTlSXNRT.json',
      mutate: (doc) => {
         doc.system.rulesElement.push(
            immunity('sleeping', '5bd6d9f0-196a-4804-adf0-992406a401c6'),
            immunity('unconscious', 'd920a03c-841b-4844-aa05-4610daf73ab2'),
         );
      },
   },
   {
      task: 1,
      file: 'effects/Tempest_Herald_h1VBWeh2GTO9UAE4.json',
      mutate: (doc) => {
         doc.system.rulesElement.push(
            immunity('blinded', '55116cbf-9377-4d0d-ace8-112cab8fa4f0'),
            immunity('contaminated', '4f5a673b-19f3-4cc5-ae7d-c0e2af1ece2d'),
            immunity('deafened', '7353a7d3-0997-4186-a1d9-a1af950a9e92'),
            immunity('frightened', '7b20acdd-1ec1-4a86-a9b5-2b4d4ebcc037'),
            immunity('incapacitated', 'fcfb39de-f663-4178-ab1f-53a1b0557547'),
            immunity('offBalance', 'cf91c97a-b2a1-4c43-a689-e2629128894c'),
            immunity('prone', 'd59e3adf-e714-48fc-a1d2-12a6e30f4126'),
            immunity('restrained', '9031fe10-ea18-4a5f-a15a-dee386eace24'),
            immunity('stunned', '7a6f4923-b33e-450c-afa4-abeb534a362b'),
            immunity('sleeping', 'b7e2ae45-092a-47bc-a16a-aa24724430a2'),
            immunity('unconscious', 'df156783-c458-4475-a841-55eda542b779'),
         );
      },
   },

   // Group 2: spell aspects.
   {
      task: 2,
      file: 'spells/Charm_Creature_GSM53DP8by4LsNBm.json',
      mutate: (doc) => {
         doc.system.customAspect.push(resistedAspect('Charm', 'willpower', '2abd0316-6d86-40f5-a49b-a44305002f12'));
      },
   },
   {
      task: 2,
      file: 'spells/Dominate_Creature_CfcRpHzVY1gbwdVA.json',
      mutate: (doc) => {
         doc.system.customAspect.push(resistedAspect('Dominate', 'willpower', 'acdb3545-f16e-4ec9-a81c-b44e4a4de315'));
      },
   },
   {
      task: 2,
      file: 'spells/Infiltrate_Dreams_fZXEe30h1sWcUgQG.json',
      mutate: (doc) => {
         doc.system.customAspect[0].resistanceCheck = 'willpower';
      },
   },
   {
      task: 2,
      file: 'spells/Enlarge_Reduce_Creature_3TX4Y4Iy29KijlWN.json',
      mutate: (doc) => {
         doc.system.customAspect.push(
            resistedAspect('Enlarge / Reduce', 'resilience', '3d813ab2-e2be-462b-a114-b20927de8a7e'),
         );
      },
   },
   {
      task: 2,
      file: 'spells/Create_Fissure_Mg0sNtMnN5CcBeaL.json',
      mutate: (doc) => {
         doc.system.aspect.splice(1, 0, {
            label: 'damage',
            scaling: false,
            initialValue: 1,
            cost: 1,
            resistanceCheck: 'reflexes',
            isDamage: true,
            option: [],
            enabled: true,
         });
      },
   },
   {
      task: 2,
      file: 'spells/Grasping_Earth_grpdCdpTwO44Y5ik.json',
      mutate: (doc) => {
         doc.system.aspect.splice(1, 0, {
            label: 'duration',
            scaling: true,
            initialValue: 1,
            unit: 'rounds',
            cost: 1,
            enabled: true,
            scalingCost: 1,
         });
      },
   },
   {
      task: 2,
      file: 'spells/Abyssal_Darkness_JiHcQ7a7HnoUfFOk.json',
      mutate: (doc) => {
         doc.system.aspect.push(
            {
               label: 'increaseRating',
               initialValue: 2,
               cost: 1,
               option: ['defense'],
               scaling: false,
               enabled: true,
            },
            {
               label: 'increaseResistance',
               initialValue: 2,
               cost: 1,
               option: ['reflexes'],
               scaling: false,
               enabled: true,
            },
         );
      },
   },
   {
      task: 2,
      file: 'spells/Chained_Bolts_KWWVYuOv7Wz5KSql.json',
      mutate: (doc) => {
         doc.system.aspect.splice(1, 0, {
            label: 'extraTargets',
            scaling: false,
            initialValue: 3,
            cost: 1,
            enabled: true,
         });
      },
   },
   {
      task: 2,
      file: 'spells/Shockwave_2p9kAI0M6RMhiHQ2.json',
      mutate: (doc) => {
         doc.system.aspect = doc.system.aspect.filter((aspect) => aspect.label !== 'radius');
      },
   },

   // Group 3: check entries.
   {
      task: 3,
      file: 'sacred-arts/Blood_Probe_OnlfMxer8ImElwhR.json',
      mutate: (doc) => {
         doc.system.check = [
            metaphysicsCheck({
               label: 'Blood Probe',
               resolveCost: 0,
               isDamage: false,
               resistanceCheck: 'resilience',
               damageReducedBy: 'none',
               uuid: '7431e330-c2df-4555-ad22-c27800ba972e',
            }),
         ];
      },
   },
   {
      task: 3,
      file: 'sacred-arts/Conjurer_of_Urdokai_HS5DA4NpCDIRY6jb.json',
      mutate: (doc) => {
         doc.system.check = [
            metaphysicsCheck({
               label: 'Conjurer',
               resolveCost: 0,
               isDamage: true,
               resistanceCheck: 'willpower',
               damageReducedBy: 'resistanceCheck',
               uuid: 'd2264c76-c37e-47fc-a0ef-fc3b69fc9627',
            }),
         ];
      },
   },
   {
      task: 3,
      file: 'sacred-arts/Pull_of_Urdokai_uibsE48NW0hbnMHl.json',
      mutate: (doc) => {
         doc.system.check = [
            metaphysicsCheck({
               label: 'Pull',
               resolveCost: 1,
               isDamage: false,
               resistanceCheck: 'willpower',
               damageReducedBy: 'none',
               uuid: '528761bd-827b-4f56-afc0-5cffa1800041',
            }),
         ];
      },
   },
   {
      task: 3,
      file: 'sacred-arts/Warding_of_Urdokai_gr1c1ZoANmlLMIth.json',
      mutate: (doc) => {
         doc.system.check = [
            metaphysicsCheck({
               label: 'Warding',
               resolveCost: 0,
               isDamage: false,
               resistanceCheck: 'willpower',
               damageReducedBy: 'none',
               uuid: '25010a79-20ca-4bdb-acd7-3bf9ede8674c',
            }),
         ];
      },
   },

   // Group 4: names, traits, flags and messages.
   {
      task: 4,
      file: 'spells/Light_Attunement_AfaeppVjow4HhIG5.json',
      mutate: (doc) => {
         doc.system.customTrait.unshift(trait('Light', 'f81b24e7-dca8-4d37-ae4d-af4e18e11cef'));
      },
   },
   {
      task: 4,
      file: 'spells/Metal_Attunement_Om0Y1sDROHUR2Yjg.json',
      mutate: (doc) => {
         doc.system.customTrait.push(trait('Attunement', '013025a4-db2c-4ff3-aaa0-856ea7b10a2d'));
      },
   },
   {
      task: 4,
      file: 'effects/Metal_Attunement_CNzUcoakHX0WMxo5.json',
      mutate: (doc) => {
         doc.system.customTrait.push(trait('Attunement', '032ca45d-aed8-4714-ad68-bfad32f18ee1'));
      },
   },
   {
      task: 4,
      file: 'effects/Aether_Attunement_Q3wpy3R1g3EPjwPc.json',
      mutate: (doc) => {
         doc.system.customTrait.push(trait('Attunement', 'ab02b902-e799-4ecd-a820-7e576e2cf158'));
      },
   },
   {
      task: 4,
      file: 'effects/Force_Attunement_spMYmh1p7gandhe6.json',
      mutate: (doc) => {
         doc.system.customTrait.push(trait('Attunement', 'e2fd8c5f-7e56-4935-afdd-87cd9dc62db3'));
      },
   },
   {
      task: 4,
      file: 'effects/Void_Attunement_zm8nu7JnlxnddR9B.json',
      mutate: (doc) => {
         doc.system.customTrait.push(trait('Attunement', '89c36e26-8763-4278-ac3d-eeaeacdd44ad'));
      },
   },
   {
      task: 4,
      file: GUNSHIELD_NOW,
      from: GUNSHIELD_BASE,
      mutate: (doc) => {
         doc.name = 'Urderic Gun Shield';
      },
   },
   {
      task: 4,
      file: 'sacred-arts/Stormcaller_s_Tempest_4095TZGJVMJUv655.json',
      mutate: (doc) => {
         doc.system.action = false;
         doc.system.passive = true;
      },
   },
   {
      task: 4,
      file: 'effects/Empower_Soul_EfvhfVmnEwGO5TmZ.json',
      mutate: (doc) => {
         doc.system.rulesElement[0] = {
            operation: 'turnMessage',
            selector: 'turnStart',
            message: '<p><strong>Empower Soul:</strong> Any allies other than yourself who start your turn within a '
               + '<strong>5-space-radius</strong> of you regain an additional <strong>+1 Resolve</strong> at the '
               + 'start of their turn, up to their maximum <strong>Resolve</strong>.</p>',
            uuid: '37311dec-5704-451a-9b12-b89205ca6e98',
         };
      },
   },
   {
      task: 4,
      file: 'effects/Blue_Magister_13pUdVwfDWS3FG0d.json',
      mutate: (doc) => {
         doc.system.rulesElement[3].message = '<p><strong>Blue Magister:</strong> Once per turn, when you successfully '
            + 'cast a spell, you may immediately cast a second spell as a <strong>Free Action</strong>. The '
            + '<strong>Complexity</strong> of the second spell increases by <strong>+1</strong>.</p>';
      },
   },

   // Group 5: text fixes the design spec lists and the backlog does not restate.
   {
      task: 5,
      file: 'effects/Aether_Blades_34TSVsEBH83m7QP6.json',
      mutate: (doc) => {
         doc.description = doc.description
            .replace('<strong>+1 Damage and</strong> gain', '<strong>+1 Damage</strong> and gain');
         doc.system.rulesElement[0].message = doc.system.rulesElement[0].message
            .replace('<strong>+1 Damage and</strong> gain', '<strong>+1 Damage</strong> and gain');
      },
   },
   {
      task: 5,
      file: 'effects/Inferno_Blades_vD6aZ1JHgLCAAfBD.json',
      mutate: (doc) => {
         doc.system.rulesElement[0].message = doc.system.rulesElement[0].message
            .replace('<strong>Actio</strong>n', '<strong>Action</strong>');
      },
   },
   {
      task: 5,
      file: 'effects/Blue_Magister_13pUdVwfDWS3FG0d.json',
      mutate: (doc) => {
         doc.system.customTrait = [
            trait('Path', 'd3ca48b2-7c82-4cdb-a9f6-883505cde56d'),
            trait('Blue Spirit', '57500b5d-8150-4189-ac6c-a91866f901ba'),
            trait('Apex', '5dd5754d-695a-4b19-af1d-529ac2ca9659'),
         ];
      },
   },
   {
      task: 5,
      file: 'effects/Abyssal_Darkness_4dn4CKsKPv7fkgXz.json',
      mutate: (doc) => {
         // The Reflexes message repeats the +2 the effect already applies; the Stealth message becomes the situational
         // Greater Advantage (Advantage level 2) the rules offer on Stealth checks to remain unseen.
         doc.system.rulesElement = doc.system.rulesElement
            .filter((element) => element.uuid !== '20758c74-4acc-43d4-a8fd-3bf2eb983499')
            .map((element) => (element.uuid === 'cdf62e40-0a4e-4ce6-8218-509391dd6d1c'
               ? {
                  operation: 'conditionalCheckModifier',
                  modifierType: 'advantage',
                  checkType: 'any',
                  selector: 'situation',
                  key: 'Remain Unseen',
                  skill: 'stealth',
                  value: 2,
                  uuid: 'cdf62e40-0a4e-4ce6-8218-509391dd6d1c',
               }
               : element));
      },
   },

   // Group 8: Parch, which uses the flat modifier `minimum` field.
   {
      task: 8,
      file: 'effects/Parch_AZWdUeIhXOOdUsBS.json',
      mutate: (doc) => {
         doc.system.rulesElement = [
            {
               operation: 'flatModifier',
               selector: 'speed',
               key: 'all',
               value: -5,
               minimum: 1,
               uuid: 'b5d88f0f-6011-4d9f-aea0-d83e94d0a400',
            },
         ];
      },
   },
];

// Group 6: the stray `type` fields. The files are those holding one at the base commit, found structurally.
for (const rel of listBaseSources()) {
   /** @type {object} The base document. */
   const probe = readBase(rel);
   /** @type {object} The same document with the stray fields stripped. */
   const stripped = structuredClone(probe);
   stripStrayTypes(stripped);
   if (JSON.stringify(stripped) !== JSON.stringify(probe)) {
      REGISTRY.push({
         task: 6,
         file: rel === GUNSHIELD_BASE ? GUNSHIELD_NOW : rel,
         mutate: stripStrayTypes,
      });
   }
}

/**
 * Computes the document a file must hold after the groups up to `upTo`, from its base version.
 * @param {string} file - The file's path under `src/packs` after the groups.
 * @param {number} upTo - The last group applied.
 * @returns {object} The expected document.
 */
export function expectedDocument(file, upTo) {
   /** @type {Change[]} The file's changes, in group order. */
   const changes = REGISTRY.filter((change) => change.file === file && change.task <= upTo);
   /** @type {string} The path at the base commit. */
   const basePath = REGISTRY.find((change) => change.file === file && change.from)?.from ?? file;
   /** @type {object} The document being built. */
   const doc = readBase(basePath);
   for (const change of changes) {
      change.mutate(doc);
   }
   return doc;
}

/**
 * Checks that an aspect list follows the system's aspect table: known labels in sort order, options drawn from the
 * aspect's own option list, and resistances drawn from the known resistances.
 * @param {string} where - The document, for messages.
 * @param {object[]} aspects - The spell's standard aspects.
 * @returns {void}
 */
function checkAspects(where, aspects) {
   /** @type {Set<string>} Every key a standard aspect may carry: the table templates' keys plus the saved extras. */
   const allowedKeys = new Set([
      'scalingCost',
      'enabled',
      'cost',
      'allOptions',
   ]);
   for (const entry of Object.values(SPELL_ASPECTS)) {
      Object.keys(entry.template).forEach((key) => allowedKeys.add(key));
   }
   /** @type {number} The previous aspect's sort order. */
   let previous = -1;
   for (const aspect of aspects) {
      /** @type {object} The table entry. */
      const entry = SPELL_ASPECTS[aspect.label];
      assert.ok(entry, `${where}: unknown aspect ${aspect.label}`);
      assert.ok(entry.sortOrder > previous, `${where}: ${aspect.label} is out of sort order`);
      previous = entry.sortOrder;
      for (const key of Object.keys(aspect)) {
         assert.ok(allowedKeys.has(key), `${where}: ${aspect.label} has unknown key ${key}`);
      }
      for (const option of aspect.option ?? []) {
         assert.ok(entry.settings?.option?.includes(option), `${where}: ${aspect.label} has unknown option ${option}`);
      }
      if (aspect.resistanceCheck !== undefined) {
         assert.ok(['none', ...RESISTANCES].includes(aspect.resistanceCheck), `${where}: resistance`);
      }
      if (entry.settings?.requireOption) {
         assert.ok(aspect.option.length > 0 || aspect.allOptions, `${where}: ${aspect.label} needs an option`);
      }
   }
}

/**
 * Checks a custom aspect against the system's custom aspect template.
 * @param {string} where - The document, for messages.
 * @param {object} aspect - The custom aspect.
 * @returns {void}
 */
function checkCustomAspect(where, aspect) {
   assert.deepEqual(Object.keys(aspect), Object.keys(CUSTOM_ASPECT_TEMPLATE), `${where}: custom aspect fields`);
   assert.ok(['none', ...RESISTANCES].includes(aspect.resistanceCheck), `${where}: custom aspect resistance`);
}

/**
 * Checks an ability check entry against the system's item check template.
 * @param {string} where - The document, for messages.
 * @param {object} entry - The check entry.
 * @returns {void}
 */
function checkCheckEntry(where, entry) {
   assert.deepEqual(Object.keys(entry).sort(), Object.keys(CHECK_TEMPLATE).sort(), `${where}: check fields`);
   assert.deepEqual(
      Object.keys(entry.opposedCheck).sort(),
      Object.keys(CHECK_TEMPLATE.opposedCheck).sort(),
      `${where}: opposed check fields`,
   );
   assert.ok(ATTRIBUTES.includes(entry.attribute), `${where}: attribute`);
   assert.ok(SKILLS.includes(entry.skill), `${where}: skill`);
   assert.ok(['none', ...RESISTANCES].includes(entry.resistanceCheck), `${where}: resistance`);
   assert.ok(['none', 'resistanceCheck'].includes(entry.damageReducedBy), `${where}: damageReducedBy`);
   assert.match(entry.uuid, UUID_V4, `${where}: v4 uuid`);
}

/**
 * Checks the rules elements of an edited document: uuids are unique, immunities carry the system's fields and a known
 * condition id, flat modifiers carry only the system's fields plus `minimum`, and turn messages carry the system's
 * fields plus `message`.
 * @param {string} where - The document, for messages.
 * @param {object[]} elements - The document's rules elements.
 * @returns {void}
 */
function checkRulesElements(where, elements) {
   /** @type {Set<string>} The uuids seen, which must be unique within the document. */
   const seen = new Set();
   for (const element of elements) {
      assert.ok(!seen.has(element.uuid), `${where}: duplicate element uuid ${element.uuid}`);
      seen.add(element.uuid);
      if (element.operation === 'immunity') {
         assert.deepEqual(Object.keys(element), Object.keys(IMMUNITY_TEMPLATE), `${where}: immunity fields`);
         assert.equal(element.selector, 'condition', `${where}: immunity selector`);
         assert.ok(CONDITION_IDS.includes(element.key), `${where}: unknown condition ${element.key}`);
         assert.match(element.uuid, UUID_V4, `${where}: immunity uuid`);
      }
      else if (element.operation === 'flatModifier') {
         /** @type {string[]} The fields a flat modifier may carry. */
         const allowed = [...Object.keys(FLAT_MODIFIER_TEMPLATE), 'minimum'];
         for (const key of Object.keys(element)) {
            assert.ok(allowed.includes(key), `${where}: flat modifier has unknown field ${key}`);
         }
      }
      else if (element.operation === 'turnMessage') {
         assert.deepEqual(
            Object.keys(element).sort(),
            [...Object.keys(TURN_MESSAGE_TEMPLATE), 'message'].sort(),
            `${where}: turn message fields`,
         );
      }
      else if (element.operation === 'conditionalCheckModifier') {
         assert.deepEqual(
            Object.keys(element).sort(),
            Object.keys(CONDITIONAL_CHECK_MODIFIER_TEMPLATE).sort(),
            `${where}: conditional check modifier fields`,
         );
      }
   }
}

/**
 * Checks the edited documents of the groups up to `upTo` against the system's schema code, then the rulings stated as
 * sets and counts rather than exact edits.
 * @param {number} upTo - The last group checked.
 * @returns {void}
 */
function checkSemantics(upTo) {
   /**
    * Lists the files the groups up to `upTo` edit among the given groups.
    * @param {number[]} groups - The groups whose files are wanted.
    * @returns {string[]} The files.
    */
   const filesOf = (groups) => [...new Set(REGISTRY
      .filter((change) => change.task <= upTo && groups.includes(change.task))
      .map((change) => change.file))];

   // Spell aspects and custom aspects (group 2), check entries (group 3), rules elements (groups 1, 4, 5, 8). The
   // legacy entries of the stray-type files (group 6) predate the system's current templates and are not rechecked.
   for (const file of filesOf([2])) {
      /** @type {object} The working-tree spell. */
      const spell = readNow(file).data;
      checkAspects(file, spell.system.aspect);
      spell.system.customAspect.forEach((aspect) => checkCustomAspect(file, aspect));
   }
   for (const file of filesOf([3])) {
      readNow(file).data.system.check.forEach((entry) => checkCheckEntry(file, entry));
   }
   /** @type {string[]} The edited effects whose rules elements the edits add or change. */
   const elementFiles = filesOf([1, 4, 5, 8]).filter((file) => ELEMENT_EDITED.some((name) => file.includes(name)));
   for (const file of elementFiles) {
      checkRulesElements(file, readNow(file).data.system.rulesElement);
   }

   if (upTo >= 1) {
      /** @type {string[]} The Tempest Herald effect's immunity keys. */
      const tempest = readNow('effects/Tempest_Herald_h1VBWeh2GTO9UAE4.json').data.system.rulesElement
         .filter((element) => element.operation === 'immunity')
         .map((element) => element.key);
      assert.deepEqual(
         [...tempest].sort(),
         CONDITION_IDS.filter((id) => id !== 'dead').sort(),
         'Tempest Herald is immune to every condition except dead',
      );
   }
   if (upTo >= 4) {
      /** @type {string[]} The attunement spells and effects, in the working tree, lacking the Attunement trait. */
      const lacking = [];
      for (const rel of walkWorkingSources(path.join(MODULE_ROOT, 'src', 'packs'))) {
         if (!rel.startsWith('spells/') && !rel.startsWith('effects/')) {
            continue;
         }
         /** @type {object} The working-tree document. */
         const doc = readNow(rel).data;
         if (/Attunement/.test(doc.name) && !doc.name.startsWith('Echoing')) {
            if (!doc.system.customTrait.some((entry) => entry.name === 'Attunement')) {
               lacking.push(rel);
            }
         }
      }
      assert.deepEqual(lacking, [], 'every Attunement spell and effect carries the Attunement trait');
   }
   if (upTo >= 8) {
      // The Parch element carries `minimum`, which only the system's flat modifier support makes meaningful.
      /** @type {string} The flat modifier typedef text. */
      const typedef = fs.readFileSync(
         path.join(SYSTEM_SRC, 'document/types/item/rules-element/FlatModifier.js'),
         'utf8',
      );
      assert.match(typedef, /@property \{number\|null\} \[minimum\]/, 'the system documents the flat modifier minimum');

      /** @type {string} The character data model text, whose flat modifier applier must read the minimum. */
      const applier = fs.readFileSync(
         path.join(SYSTEM_SRC, 'document/types/actor/types/character/CharacterDataModel.js'),
         'utf8',
      );
      assert.match(applier, /element\.minimum/, 'the system applies the flat modifier minimum');
   }
   if (upTo >= 6) {
      /** @type {string[]} The pack sources, in the working tree, still holding a stray type field. */
      const left = [];
      for (const rel of walkWorkingSources(path.join(MODULE_ROOT, 'src', 'packs'))) {
         /** @type {object} The working-tree document. */
         const doc = JSON.parse(fs.readFileSync(path.join(MODULE_ROOT, 'src', 'packs', rel), 'utf8'));
         /** @type {object} A copy with the stray fields stripped. */
         const stripped = structuredClone(doc);
         stripStrayTypes(stripped);
         if (JSON.stringify(stripped) !== JSON.stringify(doc)) {
            left.push(rel);
         }
      }
      assert.deepEqual(left, [], 'no pack source keeps a stray type field');
   }
}

/**
 * Runs the checks for groups 1..upTo.
 * @param {number} upTo - The last group checked.
 * @returns {void}
 */
function verify(upTo) {
   /** @type {string[]} The files the groups up to `upTo` edit, by final path. */
   const expectedFiles = [...new Set(REGISTRY.filter((change) => change.task <= upTo).map((change) => change.file))];

   // Every edited file equals the base with the intended change applied, in the canonical JSON layout.
   for (const file of expectedFiles) {
      /** @type {{raw: string, data: object}} The working-tree file. */
      const now = readNow(file);
      assert.equal(now.raw, `${JSON.stringify(now.data, null, 2)}\n`, `${file}: canonical JSON layout`);
      assert.equal(
         JSON.stringify(now.data, null, 2),
         JSON.stringify(expectedDocument(file, upTo), null, 2),
         `${file}: differs from the intended change`,
      );
   }

   // No other pack source differs from the base commit (a rename shows as a delete plus an add).
   /** @type {string[]} The pack sources that differ from the base commit. */
   const changed = git(['diff', '--no-renames', '--name-only', BASE_REF, '--', 'src/packs'])
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice('src/packs/'.length));
   /** @type {string[]} The base paths the edits replace by renaming. */
   const renamedAway = REGISTRY.filter((change) => change.from && change.task <= upTo).map((change) => change.from);
   for (const rel of changed) {
      assert.ok(expectedFiles.includes(rel) || renamedAway.includes(rel), `${rel}: changed but not intended`);
   }
   for (const file of expectedFiles) {
      assert.ok(fs.existsSync(path.join(MODULE_ROOT, 'src', 'packs', file)), `${file}: missing`);
   }
   for (const from of renamedAway) {
      assert.ok(!fs.existsSync(path.join(MODULE_ROOT, 'src', 'packs', from)), `${from}: still present`);
   }

   checkSemantics(upTo);
   console.log(`verify-rulings ok: groups 1..${upTo}, ${expectedFiles.length} files`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   /** @type {string} The group argument. */
   const arg = process.argv[2] ?? 'all';
   verify(arg === 'all' ? 99 : Number(arg));
}
```

- [ ] **Step 3: Run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 1
```

Expected: FAIL with `AssertionError ... effects/Blood_Frenzy_KoHQ6jmewhn0uGjy.json: differs from the intended change`
(the script loads, so the system schema files parsed and the condition ids were read; it takes about six seconds).

- [ ] **Step 4: Edit the six effects**

Use the Edit tool (never a shell substitution) for each replacement. Each old text occurs exactly once in its file
(proven against the base commit when this plan was written); the Edit tool fails if a file differs.

In `src/packs/effects/Blood_Frenzy_KoHQ6jmewhn0uGjy.json`:

Replace

```json
      {
        "operation": "turnMessage",
        "selector": "turnStart",
```

with

```json
      {
        "operation": "flatModifier",
        "selector": "speed",
        "key": "all",
        "value": 5,
        "uuid": "4e440bcf-958e-4515-a6ef-8d644b1da8b2"
      },
      {
        "operation": "turnMessage",
        "selector": "turnStart",
```

In `src/packs/effects/Elder_Sibling_Body_Mind__xDxaaDcOA9U2hS8w.json`:

Replace

```json
        "uuid": "af7f331a-e123-4db7-a9fb-81ef7a8ebcef"
      }
    ],
```

with

```json
        "uuid": "af7f331a-e123-4db7-a9fb-81ef7a8ebcef"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "contaminated",
        "uuid": "1818c6ca-3d89-41df-a2cf-d180ac98385f"
      }
    ],
```

In `src/packs/effects/Elder_Sibling_Mind_Soul__a4T77yGj0BxyvAQg.json`:

Replace

```json
        "uuid": "a67966f6-64db-451f-a040-138b2fe16c31"
      }
    ],
```

with

```json
        "uuid": "a67966f6-64db-451f-a040-138b2fe16c31"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "contaminated",
        "uuid": "8541ffa2-fc51-496d-afa0-d64103251d19"
      }
    ],
```

In `src/packs/effects/Elder_Sibling_Body_Soul__9bfEQTH9i9GaycNP.json`:

Replace

```json
        "uuid": "8d13ef89-d86d-42e8-a1bb-128a64b2bc7e"
      }
    ],
```

with

```json
        "uuid": "8d13ef89-d86d-42e8-a1bb-128a64b2bc7e"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "contaminated",
        "uuid": "94f8765f-47b1-4fa3-a185-c84081a59d25"
      }
    ],
```

In `src/packs/effects/Blessing_of_the_Arbiter_Sleepless__P7roRvBbbTlSXNRT.json`:

Replace

```json
        "uuid": "bbe35db2-cd24-41db-8952-0df32c189124"
      }
    ],
```

with

```json
        "uuid": "bbe35db2-cd24-41db-8952-0df32c189124"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "sleeping",
        "uuid": "5bd6d9f0-196a-4804-adf0-992406a401c6"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "unconscious",
        "uuid": "d920a03c-841b-4844-aa05-4610daf73ab2"
      }
    ],
```

In `src/packs/effects/Tempest_Herald_h1VBWeh2GTO9UAE4.json`:

Replace

```json
        "uuid": "b521640a-1ee1-4559-bc03-499d703c2863"
      }
    ],
```

with

```json
        "uuid": "b521640a-1ee1-4559-bc03-499d703c2863"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "blinded",
        "uuid": "55116cbf-9377-4d0d-ace8-112cab8fa4f0"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "contaminated",
        "uuid": "4f5a673b-19f3-4cc5-ae7d-c0e2af1ece2d"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "deafened",
        "uuid": "7353a7d3-0997-4186-a1d9-a1af950a9e92"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "frightened",
        "uuid": "7b20acdd-1ec1-4a86-a9b5-2b4d4ebcc037"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "incapacitated",
        "uuid": "fcfb39de-f663-4178-ab1f-53a1b0557547"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "offBalance",
        "uuid": "cf91c97a-b2a1-4c43-a689-e2629128894c"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "prone",
        "uuid": "d59e3adf-e714-48fc-a1d2-12a6e30f4126"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "restrained",
        "uuid": "9031fe10-ea18-4a5f-a15a-dee386eace24"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "stunned",
        "uuid": "7a6f4923-b33e-450c-afa4-abeb534a362b"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "sleeping",
        "uuid": "b7e2ae45-092a-47bc-a16a-aa24724430a2"
      },
      {
        "operation": "immunity",
        "selector": "condition",
        "key": "unconscious",
        "uuid": "df156783-c458-4475-a841-55eda542b779"
      }
    ],
```


- [ ] **Step 5: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 1
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..1, 6 files`; `check:links` reports no broken links; the scratch compile finishes
without errors (it writes only under `.work/`, never the live `packs/`). Then `trash .work/compiled-rulings`.

- [ ] **Step 6: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/effects/Blood_Frenzy_KoHQ6jmewhn0uGjy.json \
   src/packs/effects/Elder_Sibling_Body_Mind__xDxaaDcOA9U2hS8w.json \
   src/packs/effects/Elder_Sibling_Mind_Soul__a4T77yGj0BxyvAQg.json \
   src/packs/effects/Elder_Sibling_Body_Soul__9bfEQTH9i9GaycNP.json \
   src/packs/effects/Blessing_of_the_Arbiter_Sleepless__P7roRvBbbTlSXNRT.json \
   src/packs/effects/Tempest_Herald_h1VBWeh2GTO9UAE4.json
git commit -F - <<'EOF'
feat(packs): Blood Frenzy speed and condition immunities for Elder Sibling, Sleepless, Tempest Herald

Blood Frenzy gains its +5 Speed modifier. The three Elder Sibling effects are
immune to Contaminated, Blessing of the Arbiter (Sleepless) to Sleeping and
Unconscious, and Tempest Herald to every condition except Dead.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 2: Spell aspects (module)

Rulings: TODO "Missing spell aspects (Charm Creature, Dominate Creature, Infiltrate Dreams, Enlarge/Reduce Creature
(resistance), Create Fissure (damage), Grasping Earth (duration), Abyssal Darkness (Defense/Reflexes +2), Chained Bolts
(extra targets)): add the aspects where the existing mechanics allow; no new mechanics" and "Shockwave: match the rules
('each creature adjacent to you')". Rules lines: Charm Creature R:7403, Dominate Creature R:7469, Infiltrate Dreams
R:7492, Enlarge/Reduce Creature R:6955, Create Fissure R:5019, Grasping Earth R:5079, Abyssal Darkness R:7078, Chained
Bolts R:6342, Shockwave R:5129. All eight aspects exist today (nothing here is Not built). Every spell keeps its
`castingCheck` (`autoCalculateDC: false` on all nine), so no difficulty or complexity changes.

**Files:**
- Modify: `src/packs/spells/Charm_Creature_GSM53DP8by4LsNBm.json`, `src/packs/spells/Dominate_Creature_CfcRpHzVY1gbwdVA.json`,
  `src/packs/spells/Infiltrate_Dreams_fZXEe30h1sWcUgQG.json`, `src/packs/spells/Enlarge_Reduce_Creature_3TX4Y4Iy29KijlWN.json`,
  `src/packs/spells/Create_Fissure_Mg0sNtMnN5CcBeaL.json`, `src/packs/spells/Grasping_Earth_grpdCdpTwO44Y5ik.json`,
  `src/packs/spells/Abyssal_Darkness_JiHcQ7a7HnoUfFOk.json`, `src/packs/spells/Chained_Bolts_KWWVYuOv7Wz5KSql.json`,
  `src/packs/spells/Shockwave_2p9kAI0M6RMhiHQ2.json`
- Test (scratch): `.work/verify-rulings.mjs`

**Interfaces:**
- Consumes: `SpellAspects.js` (system `src/document/types/item/types/spell/`): the aspect table, whose `sortOrder` the
  aspect array follows (`range` 0, `radius` 1, `extraTargets` 2, `duration` 3, `damage` 4, `increaseRating` 9,
  `increaseResistance` 11, `inflictCondition` 18); `increaseRating` takes the option `defense`, `increaseResistance` the
  option `reflexes`; `SpellCustomAspect.js`: `{ label, scaling, initialValue, cost, resistanceCheck, isDamage, isHealing,
  uuid }`, whose `resistanceCheck` is `none`, `reflexes`, `resilience`, or `willpower`. The aspect shapes copy existing
  pack spells (Reactive Armor and Metal Attunement for `increaseRating`; Grasping Earth for `damage`; Arrow Ward for
  `extraTargets`; Illusion and Irresistible Command for a resisted custom aspect).
- Produces: custom aspects `Charm` (`2abd0316-6d86-40f5-a49b-a44305002f12`), `Dominate`
  (`acdb3545-f16e-4ec9-a81c-b44e4a4de315`), `Enlarge / Reduce` (`3d813ab2-e2be-462b-a114-b20927de8a7e`), each
  non-scaling, cost 1, `resistanceCheck` `willpower`/`willpower`/`resilience`; Infiltrate Dreams' existing custom
  aspect "10 Minutes" with `resistanceCheck` `willpower` (as Truth-Sight's); Create Fissure `damage` (initial value 1,
  non-scaling, `resistanceCheck` `reflexes`); Grasping Earth `duration` (1 round, scaling by 1 per extra success);
  Abyssal Darkness `increaseRating` (`defense`, +2) and `increaseResistance` (`reflexes`, +2), both non-scaling;
  Chained Bolts `extraTargets` (initial value 3, non-scaling); Shockwave without its `radius` aspect.

- [ ] **Step 1: Run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
node .work/verify-rulings.mjs 2
```

Expected: branch `conditions-and-rulings`; FAIL with `AssertionError ... spells/Charm_Creature_GSM53DP8by4LsNBm.json:
differs from the intended change` (group 1's six files already pass).

- [ ] **Step 2: Edit the nine spells**

Use the Edit tool for each replacement; each old text occurs exactly once in its file.

In `src/packs/spells/Charm_Creature_GSM53DP8by4LsNBm.json`:

Replace

```json
    },
    "customAspect": [],
    "aspect": [
      {
```

with

```json
    },
    "customAspect": [
      {
        "label": "Charm",
        "scaling": false,
        "initialValue": 0,
        "cost": 1,
        "resistanceCheck": "willpower",
        "isDamage": false,
        "isHealing": false,
        "uuid": "2abd0316-6d86-40f5-a49b-a44305002f12"
      }
    ],
    "aspect": [
      {
```

In `src/packs/spells/Dominate_Creature_CfcRpHzVY1gbwdVA.json`:

Replace

```json
    },
    "customAspect": [],
    "aspect": [
      {
```

with

```json
    },
    "customAspect": [
      {
        "label": "Dominate",
        "scaling": false,
        "initialValue": 0,
        "cost": 1,
        "resistanceCheck": "willpower",
        "isDamage": false,
        "isHealing": false,
        "uuid": "acdb3545-f16e-4ec9-a81c-b44e4a4de315"
      }
    ],
    "aspect": [
      {
```

In `src/packs/spells/Infiltrate_Dreams_fZXEe30h1sWcUgQG.json`:

Replace

```json
        "cost": 1,
        "resistanceCheck": "none",
        "isDamage": false,
        "isHealing": false,
```

with

```json
        "cost": 1,
        "resistanceCheck": "willpower",
        "isDamage": false,
        "isHealing": false,
```

In `src/packs/spells/Enlarge_Reduce_Creature_3TX4Y4Iy29KijlWN.json`:

Replace

```json
    },
    "customAspect": [],
    "aspect": [
      {
```

with

```json
    },
    "customAspect": [
      {
        "label": "Enlarge / Reduce",
        "scaling": false,
        "initialValue": 0,
        "cost": 1,
        "resistanceCheck": "resilience",
        "isDamage": false,
        "isHealing": false,
        "uuid": "3d813ab2-e2be-462b-a114-b20927de8a7e"
      }
    ],
    "aspect": [
      {
```

In `src/packs/spells/Create_Fissure_Mg0sNtMnN5CcBeaL.json`:

Replace

```json
      {
        "label": "inflictCondition",
        "cost": 1,
```

with

```json
      {
        "label": "damage",
        "scaling": false,
        "initialValue": 1,
        "cost": 1,
        "resistanceCheck": "reflexes",
        "isDamage": true,
        "option": [],
        "enabled": true
      },
      {
        "label": "inflictCondition",
        "cost": 1,
```

In `src/packs/spells/Grasping_Earth_grpdCdpTwO44Y5ik.json`:

Replace

```json
      {
        "label": "damage",
        "scaling": true,
```

with

```json
      {
        "label": "duration",
        "scaling": true,
        "initialValue": 1,
        "unit": "rounds",
        "cost": 1,
        "enabled": true,
        "scalingCost": 1
      },
      {
        "label": "damage",
        "scaling": true,
```

In `src/packs/spells/Abyssal_Darkness_JiHcQ7a7HnoUfFOk.json`:

Replace

```json
        "scalingCost": 1
      }
    ],
```

with

```json
        "scalingCost": 1
      },
      {
        "label": "increaseRating",
        "initialValue": 2,
        "cost": 1,
        "option": [
          "defense"
        ],
        "scaling": false,
        "enabled": true
      },
      {
        "label": "increaseResistance",
        "initialValue": 2,
        "cost": 1,
        "option": [
          "reflexes"
        ],
        "scaling": false,
        "enabled": true
      }
    ],
```

In `src/packs/spells/Chained_Bolts_KWWVYuOv7Wz5KSql.json`:

Replace

```json
      {
        "label": "damage",
        "scaling": true,
```

with

```json
      {
        "label": "extraTargets",
        "scaling": false,
        "initialValue": 3,
        "cost": 1,
        "enabled": true
      },
      {
        "label": "damage",
        "scaling": true,
```

In `src/packs/spells/Shockwave_2p9kAI0M6RMhiHQ2.json`:

Replace

```json
      {
        "label": "radius",
        "initialValue": 5,
        "cost": 3,
        "enabled": true
      },
      {
        "label": "damage",
        "scaling": true,
```

with

```json
      {
        "label": "damage",
        "scaling": true,
```


- [ ] **Step 3: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 2
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..2, 15 files` (the script sorts every aspect list by the system's `sortOrder`, rejects
any label, option, or resistance the system does not define, and compares each custom aspect's fields with the
system's template); no broken links; the scratch compile finishes. Then `trash .work/compiled-rulings`.

- [ ] **Step 4: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/spells/Charm_Creature_GSM53DP8by4LsNBm.json \
   src/packs/spells/Dominate_Creature_CfcRpHzVY1gbwdVA.json \
   src/packs/spells/Infiltrate_Dreams_fZXEe30h1sWcUgQG.json \
   src/packs/spells/Enlarge_Reduce_Creature_3TX4Y4Iy29KijlWN.json \
   src/packs/spells/Create_Fissure_Mg0sNtMnN5CcBeaL.json src/packs/spells/Grasping_Earth_grpdCdpTwO44Y5ik.json \
   src/packs/spells/Abyssal_Darkness_JiHcQ7a7HnoUfFOk.json src/packs/spells/Chained_Bolts_KWWVYuOv7Wz5KSql.json \
   src/packs/spells/Shockwave_2p9kAI0M6RMhiHQ2.json
git commit -F - <<'EOF'
feat(packs): add the spell aspects the rules describe

Resistance aspects for Charm Creature, Dominate Creature, Infiltrate Dreams and
Enlarge / Reduce Creature; damage for Create Fissure; duration for Grasping
Earth; Defense and Reflexes +2 for Abyssal Darkness; extra targets for Chained
Bolts. Shockwave drops its 5-space radius: the rules affect each adjacent
creature.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 3: Check entries for four Mystwalker abilities (module)

Ruling: TODO "Blood Probe, Conjurer of Urdokai, Pull of Urdokai, Warding of Urdokai: add the check entries", with the
4:1 Soul (Metaphysics) shape the design spec's pack ruling 7 (user, 2026-09-27) records ("modelled on Fangs of
Urdokai: Soul (Metaphysics) 4:1, resistance per text (Resilience for Blood Probe; Willpower for the rest);
Conjurer's damage = difference, ignores Armor"). Rules lines: Blood Probe R:8978 (resisted by the target's Resilience),
Conjurer R:9721 (Willpower opposed by Soul (Metaphysics); Damage equal to the difference), Pull R:9835, Warding R:9895
(Willpower opposed by Soul (Metaphysics)). The entries copy Torment of Urdokai (non-Damage) and Fangs of Urdokai (Damage
equal to the difference: `damageReducedBy: "resistanceCheck"`). None of the four rules texts states a difficulty or
complexity (Hunger of Urdokai R:9765, Torment of Urdokai R:9851 and Fangs of Urdokai R:9780 state 4:1); the 4:1 here
is the spec's recorded ruling.

**Files:**
- Modify: `src/packs/sacred-arts/Blood_Probe_OnlfMxer8ImElwhR.json`,
  `src/packs/sacred-arts/Conjurer_of_Urdokai_HS5DA4NpCDIRY6jb.json`, `src/packs/sacred-arts/Pull_of_Urdokai_uibsE48NW0hbnMHl.json`,
  `src/packs/sacred-arts/Warding_of_Urdokai_gr1c1ZoANmlLMIth.json`
- Test (scratch): `.work/verify-rulings.mjs`

**Interfaces:**
- Consumes: `ItemCheckTemplate.js` (system `src/check/types/item-check/`): the check entry fields `attribute`,
  `complexity`, `damageReducedBy` (`none` or `resistanceCheck`), `difficulty`, `initialValue`, `isDamage`, `isHealing`,
  `label`, `opposedCheck {enabled, attribute, skill}`, `resistanceCheck`, `resolveCost`, `scaling`, `skill`, `uuid`.
- Produces: one check entry each: `Blood Probe` (Resilience, no Resolve; `7431e330-c2df-4555-ad22-c27800ba972e`),
  `Conjurer` (Willpower, Damage equal to the difference, no Resolve because the ability's 2 Resolve is its activation
  cost; `d2264c76-c37e-47fc-a0ef-fc3b69fc9627`), `Pull` (Willpower, 1 Resolve, the ability's cost;
  `528761bd-827b-4f56-afc0-5cffa1800041`), `Warding` (Willpower, no Resolve; `25010a79-20ca-4bdb-acd7-3bf9ede8674c`).

- [ ] **Step 1: Run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
node .work/verify-rulings.mjs 3
```

Expected: FAIL with `AssertionError ... sacred-arts/Blood_Probe_OnlfMxer8ImElwhR.json: differs from the intended change`.

- [ ] **Step 2: Add the four check entries**

Use the Edit tool; each old text occurs exactly once in its file.

In `src/packs/sacred-arts/Blood_Probe_OnlfMxer8ImElwhR.json`:

Replace

```json
    "check": [],
    "customTrait": [
      {
```

with

```json
    "check": [
      {
        "label": "Blood Probe",
        "attribute": "soul",
        "skill": "metaphysics",
        "difficulty": 4,
        "complexity": 1,
        "resolveCost": 0,
        "isDamage": false,
        "isHealing": false,
        "initialValue": 1,
        "scaling": true,
        "resistanceCheck": "resilience",
        "opposedCheck": {
          "enabled": false,
          "attribute": "body",
          "skill": "athletics"
        },
        "damageReducedBy": "none",
        "uuid": "7431e330-c2df-4555-ad22-c27800ba972e"
      }
    ],
    "customTrait": [
      {
```

In `src/packs/sacred-arts/Conjurer_of_Urdokai_HS5DA4NpCDIRY6jb.json`:

Replace

```json
    "check": [],
    "customTrait": [
      {
```

with

```json
    "check": [
      {
        "label": "Conjurer",
        "attribute": "soul",
        "skill": "metaphysics",
        "difficulty": 4,
        "complexity": 1,
        "resolveCost": 0,
        "isDamage": true,
        "isHealing": false,
        "initialValue": 1,
        "scaling": true,
        "resistanceCheck": "willpower",
        "opposedCheck": {
          "enabled": false,
          "attribute": "body",
          "skill": "athletics"
        },
        "damageReducedBy": "resistanceCheck",
        "uuid": "d2264c76-c37e-47fc-a0ef-fc3b69fc9627"
      }
    ],
    "customTrait": [
      {
```

In `src/packs/sacred-arts/Pull_of_Urdokai_uibsE48NW0hbnMHl.json`:

Replace

```json
    "check": [],
    "customTrait": [
      {
```

with

```json
    "check": [
      {
        "label": "Pull",
        "attribute": "soul",
        "skill": "metaphysics",
        "difficulty": 4,
        "complexity": 1,
        "resolveCost": 1,
        "isDamage": false,
        "isHealing": false,
        "initialValue": 1,
        "scaling": true,
        "resistanceCheck": "willpower",
        "opposedCheck": {
          "enabled": false,
          "attribute": "body",
          "skill": "athletics"
        },
        "damageReducedBy": "none",
        "uuid": "528761bd-827b-4f56-afc0-5cffa1800041"
      }
    ],
    "customTrait": [
      {
```

In `src/packs/sacred-arts/Warding_of_Urdokai_gr1c1ZoANmlLMIth.json`:

Replace

```json
    "check": [],
    "customTrait": [
      {
```

with

```json
    "check": [
      {
        "label": "Warding",
        "attribute": "soul",
        "skill": "metaphysics",
        "difficulty": 4,
        "complexity": 1,
        "resolveCost": 0,
        "isDamage": false,
        "isHealing": false,
        "initialValue": 1,
        "scaling": true,
        "resistanceCheck": "willpower",
        "opposedCheck": {
          "enabled": false,
          "attribute": "body",
          "skill": "athletics"
        },
        "damageReducedBy": "none",
        "uuid": "25010a79-20ca-4bdb-acd7-3bf9ede8674c"
      }
    ],
    "customTrait": [
      {
```


- [ ] **Step 3: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 3
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..3, 19 files` (each entry's fields equal the system's check template, its attribute
and skill are defined, and its uuid is a v4 uuid); no broken links; the scratch compile finishes. Then
`trash .work/compiled-rulings`.

- [ ] **Step 4: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/sacred-arts/Blood_Probe_OnlfMxer8ImElwhR.json \
   src/packs/sacred-arts/Conjurer_of_Urdokai_HS5DA4NpCDIRY6jb.json \
   src/packs/sacred-arts/Pull_of_Urdokai_uibsE48NW0hbnMHl.json \
   src/packs/sacred-arts/Warding_of_Urdokai_gr1c1ZoANmlLMIth.json
git commit -F - <<'EOF'
feat(packs): check entries for Blood Probe, Conjurer, Pull and Warding of Urdokai

Soul (Metaphysics) 4:1 against the resistance each description names; the
Conjurer's Damage equals the difference in successes.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 4: Names, traits, flags, and messages (module)

Rulings (TODO): "Light Attunement: carry both the 'Attunement' and 'Light' traits" (R:7300-7305 lists "Light"); "Urderic
Gunshield: rename the document to the rules' 'Urderic Gun Shield'" (R:2964); "Stormcaller's Tempest: mark passive, like
The Dragon Awakens and Being of Urdokai" (R:9208-9216; Being of Urdokai's flags are `action: false`, `reaction: false`,
`passive: true`); "Empower Soul: replace the Aether Blades text in its roll message" (R:6376); "Blue Magister: add the name
prefix to the casting roll message" (R:8294, whose `+1` the sibling turn message bolds). The Light Attunement effects
(Brightness, Darkness) already carry "Light" and "Attunement"; only the spell lacks "Light". No change: Hunger of Urdokai
(the pack description reads "Range: 10 spaces", the ruling's target), Urderic Glaivegun (the Strike range 2 stands).

The same task applies the design spec's pack ruling 10 (user, 2026-09-27: "Every attunement includes the Attunement
trait"), which the conditions-rework paragraph of the spec ("Delivered by the conditions rework") keeps with this
plan: "the Attunement trait for Metal Attunement stays with spec C ruling 10". Read from the working tree (every spell and
effect whose name contains "Attunement", Echoing Attunement excluded because it is an ability's charge tracker, not an
attunement): five lack the trait: the Metal Attunement spell, and the Aether, Force, Metal and Void Attunement
effects. Each gains an `Attunement` custom trait entry appended after its element trait, the order the Fire, Air and
Earth entries use. The Metal Attunement spell lists no element trait and keeps none (the Fire, Air and Earth spells
carry `["Attunement"]` alone and name the element in `tradition`, which is `Metal` there). The rules list "Metal" alone
for Metal Attunement and "Light" alone for Light Attunement (R:5625, R:7300), so the rules source and the ruling differ;
the ruling governs (Task 9 Step 3 logs the rules-source difference).

**Files:**
- Modify: `src/packs/spells/Light_Attunement_AfaeppVjow4HhIG5.json`, `src/packs/spells/Metal_Attunement_Om0Y1sDROHUR2Yjg.json`,
  `src/packs/effects/Metal_Attunement_CNzUcoakHX0WMxo5.json`, `src/packs/effects/Aether_Attunement_Q3wpy3R1g3EPjwPc.json`,
  `src/packs/effects/Force_Attunement_spMYmh1p7gandhe6.json`, `src/packs/effects/Void_Attunement_zm8nu7JnlxnddR9B.json`,
  `src/packs/urderic-items/Urderic_Gunshield_TQJPW1rLHZUYfJpy.json` (renamed to
  `src/packs/urderic-items/Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json`),
  `src/packs/sacred-arts/Stormcaller_s_Tempest_4095TZGJVMJUv655.json`, `src/packs/effects/Empower_Soul_EfvhfVmnEwGO5TmZ.json`,
  `src/packs/effects/Blue_Magister_13pUdVwfDWS3FG0d.json`
- Test (scratch): `.work/verify-rulings.mjs`

**Interfaces:**
- Consumes: `TurnMessage.js` (system `src/document/types/item/rules-element/`): `{ operation: 'turnMessage', selector:
  'turnStart' | 'turnEnd', message, uuid }`; the pack's trait convention (a spell lists its tradition trait first:
  `["Aether", "Attunement"]`).
- Produces: Light Attunement spell traits `["Light", "Attunement"]` (new entry `f81b24e7-dca8-4d37-ae4d-af4e18e11cef`);
  an `Attunement` trait entry on the Metal Attunement spell (`013025a4-db2c-4ff3-aaa0-856ea7b10a2d`) and on the Metal
  (`032ca45d-aed8-4714-ad68-bfad32f18ee1`), Aether (`ab02b902-e799-4ecd-a820-7e576e2cf158`), Force
  (`e2fd8c5f-7e56-4935-afdd-87cd9dc62db3`) and Void (`89c36e26-8763-4278-ac3d-eeaeacdd44ad`) Attunement effects; the Gun Shield document named `Urderic Gun Shield` in `Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json` (same `_id`
  `TQJPW1rLHZUYfJpy`; the pack's links use ids, and `check:links` proves none breaks); Stormcaller's Tempest with
  `action: false`, `passive: true`; Empower Soul's single element a `turnMessage` (uuid kept); Blue Magister's casting
  roll message led by `<strong>Blue Magister:</strong>`.

- [ ] **Step 1: Run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
node .work/verify-rulings.mjs 4
```

Expected: FAIL with `AssertionError ... spells/Light_Attunement_AfaeppVjow4HhIG5.json: differs from the intended change`.

- [ ] **Step 2: Edit the ten documents**

Use the Edit tool; each old text occurs exactly once in its file. The Gun Shield is edited at its current path.

In `src/packs/spells/Light_Attunement_AfaeppVjow4HhIG5.json`:

Replace

```json
      {
        "name": "Attunement",
        "description": "",
```

with

```json
      {
        "name": "Light",
        "description": "",
        "uuid": "f81b24e7-dca8-4d37-ae4d-af4e18e11cef"
      },
      {
        "name": "Attunement",
        "description": "",
```

In `src/packs/spells/Metal_Attunement_Om0Y1sDROHUR2Yjg.json`:

Replace

```json
    "check": [],
    "customTrait": [],
    "xpCost": 0,
    "rarity": "common",
```

with

```json
    "check": [],
    "customTrait": [
      {
        "name": "Attunement",
        "description": "",
        "uuid": "013025a4-db2c-4ff3-aaa0-856ea7b10a2d"
      }
    ],
    "xpCost": 0,
    "rarity": "common",
```

In `src/packs/effects/Metal_Attunement_CNzUcoakHX0WMxo5.json`:

Replace

```json
        "uuid": "20bdc57e-0f63-4d7b-a636-4df8871f73ba"
      }
    ],
```

with

```json
        "uuid": "20bdc57e-0f63-4d7b-a636-4df8871f73ba"
      },
      {
        "name": "Attunement",
        "description": "",
        "uuid": "032ca45d-aed8-4714-ad68-bfad32f18ee1"
      }
    ],
```

In `src/packs/effects/Aether_Attunement_Q3wpy3R1g3EPjwPc.json`:

Replace

```json
        "uuid": "ffc0333e-229a-4c44-9ce9-e96a26a1ef97"
      }
    ],
```

with

```json
        "uuid": "ffc0333e-229a-4c44-9ce9-e96a26a1ef97"
      },
      {
        "name": "Attunement",
        "description": "",
        "uuid": "ab02b902-e799-4ecd-a820-7e576e2cf158"
      }
    ],
```

In `src/packs/effects/Force_Attunement_spMYmh1p7gandhe6.json`:

Replace

```json
        "uuid": "a6e06733-da73-4693-9884-9810a9e45c60"
      }
    ],
```

with

```json
        "uuid": "a6e06733-da73-4693-9884-9810a9e45c60"
      },
      {
        "name": "Attunement",
        "description": "",
        "uuid": "e2fd8c5f-7e56-4935-afdd-87cd9dc62db3"
      }
    ],
```

In `src/packs/effects/Void_Attunement_zm8nu7JnlxnddR9B.json`:

Replace

```json
        "uuid": "ffc0333e-229a-4c44-9ce9-e96a26a1ef97"
      }
    ],
```

with

```json
        "uuid": "ffc0333e-229a-4c44-9ce9-e96a26a1ef97"
      },
      {
        "name": "Attunement",
        "description": "",
        "uuid": "89c36e26-8763-4278-ac3d-eeaeacdd44ad"
      }
    ],
```

In `src/packs/urderic-items/Urderic_Gunshield_TQJPW1rLHZUYfJpy.json`:

Replace

```json
{
  "name": "Urderic Gunshield",
  "type": "weapon",
  "img": "icons/svg/sword.svg",
```

with

```json
{
  "name": "Urderic Gun Shield",
  "type": "weapon",
  "img": "icons/svg/sword.svg",
```

In `src/packs/sacred-arts/Stormcaller_s_Tempest_4095TZGJVMJUv655.json`:

Replace

```json
    "rulesElement": [],
    "action": true,
    "reaction": false,
    "passive": false,
    "documentVersion": 0
  },
```

with

```json
    "rulesElement": [],
    "action": false,
    "reaction": false,
    "passive": true,
    "documentVersion": 0
  },
```

In `src/packs/effects/Empower_Soul_EfvhfVmnEwGO5TmZ.json`:

Replace

```json
      {
        "operation": "rollMessage",
        "checkType": "attack",
        "selector": "any",
        "key": "",
        "message": "<p><strong>Aether Blades:</strong> The chosen weapons ignore <strong>Armo</strong>r, gain the <strong>Magical</strong> trait, and shed dim light in a 5 space radius.</p>",
        "uuid": "37311dec-5704-451a-9b12-b89205ca6e98"
      }
```

with

```json
      {
        "operation": "turnMessage",
        "selector": "turnStart",
        "message": "<p><strong>Empower Soul:</strong> Any allies other than yourself who start your turn within a <strong>5-space-radius</strong> of you regain an additional <strong>+1 Resolve</strong> at the start of their turn, up to their maximum <strong>Resolve</strong>.</p>",
        "uuid": "37311dec-5704-451a-9b12-b89205ca6e98"
      }
```

In `src/packs/effects/Blue_Magister_13pUdVwfDWS3FG0d.json`:

Replace

```json
        "key": "",
        "message": "<p>Once per turn, when you successfully cast a spell, you may immediately cast a second spell as a <strong>Free Action</strong>. The <strong>Complexity</strong> of the second spell increases by 1.</p>",
        "uuid": "5ae26209-0957-4ad7-a3d2-9766378f8689"
      },
```

with

```json
        "key": "",
        "message": "<p><strong>Blue Magister:</strong> Once per turn, when you successfully cast a spell, you may immediately cast a second spell as a <strong>Free Action</strong>. The <strong>Complexity</strong> of the second spell increases by <strong>+1</strong>.</p>",
        "uuid": "5ae26209-0957-4ad7-a3d2-9766378f8689"
      },
```


- [ ] **Step 3: Rename the Gun Shield file**

The file name follows the document name (`<name with each non-alphanumeric run as "_">_<_id>.json`, as
`foundryvtt-cli extract` writes it). A rename keeps the history; it is not a deletion.

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git mv src/packs/urderic-items/Urderic_Gunshield_TQJPW1rLHZUYfJpy.json src/packs/urderic-items/Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json
```

- [ ] **Step 4: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 4
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..4, 29 files` (the script also requires the old Gunshield path to be gone and
requires every spell and effect named "... Attunement", Echoing Attunement excepted, to carry the `Attunement` trait);
no broken links; the scratch compile finishes. Then `trash .work/compiled-rulings`.

- [ ] **Step 5: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/spells/Light_Attunement_AfaeppVjow4HhIG5.json \
   src/packs/spells/Metal_Attunement_Om0Y1sDROHUR2Yjg.json \
   src/packs/effects/Metal_Attunement_CNzUcoakHX0WMxo5.json \
   src/packs/effects/Aether_Attunement_Q3wpy3R1g3EPjwPc.json \
   src/packs/effects/Force_Attunement_spMYmh1p7gandhe6.json \
   src/packs/effects/Void_Attunement_zm8nu7JnlxnddR9B.json \
   src/packs/urderic-items/Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json \
   src/packs/sacred-arts/Stormcaller_s_Tempest_4095TZGJVMJUv655.json \
   src/packs/effects/Empower_Soul_EfvhfVmnEwGO5TmZ.json src/packs/effects/Blue_Magister_13pUdVwfDWS3FG0d.json
git commit -F - <<'EOF'
fix(packs): Attunement traits, Gun Shield name, Stormcaller's Tempest, Empower Soul, Blue Magister

The Light Attunement spell carries Light and Attunement, and the Metal Attunement
spell and the Aether, Force, Metal and Void Attunement effects carry Attunement.
Urderic Gunshield is renamed Urderic Gun Shield. Stormcaller's Tempest is passive. Empower Soul's
element is a turn-start message with its own text. Blue Magister's casting roll
message leads with the ability name.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

`git status` before the commit must show the rename (`R  ...Urderic_Gunshield... -> ...Urderic_Gun_Shield...`) among the
staged files.

---

### Task 5: Text fixes the design spec lists and the backlog does not restate (module)

These come from the design spec's "Pack fixes without a ruling (text is unambiguous)" and its pack table, not from a
`docs/TODO.md` ruling. The iron rule forbids deferring them; the controller strikes this task if the user does not want
it (Open questions 2). Rules lines: Aether Blades R:6305 (its comma follows "+1 Damage", so the bold ends there),
Inferno Blades R:5412 ("Action"), Blue Magister R:8283 (traits Path, Blue Spirit, Apex), Abyssal Darkness R:7078.

**Files:**
- Modify: `src/packs/effects/Aether_Blades_34TSVsEBH83m7QP6.json`, `src/packs/effects/Inferno_Blades_vD6aZ1JHgLCAAfBD.json`,
  `src/packs/effects/Blue_Magister_13pUdVwfDWS3FG0d.json`, `src/packs/effects/Abyssal_Darkness_4dn4CKsKPv7fkgXz.json`
- Test (scratch): `.work/verify-rulings.mjs`

**Interfaces:**
- Consumes: `ConditionalCheckModifier.js`: `{ operation: 'conditionalCheckModifier', modifierType, checkType, selector,
  key, skill, value, uuid }`; for `modifierType` `advantage` the `value` is the level (1 Advantage, 2 Greater
  Advantage); a `situation` selector's `key` is the typed situation text and `skill` narrows it to one Skill (an opt-in
  checkbox on that Skill's check dialog).
- Produces: Aether Blades text reading `<strong>+1 Damage</strong> and gain` (description and roll message); Inferno
  Blades reading `<strong>Action</strong>`; Blue Magister custom traits Path, Blue Spirit, Apex
  (`d3ca48b2-7c82-4cdb-a9f6-883505cde56d`, `57500b5d-8150-4189-ac6c-a91866f901ba`,
  `5dd5754d-695a-4b19-af1d-529ac2ca9659`); Abyssal Darkness without its repeated Reflexes message, and its Stealth
  message (`cdf62e40-0a4e-4ce6-8218-509391dd6d1c`) replaced by a situational Greater Advantage "Remain Unseen" on
  Stealth checks.

- [ ] **Step 1: Run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
node .work/verify-rulings.mjs 5
```

Expected: FAIL with `AssertionError ... effects/Aether_Blades_34TSVsEBH83m7QP6.json: differs from the intended change`.

- [ ] **Step 2: Edit the four effects**

Use the Edit tool; each old text occurs exactly once in its file at this point (Blue Magister after Task 4's edit).

In `src/packs/effects/Aether_Blades_34TSVsEBH83m7QP6.json` (2 replacements; each old text occurs once):

Replacement 1 of 2: replace

```json
  "img": "modules/titan-vttrpg-compendium/icons/traditions/AetherAndVoid_Tradition_Icon.webp",
  "description": "<p>Your weapons are imbued with burning-hot aether, granting them the power to cut through flesh and spirit alike.</p><p>The chosen weapons deal <strong>+1 Damage and</strong> gain the <strong>Magical</strong> and <strong>Penetrating</strong> traits.</p>",
  "disabled": false,
  "transfer": false,
```

with

```json
  "img": "modules/titan-vttrpg-compendium/icons/traditions/AetherAndVoid_Tradition_Icon.webp",
  "description": "<p>Your weapons are imbued with burning-hot aether, granting them the power to cut through flesh and spirit alike.</p><p>The chosen weapons deal <strong>+1 Damage</strong> and gain the <strong>Magical</strong> and <strong>Penetrating</strong> traits.</p>",
  "disabled": false,
  "transfer": false,
```

Replacement 2 of 2: replace

```json
        "key": "",
        "message": "<p><strong>Aether Blades:</strong> The chosen weapons deal <strong>+1 Damage and</strong> gain the <strong>Magical</strong> and <strong>Penetrating</strong> traits.</p>",
        "uuid": "37311dec-5704-451a-9b12-b89205ca6e98"
      }
```

with

```json
        "key": "",
        "message": "<p><strong>Aether Blades:</strong> The chosen weapons deal <strong>+1 Damage</strong> and gain the <strong>Magical</strong> and <strong>Penetrating</strong> traits.</p>",
        "uuid": "37311dec-5704-451a-9b12-b89205ca6e98"
      }
```

In `src/packs/effects/Inferno_Blades_vD6aZ1JHgLCAAfBD.json`:

Replace

```json
        "key": "",
        "message": "<p><strong>Inferno Blades:</strong> Weapons affected by this spell deal <strong>+1 Damage</strong> and are considered <strong>Magical</strong> until the start of your next turn.</p><p>If a weapon affected by this spell deals <strong>Damage</strong>, the target is set on fire. They suffer <strong>1 Damage</strong> at the start of their turn, which ignores <strong>Armor</strong>.</p><p>The target remains on fire until they or another creature use an <strong>Actio</strong>n to extinguish the flames.</p>",
        "uuid": "1d4c5896-f15b-4773-a88d-697f747bc410"
      }
```

with

```json
        "key": "",
        "message": "<p><strong>Inferno Blades:</strong> Weapons affected by this spell deal <strong>+1 Damage</strong> and are considered <strong>Magical</strong> until the start of your next turn.</p><p>If a weapon affected by this spell deals <strong>Damage</strong>, the target is set on fire. They suffer <strong>1 Damage</strong> at the start of their turn, which ignores <strong>Armor</strong>.</p><p>The target remains on fire until they or another creature use an <strong>Action</strong> to extinguish the flames.</p>",
        "uuid": "1d4c5896-f15b-4773-a88d-697f747bc410"
      }
```

In `src/packs/effects/Blue_Magister_13pUdVwfDWS3FG0d.json`:

Replace

```json
    "check": [],
    "customTrait": [],
    "rulesElement": [
      {
```

with

```json
    "check": [],
    "customTrait": [
      {
        "name": "Path",
        "description": "",
        "uuid": "d3ca48b2-7c82-4cdb-a9f6-883505cde56d"
      },
      {
        "name": "Blue Spirit",
        "description": "",
        "uuid": "57500b5d-8150-4189-ac6c-a91866f901ba"
      },
      {
        "name": "Apex",
        "description": "",
        "uuid": "5dd5754d-695a-4b19-af1d-529ac2ca9659"
      }
    ],
    "rulesElement": [
      {
```

In `src/packs/effects/Abyssal_Darkness_4dn4CKsKPv7fkgXz.json` (2 replacements; each old text occurs once):

Replacement 1 of 2: replace

```json
      {
        "operation": "rollMessage",
        "checkType": "attribute",
        "selector": "skill",
        "key": "stealth",
        "message": "<p><strong>Abyssal Darkness:</strong> You have <strong>Greater Advantage</strong> on <strong>Stealth</strong> checks.</p>",
        "uuid": "cdf62e40-0a4e-4ce6-8218-509391dd6d1c"
      },
```

with

```json
      {
        "operation": "conditionalCheckModifier",
        "modifierType": "advantage",
        "checkType": "any",
        "selector": "situation",
        "key": "Remain Unseen",
        "skill": "stealth",
        "value": 2,
        "uuid": "cdf62e40-0a4e-4ce6-8218-509391dd6d1c"
      },
```

Replacement 2 of 2: replace

```json
        "uuid": "8cab2531-6c99-47a5-b1e7-3a1ad36a456b"
      },
      {
        "operation": "rollMessage",
        "checkType": "resistance",
        "selector": "resistance",
        "key": "reflexes",
        "message": "<p><strong>Abyssal Darkness:</strong> Your <strong>Reflexes </strong>increase by <strong>+2.</strong></p>",
        "uuid": "20758c74-4acc-43d4-a8fd-3bf2eb983499"
      }
    ],
```

with

```json
        "uuid": "8cab2531-6c99-47a5-b1e7-3a1ad36a456b"
      }
    ],
```


- [ ] **Step 3: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 5
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..5, 32 files`; no broken links; the scratch compile finishes. Then
`trash .work/compiled-rulings`.

- [ ] **Step 4: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/effects/Aether_Blades_34TSVsEBH83m7QP6.json \
   src/packs/effects/Inferno_Blades_vD6aZ1JHgLCAAfBD.json src/packs/effects/Blue_Magister_13pUdVwfDWS3FG0d.json \
   src/packs/effects/Abyssal_Darkness_4dn4CKsKPv7fkgXz.json
git commit -F - <<'EOF'
fix(packs): Aether and Inferno Blades text, Blue Magister traits, Abyssal Darkness stealth

Aether Blades bolds "+1 Damage" alone and Inferno Blades spells "Action".
Blue Magister carries Path, Blue Spirit and Apex. Abyssal Darkness drops the
Reflexes message its flat modifier repeats and offers its Greater Advantage on
Stealth checks to remain unseen as a situational modifier.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 6: Strip the stray `type` fields (module)

Ruling (TODO): "Stray `type` fields on rules elements and trait entries: strip them." Rules elements and standard-trait
entries carry no `type` (the element typedefs in system `src/document/types/item/rules-element/`, such as
`FlatModifier.js` and `TurnMessage.js`, list none; nor do `AttackTraits.js` (`{name, value}`) or `CustomItemTrait.js`
(`{name, description, uuid}`)); the engine tags a copy of each element with its source's bucket at runtime
(`CharacterDataModel._applyRulesElements`: `element.type = source.type`). The 62 fields (43 on rules
elements, value `ability` or `equipment`; 19 on the attack trait entries of the four conjured-weapon spells, value
`boolean`) sit in 34 files, found structurally (read from the base commit by the script, not hand-listed). A weapon
attack's own `type` (`melee`, `ranged`) and every top-level document `type` stay. Each file below is edited in
isolation, so the order is irrelevant.

**Files:** Modify the 34 pack sources listed in Step 4's `git add` (abilities, one sacred art, four spells, the Astral
Assassin summon, two Urderic items), each shown in Step 2; Test (scratch): `.work/verify-rulings.mjs`.

**Interfaces:**
- Consumes: Task 4's rename (the Gun Shield is edited at `Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json`).
- Produces: no rules element, standard trait or custom trait entry in any pack source holds a `type` field (the script
  scans all 801 working-tree sources).

- [ ] **Step 1: Run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
node .work/verify-rulings.mjs 6
```

Expected: FAIL with `AssertionError ... abilities/Alert_Rank_I__6p5ejdmk7SuKbX0U.json: differs from the intended change`.

- [ ] **Step 2: Edit the 34 files**

Use the Edit tool for every replacement below (47 replacements; a file with several shows each; each old text occurs
exactly once in its file at this point). Each removes the `"type"` line and, where it was last, the comma before it.

In `src/packs/abilities/Alert_Rank_I__6p5ejdmk7SuKbX0U.json`:

Replace

```json
        "value": 2,
        "uuid": "c96a40d2-b14c-4450-ad8c-c6acb2333128",
        "type": "ability"
      }
    ],
```

with

```json
        "value": 2,
        "uuid": "c96a40d2-b14c-4450-ad8c-c6acb2333128"
      }
    ],
```

In `src/packs/abilities/Applied_Anatomy_Q296khWUb4aS3iEx.json`:

Replace

```json
        "uuid": "0aa29208-feec-48b2-940c-65813fc61c62",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "0aa29208-feec-48b2-940c-65813fc61c62"
      }
    ],
```

In `src/packs/abilities/Controlled_Blast_cVuVrVMnnmMBgqXB.json`:

Replace

```json
        "uuid": "318d9e67-0444-4cdd-b26d-327d8e025f5a",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "318d9e67-0444-4cdd-b26d-327d8e025f5a"
      }
    ],
```

In `src/packs/abilities/Crushing_Blows_HZxOh9kYlgeNUvZ9.json`:

Replace

```json
        "uuid": "67307766-9062-4e78-9b08-26c7f4712dfc",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "67307766-9062-4e78-9b08-26c7f4712dfc"
      }
    ],
```

In `src/packs/abilities/Deceitful_Qm9CvXtskaBrXvdR.json` (2 replacements; each old text occurs once):

Replacement 1 of 2: replace

```json
        "uuid": "2fcd798e-66fe-46c2-813e-c2474093cf65",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "2fcd798e-66fe-46c2-813e-c2474093cf65"
      },
      {
```

Replacement 2 of 2: replace

```json
        "uuid": "75a8513b-4f00-453a-b607-88e3158ef359",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "75a8513b-4f00-453a-b607-88e3158ef359"
      }
    ],
```

In `src/packs/abilities/Diplomat_LjG8z8IK89sGY8AF.json` (3 replacements; each old text occurs once):

Replacement 1 of 3: replace

```json
        "uuid": "7abe1fb9-f4d3-4795-b388-f84ba106fab4",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "7abe1fb9-f4d3-4795-b388-f84ba106fab4"
      },
      {
```

Replacement 2 of 3: replace

```json
        "uuid": "a3ed147c-4874-4ff8-a604-305159e599ae",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "a3ed147c-4874-4ff8-a604-305159e599ae"
      },
      {
```

Replacement 3 of 3: replace

```json
        "uuid": "59c11803-3269-447f-af3c-c82c7cdeaf7b",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "59c11803-3269-447f-af3c-c82c7cdeaf7b"
      }
    ],
```

In `src/packs/abilities/Duelist_7JfkkDO8gYCA0CHb.json`:

Replace

```json
        "uuid": "c66ed8e9-14c5-40ed-af08-1e04fb73e735",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "c66ed8e9-14c5-40ed-af08-1e04fb73e735"
      }
    ],
```

In `src/packs/abilities/Flanking_Maneuvers_r55Fi4VRnCgLlaTD.json`:

Replace

```json
        "uuid": "f0f61d17-6cd4-4f9f-9d80-835dcb423686",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "f0f61d17-6cd4-4f9f-9d80-835dcb423686"
      }
    ],
```

In `src/packs/abilities/Flurry_of_Strikes_rMeF5Jcoj6pyNaR5.json` (3 replacements; each old text occurs once):

Replacement 1 of 3: replace

```json
        "value": 1,
        "uuid": "3107ebd1-f886-4805-8de9-32aa775f6aa3",
        "type": "ability"
      },
      {
```

with

```json
        "value": 1,
        "uuid": "3107ebd1-f886-4805-8de9-32aa775f6aa3"
      },
      {
```

Replacement 2 of 3: replace

```json
        "uuid": "c17d3af9-8862-46f3-afef-c39ca67d8a6b",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "c17d3af9-8862-46f3-afef-c39ca67d8a6b"
      },
      {
```

Replacement 3 of 3: replace

```json
        "value": 1,
        "uuid": "ae870732-cfda-4da2-9624-c89607aa5d0d",
        "type": "ability"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "ae870732-cfda-4da2-9624-c89607aa5d0d"
      }
    ],
```

In `src/packs/abilities/Formation_Fighting_xusFYjyP9YFiSPyz.json`:

Replace

```json
        "uuid": "744b1930-cb41-4ae9-9067-ea479b04475f",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "744b1930-cb41-4ae9-9067-ea479b04475f"
      }
    ],
```

In `src/packs/abilities/Hit_and_Run_NbQm8idiKbgOFKCX.json`:

Replace

```json
        "uuid": "d85e4230-26e0-40b9-ad50-03f5d0413bd9",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "d85e4230-26e0-40b9-ad50-03f5d0413bd9"
      }
    ],
```

In `src/packs/abilities/Iron_Will_t7kh6aEtqZIYpZBK.json`:

Replace

```json
        "uuid": "3023105a-2809-4425-8295-813cc21814d0",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "3023105a-2809-4425-8295-813cc21814d0"
      }
    ],
```

In `src/packs/abilities/Keen_Sense_Choose__Mvny0idDE2o6lJVr.json`:

Replace

```json
        "uuid": "cf59eaf8-6baa-4744-add3-718140a050d2",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "cf59eaf8-6baa-4744-add3-718140a050d2"
      }
    ],
```

In `src/packs/abilities/Mage_Slayer_OSwBOg0bMW0fpBBU.json`:

Replace

```json
        "uuid": "75a8a68d-dbb1-412d-8575-461a3f91787a",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "75a8a68d-dbb1-412d-8575-461a3f91787a"
      }
    ],
```

In `src/packs/abilities/Menacing_bTMnvHiWl2X7TygV.json`:

Replace

```json
        "uuid": "978ce59a-cb36-4369-a285-7d15924baad0",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "978ce59a-cb36-4369-a285-7d15924baad0"
      }
    ],
```

In `src/packs/abilities/Path_Specialization_Choose__xganbVGtVdIHlkyq.json` (3 replacements; each old text occurs once):

Replacement 1 of 3: replace

```json
        "uuid": "5f3288ed-2fac-4959-8b01-65f8917c1c29",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "5f3288ed-2fac-4959-8b01-65f8917c1c29"
      },
      {
```

Replacement 2 of 3: replace

```json
        "value": 1,
        "uuid": "82df173c-0220-4905-a598-21247e0bbe26",
        "type": "ability"
      },
      {
```

with

```json
        "value": 1,
        "uuid": "82df173c-0220-4905-a598-21247e0bbe26"
      },
      {
```

Replacement 3 of 3: replace

```json
        "value": 1,
        "uuid": "d5bfa0c1-d090-4127-8936-cba2f3f82fd4",
        "type": "ability"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "d5bfa0c1-d090-4127-8936-cba2f3f82fd4"
      }
    ],
```

In `src/packs/abilities/Pierce_Armor_ym30jgW7ogMAUTug.json`:

Replace

```json
        "uuid": "78daf07f-7c17-4114-9cdd-661c15057cdd",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "78daf07f-7c17-4114-9cdd-661c15057cdd"
      }
    ],
```

In `src/packs/abilities/Sever_Tendons_RiKs0mpaEKDrW4WC.json`:

Replace

```json
        "uuid": "18b1d50c-2e45-4a6b-8390-90a8d2cdadbb",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "18b1d50c-2e45-4a6b-8390-90a8d2cdadbb"
      }
    ],
```

In `src/packs/abilities/Soul_Scarred_uwvM9Up8ayFBkPzB.json` (2 replacements; each old text occurs once):

Replacement 1 of 2: replace

```json
        "value": 1,
        "uuid": "b51278c6-c6fc-450a-a6e5-2615c453a412",
        "type": "ability"
      },
      {
```

with

```json
        "value": 1,
        "uuid": "b51278c6-c6fc-450a-a6e5-2615c453a412"
      },
      {
```

Replacement 2 of 2: replace

```json
        "value": -1,
        "uuid": "5125cc2e-ab00-418d-9ebb-2aa500520d92",
        "type": "ability"
      }
    ],
```

with

```json
        "value": -1,
        "uuid": "5125cc2e-ab00-418d-9ebb-2aa500520d92"
      }
    ],
```

In `src/packs/abilities/Spellcasting_Specialization_Choose__VYOAlSL7UdfBydgu.json` (3 replacements; each old text occurs once):

Replacement 1 of 3: replace

```json
        "uuid": "5f3288ed-2fac-4959-8b01-65f8917c1c29",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "5f3288ed-2fac-4959-8b01-65f8917c1c29"
      },
      {
```

Replacement 2 of 3: replace

```json
        "value": 1,
        "uuid": "16638f13-0754-4a0d-8da6-d158f68d02db",
        "type": "ability"
      },
      {
```

with

```json
        "value": 1,
        "uuid": "16638f13-0754-4a0d-8da6-d158f68d02db"
      },
      {
```

Replacement 3 of 3: replace

```json
        "value": 1,
        "uuid": "7ab7d938-8537-4c18-8e35-4d71290f5674",
        "type": "ability"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "7ab7d938-8537-4c18-8e35-4d71290f5674"
      }
    ],
```

In `src/packs/abilities/Streetwise_lIboUmJhchy7HGBl.json` (2 replacements; each old text occurs once):

Replacement 1 of 2: replace

```json
        "message": "<p><strong>Streetwise:</strong> You have <strong>Advantage</strong> on Checks to hide in streets and alleys.</p>",
        "uuid": "8ddfe3ec-e743-4f05-8a35-552a0d0f8486",
        "type": "ability"
      },
      {
```

with

```json
        "message": "<p><strong>Streetwise:</strong> You have <strong>Advantage</strong> on Checks to hide in streets and alleys.</p>",
        "uuid": "8ddfe3ec-e743-4f05-8a35-552a0d0f8486"
      },
      {
```

Replacement 2 of 2: replace

```json
        "message": "<p><strong>Streetwise:</strong> You have <strong>Advantage</strong> on Checks to search in streets and alleys.</p>",
        "uuid": "6416c6ac-ac8d-4075-9251-5a1c0e51e0ed",
        "type": "ability"
      }
    ],
```

with

```json
        "message": "<p><strong>Streetwise:</strong> You have <strong>Advantage</strong> on Checks to search in streets and alleys.</p>",
        "uuid": "6416c6ac-ac8d-4075-9251-5a1c0e51e0ed"
      }
    ],
```

In `src/packs/abilities/Sweeping_Strikes_XeN5hiGBN3aqY9ZO.json`:

Replace

```json
        "uuid": "f8861101-c5cd-49e1-b1fd-318f44faac47",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "f8861101-c5cd-49e1-b1fd-318f44faac47"
      }
    ],
```

In `src/packs/abilities/Thief_32etMKyIrULSZPYr.json`:

Replace

```json
        "message": "<p><strong>Thief:</strong> You have <strong>Advantage</strong> on Checks to steal an object without being noticed.</p>",
        "uuid": "f0940ad5-271c-4ca4-b948-df9c438cfa37",
        "type": "ability"
      }
    ],
```

with

```json
        "message": "<p><strong>Thief:</strong> You have <strong>Advantage</strong> on Checks to steal an object without being noticed.</p>",
        "uuid": "f0940ad5-271c-4ca4-b948-df9c438cfa37"
      }
    ],
```

In `src/packs/abilities/Tough_ozT1Il4d7ufTAAU3.json`:

Replace

```json
        "value": 1,
        "uuid": "510aa806-c583-4957-b2af-b4efc3f57081",
        "type": "ability"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "510aa806-c583-4957-b2af-b4efc3f57081"
      }
    ],
```

In `src/packs/abilities/Toxin_Resistance_2dLPrvJvTbMTqOTA.json`:

Replace

```json
        "uuid": "9f23c3f9-82a1-4f3f-9325-2cf2762c1177",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "9f23c3f9-82a1-4f3f-9325-2cf2762c1177"
      }
    ],
```

In `src/packs/abilities/Weapon_Specialization_Choose__2IEBnwcEIemby2Wy.json` (3 replacements; each old text occurs once):

Replacement 1 of 3: replace

```json
        "uuid": "5f3288ed-2fac-4959-8b01-65f8917c1c29",
        "type": "ability"
      },
      {
```

with

```json
        "uuid": "5f3288ed-2fac-4959-8b01-65f8917c1c29"
      },
      {
```

Replacement 2 of 3: replace

```json
        "value": 1,
        "uuid": "b9e4c26c-13a1-40f3-91d8-ca71fd87de13",
        "type": "ability"
      },
      {
```

with

```json
        "value": 1,
        "uuid": "b9e4c26c-13a1-40f3-91d8-ca71fd87de13"
      },
      {
```

Replacement 3 of 3: replace

```json
        "value": 1,
        "uuid": "227af7c4-44c8-49a1-9d52-aaf7dcd999c3",
        "type": "ability"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "227af7c4-44c8-49a1-9d52-aaf7dcd999c3"
      }
    ],
```

In `src/packs/sacred-arts/Path_of_the_White_Fox_cYDcLTyuy7BxNn4J.json`:

Replace

```json
        "uuid": "7c6052e3-200f-43ad-a0db-97906c786c9f",
        "type": "ability"
      }
    ],
```

with

```json
        "uuid": "7c6052e3-200f-43ad-a0db-97906c786c9f"
      }
    ],
```

In `src/packs/spells/Bound_Glaive_YoTayXQMc1Wyo5LB.json`:

Replace

```json
            "name": "cleave",
            "type": "boolean",
            "value": true
          },
          {
            "name": "magical",
            "type": "boolean",
            "value": true
          },
          {
            "name": "penetrating",
            "type": "boolean",
            "value": true
          },
          {
            "name": "slashing",
            "type": "boolean",
            "value": true
          },
          {
            "name": "twoHanded",
            "type": "boolean",
            "value": true
          }
```

with

```json
            "name": "cleave",
            "value": true
          },
          {
            "name": "magical",
            "value": true
          },
          {
            "name": "penetrating",
            "value": true
          },
          {
            "name": "slashing",
            "value": true
          },
          {
            "name": "twoHanded",
            "value": true
          }
```

In `src/packs/spells/Bound_Great_Hammer_j80ivcGhVATQnCeG.json`:

Replace

```json
            "name": "crushing",
            "type": "boolean",
            "value": true
          },
          {
            "name": "magical",
            "type": "boolean",
            "value": true
          },
          {
            "name": "push",
            "type": "boolean",
            "value": true
          },
          {
            "name": "rend",
            "type": "boolean",
            "value": true
          },
          {
            "name": "twoHanded",
            "type": "boolean",
            "value": true
          }
```

with

```json
            "name": "crushing",
            "value": true
          },
          {
            "name": "magical",
            "value": true
          },
          {
            "name": "push",
            "value": true
          },
          {
            "name": "rend",
            "value": true
          },
          {
            "name": "twoHanded",
            "value": true
          }
```

In `src/packs/spells/Bound_Great_Sword_E4HdtTJkVELF7kIy.json`:

Replace

```json
            "name": "cleave",
            "type": "boolean",
            "value": true
          },
          {
            "name": "magical",
            "type": "boolean",
            "value": true
          },
          {
            "name": "slashing",
            "type": "boolean",
            "value": true
          },
          {
            "name": "twoHanded",
            "type": "boolean",
            "value": true
          },
          {
            "name": "vicious",
            "type": "boolean",
            "value": true
          }
```

with

```json
            "name": "cleave",
            "value": true
          },
          {
            "name": "magical",
            "value": true
          },
          {
            "name": "slashing",
            "value": true
          },
          {
            "name": "twoHanded",
            "value": true
          },
          {
            "name": "vicious",
            "value": true
          }
```

In `src/packs/spells/Claws_and_Fangs_Weapon__VLTxlTclBsu9yx3T.json`:

Replace

```json
            "name": "magical",
            "type": "boolean",
            "value": true
          },
          {
            "name": "flurry",
            "type": "boolean",
            "value": true
          },
          {
            "name": "piercing",
            "type": "boolean",
            "value": true
          },
          {
            "name": "rend",
            "type": "boolean",
            "value": true
          }
```

with

```json
            "name": "magical",
            "value": true
          },
          {
            "name": "flurry",
            "value": true
          },
          {
            "name": "piercing",
            "value": true
          },
          {
            "name": "rend",
            "value": true
          }
```

In `src/packs/summons/Astral_Assassin_v7RibGeLqpL6XSJ9.json`:

Replace

```json
            "value": 5,
            "uuid": "750b7f50-84f4-4aff-b289-80554da9f5c1",
            "type": "equipment"
          }
        ],
```

with

```json
            "value": 5,
            "uuid": "750b7f50-84f4-4aff-b289-80554da9f5c1"
          }
        ],
```

In `src/packs/urderic-items/Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json`:

Replace

```json
        "value": 1,
        "uuid": "68d75f80-09d5-4560-9878-58ce208873c8",
        "type": "equipment"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "68d75f80-09d5-4560-9878-58ce208873c8"
      }
    ],
```

In `src/packs/urderic-items/Urderic_Titan_Armor_4_4__L6D4VXEuTnTy0lRo.json`:

Replace

```json
        "value": 1,
        "uuid": "3e22daa0-3b6d-4b4b-948c-6a4120cf7e28",
        "type": "equipment"
      }
    ],
```

with

```json
        "value": 1,
        "uuid": "3e22daa0-3b6d-4b4b-948c-6a4120cf7e28"
      }
    ],
```


- [ ] **Step 3: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 6
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..6, 65 files` (the script re-scans every working-tree source for a leftover stray
field); no broken links; the scratch compile finishes. Then `trash .work/compiled-rulings`.

- [ ] **Step 4: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/abilities/Alert_Rank_I__6p5ejdmk7SuKbX0U.json \
   src/packs/abilities/Applied_Anatomy_Q296khWUb4aS3iEx.json \
   src/packs/abilities/Controlled_Blast_cVuVrVMnnmMBgqXB.json \
   src/packs/abilities/Crushing_Blows_HZxOh9kYlgeNUvZ9.json src/packs/abilities/Deceitful_Qm9CvXtskaBrXvdR.json \
   src/packs/abilities/Diplomat_LjG8z8IK89sGY8AF.json src/packs/abilities/Duelist_7JfkkDO8gYCA0CHb.json \
   src/packs/abilities/Flanking_Maneuvers_r55Fi4VRnCgLlaTD.json \
   src/packs/abilities/Flurry_of_Strikes_rMeF5Jcoj6pyNaR5.json \
   src/packs/abilities/Formation_Fighting_xusFYjyP9YFiSPyz.json \
   src/packs/abilities/Hit_and_Run_NbQm8idiKbgOFKCX.json src/packs/abilities/Iron_Will_t7kh6aEtqZIYpZBK.json \
   src/packs/abilities/Keen_Sense_Choose__Mvny0idDE2o6lJVr.json \
   src/packs/abilities/Mage_Slayer_OSwBOg0bMW0fpBBU.json src/packs/abilities/Menacing_bTMnvHiWl2X7TygV.json \
   src/packs/abilities/Path_Specialization_Choose__xganbVGtVdIHlkyq.json \
   src/packs/abilities/Pierce_Armor_ym30jgW7ogMAUTug.json \
   src/packs/abilities/Sever_Tendons_RiKs0mpaEKDrW4WC.json \
   src/packs/abilities/Soul_Scarred_uwvM9Up8ayFBkPzB.json \
   src/packs/abilities/Spellcasting_Specialization_Choose__VYOAlSL7UdfBydgu.json \
   src/packs/abilities/Streetwise_lIboUmJhchy7HGBl.json \
   src/packs/abilities/Sweeping_Strikes_XeN5hiGBN3aqY9ZO.json src/packs/abilities/Thief_32etMKyIrULSZPYr.json \
   src/packs/abilities/Tough_ozT1Il4d7ufTAAU3.json src/packs/abilities/Toxin_Resistance_2dLPrvJvTbMTqOTA.json \
   src/packs/abilities/Weapon_Specialization_Choose__2IEBnwcEIemby2Wy.json \
   src/packs/sacred-arts/Path_of_the_White_Fox_cYDcLTyuy7BxNn4J.json \
   src/packs/spells/Bound_Glaive_YoTayXQMc1Wyo5LB.json src/packs/spells/Bound_Great_Hammer_j80ivcGhVATQnCeG.json \
   src/packs/spells/Bound_Great_Sword_E4HdtTJkVELF7kIy.json \
   src/packs/spells/Claws_and_Fangs_Weapon__VLTxlTclBsu9yx3T.json \
   src/packs/summons/Astral_Assassin_v7RibGeLqpL6XSJ9.json \
   src/packs/urderic-items/Urderic_Gun_Shield_TQJPW1rLHZUYfJpy.json \
   src/packs/urderic-items/Urderic_Titan_Armor_4_4__L6D4VXEuTnTy0lRo.json
git commit -F - <<'EOF'
fix(packs): strip the stray type field from rules elements and trait entries

62 fields in 34 documents. Rules elements and trait entries define no type; the
engine tags each element with its source at runtime.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 7: Flat Modifier `minimum` (system)

**Gate: the controller obtains the user's approval of this design before the task starts** (the project's consent rule
for public data shapes; Open questions 1). If the user declines or rules another shape, skip Tasks 7 and 8 and report to
the controller: Parch keeps its five reductions and no floor until a shape is ruled.

Ruling (TODO): "Parch: clamp Speed at 1, as the rules say 'to a minimum of 1' (user ruling 2026-10-08). Check how the
clamp applies to Fly, Swim, Burrow and Climb when implementing." (R:5429.) **Finding (read from the source): the
existing operations cannot express it.** `flatModifier` -5 on each speed floors at 0, not 1 (`_applyMods` clamps each
bucket step at 0). `setSum` mode `min` value 1 (`SetSumModes.js`, applied after the additive appliers on the running
total) does clamp at 1, but it also raises a speed the creature lacks: a creature without Fly (base 0) has a running
total of -5 after the reduction, and `min` 1 lifts it to 1, giving it a Fly speed. `mulSum` and `mulBase` scale and cannot
subtract. So the clamp needs a new capability. (Read from `BuildSchemaFromShape.js`: the `rulesElement` array is an `ArrayField`
of free-form `ObjectField` entries, so an extra `minimum` field is stored and needs no schema change.) **The shape:** an optional `minimum` on the Flat Modifier element (the
design spec's C2 `minimum`, without `existingOnly`): for a reduction (negative value) it adds only what keeps the stat's
running total at or above the minimum, and adds nothing to a stat whose total is already below it. "Decreases by 5, to a
minimum of 1" then takes a speed of 4 to 1, leaves 1 at 1, and leaves a speed the creature lacks at 0 (a reduction does
not grant a speed, unlike Force Speed's intended grant, which is an increase). The running total is the stat's base plus
every mod applied so far, the same total `mulSum` and `setSum` read, so sources apply in the order
`_getRulesElementSources` lists them.

**Files:**
- Create: `src/helpers/utility-functions/ComputeFlatModifierContribution.js`
- Create: `tests/unit/ComputeFlatModifierContribution.test.js`
- Create: `tests/unit/FlatModifierMinimum.test.js`
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (import near line 36; `_applyFlatModifierElements`,
  lines 1036-1087)
- Modify: `src/document/types/item/rules-element/FlatModifier.js` (typedef)
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte`
- Modify: `lang/en.json`
- Modify: `tests/e2e/rules-element-editor.spec.js`
- Modify: `CHANGELOG.md`, `.claude/skills/titan-codebase/references/abstractions.md`

**Interfaces:**
- Consumes: `FlatModifierElement` (`FlatModifier.js`): `{ operation: 'flatModifier', selector, key, value, uuid }`;
  `CharacterDataModel._applyFlatModifierElements(elements)`, whose `elements` the bucket switch in `_applyRulesElements`
  passes after `_expandAllKeyElements` (an element with key `all` arrives once per speed, `minimum` copied by the spread).
- Produces: `computeFlatModifierContribution(total, value, minimum)` (default export of
  `src/helpers/utility-functions/ComputeFlatModifierContribution.js`): `(number, number, number|null|undefined) =>
  number`, the amount an element adds to its source bucket; `FlatModifierElement.minimum?: number|null`; the editor test
  ids `flat-modifier-minimum-enabled` (the toggle) and `flat-modifier-minimum` (the integer input); `LOCAL.minimum.text`
  and `LOCAL.flatModifierMinimum.desc.text`.

- [ ] **Step 1: Confirm the system branch**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
git branch --show-current
git status --short
```

Expected: branch `conditions-and-rulings`. The status lists the user's unrelated changes (`.claude/*`, deleted
`CLAUDE.md` and `TITAN Rules Compendium.md`, the `Gemini_Generated_Image_*` files, `docs/TITAN Rules Compendium*.md`,
`src/spreadsheet/io/ApplyImport.js`): never stage them. Load the `titan-codebase`, `foundry-vtt`, `svelte-5`, and
`foundry-svelte` skills before editing.

- [ ] **Step 2: Write the failing helper test**

With the Write tool, create `tests/unit/ComputeFlatModifierContribution.test.js`:

```js
import { describe, it, expect } from 'vitest';
import computeFlatModifierContribution from '~/helpers/utility-functions/ComputeFlatModifierContribution.js';

describe('computeFlatModifierContribution', () => {
   it('limits a reduction to the room above the minimum', () => {
      expect(computeFlatModifierContribution(4, -5, 1)).toBe(-3);
      expect(computeFlatModifierContribution(4, -5, 3)).toBe(-1);
      expect(computeFlatModifierContribution(3, -5, 3)).toBe(0);
   });

   it('leaves a total at or below the minimum untouched', () => {
      expect(computeFlatModifierContribution(1, -5, 1)).toBe(0);
      expect(computeFlatModifierContribution(0, -5, 1)).toBe(0);
      expect(computeFlatModifierContribution(-2, -5, 1)).toBe(0);
   });

   it('applies a reduction in full when it stays at or above the minimum', () => {
      expect(computeFlatModifierContribution(9, -5, 1)).toBe(-5);
      expect(computeFlatModifierContribution(6, -5, 1)).toBe(-5);
      expect(computeFlatModifierContribution(5, -4, 1)).toBe(-4);
   });

   it('applies an increase in full whatever the minimum', () => {
      expect(computeFlatModifierContribution(4, 5, 1)).toBe(5);
      expect(computeFlatModifierContribution(0, 5, 3)).toBe(5);
      expect(computeFlatModifierContribution(4, 0, 1)).toBe(0);
   });

   it('applies the value unchanged without a numeric minimum', () => {
      expect(computeFlatModifierContribution(4, -5)).toBe(-5);
      expect(computeFlatModifierContribution(4, -5, undefined)).toBe(-5);
      expect(computeFlatModifierContribution(4, -5, null)).toBe(-5);
      expect(computeFlatModifierContribution(4, -5, 'one')).toBe(-5);
      expect(computeFlatModifierContribution(4, -5, Number.NaN)).toBe(-5);
   });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
npm test -- tests/unit/ComputeFlatModifierContribution.test.js
```

Expected: FAIL, the suite cannot resolve `~/helpers/utility-functions/ComputeFlatModifierContribution.js`.

- [ ] **Step 4: Write the helper**

With the Write tool, create `src/helpers/utility-functions/ComputeFlatModifierContribution.js`:

```js
/**
 * Computes the amount a flat modifier adds to its source's mod bucket. A reduction (a negative value) carrying a
 * minimum adds only what keeps the stat's running total at or above the minimum, and adds nothing to a total already
 * below it, so "decreases by 5, to a minimum of 1" takes a speed of 4 to 1, leaves a speed of 1 at 1, and leaves a
 * speed the creature lacks (0) at 0. An increase, and an element without a numeric minimum, add their value unchanged.
 * Source: TITAN Rules Compendium (09_26_2026), Parch ("Their Speed decreases by -5, to a minimum of 1").
 * @param {number} total - The stat's running total: its base value plus every mod applied so far.
 * @param {number} value - The element's value.
 * @param {number|null} [minimum] - The element's minimum; absent or null for none.
 * @returns {number} The amount to add to the stat's mod bucket.
 */
export default function computeFlatModifierContribution(total, value, minimum) {
   if (typeof minimum !== 'number' || !Number.isFinite(minimum) || value >= 0) {
      return value;
   }

   // The room above the minimum is min(minimum, total) - total, which is 0 for a total already at or below it.
   return Math.max(value, Math.min(minimum, total) - total);
}
```

- [ ] **Step 5: Run the helper test to verify it passes**

```bash
npm test -- tests/unit/ComputeFlatModifierContribution.test.js
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Write the failing pipeline test**

With the Write tool, create `tests/unit/FlatModifierMinimum.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Flat modifier `minimum` through the real rules-element pipeline: a bare CharacterDataModel (Object.create over the
// prototype) whose parent carries enabled `effect` Active Effects runs `_applyRulesElements` and then `_applyMods`, and
// each speed's `value` is read as data preparation leaves it. The model is imported after the Foundry stand-ins are
// installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/** @type {Record<string, number>} The speed bases: Stride 4, Swim 3 and Climb 1; Fly and Burrow are lacking (0). */
const SPEED_BASES = {
   burrow: 0,
   climb: 1,
   fly: 0,
   stride: 4,
   swim: 3,
};

/**
 * Builds a stat at the given base with every mod bucket at 0.
 * @param {number} base - The value stored as the stat's `baseValue`.
 * @returns {{baseValue: number, mod: Record<string, number>}} The stat, with a 0 in each mod bucket.
 */
function stat(base) {
   return {
      baseValue: base,
      mod: {
         static: 0,
         equipment: 0,
         effect: 0,
         ability: 0,
         condition: 0,
      },
   };
}

/**
 * Builds a flat modifier on every speed.
 * @param {number} value - The amount added to every speed; negative for a reduction.
 * @param {string} uuid - The element's unique id, distinct per element within a test.
 * @param {object} [extra] - Fields merged into the element, such as `minimum`.
 * @returns {object} The flat modifier element for key `all` on the speed selector.
 */
function speedElement(value, uuid, extra = {}) {
   return {
      key: 'all',
      operation: 'flatModifier',
      selector: 'speed',
      uuid,
      value,
      ...extra,
   };
}

/**
 * Builds a bare Character carrying the given rules-element lists as enabled `effect` Active Effects, in order, with
 * the speeds at SPEED_BASES and every other stat at 8 (no skills, resources, or mods).
 * @param {object[][]} effects - One rules-element list per effect.
 * @returns {object} The model, after `_applyRulesElements` and `_applyMods` (each stat's `value` is set).
 */
function createCharacter(effects) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(effects.map((rulesElement, index) => [
         `effect${index}`,
         {
            disabled: false,
            id: `effect${index}`,
            name: `Effect ${index}`,
            statuses: new Set(),
            system: {
               rulesElement: structuredClone(rulesElement),
            },
            type: 'effect',
         },
      ])),
      items: new Map(),
      rulesElementsCache: {},
   };
   model.equipped = {
      armor: null,
      shield: null,
   };
   model.attribute = {
      body: stat(8),
      mind: stat(8),
      soul: stat(8),
   };
   model.resistance = {
      reflexes: stat(8),
      resilience: stat(8),
      willpower: stat(8),
   };
   model.rating = {
      accuracy: stat(8),
      awareness: stat(8),
      defense: stat(8),
      initiative: stat(8),
      melee: stat(8),
   };
   model.speed = Object.fromEntries(Object.entries(SPEED_BASES).map(([key, base]) => [
      key,
      stat(base),
   ]));
   model.skill = {};
   model.resource = {};
   model.mod = {};
   model._applyRulesElements();
   model._applyMods();
   return model;
}

/**
 * Reads each speed's derived value.
 * @param {object} model - The prepared model.
 * @returns {Record<string, number>} The value of each speed, by key.
 */
function readSpeeds(model) {
   return Object.fromEntries(Object.entries(model.speed).map(([key, speed]) => [
      key,
      speed.value,
   ]));
}

describe('flat modifier minimum', () => {
   it('stops a reduction at the minimum and leaves a speed the creature lacks at 0', () => {
      const model = createCharacter([[speedElement(-5, 'reduction', { minimum: 1 })]]);
      expect(readSpeeds(model)).toEqual({
         burrow: 0,
         climb: 1,
         fly: 0,
         stride: 1,
         swim: 1,
      });

      // The cache records what each speed's bucket received.
      expect(model.rulesElementsCache.flatModifier.speed.stride.effect).toBe(-3);
      expect(model.rulesElementsCache.flatModifier.speed.swim.effect).toBe(-2);
      expect(model.rulesElementsCache.flatModifier.speed.climb.effect).toBe(0);
      expect(model.rulesElementsCache.flatModifier.speed.fly.effect).toBe(0);
   });

   it('floors a reduction without a minimum at 0 on every speed', () => {
      const model = createCharacter([[speedElement(-5, 'reduction')]]);
      expect(readSpeeds(model)).toEqual({
         burrow: 0,
         climb: 0,
         fly: 0,
         stride: 0,
         swim: 0,
      });
   });

   it('treats a null minimum as none', () => {
      const model = createCharacter([[speedElement(-5, 'reduction', { minimum: null })]]);
      expect(readSpeeds(model)).toEqual({
         burrow: 0,
         climb: 0,
         fly: 0,
         stride: 0,
         swim: 0,
      });
   });

   it('keeps a minimum above the current total from raising anything', () => {
      const model = createCharacter([[speedElement(-5, 'reduction', { minimum: 3 })]]);
      expect(readSpeeds(model)).toEqual({
         burrow: 0,
         climb: 1,
         fly: 0,
         stride: 3,
         swim: 3,
      });
   });

   it('ignores the minimum on an increase, which grants speeds the creature lacks', () => {
      const model = createCharacter([[speedElement(5, 'increase', { minimum: 1 })]]);
      expect(readSpeeds(model)).toEqual({
         burrow: 5,
         climb: 6,
         fly: 5,
         stride: 9,
         swim: 8,
      });
   });

   it('measures the minimum against the running total in source order', () => {
      // The reduction first: Stride 4 -> 1, then +5 on top of the floor.
      const reductionFirst = createCharacter([
         [speedElement(-5, 'reduction', { minimum: 1 })],
         [speedElement(5, 'increase')],
      ]);
      expect(reductionFirst.speed.stride.value).toBe(6);

      // The increase first: Stride 4 -> 9, then the reduction takes the full 5 (9 - 5 stays above the minimum).
      const increaseFirst = createCharacter([
         [speedElement(5, 'increase')],
         [speedElement(-5, 'reduction', { minimum: 1 })],
      ]);
      expect(increaseFirst.speed.stride.value).toBe(4);
   });
});
```

- [ ] **Step 7: Run it to verify it fails**

```bash
npm test -- tests/unit/FlatModifierMinimum.test.js
```

Expected: FAIL. The engine ignores `minimum`, so the first test reads `stride: 0` where it expects `1` (and the cache
read `-4` where it expects `-3`).

- [ ] **Step 8: Apply the minimum in the engine**

In `src/document/types/actor/types/character/CharacterDataModel.js`, use the Edit tool. Replace

```js
import computeDamageResistance from '~/helpers/utility-functions/ComputeDamageResistance.js';
import computeMulSumDelta from '~/helpers/utility-functions/ComputeMulSumDelta.js';
```

with

```js
import computeDamageResistance from '~/helpers/utility-functions/ComputeDamageResistance.js';
import computeFlatModifierContribution from '~/helpers/utility-functions/ComputeFlatModifierContribution.js';
import computeMulSumDelta from '~/helpers/utility-functions/ComputeMulSumDelta.js';
```

Replace

```js
   /**
    * Applies Flat Modifier Rules Elements to this Character.
    * @param {FlatModifierElement[]} elements - Array of Flat Modifier Rules Elements to apply.
    * @private
    */
   _applyFlatModifierElements(elements) {
```

with

```js
   /**
    * Applies Flat Modifier Rules Elements to this Character. Each element adds its value to the mod bucket of its
    * source type; a reduction carrying a `minimum` adds only what keeps the stat's running total (base value plus every
    * mod applied so far) at or above the minimum (`computeFlatModifierContribution`), so the elements apply in the
    * order the sources are gathered.
    * @param {FlatModifierElement[]} elements - Array of Flat Modifier Rules Elements to apply.
    * @private
    */
   _applyFlatModifierElements(elements) {
```

and replace

```js
               // Sort elements by type.
               const types = sortObjectsIntoContainerByKeyValue(keyElements, 'type');

               // Get the stat data.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const modObject = stat.mod;

               // For each type.
               for (const [type, typeElements] of Object.entries(types)) {
                  flatModifier[selector][key][type] = 0;

                  // Apply each mod.
                  for (const element of typeElements) {
                     modObject[type] += element.value;
                     flatModifier[selector][key][type] += element.value;
                  }
               }
```

with

```js
               // Get the stat data and its base.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const modObject = stat.mod;

               /** @type {number} The base the running total starts from; a `mod` stat has none. */
               const baseValue = (selector === 'resource' ? stat.maxBase : stat.baseValue) ?? 0;

               /** @type {Record<string, number>} What the key's elements have added, by source type. */
               const added = flatModifier[selector][key];

               // Apply each element in order, recomputing the running total so a minimum reads every mod before it.
               for (const element of keyElements) {
                  /** @type {number} The stat's running total: its base plus every mod applied so far. */
                  let total = baseValue;
                  for (const mod of Object.values(modObject)) {
                     total += mod;
                  }

                  /** @type {number} The amount this element adds, limited by its minimum. */
                  const contribution = computeFlatModifierContribution(total, element.value, element.minimum);
                  modObject[element.type] += contribution;
                  added[element.type] = (added[element.type] ?? 0) + contribution;
               }
```

Each old text occurs exactly once (the `import` pair near line 36; the doc comment and signature at 1036-1041; the type
sort through the apply loop at 1060-1078). The cache `rulesElementsCache.flatModifier[selector][key][type]` keeps its
shape: one total per source type, each present because each type has at least one element.

- [ ] **Step 9: Run both unit tests to verify they pass**

```bash
npm test -- tests/unit/ComputeFlatModifierContribution.test.js tests/unit/FlatModifierMinimum.test.js
```

Expected: PASS, 11 tests (5 + 6).

- [ ] **Step 10: Document the field on the element typedef**

`src/document/types/item/rules-element/FlatModifier.js` has CRLF line terminators in the working tree (git stores LF:
`git ls-files --eol` prints `i/lf w/crlf`), so a multi-line Edit cannot match it. Replace the whole file with the Write
tool; the new file is LF and `git diff` shows only the added typedef lines.

```js
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for adding a simple bonus or penalty to the value of a Character's stat.
 * @typedef {object} FlatModifierElement
 * @property {string} operation - The operation to be performed by the Rules Element (flatModifier).
 * @property {string} selector - The type of stat being modified (attribute,
 * rating, training, expertise, resistance, or mod).
 * @property {string} key - The Key of the stat being multiplied (body, willpower, etc.).
 * @property {number} value - The value by which to modify the stat.
 * @property {number|null} [minimum] - For a reduction (a negative value), the total the stat's running total (base
 * value plus every mod applied so far) is not taken below; a stat already below it is left alone. Absent or null for
 * no minimum; ignored on an increase.
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * Creates a Rules Element for adding a simple bonus or penalty to the value of a Character's stat.
 * @param {object} [options] - Options for the rules element.
 * @returns {FlatModifierElement} The new Rules Element.
 */
export default function createFlatModifierElement(options) {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: options?.uuid ?? generateUUID(),
   };
}
```

- [ ] **Step 11: Add the editor controls and localization**

`src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte` also has CRLF line terminators
(measured: 162 CRLF in 162 lines), so replace the whole file with the Write tool. The additions are the three imports,
`hasMinimum`, `onMinimumToggle`, the `field minimum` block, and the `&.minimum` style; everything else is the file as
read. The new field uses the class `minimum`, not `select`, because `addRulesElement` in `tests/e2e/flows.js` indexes a
row's `.field.select` controls.

```svelte
<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/document/svelte-components/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/document/svelte-components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/svelte-components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/svelte-components/select/DocumentSpeedSelect.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} ItemSheetFlatModifierSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetFlatModifierSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} Whether this element limits its reduction to a minimum. */
   const hasMinimum = $derived(typeof document.data?.system.rulesElement[idx]?.minimum === 'number');

   /** @type {string[]} Options for selecting the stat the flat modifier applies to. */
   const selectorOptions = [
      'attribute',
      'expertise',
      'mod',
      'rating',
      'resistance',
      'resource',
      'speed',
      'training',
   ];

   /**
    * Switches the element's minimum on (at 0) or off, then saves the element.
    * @returns {void}
    */
   function onMinimumToggle() {
      document.data.system.rulesElement[idx].minimum = hasMinimum ? null : 0;
      refreshSystemDocument(document.data, false);
   }

   /**
    * Updates the element key to a sensible default when the selector changes.
    * @returns {void}
    */
   function onSelectorChange() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            document.data.system.rulesElement[idx].key = 'body';
            break;
         }
         case 'training':
         case 'expertise': {
            document.data.system.rulesElement[idx].key = 'arcana';
            break;
         }
         case 'mod': {
            document.data.system.rulesElement[idx].key = 'armor';
            break;
         }
         case 'rating': {
            document.data.system.rulesElement[idx].key = 'awareness';
            break;
         }
         case 'resistance': {
            document.data.system.rulesElement[idx].key = 'reflexes';
            break;
         }
         case 'resource': {
            document.data.system.rulesElement[idx].key = 'resolve';
            break;
         }
         case 'speed': {
            document.data.system.rulesElement[idx].key = 'burrow';
            break;
         }

         default: {
            break;
         }
      }
   }

   /**
    * Returns the appropriate select component for the key, depending on the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getKeySelect() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'training':
         case 'expertise': {
            return DocumentSkillSelect;
         }
         case 'mod': {
            return DocumentModSelect;
         }
         case 'rating': {
            return DocumentRatingSelect;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'resource': {
            return DocumentResourceSelect;
         }
         case 'speed': {
            return DocumentSpeedSelect;
         }

         default: {
            break;
         }
      }
   }
</script>

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={selectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      {#if getKeySelect()}
         {@const KeySelect = getKeySelect()}
         <KeySelect
            allowAll
            bind:value={document.data.system.rulesElement[idx].key}
         />
      {/if}
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={document.data.system.rulesElement[idx].value}/>
   </div>

   <!--Minimum: a reduction stops at this total-->
   <div class="field minimum">
      <LabeledElement
         label="minimum"
         tooltip={'flatModifierMinimum.desc'}
      >
         <CheckboxInput
            disabled={!document.data?.isOwner}
            onchange={onMinimumToggle}
            testId="flat-modifier-minimum-enabled"
            value={hasMinimum}
         />
      </LabeledElement>
      {#if hasMinimum}
         <DocumentIntegerInput
            bind:value={document.data.system.rulesElement[idx].minimum}
            testId="flat-modifier-minimum"
         />
      {/if}
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }

         &.minimum {
            @include flex-group-left;
         }
      }
   }
</style>
```

In `lang/en.json` (LF), use the Edit tool: replace

```
      "flatModifier.text": "Flat Modifier",
```

with

```
      "flatModifier.text": "Flat Modifier",
      "flatModifierMinimum.desc.text": "A reduction stops at this total: it never takes the stat below it, and a stat already below it is left alone.",
```

and replace

```
      "minimizeElement.text": "Minimize",
```

with

```
      "minimizeElement.text": "Minimize",
      "minimum.text": "Minimum",
```

- [ ] **Step 12: Write the editor e2e test**

In `tests/e2e/rules-element-editor.spec.js`, use the Edit tool. Replace

```js
 * situation; and the immunity editor offers the condition and effect selectors, a condition picker over every
 * condition, a typed effect name, and builds the default condition immunity when a row is retyped to Immunity.
```

with

```js
 * situation; the immunity editor offers the condition and effect selectors, a condition picker over every
 * condition, a typed effect name, and builds the default condition immunity when a row is retyped to Immunity; and the
 * flat modifier editor's minimum toggle stores a minimum, shows its input, and clears it.
```

and replace

```js
      await expect.poll(readElement, { message: 'the typed name is stored' }).toEqual({
         key: 'Poisoned Blade',
         selector: 'effect',
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

with

```js
      await expect.poll(readElement, { message: 'the typed name is stored' }).toEqual({
         key: 'Poisoned Blade',
         selector: 'effect',
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});

test.describe('flat modifier minimum', () => {
   /**
    * Reads the edited element's stored minimum.
    * @returns {Promise<number|null|undefined>} The stored `minimum`; absent until the toggle first saves.
    */
   async function readMinimum() {
      return (await readElements())[0].minimum;
   }

   test('the minimum toggle stores a minimum, shows its input, and clears it', async () => {
      await addRulesElement(page, weaponUuid, {});

      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openRulesElements();

      /** @type {import('@playwright/test').Locator} The toggle, shown on every flat modifier. */
      const toggle = sheet.getByTestId('flat-modifier-minimum-enabled');

      /** @type {import('@playwright/test').Locator} The minimum input, which the toggle reveals. */
      const input = sheet.getByTestId('flat-modifier-minimum');

      // A new flat modifier carries no minimum. The toggle is shown first, so the absence is of the input it reveals.
      await expect(toggle).toBeVisible();
      await expect(input).toHaveCount(0);
      expect(await readMinimum(), 'a new flat modifier carries no minimum').toBeUndefined();

      await toggle.click();
      await expect.poll(readMinimum, { message: 'switching the minimum on stores 0' }).toBe(0);
      await expect(input).toBeVisible();

      await commitText(input, 1);
      await expect.poll(readMinimum, { message: 'the typed minimum is stored' }).toBe(1);

      await toggle.click();
      await expect.poll(readMinimum, { message: 'switching the minimum off clears it' }).toBe(null);
      await expect(input).toHaveCount(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 13: Update the skill and the changelog**

In `.claude/skills/titan-codebase/references/abstractions.md`, use the Edit tool. Replace

```
fractional) base contribution per element via `roundDirectional(baseValue * (value - 1), rounding)`. Both sum
```

with

```
fractional) base contribution per element via `roundDirectional(baseValue * (value - 1), rounding)`.
`_applyFlatModifierElements` adds each element's value to its source bucket; a negative value carrying a `minimum` adds
only what keeps the running total (base plus every mod applied so far, `computeFlatModifierContribution`) at or above
the minimum and adds 0 to a total already below it, so a reduction never grants a stat the creature lacks and elements
apply in gather order. Both sum
```

and replace

```
operation carrying a key supports `'all'` at the engine level (`flatModifier`/`mulSum`/`setSum` are the additive/sum ops
that use it), but the settings UI only exposes the `'all'` option (`allowAll` on the key select) for `mulSum` and
`setSum`.
```

with

```
operation carrying a key supports `'all'` at the engine level (`flatModifier`/`mulSum`/`setSum` are the additive/sum ops
that use it), and the settings UI exposes the `'all'` option (`allowAll` on the key select) for those three
operations (`ItemSheetFlatModifierSettings`, `ItemSheetMulSumSettings`, `ItemSheetSetSumSettings`).
```

In `CHANGELOG.md`, replace

```
- Falling Unconscious also applies Prone and Incapacitated, each only if absent and unless the character is immune to
  it; removing Unconscious leaves Prone and Incapacitated.
```

with

```
- Falling Unconscious also applies Prone and Incapacitated, each only if absent and unless the character is immune to
  it; removing Unconscious leaves Prone and Incapacitated.
- Flat Modifier rules elements can carry a minimum for a reduction: the stat's running total (its base plus the
  modifiers applied before it) is not taken below the minimum, and a stat already below it is left alone, so a Speed
  reduction "to a minimum of 1" leaves a speed the character lacks at 0. The rules element editor has a Minimum toggle
  and input on Flat Modifier rows.
```

- [ ] **Step 14: Lint, test, build, and run the editor e2e**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
npm run eslint
npm run stylelint
npm test
npm run build
npm run test:e2e -- tests/e2e/rules-element-editor.spec.js
```

Expected: 0 ESLint and Stylelint errors; every unit test passes (read Vitest's own summary); the build succeeds; in
the e2e run (log in only as `E2E GM 1`; the live Foundry at http://localhost:30000 serves this directory's build) read
Playwright's own passed count from its log, never an exit code through a pipe: every test in
`rules-element-editor.spec.js` passes, including `flat modifier minimum`. A failure is an implementation defect first.

- [ ] **Step 15: Commit**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
git branch --show-current
git status --short
git add src/helpers/utility-functions/ComputeFlatModifierContribution.js \
   tests/unit/ComputeFlatModifierContribution.test.js tests/unit/FlatModifierMinimum.test.js \
   src/document/types/actor/types/character/CharacterDataModel.js \
   src/document/types/item/rules-element/FlatModifier.js \
   src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte \
   lang/en.json tests/e2e/rules-element-editor.spec.js CHANGELOG.md \
   .claude/skills/titan-codebase/references/abstractions.md
git commit -F - <<'EOF'
feat(rules-elements): Flat Modifier minimum for reductions

A reduction with a minimum adds only what keeps the stat's running total at or
above it and leaves a total already below it alone, so "decreases by 5, to a
minimum of 1" cannot grant a speed the creature lacks. The editor has a Minimum
toggle and input.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

(`git add .claude/skills/...` stages that one file; the user's other `.claude/*` working-tree changes stay unstaged.)

---

### Task 8: Parch uses the minimum (module)

**Needs Task 7's commit and the user's approval of its design (Task 7 gate).** If Task 7 was skipped, skip this task.

Ruling: TODO "Parch: clamp Speed at 1, as the rules say 'to a minimum of 1' (user ruling 2026-10-08). Check how the
clamp applies to Fly, Swim, Burrow and Climb when implementing." Rules line R:5429 ("Their Speed decreases by -5, to a
minimum of 1"). Document: `effects/Parch_AZWdUeIhXOOdUsBS.json`. **How the clamp applies to the other speeds (the
ruling's check):** the element's `minimum` limits a reduction to the room above 1 on each speed's running total
(Task 7), so Stride 4 becomes 1, a Swim or Climb of 1 stays 1, and a speed the creature lacks (Fly, Burrow at 0) stays 0
instead of becoming 1. The five per-speed -5 elements collapse into one `speed` element with key `all` (expanded by the
engine to the five speeds, each carrying the `minimum`).

**Files:**
- Modify: `src/packs/effects/Parch_AZWdUeIhXOOdUsBS.json`
- Test (scratch): `.work/verify-rulings.mjs`

**Interfaces:**
- Consumes: `FlatModifierElement.minimum?: number|null` (Task 7, `src/document/types/item/rules-element/FlatModifier.js`);
  key `all` expansion in `CharacterDataModel._expandAllKeyElements`.
- Produces: one element `{ operation: 'flatModifier', selector: 'speed', key: 'all', value: -5, minimum: 1, uuid:
  'b5d88f0f-6011-4d9f-aea0-d83e94d0a400' }` replacing the five per-speed elements (their uuids are dropped with them).

- [ ] **Step 1: Confirm Task 7 is committed and run the check to verify it fails**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
git log --oneline -5
grep -n "minimum" src/document/types/item/rules-element/FlatModifier.js
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
node .work/verify-rulings.mjs 8
```

Expected: the system log shows the Task 7 commit (`feat(rules-elements): Flat Modifier minimum for reductions`) and
the `grep` prints the typedef line; the module branch is `conditions-and-rulings`; the script FAILs with
`AssertionError ... effects/Parch_AZWdUeIhXOOdUsBS.json: differs from the intended change` (groups 1..6 already pass). At
group 8 the script also reads the system source: it fails with `the system documents the flat modifier minimum` or `the
system applies the flat modifier minimum` if Task 7's typedef or engine edit is absent.

- [ ] **Step 2: Replace the five reductions with one**

Use the Edit tool; the old text occurs exactly once in the file.

In `src/packs/effects/Parch_AZWdUeIhXOOdUsBS.json`:

Replace

```json
        "selector": "speed",
        "key": "burrow",
        "value": -5,
        "uuid": "9e5eec48-ceba-4d28-85ab-4da248b7fd76"
      },
      {
        "operation": "flatModifier",
        "selector": "speed",
        "key": "climb",
        "value": -5,
        "uuid": "1c7550b1-8e3c-41bd-aeaa-459537e574fd"
      },
      {
        "operation": "flatModifier",
        "selector": "speed",
        "key": "fly",
        "value": -5,
        "uuid": "528cd059-5cac-4ef0-9fe1-81c97ecc1379"
      },
      {
        "operation": "flatModifier",
        "selector": "speed",
        "key": "stride",
        "value": -5,
        "uuid": "c03d4726-9ba2-48e0-8e9a-abd0bb5995f8"
      },
      {
        "operation": "flatModifier",
        "selector": "speed",
        "key": "swim",
        "value": -5,
        "uuid": "d9246fab-43f9-40b8-9878-0aea5bad5639"
      }
    ],
```

with

```json
        "selector": "speed",
        "key": "all",
        "value": -5,
        "minimum": 1,
        "uuid": "b5d88f0f-6011-4d9f-aea0-d83e94d0a400"
      }
    ],
```


- [ ] **Step 3: Verify**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
node .work/verify-rulings.mjs 8
npm run check:links
npm run packs:compile -- src/packs .work/compiled-rulings
```

Expected: `verify-rulings ok: groups 1..8, 66 files` (the Parch file equals the base commit with exactly the one
replacement element, its element fields are the system's flat modifier fields plus `minimum`, and the system source
documents and applies `minimum`); no broken links; the scratch compile finishes. Then `trash .work/compiled-rulings`.

- [ ] **Step 4: Commit (source only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
git branch --show-current
git status --short -- . ':(exclude)packs'
git add src/packs/effects/Parch_AZWdUeIhXOOdUsBS.json
git commit -F - <<'EOF'
feat(packs): Parch reduces every speed by 5 to a minimum of 1

One Flat Modifier on every speed with a minimum of 1 replaces the five per-speed
reductions, which floored at 0 and ignored the rules' minimum.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

---

### Task 9: Live recompile, in-world check, full verification, documentation (both repos)

Runs last, after Tasks 1-8 are committed (Tasks 7 and 8 only if the user approved Task 7's design; if they were
skipped, drop the Parch and Flat Modifier lines from every step below). Step 1 is a controller checkpoint: the live world
locks every pack LevelDB and stopping the server is not available to agents, so the controller asks the user once.

**Files:**
- Create (scratch, git-ignored, never committed): `.work/live-check-rulings.mjs` (module)
- Modify (system): `docs/TODO.md`, `docs/POST_WORK_FINDINGS.md`,
  `docs/superpowers/specs/2026-09-27-compendium-rulings-design.md`,
  `.claude/skills/titan-codebase/references/conventions.md`
- The module has no CHANGELOG (`ls CHANGELOG*` in the module root finds none) and its README describes no workflow this
  plan changes, so the module needs no documentation edit. Releasing the module (a zip to the rolling `latest`) is the
  user's separate step; this plan does not tag, zip, or push.

**Interfaces:**
- Consumes: the compiled module packs (`Compendium.titan-vttrpg-compendium.effects.ActiveEffect.<id>`,
  `Compendium.titan-vttrpg-compendium.<pack>.Item.<id>`), the system's `immunityHandling` setting (default `remove`),
  `Actor.toggleStatusEffect`, `actor.system.speed.<key>.value`/`baseValue`, and the module's `tools/validate-live.mjs`.
- Produces: `.work/live-check-rulings.mjs`, whose exit code is 0 only when every assertion below holds; a saved log;
  the documentation edits of Step 3.

- [ ] **Step 1: Controller checkpoint: recompile the live packs and check them in the test world**

Preconditions (controller): in the module, `git branch --show-current` prints `conditions-and-rulings`,
`git status --short -- . ':(exclude)packs'` prints nothing, and `node .work/verify-rulings.mjs all` prints
`verify-rulings ok: groups 1..8, 66 files`. Create the log directory first:
`mkdir -p /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan/.superpowers/sdd/2026-10-09-compendium-rulings/logs`
(`.superpowers/` is git-ignored).

Ask the user once to either stop Foundry so the recompile can run, or to authorize logging "recompile the module's live
packs from `src/packs`" in `docs/TODO.md` (in which case Step 3 adds that entry and Steps 1b to 1d do not run). Nothing is
deferred without that answer. After the user stops Foundry:

1a. Recompile into the live packs (default `src/packs` to `packs`; the churn stays unstaged):

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
npm run packs:compile
```

Expected: one line per pack with its document counts (`effects`, `items`, `journal`, `actors`, `folders` as each pack
holds them) and no error. Then the user, or the controller using the relaunch method the user has permitted (auto-memory
`relaunch-foundry-method.md`, run in the background), restarts Foundry and the test world `test-titan`.

1b. With the Write tool (never a shell heredoc), create `.work/live-check-rulings.mjs` in the module with exactly this
content. It logs in as `E2E GM 1`, creates one throwaway actor, applies each ruled effect from the compendium through
`createEmbeddedDocuments`, drives conditions through `toggleStatusEffect`, reads speeds as data preparation derives
them, reads four compendium documents, deletes the actor, and asserts. Logging in as a GM to the world runs the system's
`OnceReady` migrations for that world per its Migration Mode setting, exactly as an e2e run does; the throwaway actor
is created with the API and deleted in a `finally` (the pattern of plan B's live-pack check; this is a one-off check,
not a suite test).

```js
// Checks the recompiled compendium packs in the running test world. Usage: node .work/live-check-rulings.mjs
// Environment: FOUNDRY_URL (default http://localhost:30000), FOUNDRY_USER (default E2E GM 1), FOUNDRY_PASSWORD.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

/** @type {string} The Foundry server. */
const FOUNDRY_URL = process.env.FOUNDRY_URL ?? 'http://localhost:30000';

/** @type {string} The Foundry user; a GM with no other open session. */
const FOUNDRY_USER = process.env.FOUNDRY_USER ?? 'E2E GM 1';

/** @type {string[]} Every condition id of the system (buildConditionDefinitions in src/system/Conditions.js). */
const CONDITION_IDS = [
   'blinded',
   'contaminated',
   'dead',
   'deafened',
   'frightened',
   'incapacitated',
   'offBalance',
   'prone',
   'restrained',
   'stunned',
   'sleeping',
   'unconscious',
];

console.log(`live-check-rulings ${new Date().toISOString()} as ${FOUNDRY_USER} at ${FOUNDRY_URL}`);
const browser = await chromium.launch();
const page = await browser.newPage();

/** @type {string[]} Uncaught page errors. */
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.goto(`${FOUNDRY_URL}/join`);
await page.selectOption('select[name="userid"]', { label: FOUNDRY_USER });
if (process.env.FOUNDRY_PASSWORD) {
   await page.fill('input[name="password"]', process.env.FOUNDRY_PASSWORD);
}
await page.click('button[name="join"]');
await page.waitForURL('**/game');
await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 120_000 });

/** @type {object} Everything the in-world checks measured. */
const result = await page.evaluate(async (conditionIds) => {
   /** @type {string} The module's effects pack, as a UUID prefix. */
   const EFFECTS = 'Compendium.titan-vttrpg-compendium.effects.ActiveEffect';

   /** @type {string[]} The speed keys. */
   const SPEEDS = ['stride', 'swim', 'climb', 'fly', 'burrow'];

   /**
    * Builds the UUID of a module item.
    * @param {string} pack - The pack name.
    * @param {string} id - The item id.
    * @returns {string} The UUID.
    */
   const itemUuid = (pack, id) => `Compendium.titan-vttrpg-compendium.${pack}.Item.${id}`;

   /**
    * Waits up to one second for a condition, polling every 50 ms.
    * @param {Function} predicate - Returns true when the wait is over.
    * @returns {Promise<boolean>} Whether the predicate became true.
    */
   const settle = async (predicate) => {
      const deadline = Date.now() + 1000;
      while (!predicate()) {
         if (Date.now() > deadline) {
            return false;
         }
         await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return true;
   };

   /** @type {object} What the checks measured. */
   const out = {
      immunityHandling: game.settings.get('titan', 'immunityHandling'),
      moduleActive: game.modules.get('titan-vttrpg-compendium')?.active === true,
      missingStatuses: conditionIds.filter((id) => !CONFIG.statusEffects.some((status) => status.id === id)),
   };

   /** @type {Actor} A throwaway actor, deleted at the end. */
   const actor = await Actor.create({
      name: 'Compendium Rulings Check',
      type: 'player',
   });

   /**
    * Whether the actor carries an effect with the status.
    * @param {string} status - The status id.
    * @returns {boolean} True when present.
    */
   const has = (status) => actor.effects.some((effect) => effect.statuses.has(status));

   /**
    * Creates a module effect on the actor.
    * @param {string} id - The compendium effect id.
    * @returns {Promise<ActiveEffect>} The created effect.
    */
   const addEffect = async (id) => {
      const source = await fromUuid(`${EFFECTS}.${id}`);
      const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [source.toObject()]);
      return created;
   };

   /**
    * Reads the actor's derived speeds.
    * @returns {Record<string, number>} The value of each speed.
    */
   const readSpeeds = () => Object.fromEntries(SPEEDS.map((key) => [key, actor.system.speed[key].value]));

   try {
      // Elder Sibling (three effects): a Contaminated the actor already has is removed, a new one is refused, and
      // the condition applies again once the effect is gone.
      out.elderSibling = {};
      for (const [name, id] of [
         ['bodyMind', 'xDxaaDcOA9U2hS8w'],
         ['mindSoul', 'a4T77yGj0BxyvAQg'],
         ['bodySoul', '9bfEQTH9i9GaycNP'],
      ]) {
         await actor.toggleStatusEffect('contaminated', { active: true });
         const before = has('contaminated');
         const granted = await addEffect(id);
         const removed = await settle(() => !has('contaminated'));
         await actor.toggleStatusEffect('contaminated', { active: true });
         const refused = !has('contaminated');
         await granted.delete();
         await actor.toggleStatusEffect('contaminated', { active: true });
         const allowedAfter = has('contaminated');
         await actor.toggleStatusEffect('contaminated', { active: false });
         out.elderSibling[name] = { allowedAfter, before, refused, removed };
      }

      // Blessing of the Arbiter (Sleepless): Sleeping and Unconscious are refused.
      const sleepless = await addEffect('P7roRvBbbTlSXNRT');
      out.sleepless = {};
      for (const status of ['sleeping', 'unconscious']) {
         await actor.toggleStatusEffect(status, { active: true });
         out.sleepless[status] = !has(status);
      }
      await sleepless.delete();

      // Tempest Herald: every condition except Dead is refused; Dead applies.
      const tempest = await addEffect('h1VBWeh2GTO9UAE4');
      out.tempestRefused = {};
      for (const status of conditionIds.filter((id) => id !== 'dead')) {
         await actor.toggleStatusEffect(status, { active: true });
         out.tempestRefused[status] = !has(status);
      }
      await actor.toggleStatusEffect('dead', { active: true });
      out.tempestDead = has('dead');
      await actor.toggleStatusEffect('dead', { active: false });
      await tempest.delete();

      // Speeds: Stride 9, Swim 3, Climb 1, Fly 0, Burrow 0.
      await actor.update({
         'system.speed.burrow.baseValue': 0,
         'system.speed.climb.baseValue': 1,
         'system.speed.fly.baseValue': 0,
         'system.speed.stride.baseValue': 9,
         'system.speed.swim.baseValue': 3,
      });
      out.speedBefore = readSpeeds();

      // Blood Frenzy: +5 on every speed, including the two the actor lacks.
      const frenzy = await addEffect('KoHQ6jmewhn0uGjy');
      await settle(() => actor.system.speed.stride.value === out.speedBefore.stride + 5);
      out.bloodFrenzy = readSpeeds();
      await frenzy.delete();
      await settle(() => actor.system.speed.stride.value === out.speedBefore.stride);

      // Parch: -5 on every speed to a minimum of 1; a speed the actor lacks stays 0.
      const parch = await addEffect('AZWdUeIhXOOdUsBS');
      await settle(() => actor.system.speed.stride.value !== out.speedBefore.stride);
      out.parch = readSpeeds();
      await parch.delete();
      await settle(() => actor.system.speed.stride.value === out.speedBefore.stride);
      out.speedAfterParch = readSpeeds();

      // Four compendium documents the other tasks edited.
      const charm = await fromUuid(itemUuid('spells', 'GSM53DP8by4LsNBm'));
      out.charmAspects = charm.system.customAspect.map((aspect) => ({
         label: aspect.label,
         resistanceCheck: aspect.resistanceCheck,
      }));
      const shockwave = await fromUuid(itemUuid('spells', '2p9kAI0M6RMhiHQ2'));
      out.shockwaveAspects = shockwave.system.aspect.map((aspect) => aspect.label);
      const bloodProbe = await fromUuid(itemUuid('sacred-arts', 'OnlfMxer8ImElwhR'));
      out.bloodProbeChecks = bloodProbe.system.check.map((entry) => entry.label);
      const stormcaller = await fromUuid(itemUuid('sacred-arts', '4095TZGJVMJUv655'));
      out.stormcaller = {
         action: stormcaller.system.action,
         passive: stormcaller.system.passive,
      };
      const metalSpell = await fromUuid(itemUuid('spells', 'Om0Y1sDROHUR2Yjg'));
      out.metalSpellTraits = metalSpell.system.customTrait.map((trait) => trait.name);
      out.urdericNames = Array.from(game.packs.get('titan-vttrpg-compendium.urderic-items').index)
         .map((entry) => entry.name)
         .filter((name) => /Gun\s?shield/i.test(name));
   }
   finally {
      await actor.delete();
   }
   return out;
}, CONDITION_IDS);
await browser.close();
console.log(JSON.stringify(result, null, 3));
console.log(`pageErrors: ${pageErrors.length}`);

assert.equal(result.immunityHandling, 'remove', 'the world keeps Immunity Handling at its default, Remove');
assert.equal(result.moduleActive, true, 'the compendium module is active in the world');
assert.deepEqual(result.missingStatuses, [], 'every condition id has a status effect');
for (const [name, state] of Object.entries(result.elderSibling)) {
   assert.deepEqual(
      state,
      { allowedAfter: true, before: true, refused: true, removed: true },
      `Elder Sibling ${name}: removes and refuses Contaminated, allows it again afterwards`,
   );
}
assert.deepEqual(result.sleepless, { sleeping: true, unconscious: true }, 'Sleepless refuses Sleeping and Unconscious');
assert.deepEqual(
   result.tempestRefused,
   Object.fromEntries(CONDITION_IDS.filter((id) => id !== 'dead').map((id) => [id, true])),
   'Tempest Herald refuses every condition except Dead',
);
assert.equal(result.tempestDead, true, 'Tempest Herald allows Dead');
assert.deepEqual(result.speedBefore, { burrow: 0, climb: 1, fly: 0, stride: 9, swim: 3 }, 'the speeds before the effects');
assert.deepEqual(
   result.bloodFrenzy,
   { burrow: 5, climb: 6, fly: 5, stride: 14, swim: 8 },
   'Blood Frenzy adds 5 to every speed, including the two the actor lacks',
);
assert.deepEqual(
   result.parch,
   { burrow: 0, climb: 1, fly: 0, stride: 4, swim: 1 },
   'Parch takes 5 off every speed to a minimum of 1 and leaves the speeds the actor lacks at 0',
);
assert.deepEqual(result.speedAfterParch, result.speedBefore, 'deleting Parch restores the speeds');
assert.deepEqual(result.charmAspects, [{ label: 'Charm', resistanceCheck: 'willpower' }], 'Charm Creature aspect');
assert.equal(result.shockwaveAspects.includes('radius'), false, 'Shockwave has no radius aspect');
assert.deepEqual(result.bloodProbeChecks, ['Blood Probe'], 'Blood Probe has its check entry');
assert.deepEqual(result.stormcaller, { action: false, passive: true }, 'Stormcaller\'s Tempest is passive');
assert.ok(result.metalSpellTraits.includes('Attunement'), 'the Metal Attunement spell carries Attunement');
assert.deepEqual(result.urdericNames, ['Urderic Gun Shield'], 'the Gun Shield carries its new name');
assert.deepEqual(pageErrors, [], 'no uncaught page errors');
console.log('live-check-rulings ok');
```

1c. Run it and save the log (the exit code is node's own, not a pipe's):

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
FOUNDRY_USER="E2E GM 1" node .work/live-check-rulings.mjs > /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan/.superpowers/sdd/2026-10-09-compendium-rulings/logs/live-check.log 2>&1; echo "exit $?"
```

Expected: `exit 0`, and the log ends `live-check-rulings ok`. Any assertion failure, thrown error, or non-zero exit: stop and
report it to the controller with the log path, and treat it as an implementation defect first. Do not edit the script's
expected values to match a result.

1d. Run the module's strict validation (every pack document constructed with strict validation in the running world,
plus one unsaved actor carrying every item and effect through data preparation):

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/modules/titan-vttrpg-compendium
FOUNDRY_USER="E2E GM 1" npm run validate -- src/packs .work/validated-rulings > /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan/.superpowers/sdd/2026-10-09-compendium-rulings/logs/validate.log 2>&1; echo "exit $?"
```

Expected: `exit 0`; the log's final JSON has `"errors": 0`, `derived.problems` an empty array, no `derived.fatal`, and
`pageErrors` 0. Then `trash .work/validated-rulings` (the validation output is scratch; adopting it is not part of this
plan).

- [ ] **Step 2: Full system verification (Task 7 changed system code)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
graphify update .
npm run eslint
npm run stylelint
npm test
npm run build
npx playwright test --list
```

Expected: ESLint and Stylelint report 0 errors; Vitest's own summary shows every file and test passed (read the
"Test Files" and "Tests" lines, they are the numbers Step 3 records); the build succeeds; the `--list` summary prints
`Total: N tests in 42 files` (record N). Then the full e2e run in the background, reading its counts from the
incremental log (never from a pipe's exit code):

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
npm run test:e2e > .superpowers/sdd/2026-10-09-compendium-rulings/logs/e2e-full.log 2>&1
```

Run it with the Bash tool's `run_in_background`, and read Playwright's own summary lines (`N passed`, `N failed`) from
the log when the run ends. Expected: N passed equals the `--list` total and 0 failed, with Foundry's `test-titan` world
and the E2E users (`E2E GM 1`, `E2E GM 2`, `E2E Player 1`, `E2E Player 2`) as the e2e conventions in the skill describe.
A failure or an unexpected count: stop and report it to the controller with the log path.

- [ ] **Step 3: Documentation (system repo)**

Use the Edit tool for each replacement.

3a. `docs/TODO.md`: delete the whole "Compendium audit rulings" bullet (every sub-bullet is done by this plan, logged
below as a new entry, or recorded in the design spec) and add the entries for what this plan leaves. Replace

```
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
- Operation that adds one stat to another
```

with

```
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
- Operation that adds one stat to another
```

(That is one edit: the old text ends at `- Operation that adds one stat to another` and the new text ends with the same
words, so the following lines are untouched.)

3b. `docs/TODO.md`, the Dying condition entry: replace

```
  lines 1860 and 1919 say Dying starts when Wounds would go above their maximum. The trigger is settled when the
  condition is built.
```

with

```
  lines 1860 and 1919 say Dying starts when Wounds would go above their maximum. The trigger is settled when the
  condition is built. Tempest Herald (R:9251) carries one `immunity` element for each condition id except `dead`
  (user ruling 2026-10-09 for the immunities; the exception for Dead is a controller judgement, inferred: Dying leads to
  Dead, so Dead must stay possible), so when Dying exists the effect needs no element for it; a condition added to
  `src/system/Conditions.js` later is not covered until the effect gains its own element, since the list is written
  by hand. Tempest Herald's "If you start Dying, you are not stunned", Diehard's "you are not Stunned" at zero Stamina,
  and the "no longer Dying" lines of Dark Side and Deathsinger's Rebirth wait for this condition.
```

3c. `docs/TODO.md`, the immunity entries: replace

```
  editor, the derivation, suppression and refusal); only the extension by trait remains deferred.
```

with

```
  editor, the derivation, suppression and refusal); only the extension by trait remains deferred. Compendium texts that
  grant such an immunity (read by hand 2026-10-09): Fire Attunement (damage from heat and flames), Force Attunement
  (being pushed, shoved or moved), Earth Attunement (Shoved), Fox's Cunning (effects that force the truth), Path of the
  Stormcaller (effects based on pain), Control Light (creatures that see in the dark).
```

and replace

```
needs a way to choose the condition; not yet ruled.
```

with

```
needs a way to choose the condition; not yet ruled. Mountain King Style (the effect and the combat-style ability:
"you cannot be knocked Prone unless you choose to be") needs an immunity that can carry a voluntary exception, or a
ruling to convert it to an unconditional Prone immunity; both documents keep their text until then.
```

3d. `docs/POST_WORK_FINDINGS.md`: add three entries before the first one. The file has CRLF line terminators in the
working tree (measured: 391 CRLF; git stores LF), so the old text below is a single line and the inserted lines are LF;
the commit normalizes them. Replace

```
### Foundry v14 core: a token's deletion stores a tombstone only where its base actor holds the id (2026-10-01)
```

with

```
### Flat Modifier minimum: evaluated against the running total, in source order (2026-10-09)

A Flat Modifier with a `minimum` adds, for a negative value, only what keeps the stat's running total (base value plus
every mod applied so far) at or above the minimum, and adds 0 to a total already below it
(`computeFlatModifierContribution`, pinned by `tests/unit/ComputeFlatModifierContribution.test.js` and the order test in
`tests/unit/FlatModifierMinimum.test.js`). The elements apply in the order `_getRulesElementSources` lists the sources, so
a +5 applied after Parch is added on top of its floor and a +5 applied before is reduced first (unit test, run).
Read from `CharacterDataModel.prepareDerivedData`, not measured in a world: `_applyArmorAndShields` runs after
`_applyRulesElements` and lowers a Heavy-armored character's non-zero speeds by 1 (`speed.mod.equipment`), so a speed that
Parch floored at 1 ends at 0 under Heavy armor. The compendium's Parch (key `all`, value -5, minimum 1) therefore floors
at 1 before armor and not after it.

### Tempest Herald's immunities are a hand list of condition ids (2026-10-09)

The compendium effect Tempest Herald carries one `immunity` element for each condition id of
`buildConditionDefinitions` (`src/system/Conditions.js`) except `dead` (11 elements). A condition added to the system
later is not covered until the effect gains its element; no system test or selector enforces the list. The module's
verification script checks the list against the system source at the time of the edit only.

### Compendium edits reach new copies only (2026-10-09)

The compendium corrections (speed and immunity effects, spell aspects, check entries, traits, and Parch's minimum)
change the module's packs. Items and effects already copied into a world, an actor, or an item keep the data they hold; no
migration updates them (project scope: no migrations yet). A copy is refreshed by dropping the corrected compendium
document again.

### Foundry v14 core: a token's deletion stores a tombstone only where its base actor holds the id (2026-10-01)
```

3e. `docs/superpowers/specs/2026-09-27-compendium-rulings-design.md`: append the as-built record. Replace the last line
of the file

```
(`.superpowers/sdd/2026-09-29-conditions-rework/task-17-logs/module-live-check.log`).
```

with

```
(`.superpowers/sdd/2026-09-29-conditions-rework/task-17-logs/module-live-check.log`).

## As built by the compendium rulings plan

The user's rulings of 2026-10-08 and 2026-10-09 narrowed this spec; the plan
(`docs/superpowers/plans/2026-10-09-compendium-rulings.md`) built these parts, and the rulings govern where they differ:

- **Built:** the pack rulings and fixes listed above, except as noted below; C2's per-element `minimum` as an optional
  field on Flat Modifier (`computeFlatModifierContribution`, the editor's Minimum toggle and input), used by Parch (one
  `speed` element with key `all`, value -5, minimum 1); Blood Frenzy's +5 on `speed` `all`; condition immunities for the
  Elder Sibling effects, Blessing of the Arbiter (Sleepless) and Tempest Herald (one element per condition id except
  `dead`); Attunement traits on the Metal Attunement spell and the Aether, Force, Metal and Void Attunement effects
  (ruling 10) and Light on the Light Attunement spell; Empower Soul as a turn-start message; Abyssal Darkness's Stealth
  message as a situational Greater Advantage.
- **Not built, by ruling:** C1 (stat-referenced values: Tough, Jade Perception keep their placeholders, TODO "Operation
  that adds one stat to another"); C3 (weapon-targeted effects: the four weapon effects keep their placeholders, TODO
  "Weapon-targeted effects"); C4 (radius 1: Shockwave drops its radius aspect, TODO "Spell radius"); C2's
  `existingOnly` (Force Speed, Blood Frenzy and the Elder Sibling effects grant speeds the creature lacks).
- **Changed from the table above:** pack ruling 1 (Force Slow) keeps `mulBase` 0.5, which rounds down (ruling of
  2026-10-08: round down unless the text states otherwise); ruling 2's Force Speed keeps its plain +5; ruling 5
  (Shockwave) removes the radius aspect instead of adding radius 1; ruling 9 adds the Willpower aspect as a custom aspect
  with `resistanceCheck` (no standard aspect carries one); the Urderic Glaivegun keeps Strike range 2.
- **Testing:** the `minimum` is pinned by unit tests (`ComputeFlatModifierContribution`, `FlatModifierMinimum`) and the
  editor by `tests/e2e/rules-element-editor.spec.js`. The module's pack content is checked in the test world by
  `.work/live-check-rulings.mjs` (module, git-ignored; log in
  `.superpowers/sdd/2026-10-09-compendium-rulings/logs/live-check.log`, which records the run date): Elder Sibling,
  Sleepless and Tempest Herald refuse their conditions (with Immunity Handling at Remove, an existing Contaminated is
  removed), Blood Frenzy adds 5 to every speed, and Parch takes 5 off to a minimum of 1 and leaves a speed the actor
  lacks at 0. The suite has no spec that reads the module's packs, so this spec's e2e items for Parch and Metal
  Attunement are covered by that check, not by suite specs.
- **Recompile:** the live packs were recompiled from `src/packs` and the module's `validate` ran with 0 errors
  (`.superpowers/sdd/2026-10-09-compendium-rulings/logs/validate.log`).
```

3f. `.claude/skills/titan-codebase/references/conventions.md`: record the counts Step 2 measured. The unit counts recorded
in the file (134 files, 1553 tests) are stale: `npm test` at the system commit `fe533375` printed 147 files and 1687
tests (measured when this plan was written), and Task 7 adds two files with 11 tests; the e2e count recorded (798 tests
in 42 files) matched `npx playwright test --list` at that commit, and Task 7 adds one test. The new text below shows the
counts expected from that; write the numbers Vitest and `--list` print in Step 2 instead where they differ, never
the arithmetic. Replace

```
parallelism. Tests live in `tests/unit/**/*.test.js`: 134 files, 1553 tests (measured: `npm test` → "Test Files  134
passed (134)", "Tests  1553 passed (1553)"). There is NO test code under `src/`. Support files: `tests/setup.js`,
```

with

```
parallelism. Tests live in `tests/unit/**/*.test.js`: 149 files, 1698 tests (measured: `npm test` → "Test Files  149
passed (149)", "Tests  1698 passed (1698)"). There is NO test code under `src/`. Support files: `tests/setup.js`,
```

Replace

```
42 spec files, 798 tests (measured: `npx playwright test --list` → "Total: 798 tests in 42
files").
```

with

```
42 spec files, 799 tests (measured: `npx playwright test --list` → "Total: 799 tests in 42
files").
```

Replace

```
  the immunity editor),
  `item-sheet-rolls.spec.js`
```

with

```
  the immunity editor, the flat modifier minimum toggle),
  `item-sheet-rolls.spec.js`
```

3g. Only if the user declined the recompile at the Step 1 checkpoint (Steps 1a to 1d did not run, and the 3e bullet that
reports the recompile and `validate` is replaced by "The live packs are not yet recompiled; see TODO"): in
`docs/TODO.md`, replace

```
- Operation that adds one stat to another
```

with the entry below:

```
- Recompile the compendium module's live packs from `src/packs` (deferred by the user at the compendium rulings
  plan's Task 9 checkpoint; the commit date is the authorization date): the module's commits of that plan are not in
  the live packs until `npm run packs:compile` runs in the module with Foundry stopped. Then run `.work/live-check-rulings.mjs` and `npm run validate` as `E2E GM 1`
  (the scripts are in the plan, `docs/superpowers/plans/2026-10-09-compendium-rulings.md`, Task 9 Step 1).
- Operation that adds one stat to another
```

- [ ] **Step 4: Commit (system repo, docs and skill only)**

```bash
cd /c/FoundryVTT/V14/dev/foundryuserdata/Data/systems/titan
git branch --show-current
git status --short
git add docs/TODO.md docs/POST_WORK_FINDINGS.md docs/superpowers/specs/2026-09-27-compendium-rulings-design.md \
   .claude/skills/titan-codebase/references/conventions.md
git commit -F - <<'EOF'
docs: compendium rulings close-out - TODO entries, findings, spec as-built, test counts

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SPVZ3AXCPn5Bo41aemiJZc
EOF
```

`git status --short` shows the user's unrelated changes (never stage them); confirm only these four files are staged.
Then report to the controller: the two commit ranges (module Tasks 1-6 and 8; system Tasks 7 and 9), the three logs, and
that the module's release is the user's step. Do not push.

---

## Self-review

**Spec and ruling coverage.** Every sub-bullet of the TODO "Compendium audit rulings" bullet is in the table of
"Rulings, sources, and tasks" with its rules line, its document, and its task (or "none" with the reason): Force Slow
(no change), Blood Frenzy (1), weapon-targeted placeholders (none; logged in Task 9 Step 3a), the eight spell aspects
and Shockwave (2), the four check entries (3), Force Speed and the Elder Sibling speeds (none) and the Elder Sibling,
Sleepless and Tempest Herald immunities (1), Glaivegun (none; logged), Light Attunement, Gun Shield, Stormcaller's Tempest,
Empower Soul, Blue Magister (4), Hunger of Urdokai (none), the stray `type` fields (6), the review of the module for other
condition-immunity text (recorded in the plan; result: nothing further convertible), Parch (7 and 8), Lord of Black Flames
(none), and the stat-adding operation (none; already in the TODO). The design-spec items outside the TODO (Task 5 and
the Attunement traits of Task 4) are marked as spec-only and listed in Open questions 2. Items that cannot be built
with the existing mechanics are under "Not built (needs a mechanic)" and are logged by Task 9 Step 3.

**Placeholder scan.** No "TBD", "similar to", or "add appropriate" text; every module edit is an exact old/new pair
generated from the files at the base commit and proven unique and order-correct, and every system edit is a complete
file or an exact old/new pair checked against the working tree. The only values filled from a run are the test counts
of Task 9 Step 3f, which the step gives with the counts expected from the measured baseline and tells the executor to
replace with the numbers Vitest and `--list` print.

**Type and name consistency.** `computeFlatModifierContribution(total, value, minimum)` is defined in Task 7 Step 4 and
called, with the same argument order, in the engine edit (Task 7 Step 8) and its tests; the element field is `minimum`
(`number | null`, optional) in the helper, the typedef, the engine, the editor, the Parch element (Task 8) and the
verification script; the editor test ids `flat-modifier-minimum-enabled` and `flat-modifier-minimum` are the same in the
Svelte file and the e2e test; the file counts printed by `verify-rulings.mjs` are 6, 15, 19, 29, 32, 65, 66 for groups
1, 2, 3, 4, 5, 6, 8 and the same figures appear in each task and in Task 9.

**Review Focus coverage.** Each of the five items names its pinning test: items 1 and 3 by Task 7's unit tests and
Task 9's in-world Parch check; item 2 by the verification script's Tempest Herald assertion (no system guard exists);
item 4 by Task 9's in-world check, which applies the condition before the effect; item 5 by the script's exact
template comparison of the check entries.

**Checks run while writing this plan** (measured, in git-ignored scratch copies; no repository file was edited):
- The module hunks of Tasks 1-6 and 8 were applied in order to fresh clones of the module at the base commit, and
  `verify-rulings.mjs` printed `ok` after each group with the counts above (the group 8 run used a copy of the script
  with the two system-source assertions removed, because Task 7 is not in the system source yet; the real script fails
  on those assertions without Task 7, as shown by a run).
- Task 7's two unit test files, the helper, and the engine edit were applied to a scratch copy of the system sources:
  the engine-less run failed as Step 7 says, the run with the engine edit printed 11 tests passed, the full unit suite of
  the copy passed apart from three files that read repository fixtures the copy lacks (`EffectPackSource`,
  `e2e-users`, one `Xlsx` fixture test), ESLint printed nothing for the new JavaScript and the edited e2e spec, and the
  Svelte file compiled with 0 warnings (its SCSS block was not compiled). The editor e2e test, the in-world script, and
  the recompile were not run: they need the live world.
