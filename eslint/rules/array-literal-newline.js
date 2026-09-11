/**
 * Local ESLint rule enforcing the house rule that array literals with 2+ elements are multi-line.
 * Applies only to `ArrayExpression` nodes (array literals); `ArrayPattern` (destructuring) is left
 * alone because `@stylistic/array-bracket-newline` and `@stylistic/array-element-newline` cannot be
 * scoped to literals only. Reports a missing line break after `[`, after any element's trailing
 * comma, and before `]`; the fixer inserts bare newlines and relies on a later `@stylistic/indent
 * --fix` pass to re-indent them.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const arrayLiteralNewlineRule = {
   meta: {
      type: 'layout',
      fixable: 'whitespace',
      schema: [],
      messages: {
         missingOpeningBreak: 'Expected a line break after this opening bracket.',
         missingClosingBreak: 'Expected a line break before this closing bracket.',
         missingElementBreak: 'Expected a line break after this comma.',
      },
   },
   /**
    * Builds the rule's visitor.
    *
    * @param {import('eslint').Rule.RuleContext} context - The rule's execution context.
    * @returns {import('eslint').Rule.RuleListener} Visitor that reports and fixes array-literal newlines.
    */
   create(context) {
      // ESLint 9 exposes sourceCode directly; context.getSourceCode() is the pre-9 fallback.
      const sourceCode = context.sourceCode ?? context.getSourceCode();

      return {
         /**
          * Validates the opening-bracket, per-element, and closing-bracket line breaks of an array literal
          * with 2 or more elements. Sparse-array holes (`null` elements) are skipped since they have no
          * token to anchor a comma check.
          *
          * @param {import('estree').ArrayExpression} node - The array literal being visited.
          * @returns {void}
          */
         ArrayExpression(node) {
            if (node.elements.length < 2) {
               return;
            }

            const openBracket = sourceCode.getFirstToken(node);
            const closeBracket = sourceCode.getLastToken(node);
            const firstToken = sourceCode.getTokenAfter(openBracket);

            if (firstToken.loc.start.line === openBracket.loc.end.line) {
               context.report({
                  node,
                  loc: openBracket.loc,
                  messageId: 'missingOpeningBreak',
                  fix: (fixer) => fixer.insertTextAfter(openBracket, '\n'),
               });
            }

            const lastToken = sourceCode.getTokenBefore(closeBracket);

            if (lastToken.loc.end.line === closeBracket.loc.start.line) {
               context.report({
                  node,
                  loc: closeBracket.loc,
                  messageId: 'missingClosingBreak',
                  fix: (fixer) => fixer.insertTextBefore(closeBracket, '\n'),
               });
            }

            for (const element of node.elements) {
               if (element === null) {
                  continue;
               }

               const comma = sourceCode.getTokenAfter(element, {
                  filter: (token) => token.value === ',',
               });

               if (!comma || comma.range[0] >= closeBracket.range[0]) {
                  continue;
               }

               const afterComma = sourceCode.getTokenAfter(comma);

               // A trailing comma right before `]` is already covered by the closing-break check above.
               if (!afterComma || afterComma === closeBracket) {
                  continue;
               }

               if (afterComma.loc.start.line === comma.loc.end.line) {
                  context.report({
                     node,
                     loc: comma.loc,
                     messageId: 'missingElementBreak',
                     fix: (fixer) => fixer.insertTextAfter(comma, '\n'),
                  });
               }
            }
         },
      };
   },
};

export default arrayLiteralNewlineRule;
