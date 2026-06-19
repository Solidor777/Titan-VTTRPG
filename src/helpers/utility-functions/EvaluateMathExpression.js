/**
 * @typedef {object} MathToken
 * @property {'num'|'op'} type - The token kind: a number literal or an operator/parenthesis.
 * @property {number|string} value - The numeric value (for `num`) or the operator character (for `op`).
 */

/**
 * @typedef {object} ParserState
 * @property {MathToken[]} tokens - The full token stream being parsed.
 * @property {number} index - The cursor into `tokens` for the current parse position.
 */

/**
 * Evaluates a basic arithmetic expression supporting `+ - * /`, parentheses, decimals, and unary
 * minus with standard operator precedence. Uses a clean-room recursive-descent parser (no `eval`,
 * no `Function`) over a tokenized stream.
 *
 * Relative delta: when the trimmed expression begins with a binary operator (`+ - * /`), the
 * current value is prepended so the entry adjusts that value — e.g. `+5` on a field of `12`
 * evaluates `12+5` → `17`, and `*2` → `24`. A leading digit, `.`, or `(` is a literal expression.
 * @param {string} expression - The raw expression string to evaluate.
 * @param {object} [options] - Evaluation options.
 * @param {number} [options.currentValue=0] - The field's current value, used as the base for relative-delta entries.
 * @returns {number|null} The evaluated finite number, or `null` for any malformed input or non-finite result.
 */
export default function evaluateMathExpression(expression, { currentValue = 0 } = {}) {
   // Reject non-string or empty input before any parsing.
   const trimmed = typeof expression === 'string' ? expression.trim() : '';
   if (trimmed === '') {
      return null;
   }

   // Prepend the current value when the entry starts with a binary operator (relative delta).
   const isRelative = /^[+\-*/]/.test(trimmed);
   const source = isRelative ? `${currentValue}${trimmed}` : trimmed;

   // Tokenize, then parse-and-evaluate via recursive descent.
   const tokens = tokenize(source);
   if (tokens === null) {
      return null;
   }

   /** @type {ParserState} The shared cursor threaded through the recursive-descent functions. */
   const parser = {
      tokens,
      index: 0,
   };
   const result = parseExpression(parser);

   // A clean parse consumes every token; leftover tokens indicate malformed input.
   if (result === null || parser.index !== tokens.length) {
      return null;
   }

   return Number.isFinite(result) ? result : null;
}

/**
 * Splits a source string into number and operator tokens. Whitespace is skipped.
 * @param {string} source - The normalized expression string.
 * @returns {MathToken[]|null} The token stream, or `null` if an unrecognized or invalid token is found.
 */
function tokenize(source) {
   /** @type {MathToken[]} The accumulated token stream. */
   const tokens = [];

   // Cursor into the source string.
   let i = 0;

   while (i < source.length) {
      // Current character under the cursor.
      const char = source[i];

      // Skip whitespace between tokens.
      if (char === ' ' || char === '\t') {
         i += 1;
         continue;
      }

      // Single-character operators and parentheses.
      if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
         tokens.push({
            type: 'op',
            value: char,
         });
         i += 1;
         continue;
      }

      // Number literal: a run of digits and decimal points.
      if (/[0-9.]/.test(char)) {
         // The accumulated number characters.
         let numString = '';
         while (i < source.length && /[0-9.]/.test(source[i])) {
            numString += source[i];
            i += 1;
         }

         // Parsed numeric value; rejects malformed literals such as "1.2.3" (NaN) and lone ".".
         const num = Number(numString);
         if (!Number.isFinite(num)) {
            return null;
         }
         tokens.push({
            type: 'num',
            value: num,
         });
         continue;
      }

      // Any other character is invalid.
      return null;
   }

   return tokens;
}

/**
 * Returns the token at the parser cursor without consuming it.
 * @param {ParserState} parser - The parser state.
 * @returns {MathToken|null} The current token, or `null` at the end of the stream.
 */
function peek(parser) {
   return parser.tokens[parser.index] ?? null;
}

/**
 * Parses an additive expression: `term (('+' | '-') term)*`.
 * @param {ParserState} parser - The parser state.
 * @returns {number|null} The evaluated value, or `null` on a parse error.
 */
function parseExpression(parser) {
   // Left operand, folded leftward as additive operators are consumed.
   let left = parseTerm(parser);
   if (left === null) {
      return null;
   }

   // Lookahead operator token.
   let token = peek(parser);
   while (token !== null && token.type === 'op' && (token.value === '+' || token.value === '-')) {
      parser.index += 1;

      // Right operand of the current additive operator.
      const right = parseTerm(parser);
      if (right === null) {
         return null;
      }

      left = token.value === '+' ? left + right : left - right;
      token = peek(parser);
   }

   return left;
}

/**
 * Parses a multiplicative term: `factor (('*' | '/') factor)*`.
 * @param {ParserState} parser - The parser state.
 * @returns {number|null} The evaluated value, or `null` on a parse error or division by zero.
 */
function parseTerm(parser) {
   // Left operand, folded leftward as multiplicative operators are consumed.
   let left = parseFactor(parser);
   if (left === null) {
      return null;
   }

   // Lookahead operator token.
   let token = peek(parser);
   while (token !== null && token.type === 'op' && (token.value === '*' || token.value === '/')) {
      parser.index += 1;

      // Right operand of the current multiplicative operator.
      const right = parseFactor(parser);
      if (right === null) {
         return null;
      }

      if (token.value === '/') {
         // Division by zero yields a non-finite result; reject it.
         if (right === 0) {
            return null;
         }
         left = left / right;
      }
      else {
         left = left * right;
      }
      token = peek(parser);
   }

   return left;
}

/**
 * Parses a factor: `('+' | '-') factor | number | '(' expression ')'`.
 * @param {ParserState} parser - The parser state.
 * @returns {number|null} The evaluated value, or `null` on a parse error.
 */
function parseFactor(parser) {
   // Current token to dispatch on.
   const token = peek(parser);
   if (token === null) {
      return null;
   }

   // Unary plus/minus applied to the following factor.
   if (token.type === 'op' && (token.value === '+' || token.value === '-')) {
      parser.index += 1;

      // The operand the unary sign applies to.
      const operand = parseFactor(parser);
      if (operand === null) {
         return null;
      }
      return token.value === '-' ? -operand : operand;
   }

   // Number literal.
   if (token.type === 'num') {
      parser.index += 1;
      return token.value;
   }

   // Parenthesized sub-expression.
   if (token.type === 'op' && token.value === '(') {
      parser.index += 1;

      // The value of the grouped sub-expression.
      const inner = parseExpression(parser);
      if (inner === null) {
         return null;
      }

      // Require a matching closing parenthesis.
      const closing = peek(parser);
      if (closing === null || closing.type !== 'op' || closing.value !== ')') {
         return null;
      }
      parser.index += 1;
      return inner;
   }

   return null;
}
