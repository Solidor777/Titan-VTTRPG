import { statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';
import { renderTraitList } from './RenderTraits.js';
import { renderItemCheckLines } from './RenderItemChecks.js';

/**
 * Renders an Equipment document as its full Markdown item block: Rarity, Value, Traits (custom
 * only -- equipment carries no standard trait list), then item checks.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The
 * equipment item.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderEquipment(document, { labels, slugFor }) {
   /** @type {object} The equipment's `system` data. */
   const system = document.system;
   /** @type {string[]} The equipment's rendered stat lines. */
   const statLines = [...commonStatLines(system, labels)];

   /** @type {string} The equipment's rendered custom trait list. */
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
