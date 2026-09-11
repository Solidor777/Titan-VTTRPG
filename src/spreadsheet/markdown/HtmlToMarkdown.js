import { escapeText } from './MarkdownText.js';

/**
 * Named HTML entities decoded by this converter (the subset ProseMirror/Foundry descriptions use).
 * @type {Object<string, string>}
 */
const NAMED_ENTITIES = {
   amp: '&',
   lt: '<',
   gt: '>',
   quot: '"',
   apos: '\'',
   nbsp: ' ',
};

/**
 * Void elements: tags with no closing tag and no children, regardless of a trailing `/`.
 * @type {Set<string>}
 */
const VOID_ELEMENTS = new Set(['br', 'hr', 'img']);

/**
 * Element tags rendered as standalone Markdown blocks (paragraphs, lists, tables, etc.).
 * @type {Set<string>}
 */
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'blockquote', 'pre', 'ul', 'ol', 'table']);

/**
 * Element tags rendered inline (inside a block's text run), including the self-closing `<br>`.
 * @type {Set<string>}
 */
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 's', 'del', 'strike', 'u', 'code', 'a', 'br', 'img']);

/**
 * Matches a single HTML entity reference: a named entity, a decimal numeric reference, or a
 * hexadecimal numeric reference.
 * @type {RegExp}
 */
const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g;

/**
 * Matches a Foundry enricher (`@UUID[...]{Label}`, `@Compendium[...]{Label}`, `@Actor[...]{Label}`,
 * each with an optional label) or an inline roll (`[[/r FORMULA]]`, `[[/roll FORMULA]]`, `[[FORMULA]]`).
 * @type {RegExp}
 */
const ENRICHER_RE = new RegExp(
   '@(?:UUID|Compendium|Actor)\\[([^\\]]*)\\](?:\\{([^}]*)\\})?'
   + '|\\[\\[\\s*(?:\\/(?:r|roll)\\s+)?([^\\]]+?)\\s*\\]\\]',
   'g',
);

/**
 * Matches the next HTML tag or comment: a comment, a closing tag, or an opening/self-closing tag
 * with its raw attribute string.
 * @type {RegExp}
 */
const TOKEN_RE = new RegExp(
   '<!--[\\s\\S]*?-->'
   + '|<\\/\\s*([a-zA-Z][a-zA-Z0-9]*)\\s*>'
   + '|<([a-zA-Z][a-zA-Z0-9]*)'
   + '((?:\\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s"\'=<>`]+))?)*)'
   + '\\s*(\\/)?>',
   'g',
);

/**
 * Matches a single attribute name/value pair within a tag's raw attribute string.
 * @type {RegExp}
 */
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * Decodes the HTML entities this converter supports; an unrecognized or malformed reference is
 * left untouched.
 * @param {string} text - The raw text to decode.
 * @returns {string} The decoded text.
 */
function decodeEntities(text) {
   return text.replace(ENTITY_RE, (full, body) => {
      if (body[0] === '#') {
         /** @type {number} The codepoint parsed from the numeric reference. */
         const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
         return Number.isNaN(code) ? full : String.fromCodePoint(code);
      }

      return NAMED_ENTITIES[body] ?? full;
   });
}

/**
 * Parses a tag's raw attribute string (everything between the tag name and the closing `>`) into
 * a name/value map. A valueless attribute (e.g. `disabled`) maps to `''`.
 * @param {string} attrString - The raw attribute text.
 * @returns {Object<string, string>} The parsed attributes, lower-cased by name.
 */
function parseAttrs(attrString) {
   /** @type {Object<string, string>} The accumulated attribute map. */
   const attrs = {};
   ATTR_RE.lastIndex = 0;

   let match;
   while ((match = ATTR_RE.exec(attrString)) !== null) {
      /** @type {string} The value from whichever capture group matched (quoted or bare). */
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      attrs[match[1].toLowerCase()] = value;
   }

   return attrs;
}

