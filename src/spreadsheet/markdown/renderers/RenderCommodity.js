import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';

/**
 * Renders a Commodity document as its full Markdown item block: Rarity and Value only. The
 * `quantity` field is per-instance (how many the actor holds), not a property of the item itself,
 * and is never rendered.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The
 * commodity.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderCommodity(document, { labels, slugFor }) {
   /** @type {object} The commodity's `system` data. */
   const system = document.system;

   return renderItemBlock({
      headingText: document.name,
      slug: slugFor(document.name),
      statLines: commonStatLines(system, labels),
      descriptionHtml: system.description,
   });
}
