/**
 * Characters that always get a plain backslash escape: the Markdown specials `\ * _ \` [ ]`.
 * @type {string}
 */
const BACKSLASH_ESCAPED_CHARS = '\\*_`[]';

/**
 * Escapes text for safe inline rendering, matching the compendium's Google-Docs-export escaping
 * style: a leading `#` (so it can never read as a heading marker), the Markdown specials
 * `\ * _ \` [ ]`, `+` (always), and `-` immediately followed by a digit (a bare negative number, not
 * a list marker).
 * @param {*} text - The text to escape; coerced to a string (`null`/`undefined` become `''`).
 * @returns {string} The escaped text.
 */
export function escapeText(text) {
   /** @type {string} The input coerced to a string. */
   const str = text === null || text === undefined ? '' : String(text);

   let out = '';
   for (let i = 0; i < str.length; i++) {
      /** @type {string} The character under inspection. */
      const ch = str[i];

      if (i === 0 && ch === '#') {
         out += '\\#';
         continue;
      }

      if (BACKSLASH_ESCAPED_CHARS.includes(ch)) {
         out += `\\${ch}`;
         continue;
      }

      if (ch === '+') {
         out += '\\+';
         continue;
      }

      if (ch === '-' && /[0-9]/.test(str[i + 1] ?? '')) {
         out += '\\-';
         continue;
      }

      out += ch;
   }

   return out;
}

/**
 * Renders a single stat line: a bold label, its value, and a trailing Markdown hard break.
 * @param {string} label - The stat label (without the trailing colon).
 * @param {*} value - The stat value, rendered as written.
 * @returns {string} The stat line, e.g. `**Value:** 135  ` (two trailing spaces).
 */
export function statLine(label, value) {
   return `**${label}:** ${value}  `;
}

/**
 * The Markdown heading prefix (`#` run) for each supported heading level.
 * @type {Object<number, string>}
 */
const HEADING_PREFIXES = {
   1: '#',
   2: '##',
   3: '###',
   4: '####',
   5: '#####',
};

/**
 * Renders a heading with its level-specific emphasis and a Foundry-style explicit anchor, per the
 * compendium's heading table: H1/H2 plain text, H3 bold, H4/H5 bold-italic.
 * @param {number} level - The heading level, 1 through 5.
 * @param {string} text - The heading text (escaped via {@link escapeText}).
 * @param {string} slug - The anchor slug (no leading `#`).
 * @returns {string} The rendered heading line, e.g. `### **Name** {#name}`.
 * @throws {Error} When `level` is not one of 1 through 5.
 */
export function heading(level, text, slug) {
   /** @type {string|undefined} The `#` run for this level. */
   const prefix = HEADING_PREFIXES[level];

   if (prefix === undefined) {
      throw new Error(`Unsupported heading level: ${level}`);
   }

   /** @type {string} The escaped heading text. */
   const escaped = escapeText(text);

   /** @type {string} The heading text with its level-specific emphasis applied. */
   let body;
   if (level === 3) {
      body = `**${escaped}**`;
   }
   else if (level === 4 || level === 5) {
      body = `***${escaped}***`;
   }
   else {
      body = escaped;
   }

   return `${prefix} ${body} {#${slug}}`;
}