/**
 * Parses an HTML fragment into a node tree. Unclosed or mismatched tags are handled best-effort
 * (a closing tag pops the stack up to its matching opener, or is ignored if none is open).
 * @param {string} html - The HTML fragment to parse.
 * @returns {{type: 'element', tag: 'root', attrs: object, children: object[]}} The synthetic root node.
 */
function parseHtml(html) {
   /** @type {{type: 'element', tag: string, attrs: object, children: object[]}} The synthetic document root. */
   const root = {
      type: 'element',
      tag: 'root',
      attrs: {},
      children: [],
   };
   /** @type {object[]} The stack of currently-open element nodes, root-first. */
   const stack = [root];

   TOKEN_RE.lastIndex = 0;
   /** @type {number} The end of the most recently consumed match, for extracting interleaved text. */
   let lastIndex = 0;
   let match;
   while ((match = TOKEN_RE.exec(html)) !== null) {
      /** @type {string} The literal text between the previous token and this one. */
      const textBefore = html.slice(lastIndex, match.index);
      if (textBefore !== '') {
         stack[stack.length - 1].children.push({ type: 'text', value: textBefore });
      }

      lastIndex = TOKEN_RE.lastIndex;

      if (match[0].startsWith('<!--')) {
         continue;
      }

      if (match[1] !== undefined) {
         /** @type {string} The lower-cased closing tag name. */
         const closeTag = match[1].toLowerCase();
         for (let i = stack.length - 1; i > 0; i--) {
            if (stack[i].tag === closeTag) {
               stack.length = i;
               break;
            }
         }
         continue;
      }

      /** @type {string} The lower-cased opening tag name. */
      const tag = match[2].toLowerCase();
      /** @type {boolean} Whether this tag has no children (void element or self-closing syntax). */
      const selfClosing = match[4] === '/' || VOID_ELEMENTS.has(tag);
      /** @type {object} The newly opened element node. */
      const node = {
         type: 'element',
         tag,
         attrs: parseAttrs(match[3] ?? ''),
         children: [],
      };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) {
         stack.push(node);
      }
   }

   /** @type {string} Any text following the final token. */
   const trailingText = html.slice(lastIndex);
   if (trailingText !== '') {
      stack[stack.length - 1].children.push({ type: 'text', value: trailingText });
   }

   return root;
}

/**
 * Extracts an element's text content verbatim (entities decoded, no markdown escaping, tags
 * stripped), used for `<code>` and `<pre>` where the content must not be re-escaped.
 * @param {object} node - The element node.
 * @returns {string} The concatenated, decoded text content.
 */
function extractText(node) {
   let out = '';
   for (const child of node.children) {
      out += child.type === 'text' ? decodeEntities(child.value) : extractText(child);
   }

   return out;
}

/**
 * Escapes a literal text segment for inline rendering, additionally escaping `|` when rendering
 * inside a table cell (per the spec's table-cell escaping rule).
 * @param {string} text - The literal text segment (already entity-decoded and whitespace-collapsed).
 * @param {{inTable: boolean}} ctx - The current render context.
 * @returns {string} The escaped segment.
 */
function escapeSegment(text, ctx) {
   /** @type {string} The segment after the shared escaping rules. */
   const escaped = escapeText(text);
   return ctx.inTable ? escaped.replace(/\|/g, '\\|') : escaped;
}

/**
 * Renders a single text node: decodes entities, collapses whitespace runs to a single space,
 * expands Foundry enrichers and inline rolls, and escapes the remaining literal text.
 * @param {string} rawText - The raw (undecoded) text node content.
 * @param {{inTable: boolean}} ctx - The current render context.
 * @returns {string} The rendered inline Markdown text.
 */
