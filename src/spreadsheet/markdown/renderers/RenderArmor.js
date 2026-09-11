import { statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';
import { renderTraitList } from './RenderTraits.js';
import { renderItemCheckLines } from './RenderItemChecks.js';

/**
 * Renders an Armor document as its full Markdown item block: Rarity, Value, Armor rating, Traits
 * (standard then custom), then item checks.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The armor.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderArmor(document, { labels, slugFor }) {
   /** @type {object} The armor's `system` data. */
   const system = document.system;
   /** @type {string[]} The armor's rendered stat lines. */
   const statLines = [...commonStatLines(system, labels)];

   statLines.push(statLine(labels('armor', 'Armor'), system.armor.max));

   /** @type {string} The armor's rendered trait list (standard then custom). */
   const traitsText = renderTraitList(system.trait, system.customTrait, labels);
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
