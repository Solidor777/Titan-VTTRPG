// Source masking for the static guard test that scans test sources as text (E2eContextMenuClicks; the guards that read
// sources as syntax use `parseSource.js`). Masking keeps every index and line break, so a match in the masked text maps
// back to the same position and line in the source.
//
// Known limits: template-literal `${…}` expressions are treated as string content, and a regular-expression literal is
// not recognized, so one containing a quote character reads as the start of a string (hiding the text up to the next
// matching quote) and one containing `//` or `/*` reads as a comment.

/** @type {string[]} The characters that open a string or template literal. */
const QUOTES = [
   '\'',
   '"',
   '`',
];

/**
 * Masks a source for structural scanning: comments always become spaces, and string or template contents become `x`
 * when `strings` is set (so brackets inside strings never unbalance a walk) or are kept when it is not (so a call
 * built inside a string is still found).
 * @param {string} source - The source text.
 * @param {object} [options] - What to mask besides comments.
 * @param {boolean} [options.strings] - Whether string and template contents are masked too.
 * @returns {string} The masked text, the same length as the source.
 */
export default function maskSource(source, { strings = false } = {}) {
   /** @type {string[]} The masked characters. */
   const out = [...source];
   /** @type {number} The scan position. */
   let index = 0;
   while (index < source.length) {
      /** @type {string} The two characters at the scan position. */
      const pair = source.slice(index, index + 2);
      if (pair === '//' || pair === '/*') {
         /** @type {number} The index of the line break or block close ending the comment; -1 if none. */
         const terminator = source.indexOf(pair === '//' ? '\n' : '*/', index + 2);
         /** @type {number} The index just past the comment (a line comment keeps its line break). */
         const end = terminator === -1 ? source.length : terminator + (pair === '//' ? 0 : 2);
         for (let position = index; position < end; position++) {
            if (out[position] !== '\n') {
               out[position] = ' ';
            }
         }
         index = end;
      }
      else if (QUOTES.includes(source[index])) {
         /** @type {string} The quote that closes the string. */
         const quote = source[index];
         index++;
         while (index < source.length && source[index] !== quote) {
            /** @type {number} The length of the current character: two for an escape sequence. */
            const length = source[index] === '\\' ? 2 : 1;
            if (strings) {
               for (let position = index; position < index + length && position < source.length; position++) {
                  if (out[position] !== '\n') {
                     out[position] = 'x';
                  }
               }
            }
            index += length;
         }
         index++;
      }
      else {
         index++;
      }
   }
   return out.join('');
}
