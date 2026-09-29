import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Core `ContextMenu#close()` removes whatever menu element the instance holds when its 200 ms collapse ends, and every
// document click while `ui.context` is set queues another close, so an e2e test that clicks a context-menu entry and
// moves on can leave a close pending that removes the next menu. `chooseContextMenuEntry` (tests/e2e/contextMenu.js)
// clicks the entry and waits for the menu to detach. This scan fails on any context-menu entry clicked directly
// anywhere else under tests/e2e: a click whose receiver chain (or `page.click` selector) names a context-menu selector,
// or starts from a variable or function that holds or returns one.

/** @type {string} The e2e test directory. */
const E2E_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../e2e');

/** @type {string} The one source allowed to click a context-menu entry: the helper that waits for the close. */
const HELPER_SOURCE = 'contextMenu.js';

/** @type {RegExp} A selector naming core's context menu or one of its entries. */
const CONTEXT_MENU_SELECTOR = /#context-menu|\.context-menu\b|\bcontext-item\b/;

/** @type {RegExp} A call that can click its receiver: a click method, or `dispatchEvent` (checked for a click). */
const CLICK_CALL = /\.\s*(click|dblclick|tap|dispatchEvent)\s*\(/g;

/** @type {RegExp} A `dispatchEvent` argument that dispatches a click. */
const CLICK_EVENT_ARGUMENT = /^\s*(['"`])(?:click|dblclick)\1/;

/** @type {string[]} The characters that open a string or template literal. */
const QUOTES = [
   '\'',
   '"',
   '`',
];

/**
 * Masks a source for structural scanning: comments become spaces and string or template contents become `x`, keeping
 * every index and line break, so brackets inside strings or comments never unbalance a walk.
 * @param {string} source - The source text.
 * @returns {string} The masked text, the same length as the source.
 */
function maskSource(source) {
   /** @type {string[]} The masked characters. */
   const out = [...source];
   /** @type {number} The scan position. */
   let index = 0;
   while (index < source.length) {
      /** @type {string} The two characters at the scan position. */
      const pair = source.slice(index, index + 2);
      if (pair === '//' || pair === '/*') {
         /** @type {number} The index just past the comment. */
         const end = pair === '//'
            ? (source.indexOf('\n', index) + 1 || source.length)
            : source.indexOf('*/', index + 2) + 2;
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
            if (source[index] === '\\') {
               out[index] = 'x';
               index++;
            }
            if (out[index] !== '\n') {
               out[index] = 'x';
            }
            index++;
         }
         index++;
      }
      else {
         index++;
      }
   }
   return out.join('');
}

/**
 * Finds the index of the bracket that opens the group closed at a position, walking left over balanced groups.
 * @param {string} masked - The masked source.
 * @param {number} closeIndex - The index of a `)` or `]`.
 * @returns {number} The index of its opening bracket, or -1 when unbalanced.
 */
function findOpening(masked, closeIndex) {
   /** @type {number} The nesting depth. */
   let depth = 0;
   for (let index = closeIndex; index >= 0; index--) {
      if (masked[index] === ')' || masked[index] === ']') {
         depth++;
      }
      else if (masked[index] === '(' || masked[index] === '[') {
         depth--;
         if (depth === 0) {
            return index;
         }
      }
   }
   return -1;
}

/**
 * Finds the index of the bracket that closes the group opened at a position.
 * @param {string} masked - The masked source.
 * @param {number} openIndex - The index of a `(` or `[`.
 * @returns {number} The index of its closing bracket, or the source length when unbalanced.
 */
function findClosing(masked, openIndex) {
   /** @type {number} The nesting depth. */
   let depth = 0;
   for (let index = openIndex; index < masked.length; index++) {
      if (masked[index] === '(' || masked[index] === '[') {
         depth++;
      }
      else if (masked[index] === ')' || masked[index] === ']') {
         depth--;
         if (depth === 0) {
            return index;
         }
      }
   }
   return masked.length;
}

/**
 * Finds where the member chain ending just before a position starts: identifiers joined by `.`/`?.`, each optionally
 * called or indexed, across line breaks (`page.locator(…)\n   .first()`).
 * @param {string} masked - The masked source.
 * @param {number} end - The index just past the chain (the `.` of the member being called).
 * @returns {number} The index the chain starts at.
 */
function findChainStart(masked, end) {
   /** @type {number} The walk position: the start of the chain read so far. */
   let start = end;
   /** @type {boolean} Whether the chain continues left of the member read last. */
   let continues = true;
   while (continues) {
      /** @type {number} The index of the last non-space character before the chain read so far. */
      let index = start - 1;
      while (index >= 0 && /\s/.test(masked[index])) {
         index--;
      }

      // An optional-chaining `?.` call (`first()?.click()`) leaves a `?` before the member's dot.
      if (masked[index] === '?') {
         index--;
      }
      while (masked[index] === ')' || masked[index] === ']') {
         index = findOpening(masked, index) - 1;
         while (index >= 0 && /\s/.test(masked[index])) {
            index--;
         }
      }
      /** @type {number} The end of the identifier ending at the index. */
      const identifierEnd = index + 1;
      while (index >= 0 && /[\w$]/.test(masked[index])) {
         index--;
      }
      if (index + 1 === identifierEnd) {
         continues = false;
      }
      else {
         start = index + 1;

         /** @type {number} The index of the last non-space character before the identifier. */
         let before = index;
         while (before >= 0 && /\s/.test(masked[before])) {
            before--;
         }
         continues = masked[before] === '.';
         if (continues) {
            start = masked[before - 1] === '?' ? before - 1 : before;
         }
      }
   }
   return start;
}

/**
 * Collects the names that hold or return a context-menu locator: variables assigned an expression naming a
 * context-menu selector or another such name, and functions whose body returns one. Names are file-wide (no scopes),
 * so a reused name errs toward flagging.
 * @param {string} source - The source text.
 * @param {string} masked - The masked source.
 * @returns {Set<string>} The variable and function names that stand for a context-menu locator.
 */
function findContextMenuNames(source, masked) {
   /** @type {{name: string, text: string}[]} Each declaration's name and the text that decides it. */
   const declarations = [];
   for (const match of masked.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=/g)) {
      /** @type {number} The index of the end of the declaration (its semicolon, or the source end). */
      const end = masked.indexOf(';', match.index);
      declarations.push({
         name: match[1],
         text: source.slice(match.index + match[0].length, end === -1 ? source.length : end),
      });
   }
   for (const match of masked.matchAll(/\bfunction\s*\*?\s*([\w$]+)\s*\(/g)) {
      /** @type {number} The index of the body's opening brace. */
      const bodyStart = masked.indexOf('{', findClosing(masked, match.index + match[0].length - 1));
      /** @type {number} The nesting depth while reading the body. */
      let depth = 0;
      /** @type {number} The index of the body's closing brace. */
      let bodyEnd = bodyStart;
      for (; bodyEnd < masked.length; bodyEnd++) {
         depth += masked[bodyEnd] === '{' ? 1 : masked[bodyEnd] === '}' ? -1 : 0;
         if (depth === 0) {
            break;
         }
      }
      for (const statement of masked.slice(bodyStart, bodyEnd).matchAll(/\breturn\b[^;]*/g)) {
         declarations.push({
            name: match[1],
            text: source.slice(bodyStart + statement.index, bodyStart + statement.index + statement[0].length),
         });
      }
   }

   /** @type {Set<string>} The names found so far. */
   const names = new Set();
   /** @type {boolean} Whether the last pass added a name. */
   let added = true;
   while (added) {
      added = false;
      for (const { name, text } of declarations) {
         if (!names.has(name) && (CONTEXT_MENU_SELECTOR.test(text) ||
            [...names].some((known) => new RegExp(`(?<![\\w$.])${known.replace(/\$/g, '\\$')}(?![\\w$])`).test(text)))) {
            names.add(name);
            added = true;
         }
      }
   }
   return names;
}

/**
 * Finds the context-menu entries a source clicks directly.
 * @param {string} relativePath - The source path relative to tests/e2e.
 * @param {string} source - The source text.
 * @returns {string[]} One `path:line — text` entry per direct click; none for the helper source.
 */
function findDirectContextMenuClicks(relativePath, source) {
   if (relativePath === HELPER_SOURCE) {
      return [];
   }

   /** @type {string} The masked source. */
   const masked = maskSource(source);
   /** @type {Set<string>} The names holding or returning a context-menu locator. */
   const names = findContextMenuNames(source, masked);

   /** @type {string[]} The direct clicks found. */
   const found = [];
   for (const match of masked.matchAll(CLICK_CALL)) {
      /** @type {string} The call's argument text (a `page.click` selector or a dispatched event type lands here). */
      const argument = source.slice(
         match.index + match[0].length,
         findClosing(masked, match.index + match[0].length - 1),
      );
      if (match[1] === 'dispatchEvent' && !CLICK_EVENT_ARGUMENT.test(argument)) {
         continue;
      }

      /** @type {number} The index the receiver chain starts at. */
      const start = findChainStart(masked, match.index);
      /** @type {string} The receiver chain's text. */
      const chain = source.slice(start, match.index);
      /** @type {RegExpMatchArray | null} The chain's root identifier. */
      const root = masked.slice(start, match.index).match(/^[\w$]+/);
      if (CONTEXT_MENU_SELECTOR.test(chain) || CONTEXT_MENU_SELECTOR.test(argument) || names.has(root?.[0])) {
         /** @type {number} The 1-based line the chain starts on. */
         const line = source.slice(0, start).split('\n').length;
         found.push(`${relativePath}:${line} — ${source.slice(start, match.index + match[0].length).replace(/\s+/g, ' ')}`);
      }
   }
   return found;
}

describe('e2e context-menu entry clicks', () => {
   it('flags every direct click on a context-menu entry', () => {
      /** @type {string[]} Sources that each click one context-menu entry directly. */
      const clicks = [
         'await page.locator(\'#context-menu .context-item\', { hasText: \'Export to Spreadsheet\' }).click();',
         'await page.locator(\'#context-menu li.context-item\', { hasText: moveLabel }).first().click();',
         'await page.locator(\'#context-menu li.context-item, .context-menu .context-item\', ' +
            '{ hasText: \'Edit (x)\' })\n   .first()\n   .click();',
         'await page.click(\'#context-menu li.context-item:first-child\');',
         'const menu = page.locator(\'#context-menu li.context-item\');\n' +
            'await menu.filter({ hasText: label }).click();',
         'const menu = page.locator(\'#context-menu li.context-item\');\nconst entry = menu.first();\n' +
            'await entry.click({ force: true });',
         'function menuEntry(page, label) {\n   return page.locator(\'#context-menu li\', { hasText: label });\n}\n' +
            'await menuEntry(page, \'Open\').click();',
         'const entryOf = (label) => page.locator(\'.context-item\', { hasText: label });\n' +
            'await entryOf(\'x\').dblclick();',
         'await page.locator(\'#context-menu li\').nth(0).dispatchEvent(\'click\');',
         'await page?.locator(\'#context-menu li\')?.first()?.click();',
      ];
      for (const source of clicks) {
         expect.soft(findDirectContextMenuClicks('x.spec.js', source), source).toHaveLength(1);
      }
   });

   it('passes clicks through the helper, menu reads, and unrelated clicks', () => {
      /** @type {string[]} Sources that click no context-menu entry directly. */
      const others = [
         'await chooseContextMenuEntry(page, page.locator(\'#context-menu li.context-item\', { hasText: label }));',
         'const items = page.locator(\'#context-menu li.context-item\');\n' +
            'await expect(items.first()).toBeVisible();\n' +
            'return (await items.allInnerTexts()).map((text) => text.trim());',
         'await expect(page.locator(\'#context-menu\')).toHaveCount(0);',
         'await card.locator(\'.message-header\').click({ button: \'right\' });',
         '// await page.locator(\'#context-menu li\').click();',
         'await page.locator(\'[data-testid="effect-tray-lock"]\').first().click();',
         'await page.locator(\'button\', { hasText: \'Roll (Body)\' }).click();',
      ];
      for (const source of others) {
         expect.soft(findDirectContextMenuClicks('x.spec.js', source), source).toEqual([]);
      }
      expect(findDirectContextMenuClicks(HELPER_SOURCE, 'await entry.click();\nconst e = \'#context-menu\';'))
         .toEqual([]);
   });

   it('reports the line the clicked chain starts on', () => {
      /** @type {string} A source whose click chain starts on line 3 and ends on line 4. */
      const source = 'a;\nb;\nawait page.locator(\'#context-menu li\')\n   .click();';
      expect(findDirectContextMenuClicks('x.spec.js', source)[0]).toMatch(/^x\.spec\.js:3 /);
   });

   it('finds no direct context-menu entry click under tests/e2e', () => {
      /** @type {string[]} The e2e sources, relative to tests/e2e. */
      const sources = readdirSync(E2E_DIRECTORY, { recursive: true })
         .map((entry) => String(entry))
         .filter((entry) => entry.endsWith('.js'));
      expect(sources).toContain(HELPER_SOURCE);
      expect(sources).toContain('effect-tray.spec.js');

      /** @type {string[]} Every direct click found. */
      const found = sources.flatMap((relativePath) => findDirectContextMenuClicks(
         relativePath,
         readFileSync(path.join(E2E_DIRECTORY, relativePath), 'utf8'),
      ));
      expect(found, found.join('\n')).toEqual([]);
   });
});
