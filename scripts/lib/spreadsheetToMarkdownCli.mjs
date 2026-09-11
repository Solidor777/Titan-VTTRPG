/**
 * Usage text printed for `--help`/`-h` or when no inputs are given.
 * @type {string}
 */
const USAGE = 'Usage: node scripts/spreadsheet-to-markdown.mjs <input> [<input>...] '
   + '[--out <file.md>] [--title <text>] [--lang <file>]';

/**
 * CLI entry point for the spreadsheet-to-markdown export.
 * TODO: parse arguments, decode spreadsheet inputs, and render the Markdown document.
 * @param {string[]} argv - The CLI arguments (excluding the node executable and script path).
 * @returns {Promise<number>} Resolves to the process exit code.
 */
export async function runCli(argv) {
   void argv;
   console.log(USAGE);
   return 0;
}
