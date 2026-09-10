import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import defaultAttributeArcana from '~/helpers/Settings/DefaultAttributeArcana.js';
import defaultAttributeAthletics from '~/helpers/Settings/DefaultAttributeAthletics.js';
import defaultAttributeDeception from '~/helpers/Settings/DefaultAttributeDeception.js';
import defaultAttributeDexterity from '~/helpers/Settings/DefaultAttributeDexterity.js';
import defaultAttributeDiplomacy from '~/helpers/Settings/DefaultAttributeDiplomacy.js';
import defaultAttributeEngineering from '~/helpers/Settings/DefaultAttributeEngineering.js';
import defaultAttributeIntimidation from '~/helpers/Settings/DefaultAttributeIntimidation.js';
import defaultAttributeInvestigation from '~/helpers/Settings/DefaultAttributeInvestigation.js';
import defaultAttributeLore from '~/helpers/Settings/DefaultAttributeLore.js';
import defaultAttributeMedicine from '~/helpers/Settings/DefaultAttributeMedicine.js';
import defaultAttributeMeleeWeapons from '~/helpers/Settings/DefaultAttributeMeleeWeapons.js';
import defaultAttributeMetaphysics from '~/helpers/Settings/DefaultAttributeMetaphysics.js';
import defaultAttributeNature from '~/helpers/Settings/DefaultAttributeNature.js';
import defaultAttributePerception from '~/helpers/Settings/DefaultAttributePerception.js';
import defaultAttributePerformance from '~/helpers/Settings/DefaultAttributePerformance.js';
import defaultAttributeRangedWeapons from '~/helpers/Settings/DefaultAttributeRangedWeapons.js';
import defaultAttributeStealth from '~/helpers/Settings/DefaultAttributeStealth.js';
import defaultAttributeSubterfuge from '~/helpers/Settings/DefaultAttributeSubterfuge.js';
import resolveBaseMultiplier from '~/helpers/Settings/ResolveBaseMultiplier.js';
import staminaBaseMultiplier from '~/helpers/Settings/StaminaBaseMultiplier.js';

/**
 * Creates the shape of a Character stat mod bag, shared by every base and derived stat. Mirrors
 * `createStatModField()`: a single integer `static` sub-field, initial 0.
 * @returns {object} The stat mod bag shape.
 */
function createStatModShape() {
   return {
      static: 0,
   };
}

/**
 * Creates the shape of a Character base stat (Attributes, Speeds), carrying its own base value plus a
 * mod bag. Mirrors `createBaseStatField()`.
 * @param {number} [initial] - The initial value of the base stat's baseValue sub-field.
 * @returns {object} The base stat shape.
 */
export function createBaseStatShape(initial = 0) {
   return {
      baseValue: initial,
      mod: createStatModShape(),
   };
}

/**
 * Creates the shape of a Character derived stat (Resistances, Ratings, Mods), carrying only a mod bag
 * (its base value is computed in `prepareDerivedData`, not persisted). Mirrors `createDerivedStatField()`.
 * @returns {object} The derived stat shape.
 */
export function createDerivedStatShape() {
   return {
      mod: createStatModShape(),
   };
}

/**
 * Creates the shape of a Character Skill (Athletics, Perception, etc.), carrying its default Attribute
 * plus training/expertise base stats. Mirrors `createSkillSchema()`.
 * @param {string} defaultAttribute - Default Attribute to be used when rolling the Skill.
 * @returns {object} The Skill shape.
 */
export function createSkillShape(defaultAttribute) {
   return {
      defaultAttribute,
      training: createBaseStatShape(),
      expertise: createBaseStatShape(),
   };
}

/**
 * Creates the shape of a Character Resource (Stamina, Resolve, or Wounds), carrying its persisted value
 * plus a mod bag (its derived `max` is computed in `prepareDerivedData`, not persisted). Mirrors
 * `createResourceSchema()`.
 * @param {number} initial - The initial value of the resource's value sub-field.
 * @returns {object} The Resource shape.
 */
export function createResourceShape(initial) {
   return {
      value: initial,
      mod: createStatModShape(),
   };
}