function renderTextNode(rawText, ctx) {
   /** @type {string} The entity-decoded, whitespace-collapsed source text. */
   const collapsed = decodeEntities(rawText).replace(/\s+/g, ' ');

   let out = '';
   /** @type {number} The end of the most recently consumed match. */
   let lastIndex = 0;
   ENRICHER_RE.lastIndex = 0;
   let match;
   while ((match = ENRICHER_RE.exec(collapsed)) !== null) {
      out += escapeSegment(collapsed.slice(lastIndex, match.index), ctx);
      lastIndex = ENRICHER_RE.lastIndex;

      if (match[3] !== undefined) {
         // An inline roll: rendered verbatim, unescaped.
         out += match[3];
         continue;
      }

      /** @type {string} The enricher's reference (e.g. `Item.abc` or `Compendium.titan.effects.Item.xyz`). */
      const reference = match[1];
      /** @type {string} The enricher's display text: its explicit label, or the reference's last segment. */
      const displayText = match[2] !== undefined ? match[2] : reference.split('.').pop();
      out += `*${escapeSegment(displayText, ctx)}*`;
   }

   out += escapeSegment(collapsed.slice(lastIndex), ctx);
   return out;
}

/**
 * Renders a sequence of sibling nodes as inline Markdown (no block-level separation).
 * @param {object[]} nodes - The sibling nodes (text and/or inline elements).
 * @param {{inTable: boolean}} ctx - The current render context.
 * @returns {string} The rendered inline Markdown text.
 */
function renderInline(nodes, ctx) {
   let out = '';
   for (const node of nodes) {
      if (node.type === 'text') {
         out += renderTextNode(node.value, ctx);
         continue;
      }

      switch (node.tag) {
         case 'strong':
         case 'b':
            out += `**${renderInline(node.children, ctx)}**`;
            break;

         case 'em':
         case 'i':
            out += `*${renderInline(node.children, ctx)}*`;
            break;

         case 's':
         case 'del':
         case 'strike':
            out += `~~${renderInline(node.children, ctx)}~~`;
            break;

         case 'u':
            out += renderInline(node.children, ctx);
            break;

         case 'code':
            out += `\`${extractText(node)}\``;
            break;

         case 'a':
            out += `[${renderInline(node.children, ctx)}](${node.attrs.href ?? ''})`;
            break;

         case 'br':
            out += '  \n';
            break;

         case 'img':
            out += escapeSegment(node.attrs.alt ?? '', ctx);
            break;

         default:
            // Any other tag (block tags reached in an inline context, unknown tags): children inline.
            out += renderInline(node.children, ctx);
            break;
      }
   }

   return out;
}

/**
 * Renders a `<ul>`/`<ol>` element as a Markdown list. Top-level items are blank-line separated;
 * nested lists render directly under their parent item, indented two spaces per level, with no
 * blank line before or between nested items.
 * @param {object} node - The `<ul>` or `<ol>` element node.
 * @param {number} level - The nesting depth (0 for a top-level list).
 * @param {{inTable: boolean}} ctx - The current render context.
 * @returns {string} The rendered list block.
 */
function renderList(node, level, ctx) {
   /** @type {boolean} Whether this list is ordered (numbered markers) or unordered (`*` markers). */
   const ordered = node.tag === 'ol';
   /** @type {string} The two-space-per-level indentation for this list's items. */
   const indent = '  '.repeat(level);
   /** @type {object[]} This list's direct `<li>` children. */
   const items = node.children.filter((child) => child.type === 'element' && child.tag === 'li');

   /** @type {string[]} Each item's rendered block (its own line plus any nested list lines). */
   const itemBlocks = items.map((li, index) => {
      /** @type {object[]} The item's nested `<ul>`/`<ol>` children. */
      const nestedLists = li.children.filter(
         (child) => child.type === 'element' && (child.tag === 'ul' || child.tag === 'ol'),
      );
      /** @type {object[]} The item's own inline content (everything but nested lists). */
      const inlineChildren = li.children.filter(
         (child) => !(child.type === 'element' && (child.tag === 'ul' || child.tag === 'ol')),
      );
      /** @type {string} This item's marker (`*` or `N.`). */
      const marker = ordered ? `${index + 1}.` : '*';
      /** @type {string[]} This item's own line followed by each nested list's rendered block. */
      const lines = [`${indent}${marker} ${renderInline(inlineChildren, ctx).trim()}`];
      for (const nested of nestedLists) {
         lines.push(renderList(nested, level + 1, ctx));
      }

      return lines.join('\n');
   });

   return itemBlocks.join(level === 0 ? '\n\n' : '\n');
}

