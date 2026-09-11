import { heading, statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { htmlToMarkdown } from '~/spreadsheet/markdown/HtmlToMarkdown.js';

/**
 * @typedef {object} AttackSection
 * @property {string} headingText - The attack heading's text (e.g. `Strike (Melee)`).
 * @property {string} slug - The attack heading's anchor slug.
 * @property {string[]} statLines - The attack's own rendered stat lines.
 */

/**
 * Renders the stat lines every item type shares: `**Rarity:**` when the rarity is not `common`, and
 * `**Value:**` when the value is greater than zero.
 * @param {{rarity: string, value: number}} system - The item's `system` data.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {string[]} The common stat lines, in rendering order.
 */
export function commonStatLines(system, labels) {
   /** @type {string[]} The accumulated common stat lines. */
   const lines = [];

   if (system.rarity !== 'common') {
      lines.push(statLine(labels('rarity', 'Rarity'), labels(system.rarity)));
   }

   if (system.value > 0) {
      lines.push(statLine(labels('value', 'Value'), system.value));
   }

   return lines;
}

/**
 * Assembles an item's rendered Markdown block per the compendium's item block format: an H4 heading,
 * a blank line, the item's stat lines followed by a `---` separator (or, when one or more attack
 * sections are supplied, the item's own stat lines with no separator, a blank line, then each attack
 * as its own H5 section, only the last of which is followed by `---`), a blank line, the description
 * (converted from HTML, its last line gaining a trailing hard-break before the closing `---`), and a
 * closing `---`. `extraDescriptionHtml` (a weapon's `attackNotes`) renders as an additional
 * paragraph group after the description, under the same closing `---`, when non-blank.
 * @param {object} args - The block's content.
 * @param {string} args.headingText - The item's name (escaped via {@link heading}).
 * @param {string} args.slug - The item heading's anchor slug.
 * @param {string[]} args.statLines - The item's own rendered stat lines.
 * @param {string} [args.descriptionHtml] - The item's `system.description` HTML.
 * @param {string} [args.extraDescriptionHtml] - Additional HTML rendered after the description.
 * @param {AttackSection[]} [args.attackSections] - Per-attack sections, for a multi-attack weapon.
 * @returns {string} The rendered item block, with no trailing blank line.
 */
export function renderItemBlock({
   headingText,
   slug,
   statLines,
   descriptionHtml,
   extraDescriptionHtml,
   attackSections = [],
}) {
   /** @type {string[]} The block's lines, joined with `\n` at the end. */
   const lines = [heading(4, headingText, slug), ''];

   if (attackSections.length > 0) {
      if (statLines.length > 0) {
         lines.push(...statLines, '');
      }

      attackSections.forEach((section, index) => {
         lines.push(heading(5, section.headingText, section.slug), '', ...section.statLines);
         lines.push(index === attackSections.length - 1 ? '---' : '');
      });
   }
   else {
      lines.push(...statLines, '---');
   }

   lines.push('');

   /** @type {string[]} The description and extra-description Markdown, as separate content blocks. */
   const contentBlocks = [htmlToMarkdown(descriptionHtml)];
   /** @type {string} The extra-description (e.g. `attackNotes`) Markdown. */
   const extraContent = htmlToMarkdown(extraDescriptionHtml);
   if (extraContent !== '') {
      contentBlocks.push(extraContent);
   }

   /** @type {string} The description and extra-description content, blank-line separated. */
   const content = contentBlocks.filter((block) => block !== '').join('\n\n');

   if (content === '') {
      lines.push('---');
   }
   else {
      /** @type {string[]} The content's lines; the last gains a trailing hard-break before `---`. */
      const contentLines = content.split('\n');
      contentLines[contentLines.length - 1] += '  ';
      lines.push(...contentLines, '---');
   }

   return lines.join('\n');
}
