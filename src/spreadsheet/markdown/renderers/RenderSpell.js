import calculateSpellAspectCosts from '~/document/types/item/types/spell/CalculateSpellAspectCosts.js';
import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
import { escapeText, statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';

/**
 * Renders a `range` aspect's value: `Self`, `Touch`, or `N spaces`.
 * @param {string|number} initialValue - The aspect's `initialValue` (`'self'`, `'touch'`, or a number).
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {string} The rendered Range value.
 */
function formatRangeValue(initialValue, labels) {
   if (initialValue === 'self') {
      return labels('self', 'Self');
   }
   if (initialValue === 'touch') {
      return labels('touch', 'Touch');
   }
   return `${initialValue} ${labels('spaces', 'spaces')}`;
}

/**
 * Renders one scaling aspect's `Enhancements` entry, e.g. `Damage (1 \+ ES)` or
 * `Fly Speed (5 \+ ES / 2)`, mirroring `SpellAspectTag.svelte`'s display rule.
 * @param {{unit: (string|undefined), label: string, initialValue: (number|undefined)}} aspect - The
 * aspect (standard or custom).
 * @param {number} cost - The aspect's computed cost (its own `cost` for a custom aspect).
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @param {boolean} [isCustom] - Whether `aspect` is a custom aspect, whose label renders as written
 * rather than through the label resolver.
 * @returns {string} The rendered `Name (v \+ ES)` or `Name (v \+ ES / cost)` entry.
 */
function formatEnhancement(aspect, cost, labels, isCustom = false) {
   /** @type {string} The enhancement's display name: the unit when present, else the label. */
   const name = isCustom ? escapeText(aspect.label) : labels(aspect.unit ?? aspect.label);

   /** @type {string} The initial-value prefix, omitted (with its space) when 0/blank. */
   const valuePrefix = aspect.initialValue ? `${aspect.initialValue} ` : '';

   /** @type {string} The `/ cost` suffix, appended only when the computed cost is greater than 1. */
   const costSuffix = cost > 1 ? ` / ${cost}` : '';

   return `${name} (${valuePrefix}\\+ ${labels('extraSuccesses.short', 'ES')}${costSuffix})`;
}

/**
 * Renders a non-scaling, non-range/radius standard aspect's stat line, e.g.
 * `**Inflict Conditions:** Stunned, resisted by Resilience`.
 * @param {object} aspect - The standard aspect entry.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {string} The rendered stat line.
 */
function formatOtherAspectLine(aspect, labels) {
   /** @type {string} The aspect's option text: `All` for `allOptions`, else the selected options. */
   let valueText = aspect.allOptions
      ? labels('all', 'All')
      : (aspect.option ?? []).map((option) => labels(option)).join(', ');

   if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
      valueText += `, ${labels('resistedBy', 'resisted by')} ${labels(aspect.resistanceCheck)}`;
   }

   return statLine(labels(aspect.label), valueText);
}

