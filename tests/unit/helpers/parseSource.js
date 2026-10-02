import { Linter } from 'eslint';

// Source parsing shared by the static guard tests that read test sources as syntax (E2eRealDocuments, E2eReloads,
// UnitFakeDocuments). The parser is ESLint's own (espree, reached through `Linter` of the `eslint` devDependency), so a
// guard sees every syntactic form of a property, method, field, assignment or call as one node type instead of
// enumerating its spellings. Comments are not nodes.
//
// Test sources also hold code in strings (e2e specs pass it to the browser: `page.evaluate('…')`,
// `new Function('actor', src)`), so every string whose text parses as a module or as a function body is read as code
// too, recursively, and its nodes are listed with the outer source's line numbers. A string's text is a string literal,
// a template literal (each `${…}` read as the identifier `_`), or a `+` concatenation of those; a key or a module
// specifier is a name, not code. Prose, selectors and other text that does not parse yield no nodes.

/**
 * @type {number} The ceiling, in ms, of a guard test that parses a whole test tree. Parsing the 113 e2e sources with
 * their code strings takes 1.3 to 1.4 s alone and passes vitest's 5 s default under a full parallel run, so the
 * whole-tree tests set this failure bound instead.
 */
export const TREE_SCAN_TIMEOUT = 60_000;

/** @type {Linter} The linter whose parse yields the syntax tree; no rules are configured, so it only parses. */
const LINTER = new Linter();

/** @type {object[][]} The flat configs to parse with, in order: a module, then a function body (top-level `return`). */
const PARSE_CONFIGS = [
   [{
      languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
      },
   }],
   [{
      languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'script',
         parserOptions: { ecmaFeatures: { globalReturn: true } },
      },
   }],
];

/**
 * @callback OuterLine
 * @param {number} offset - An offset in the parsed text.
 * @param {number} line - The 1-based line of that offset in the parsed text.
 * @returns {number} The 1-based line of the outer source that the position comes from.
 */

/**
 * @typedef {object} StringText
 * @property {string} text - The string's value, each template expression read as the identifier `_`.
 * @property {number[]} lines - The outer source line of each character of `text`.
 */

/**
 * Parses a text, as a module or else as a function body.
 * @param {string} text - The text to parse.
 * @param {number} configCount - How many of `PARSE_CONFIGS` to try, in order.
 * @returns {{ast: object, visitorKeys: {[type: string]: string[]}} | {fatal: object}} The parse, or the first fatal
 * message when no config parses the text.
 */
function parse(text, configCount) {
   /** @type {object | undefined} The first config's fatal message. */
   let firstFatal;
   for (const config of PARSE_CONFIGS.slice(0, configCount)) {
      /** @type {object | undefined} The fatal parse message, when the text does not parse. */
      const fatal = LINTER.verify(text, config, 'source.js').find((message) => message.fatal);
      if (!fatal) {
         return LINTER.getSourceCode();
      }
      firstFatal ??= fatal;
   }
   return { fatal: firstFatal };
}

/**
 * Lists a syntax tree's nodes, depth first in source order.
 * @param {object} root - The root node.
 * @param {{[type: string]: string[]}} visitorKeys - The child keys of each node type.
 * @returns {object[]} Every node, the root first.
 */
function listNodes(root, visitorKeys) {
   /** @type {object[]} The nodes, in visiting order. */
   const nodes = [];
   /** @type {object[]} The nodes left to visit, the next one last. */
   const stack = [root];
   while (stack.length > 0) {
      /** @type {object} The node being visited. */
      const node = stack.pop();
      nodes.push(node);

      /** @type {object[]} The node's children in source order. */
      const children = (visitorKeys[node.type] ?? [])
         .flatMap((key) => node[key] ?? [])
         .filter((child) => child !== null);
      stack.push(...children.reverse());
   }
   return nodes;
}

/**
 * Reads the text of a string expression with the outer line of each character. A template's lines are counted from its
 * cooked text, so an escaped line break (`\n`) counts as a line; inside a code string, a template's positions are
 * approximate.
 * @param {object} node - An expression node.
 * @param {OuterLine} outerLine - Maps a position of the parsed text to the outer source line.
 * @returns {StringText | null} The text, or `null` when the node is not a string, a template or a `+` of those.
 */
function readStringText(node, outerLine) {
   if (node.type === 'Literal' && typeof node.value === 'string') {
      return {
         text: node.value,
         lines: Array.from(node.value, () => outerLine(node.range[0], node.loc.start.line)),
      };
   }
   if (node.type === 'TemplateLiteral') {
      /** @type {StringText} The template's text so far. */
      const result = {
         text: '',
         lines: [],
      };
      node.quasis.forEach((quasi, index) => {
         /** @type {number} The line of the quasi's next character, in the parsed text. */
         let line = quasi.loc.start.line;
         for (const [offset, character] of [...quasi.value.cooked ?? quasi.value.raw].entries()) {
            result.text += character;
            result.lines.push(outerLine(quasi.range[0] + offset, line));
            if (character === '\n') {
               line++;
            }
         }
         if (index < node.expressions.length) {
            result.text += '_';
            result.lines.push(outerLine(node.expressions[index].range[0], node.expressions[index].loc.start.line));
         }
      });
      return result;
   }
   if (node.type === 'BinaryExpression' && node.operator === '+') {
      /** @type {StringText | null} The left operand's text. */
      const left = readStringText(node.left, outerLine);
      /** @type {StringText | null} The right operand's text. */
      const right = readStringText(node.right, outerLine);
      return left && right
         ? {
            text: left.text + right.text,
            lines: [
               ...left.lines,
               ...right.lines,
            ],
         }
         : null;
   }
   return null;
}

