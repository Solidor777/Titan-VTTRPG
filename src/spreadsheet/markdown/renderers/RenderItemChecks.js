import { escapeText, statLine } from '~/spreadsheet/markdown/MarkdownText.js';

/**
 * Renders an item's `system.check` array (`ItemCheckTemplate.js` entries) as stat lines: each entry
 * becomes `**<label>:** <Attribute> (<Skill>) D:C`, followed by `, <N> Resolve` when a Resolve cost
 * is set, `, Damage v` / `, Healing v` (with ` \+ ES` appended when the value scales) when the check
 * inflicts damage or applies healing, and `, resisted by <Resistance>` when a Resistance Check
 * opposes it.
 * @param {object[]} checks - The item's `system.check` array.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {string[]} One rendered stat line per check, in stored order.
 */
export function renderItemCheckLines(checks, labels) {
   return (checks ?? []).map((check) => {
      /** @type {string[]} The comma-separated segments of this check's value text. */
      const segments = [
         `${labels(check.attribute)} (${labels(check.skill)}) ${check.difficulty}:${check.complexity}`,
      ];

      if (check.resolveCost > 0) {
         segments.push(`${check.resolveCost} ${labels('resolve', 'Resolve')}`);
      }

      if (check.isDamage || check.isHealing) {
         /** @type {string} The localized "Damage" or "Healing" label, per the check's flag. */
         const kindLabel = check.isDamage ? labels('damage', 'Damage') : labels('healing', 'Healing');
         /** @type {string} The value segment, with the scaling suffix appended when applicable. */
         let valueSegment = `${kindLabel} ${check.initialValue}`;
         if (check.scaling) {
            valueSegment += ` \\+ ${labels('extraSuccesses.short', 'ES')}`;
         }

         segments.push(valueSegment);
      }

      if (check.resistanceCheck && check.resistanceCheck !== 'none') {
         segments.push(`${labels('resistedBy', 'resisted by')} ${labels(check.resistanceCheck)}`);
      }

      // check.label is free-form, GM-authored text, unlike the localized attribute/skill/resistance labels.
      return statLine(escapeText(check.label), segments.join(', '));
   });
}