/**
 * Creates the canonical plain-object shape of a Character's `system` data, mirroring the fields
 * `CharacterDataModel._defineDocumentSchema()` declares directly (shared by every Character subtype:
 * Player, NPC). Built from representative values whose runtime types drive the schema produced by
 * `buildSchemaFromShape`. `equipped.armor` / `equipped.shield` are pre-built nullable `StringField`s
 * (via the `buildSchemaFromShape` DataField pass-through) rather than plain values, because a `null`
 * shape value would build a nullable `ObjectField`, which rejects the string item ids this system stores.
 * @returns {object} The Character `system` shape template.
 */
export default function createCharacterSystemTemplate() {
   return {
      // Attributes: Body, Mind, and Soul, each starting at 1.
      attribute: {
         body: createBaseStatShape(1),
         mind: createBaseStatShape(1),
         soul: createBaseStatShape(1),
      },

      // Resistances: derived stats computed from attributes in prepareDerivedData.
      resistance: {
         reflexes: createDerivedStatShape(),
         resilience: createDerivedStatShape(),
         willpower: createDerivedStatShape(),
      },

      // Skills: each carries its default Attribute (read from settings) and training/expertise.
      skill: {
         arcana: createSkillShape(defaultAttributeArcana()),
         athletics: createSkillShape(defaultAttributeAthletics()),
         deception: createSkillShape(defaultAttributeDeception()),
         dexterity: createSkillShape(defaultAttributeDexterity()),
         diplomacy: createSkillShape(defaultAttributeDiplomacy()),
         engineering: createSkillShape(defaultAttributeEngineering()),
         intimidation: createSkillShape(defaultAttributeIntimidation()),
         investigation: createSkillShape(defaultAttributeInvestigation()),
         lore: createSkillShape(defaultAttributeLore()),
         medicine: createSkillShape(defaultAttributeMedicine()),
         meleeWeapons: createSkillShape(defaultAttributeMeleeWeapons()),
         metaphysics: createSkillShape(defaultAttributeMetaphysics()),
         nature: createSkillShape(defaultAttributeNature()),
         perception: createSkillShape(defaultAttributePerception()),
         performance: createSkillShape(defaultAttributePerformance()),
         rangedWeapons: createSkillShape(defaultAttributeRangedWeapons()),
         subterfuge: createSkillShape(defaultAttributeSubterfuge()),
         stealth: createSkillShape(defaultAttributeStealth()),
      },

      // Ratings: derived stats computed from attributes and skills in prepareDerivedData.
      rating: {
         awareness: createDerivedStatShape(),
         defense: createDerivedStatShape(),
         melee: createDerivedStatShape(),
         accuracy: createDerivedStatShape(),
         initiative: createDerivedStatShape(),
      },

      // Resources: Stamina and Resolve initials scale from their base-multiplier settings; Wounds
      // starts at 0. Each resource's derived `max` is computed in prepareDerivedData.
      resource: {
         stamina: createResourceShape(Math.ceil(3 * staminaBaseMultiplier())),
         resolve: createResourceShape(Math.ceil(1 * resolveBaseMultiplier())),
         wounds: createResourceShape(0),
      },

      // Speeds: Stride starts at 5; all other movement types start at 0.
      speed: {
         stride: createBaseStatShape(5),
         fly: createBaseStatShape(),
         climb: createBaseStatShape(),
         swim: createBaseStatShape(),
         burrow: createBaseStatShape(),
      },

      // Mods: derived stats computed from equipment and rules elements in prepareDerivedData.
      mod: {
         armor: createDerivedStatShape(),
         damage: createDerivedStatShape(),
         healing: createDerivedStatShape(),
         resolveRegain: createDerivedStatShape(),
         woundRegain: createDerivedStatShape(),
      },

      // Equipped item ids: nullable StringFields (pass-through), since a shape value cannot express a
      // nullable string field for plain values that default to null.
      equipped: {
         armor: createStringField(null),
         shield: createStringField(null),
      },

      // Bio: free-text description of the Character.
      bio: {
         description: '',
      },
   };
}