/**
 * Renders a Spell document as its full Markdown item block: the unlabeled bold casting-check line,
 * Rarity, XP Cost, then the enabled standard aspects (in `SpellAspects` sortOrder) followed by the
 * custom aspects (in stored order) — Range and Area as their own lines, every scaling aspect
 * collected into one `Enhancements` line, every other enabled aspect as its own line — and finally
 * Traits (tradition first, then custom traits).
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The spell.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderSpell(document, { labels, slugFor }) {
   /** @type {object} The spell's `system` data. */
   const system = document.system;
   /** @type {object} The spell's `castingCheck` data. */
   const castingCheck = system.castingCheck ?? {};
   /** @type {import('~/document/types/item/types/spell/CalculateSpellAspectCosts.js').SpellAspectCostResult} */
   const costResult = calculateSpellAspectCosts(system.aspect ?? [], system.customAspect ?? []);

   /** @type {number} The rendered casting difficulty: recomputed when auto-calculated, else stored. */
   const difficulty = castingCheck.autoCalculateDC ? costResult.difficulty : castingCheck.difficulty;
   /** @type {number} The rendered casting complexity: recomputed when auto-calculated, else stored. */
   const complexity = castingCheck.autoCalculateDC ? costResult.complexity : castingCheck.complexity;

   /** @type {string[]} The spell's rendered stat lines. */
   const statLines = [
      `**${labels(castingCheck.attribute)} (${labels(castingCheck.skill)}) ${difficulty}:${complexity}**  `,
      ...commonStatLines(system, labels),
      statLine(labels('xpCost', 'XP Cost'), system.xpCost),
   ];

   /**
    * @type {{aspect: object, cost: number}[]} The enabled standard aspects, sorted by `SpellAspects`
    *    sortOrder, paired with their computed cost.
    */
   const enabledStandardAspects = (system.aspect ?? [])
      .map((aspect, idx) => ({
         aspect,
         enabled: costResult.enabled[idx],
         cost: costResult.aspectCosts[idx],
      }))
      .filter((entry) => entry.enabled)
      .sort((a, b) => SpellAspects[a.aspect.label].sortOrder - SpellAspects[b.aspect.label].sortOrder);

   /** @type {string|undefined} The rendered Range stat line, if the spell has a `range` aspect. */
   let rangeLine;
   /** @type {string|undefined} The rendered Area stat line, if the spell has a `radius` aspect. */
   let areaLine;
   /** @type {string[]} The accumulated `Enhancements` entries, in aspect order. */
   const enhancementParts = [];
   /** @type {string[]} Every other enabled aspect's own stat line, in aspect order. */
   const otherLines = [];

   for (const { aspect, cost } of enabledStandardAspects) {
      if (aspect.label === 'range') {
         rangeLine = statLine(labels('range', 'Range'), formatRangeValue(aspect.initialValue, labels));
      }
      else if (aspect.label === 'radius') {
         areaLine = statLine(
            labels('area', 'Area'),
            `${aspect.initialValue}-${labels('spaceRadius', 'space-radius')}`,
         );
      }
      else if (SpellAspects[aspect.label].template.scaling) {
         enhancementParts.push(formatEnhancement(aspect, cost, labels));
      }
      else {
         otherLines.push(formatOtherAspectLine(aspect, labels));
      }
   }

   for (const customAspect of system.customAspect ?? []) {
      if (customAspect.scaling) {
         enhancementParts.push(formatEnhancement(customAspect, customAspect.cost, labels, true));
      }
      else {
         // customAspect.label is free-form, GM-authored text, unlike the localized standard-aspect labels.
         otherLines.push(statLine(escapeText(customAspect.label), customAspect.initialValue));
      }
   }

   if (rangeLine !== undefined) {
      statLines.push(rangeLine);
   }
   if (areaLine !== undefined) {
      statLines.push(areaLine);
   }
   if (enhancementParts.length > 0) {
      // Google-Docs-export quirk: the LAST entry's closing paren is escaped only when it directly
      // follows a whitespace-preceded all-digit token, e.g. `Fly Speed (5 \+ ES / 2\)`, but
      // `Dexterity (1 \+ ES)` and mid-line `/ 2), Body` stay unescaped. Confirmed against 24/24
      // compendium samples (e.g. compendium lines 4647, 5593, 6091).
      const enhancementsValue = enhancementParts.join(', ').replace(/(\s\d+)\)$/, '$1\\)');
      statLines.push(statLine(labels('enhancements', 'Enhancements'), enhancementsValue));
   }
   statLines.push(...otherLines);

   /** @type {string[]} The Traits line's parts: the tradition (as written) first, then custom traits. */
   const traitParts = [];
   if (system.tradition) {
      // system.tradition and customTrait.name are free-form, GM-authored text.
      traitParts.push(escapeText(system.tradition));
   }
   for (const customTrait of system.customTrait ?? []) {
      traitParts.push(escapeText(customTrait.name));
   }
   if (traitParts.length > 0) {
      statLines.push(statLine(labels('traits', 'Traits'), traitParts.join(', ')));
   }

   return renderItemBlock({
      headingText: document.name,
      slug: slugFor(document.name),
      statLines,
      descriptionHtml: system.description,
   });
}
