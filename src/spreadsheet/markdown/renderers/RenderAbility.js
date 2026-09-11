import { statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';
import { renderTraitList } from './RenderTraits.js';
import { renderItemCheckLines } from './RenderItemChecks.js';

/**
 * Renders an Ability document as its full Markdown item block: Rarity, XP Cost (always shown),
 * Type flags (Action, Reaction, Passive — those that are true, in that order), Traits (custom only),
 * then item checks.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The ability.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderAbility(document, { labels, slugFor }) {
   /** @type {object} The ability's `system` data. */
   const system = document.system;
   /** @type {string[]} The ability's rendered stat lines. */
   const statLines = [...commonStatLines(system, labels)];

   statLines.push(statLine(labels('xpCost', 'XP Cost'), system.xpCost));

   /** @type {string[]} The enabled Action/Reaction/Passive flag labels, in that fixed order. */
   const typeFlags = [];
   if (system.action) {
      typeFlags.push(labels('action', 'Action'));
   }
   if (system.reaction) {
      typeFlags.push(labels('reaction', 'Reaction'));
   }
   if (system.passive) {
      typeFlags.push(labels('passive', 'Passive'));
   }
   if (typeFlags.length > 0) {
      statLines.push(statLine(labels('type', 'Type'), typeFlags.join(', ')));
   }

   /** @type {string} The ability's rendered trait list (custom traits only). */
   const traitsText = renderTraitList([], system.customTrait, labels);
   if (traitsText !== '') {
      statLines.push(statLine(labels('traits', 'Traits'), traitsText));
   }

   statLines.push(...renderItemCheckLines(system.check, labels));

   return renderItemBlock({
      headingText: document.name,
      slug: slugFor(document.name),
      statLines,
      descriptionHtml: system.description,
   });
}
