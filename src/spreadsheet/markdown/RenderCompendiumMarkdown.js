import { buildCompendiumTree } from '~/spreadsheet/markdown/CompendiumTree.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { escapeText, heading } from '~/spreadsheet/markdown/MarkdownText.js';
import { renderWeapon } from '~/spreadsheet/markdown/renderers/RenderWeapon.js';
import { renderArmor } from '~/spreadsheet/markdown/renderers/RenderArmor.js';
import { renderShield } from '~/spreadsheet/markdown/renderers/RenderShield.js';
import { renderEquipment } from '~/spreadsheet/markdown/renderers/RenderEquipment.js';
import { renderCommodity } from '~/spreadsheet/markdown/renderers/RenderCommodity.js';
import { renderAbility } from '~/spreadsheet/markdown/renderers/RenderAbility.js';
import { renderSpell } from '~/spreadsheet/markdown/renderers/RenderSpell.js';

/**
 * @typedef {object} TocEntry
 * @property {string} text - The heading's escaped display text (as used in the rendered heading).
 * @property {string} slug - The heading's anchor slug.
 */

/** @type {Object<string, function(object, {labels: Function, slugFor: Function}): string>} Type -> renderer. */
const RENDERERS = {
   weapon: renderWeapon,
   armor: renderArmor,
   shield: renderShield,
   equipment: renderEquipment,
   commodity: renderCommodity,
   ability: renderAbility,
   spell: renderSpell,
};

/**
 * Renders one document to its item block, capturing every slug it requests (its own heading, then any
 * attack headings) so the table of contents can list them in the same order the file's slugger
 * assigned them. A renderer's own heading slug is identified by the captured call whose text matches
 * the document's name; every other captured call is a lower-level heading (a weapon attack, H5).
 * @param {import('./WorkbookToDocuments.js').RenderableDocument} document - The document to render.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @param {function(string): string} slugFor - The file's shared slugger.
 * @returns {{block: string, entries: TocEntry[]}} The rendered block and its table-of-contents entries.
 */
function renderDocumentEntry(document, labels, slugFor) {
   /** @type {{text: string, slug: string}[]} Every `slugFor` call made while rendering this document. */
   const capturedSlugs = [];

   /**
    * Wraps `slugFor` to record each call's text and resulting slug, in call order.
    * @param {string} text - The heading text passed to `slugFor`.
    * @returns {string} The generated slug.
    */
   function capturingSlugFor(text) {
      /** @type {string} The generated slug. */
      const slug = slugFor(text);
      capturedSlugs.push({ text, slug });
      return slug;
   }

   /** @type {string} The rendered item block. */
   const block = RENDERERS[document.type](document, { labels, slugFor: capturingSlugFor });

   /** @type {number} The captured call that produced the item's own H4 heading slug. */
   const itemIndex = capturedSlugs.findIndex((entry) => entry.text === document.name);
   /** @type {{text: string, slug: string}} The item's own heading capture. */
   const itemCapture = capturedSlugs[itemIndex];
   /** @type {{text: string, slug: string}[]} Every other capture, i.e. attack headings (H5), in order. */
   const attackCaptures = capturedSlugs.filter((_entry, index) => index !== itemIndex);

   /** @type {TocEntry[]} The item's table-of-contents entries: its own heading, then its attacks. */
   const entries = [
      { text: escapeText(itemCapture.text), slug: itemCapture.slug },
      ...attackCaptures.map((entry) => ({ text: escapeText(entry.text), slug: entry.slug })),
   ];

   return { block, entries };
}

/**
 * Walks a section (depth-first: its own heading, its own documents, then its children), appending the
 * rendered Markdown blocks and table-of-contents entries in document order.
 * @param {import('./CompendiumTree.js').Section} section - The section to render.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @param {function(string): string} slugFor - The file's shared slugger.
 * @param {TocEntry[]} tocEntries - The accumulated table-of-contents entries (mutated in place).
 * @param {string[]} bodyBlocks - The accumulated rendered blocks (mutated in place).
 * @returns {void}
 */
function walkSection(section, labels, slugFor, tocEntries, bodyBlocks) {
   /** @type {string} This section's heading slug. */
   const slug = slugFor(section.text);
   bodyBlocks.push(heading(section.level, section.text, slug));
   tocEntries.push({ text: escapeText(section.text), slug });

   for (const document of section.documents) {
      /** @type {{block: string, entries: TocEntry[]}} The document's rendered block and TOC entries. */
      const { block, entries } = renderDocumentEntry(document, labels, slugFor);
      bodyBlocks.push(block);
      tocEntries.push(...entries);
   }

   for (const child of section.children) {
      walkSection(child, labels, slugFor, tocEntries, bodyBlocks);
   }
}

/**
 * Renders a full compendium reference document: the title heading, a `Contents` table of contents
 * listing every heading (including item and attack headings) in document order, then every folder/type
 * section and its item blocks, each block separated by one blank line.
 * @param {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - Every renderable document.
 * @param {{title: string, labels: function(string, string=): string}} options - The document title and
 *    label resolver.
 * @returns {string} The rendered Markdown file, ending with a single `\n`.
 */
export function renderCompendiumMarkdown(documents, { title, labels }) {
   /** @type {{sections: import('./CompendiumTree.js').Section[]}} The document's section tree. */
   const tree = buildCompendiumTree(documents, labels);
   /** @type {function(string): string} The single slugger shared by every heading and item/attack. */
   const slugFor = createSlugger();

   /** @type {string} The title heading's anchor slug. */
   const titleSlug = slugFor(title);
   /** @type {string} The `Contents` heading's anchor slug. */
   const contentsSlug = slugFor('Contents');

   /** @type {TocEntry[]} The table-of-contents entries, in document order. */
   const tocEntries = [
      { text: escapeText(title), slug: titleSlug },
      { text: escapeText('Contents'), slug: contentsSlug },
   ];
   /** @type {string[]} The rendered section headings and item blocks, in document order. */
   const bodyBlocks = [];

   for (const section of tree.sections) {
      walkSection(section, labels, slugFor, tocEntries, bodyBlocks);
   }

   /** @type {string} The table-of-contents block: one `[Text](#slug)` line per entry, blank-line separated. */
   const tocBlock = tocEntries.map((entry) => `[${entry.text}](#${entry.slug})`).join('\n\n');

   return `${[
      heading(1, title, titleSlug),
      '',
      heading(1, 'Contents', contentsSlug),
      '',
      tocBlock,
      '',
      bodyBlocks.join('\n\n'),
   ].join('\n')}\n`;
}
