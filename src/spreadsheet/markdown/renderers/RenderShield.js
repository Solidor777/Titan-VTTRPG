import { escapeText, statLine } from '~/spreadsheet/markdown/MarkdownText.js';
import { commonStatLines, renderItemBlock } from './RenderItemBlock.js';
import { renderTraitList } from './RenderTraits.js';
import { renderItemCheckLines } from './RenderItemChecks.js';

/**
 * Renders a Shield document as its full Markdown item block: Rarity, Value, Defense Bonus (signed,
 * omitted when zero), Traits (standard then custom), then item checks.
 * @param {import('~/spreadsheet/markdown/WorkbookToDocuments.js').RenderableDocument} document - The shield.
 * @param {{labels: function(string, string=): string, slugFor: function(string): string}} context - The
 * render context.
 * @returns {string} The rendered item block.
 */
export function renderShield(document, { labels, slugFor }) {
   /** @type {object} The shield's `system` data. */
   const system = document.system;
   /** @type {string[]} The shield's rendered stat lines. */
   const statLines = [...commonStatLines(system, labels)];

   if (system.defense !== 0) {
      /** @type {string} The defense bonus, signed (e.g. `+2` or `-2`), escaped via {@link escapeText}. */
      const signedDefense = escapeText(system.defense > 0 ? `+${system.defense}` : `${system.defense}`);
      statLines.push(statLine(labels('defenseBonus', 'Defense Bonus'), signedDefense));
   }

   /** @type {string} The shield's rendered trait list (standard then custom). */
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
