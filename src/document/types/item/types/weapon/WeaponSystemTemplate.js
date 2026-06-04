import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';
import createRulesElementTemplate from '~/document/types/item/rules-element/RulesElementTemplate.js';
import createWeaponAttackTemplate from '~/document/types/item/types/weapon/WeaponAttack.js';

/**
 * Creates the canonical plain-object shape of a Weapon's `system` data, mirroring
 * `WeaponDataModel._defineDocumentSchema()`. Built by spreading the shared base and rules-element
 * fragments, then adding the weapon-specific fields with representative values whose runtime types
 * drive the schema produced by `buildSchemaFromShape` (string -> StringField, number -> NumberField,
 * boolean -> BooleanField, array -> ArrayField of the element shape). The `attack` array carries one
 * representative element so its element schema mirrors a real weapon attack; `trait` is empty so it
 * maps to an `ArrayField(ObjectField)`, matching the data model's untyped trait storage.
 * @returns {object} The Weapon `system` shape template.
 */
export default function createWeaponSystemTemplate() {
   return {
      ...createItemSystemTemplate(),
      ...createRulesElementTemplate(),

      // Rarity tier of the weapon.
      rarity: 'common',

      // Monetary value of the weapon.
      value: 0,

      // Whether the weapon is currently equipped.
      equipped: false,

      // Attacks: one representative element so the element schema mirrors a real weapon attack.
      attack: [
         createWeaponAttackTemplate(),
      ],

      // Free-text notes describing the weapon's attacks.
      attackNotes: '',

      // Standard weapon traits, stored as untyped object bags (empty -> ArrayField(ObjectField)).
      trait: [],
   };
}