/**
 * Decides whether a string node is not read as code: one operand of a larger `+` concatenation of strings (the whole
 * concatenation is read instead), a key (`{ 'update': … }`, `actor['update']`), or a module specifier.
 * @param {object} node - A syntax-tree node.
 * @param {OuterLine} outerLine - Maps a position of the parsed text to the outer source line.
 * @returns {boolean} Whether the node is excluded from code-string parsing.
 */
function isNameString(node, outerLine) {
   /** @type {object | undefined} The node's parent. */
   const { parent } = node;
   if (!parent) {
      return false;
   }
   if (parent.type === 'BinaryExpression' && parent.operator === '+' && readStringText(parent, outerLine)) {
      return true;
   }
   if ([
      'Property',
      'MethodDefinition',
      'PropertyDefinition',
   ].includes(parent.type) && parent.key === node) {
      return true;
   }
   if (parent.type === 'MemberExpression' && parent.property === node) {
      return true;
   }
   return [
      'ImportDeclaration',
      'ExportNamedDeclaration',
      'ExportAllDeclaration',
      'ImportExpression',
   ].includes(parent.type) && parent.source === node;
}

/**
 * Lists the nodes of a parsed text, then those of every code string in it, recursively. A code string's nodes get the
 * outer source's lines in `loc`; their `range` stays relative to the string's text.
 * @param {object} ast - The parsed text's `Program`.
 * @param {{[type: string]: string[]}} visitorKeys - The child keys of each node type.
 * @param {OuterLine} outerLine - Maps a position of the parsed text to the outer source line.
 * @returns {object[]} The text's own nodes, then the nested code strings' nodes.
 */
function collectNodes(ast, visitorKeys, outerLine) {
   /** @type {object[]} The parsed text's own nodes. */
   const nodes = listNodes(ast, visitorKeys);
   /** @type {object[]} The nodes of the code strings found. */
   const nested = [];
   for (const node of nodes) {
      /** @type {StringText | null} The node's text, when it is a whole string read as code. */
      const string = isNameString(node, outerLine) ? null : readStringText(node, outerLine);
      if (string === null || string.text.length === 0) {
         continue;
      }

      /** @type {{ast: object, visitorKeys: {[type: string]: string[]}} | {fatal: object}} The string read as code. */
      const parsed = parse(string.text, PARSE_CONFIGS.length);
      if ('fatal' in parsed) {
         continue;
      }

      /**
       * Maps a position of the string's text to the outer source line of the character there.
       * @param {number} offset - The offset in the string's text.
       * @returns {number} The outer source line.
       */
      const stringLine = (offset) => string.lines[Math.min(offset, string.lines.length - 1)];
      nested.push(...collectNodes(parsed.ast, parsed.visitorKeys, stringLine));
   }
   for (const node of nodes) {
      node.loc = {
         start: {
            ...node.loc.start,
            line: outerLine(node.range[0], node.loc.start.line),
         },
         end: {
            ...node.loc.end,
            line: outerLine(Math.max(node.range[0], node.range[1] - 1), node.loc.end.line),
         },
      };
   }
   return [
      ...nodes,
      ...nested,
   ];
}

/**
 * Parses a source and lists its syntax-tree nodes, and those of every code string in it. Each is an ESTree node with
 * `parent` and `loc` (1-based lines of the source).
 * @param {string} source - The source text.
 * @param {string} file - The source path, named in the error when the source does not parse.
 * @returns {object[]} Every node, the source's own first, each tree depth first in source order.
 * @throws {Error} When the source does not parse as a module; a guard must not pass a file it could not read.
 */
export function parseNodes(source, file) {
   /** @type {{ast: object, visitorKeys: {[type: string]: string[]}} | {fatal: object}} The parsed source. */
   const parsed = parse(source, 1);
   if ('fatal' in parsed) {
      throw new Error(`${file}:${parsed.fatal.line}:${parsed.fatal.column} does not parse: ${parsed.fatal.message}`);
   }
   return collectNodes(parsed.ast, parsed.visitorKeys, (offset, line) => line);
}

/**
 * Reads the static name of a property, method, field or member key: an identifier (unless computed), a string
 * literal, or a template literal with no expressions.
 * @param {object} key - The key node.
 * @param {boolean} computed - Whether the key is written in brackets.
 * @returns {string | null} The name, or `null` when it is not static (a computed variable, a number, an expression, a
 * private name).
 */
export function staticKeyName(key, computed) {
   if (key.type === 'Identifier' && !computed) {
      return key.name;
   }
   if (key.type === 'Literal' && typeof key.value === 'string') {
      return key.value;
   }
   if (key.type === 'TemplateLiteral' && key.expressions.length === 0) {
      return key.quasis[0].value.cooked;
   }
   return null;
}
