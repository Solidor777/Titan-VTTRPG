import { statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';
import { renderTraitList } from './RenderTraits.js';
import { renderItemCheckLines } from './RenderItemChecks.js';

/**
 * The default attribute/skill pair for each attack type, per the spec's "differs from the type
 * default" rule: an attack whose own attribute/skill matches its type's default omits the Check line.
 * @type {Object<string, {attribute: string, skill: string}>}
 */
const DEFAULT_ATTACK_CHECK = {
   melee: {
      attribute: 'body',
      skill: 'meleeWeapons',
   },
   ranged: {
      attribute: 'body',
      skill: 'rangedWeapons',
   },
};

/**
 * Renders a single Weapon Attack's own stat lines: Damage (with the Extra Successes suffix when
 * `plusExtraSuccessDamage`), Range (when greater than 1 space), Check (when the attribute/skill pair
 * differs from its type's default), and Traits (standard then custom, comma-separated).
 * @param {import('~/document/types/item/types/weapon/WeaponAttack.js').WeaponAttack} attack - The attack.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {string[]} The attack's rendered stat lines.
 */
function renderAttackStatLines(attack, labels) {
   /** @type {string[]} The accumulated attack stat lines. */
   const lines = [];

   /** @type {string} The rendered damage value, with the Extra Successes suffix when applicable. */
   const damageText = attack.plusExtraSuccessDamage
      ? `${attack.damage} \\+ ${labels('extraSuccesses.short', 'ES')}`
      : `${attack.damage}`;
   lines.push(statLine(labels('damage', 'Damage'), damageText));

   if (attack.range > 1) {
      lines.push(statLine(labels('range', 'Range'), `${attack.range} ${labels('spaces', 'spaces')}`));
   }

   /** @type {{attribute: string, skill: string}|undefined} This attack type's default check pair. */
   const defaultCheck = DEFAULT_ATTACK_CHECK[attack.type];
   if (!defaultCheck || attack.attribute !== defaultCheck.attribute || attack.skill !== defaultCheck.skill) {
      lines.push(statLine(labels('check', 'Check'), `${labels(attack.attribute)} (${labels(attack.skill)})`));
   }

   /** @type {string} This attack's rendered trait list. */
   const traitsText = renderTraitList(attack.trait, attack.customTrait, labels);
   if (traitsText !== '') {
      lines.push(statLine(labels('traits', 'Traits'), traitsText));
   }

   return lines;
}

/**
 * Renders a Weapon document as its full Markdown item block.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The weapon.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderWeapon(document, { labels, slugFor }) {
   /** @type {object} The weapon's `system` data. */
   const system = document.system;
   /**
    * @type {string[]} The item's own stat lines: common, weapon-level traits, then either a single
    *    attack's lines followed by item checks, or (for more than one attack) item checks alone —
    *    the attack lines move into `attackSections` instead.
    */
   const statLines = [...commonStatLines(system, labels)];

   /** @type {string} The weapon-level standard trait list (e.g. Two-Handed). */
   const weaponTraitsText = renderTraitList(system.trait, [], labels);
   if (weaponTraitsText !== '') {
      statLines.push(statLine(labels('traits', 'Traits'), weaponTraitsText));
   }

   /** @type {object[]} The weapon's attacks. */
   const attacks = system.attack ?? [];
   /** @type {import('./RenderItemBlock.js').AttackSection[]} The multi-attack H5 sections, if any. */
   const attackSections = [];

   if (attacks.length > 1) {
      for (const attack of attacks) {
         /** @type {string} This attack's heading text (e.g. `Strike (Melee)`). */
         const attackHeadingText = `${attack.label} (${labels(attack.type)})`;
         attackSections.push({
            headingText: attackHeadingText,
            slug: slugFor(attackHeadingText),
            statLines: renderAttackStatLines(attack, labels),
         });
      }

      // A multi-attack weapon's item checks belong to the weapon's own stat block (after the
      // weapon-level Traits, before the attack sections), not the last attack.
      statLines.push(...renderItemCheckLines(system.check, labels));
   }
   else {
      if (attacks.length === 1) {
         statLines.push(...renderAttackStatLines(attacks[0], labels));
      }

      // A single-attack weapon keeps the spec order: attack lines, then item checks.
      statLines.push(...renderItemCheckLines(system.check, labels));
   }

   return renderItemBlock({
      headingText: document.name,
      slug: slugFor(document.name),
      statLines,
      descriptionHtml: system.description,
      extraDescriptionHtml: system.attackNotes,
      attackSections,
   });
}