/**
 * Collects a `<table>`'s data rows (`<tr>` elements), descending through `<thead>`/`<tbody>`/`<tfoot>`.
 * @param {object} node - The `<table>` element node.
 * @returns {object[]} The table's `<tr>` element nodes, in document order.
 */
function collectTableRows(node) {
   /** @type {object[]} The accumulated `<tr>` nodes. */
   const rows = [];

   /**
    * Recursively walks a table container collecting `<tr>` rows.
    * @param {object} container - The `<table>`, `<thead>`, `<tbody>`, or `<tfoot>` node.
    * @returns {void}
    */
   function walk(container) {
      for (const child of container.children) {
         if (child.type !== 'element') {
            continue;
         }

         if (child.tag === 'tr') {
            rows.push(child);
         }
         else if (child.tag === 'thead' || child.tag === 'tbody' || child.tag === 'tfoot') {
            walk(child);
         }
      }
   }

   walk(node);
   return rows;
}

/**
 * Renders a `<table>` element as a GFM pipe table. The first row is the header when it is made of
 * `<th>` cells; otherwise a blank header row is synthesised.
 * @param {object} node - The `<table>` element node.
 * @returns {string} The rendered table block, or `''` when the table has no rows.
 */
function renderTable(node) {
   /** @type {{isHeader: boolean, text: string}[][]} Each row's rendered cells. */
   const rows = collectTableRows(node).map((tr) => tr.children
      .filter((cell) => cell.type === 'element' && (cell.tag === 'td' || cell.tag === 'th'))
      .map((cell) => ({
         isHeader: cell.tag === 'th',
         text: renderInline(cell.children, { inTable: true }).trim(),
      })));

   if (rows.length === 0) {
      return '';
   }

   /** @type {number} The widest row's cell count; every row is padded to this width. */
   const columnCount = Math.max(...rows.map((row) => row.length));

   /** @type {boolean} Whether the first row is a real header row (built from `<th>` cells). */
   const hasHeaderRow = rows[0].some((cell) => cell.isHeader);
   /** @type {string[]} The header cell text, one entry per column. */
   const headerTexts = hasHeaderRow ? rows[0].map((cell) => cell.text) : [];
   /** @type {{isHeader: boolean, text: string}[][]} The remaining, body-only rows. */
   const bodyRows = hasHeaderRow ? rows.slice(1) : rows;

   /**
    * Pads a row's cell text out to `columnCount` columns.
    * @param {string[]} texts - The row's cell text.
    * @returns {string[]} The padded cell text.
    */
   function pad(texts) {
      /** @type {string[]} A copy of `texts`, padded with empty cells. */
      const padded = [...texts];
      while (padded.length < columnCount) {
         padded.push('');
      }

      return padded;
   }

   /** @type {string[]} The rendered table lines (header, separator, then each body row). */
   const lines = [
      `| ${pad(headerTexts).join(' | ')} |`,
      `| ${new Array(columnCount).fill('---').join(' | ')} |`,
   ];
   for (const row of bodyRows) {
      lines.push(`| ${pad(row.map((cell) => cell.text)).join(' | ')} |`);
   }

   return lines.join('\n');
}

/**
 * Whether a `<section>` element carries the `secret` class (a GM-only note that is never rendered).
 * @param {object} node - The `<section>` element node.
 * @returns {boolean} `true` when the section's `class` attribute contains `secret`.
 */
function isSecretSection(node) {
   return (node.attrs.class ?? '').split(/\s+/).includes('secret');
}

/**
 * Renders a single block-level element (a member of {@link BLOCK_TAGS}) as its Markdown block.
 * @param {object} node - The block-level element node.
 * @param {{inTable: boolean}} ctx - The current render context.
 * @returns {string} The rendered block, or `''` for an empty block.
 */
function renderBlockElement(node, ctx) {
   switch (node.tag) {
      case 'p':
         return renderInline(node.children, ctx).trim();

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
         /** @type {string} The heading's rendered inline text. */
         const headingText = renderInline(node.children, ctx).trim();
         return headingText === '' ? '' : `**${headingText}**`;
      }

      case 'hr':
         return '***';

      case 'blockquote': {
         /** @type {string} The blockquote's inner blocks, joined as elsewhere. */
         const inner = renderBlocks(node.children, ctx).join('\n\n');
         return inner
            .split('\n')
            .map((line) => (line === '' ? '>' : `> ${line}`))
            .join('\n');
      }

      case 'pre':
         return `\`\`\`\n${extractText(node)}\n\`\`\``;

      case 'ul':
      case 'ol':
         return renderList(node, 0, ctx);

      case 'table':
         return renderTable(node);

      default:
         return '';
   }
}

/**
 * Renders a sequence of sibling nodes as a list of top-level Markdown blocks. Stray inline content
 * not wrapped in a block tag (and non-secret container tags such as `<div>`/`<section>`) are
 * flattened into the surrounding block sequence; `<section class="secret">` is dropped entirely.
 * @param {object[]} nodes - The sibling nodes to render.
 * @param {{inTable: boolean}} ctx - The current render context.
 * @returns {string[]} The rendered blocks, in document order.
 */
function renderBlocks(nodes, ctx) {
   /** @type {string[]} The accumulated rendered blocks. */
   const blocks = [];
   /** @type {object[]} A run of consecutive text/inline nodes not yet flushed as an implicit paragraph. */
   let inlineRun = [];

   /**
    * Flushes the pending inline run (if any) as one implicit paragraph block.
    * @returns {void}
    */
   function flushInline() {
      if (inlineRun.length === 0) {
         return;
      }

      /** @type {string} The flushed run's rendered, trimmed text. */
      const text = renderInline(inlineRun, ctx).trim();
      if (text !== '') {
         blocks.push(text);
      }

      inlineRun = [];
   }

   for (const node of nodes) {
      if (node.type === 'text') {
         inlineRun.push(node);
         continue;
      }

      if (node.tag === 'section' && isSecretSection(node)) {
         flushInline();
         continue;
      }

      if (BLOCK_TAGS.has(node.tag)) {
         flushInline();
         /** @type {string} The block's rendered text. */
         const rendered = renderBlockElement(node, ctx);
         if (rendered !== '') {
            blocks.push(rendered);
         }

         continue;
      }

      if (INLINE_TAGS.has(node.tag)) {
         inlineRun.push(node);
         continue;
      }

      // A container tag with no dedicated rendering (e.g. <div>, non-secret <section>): flatten
      // its children into this block sequence.
      flushInline();
      blocks.push(...renderBlocks(node.children, ctx));
   }

   flushInline();
   return blocks;
}

/**
 * Converts a ProseMirror/Foundry HTML description fragment to Markdown text.
 * @param {string} [html] - The HTML fragment to convert.
 * @returns {string} The rendered Markdown, with no trailing newline. Blank/undefined input → `''`.
 */
export function htmlToMarkdown(html) {
   if (html === null || html === undefined || html === '') {
      return '';
   }

   /** @type {object} The parsed document root. */
   const root = parseHtml(String(html));
   return renderBlocks(root.children, { inTable: false }).join('\n\n');
}
