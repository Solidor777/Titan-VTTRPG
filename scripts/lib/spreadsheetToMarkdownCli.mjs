import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeSpreadsheetFiles } from '~/spreadsheet/format/DecodeSpreadsheetFiles.js';
import { workbookToDocuments } from '~/spreadsheet/markdown/WorkbookToDocuments.js';
import { renderCompendiumMarkdown } from '~/spreadsheet/markdown/RenderCompendiumMarkdown.js';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';

/**
 * Usage text printed for `--help`/`-h` or when no inputs are given.
 * @type {string}
 */
const USAGE = 'Usage: node scripts/spreadsheet-to-markdown.mjs <input> [<input>...] '
   + '[--out <file.md>] [--title <text>] [--lang <file>]';

/** @type {string} The repository root, two directories above this module. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @type {string} The default language file path, relative to the repo root. */
const DEFAULT_LANG_PATH = path.join(repoRoot, 'lang', 'en.json');

/** @type {Set<string>} The spreadsheet file extensions collected from a directory input. */
const SPREADSHEET_EXTENSIONS = new Set([
   '.csv',
   '.xlsx',
   '.zip',
]);

/**
 * @typedef {object} ParsedArgs
 * @property {boolean} help - Whether `--help`/`-h` was given.
 * @property {string|undefined} out - The `--out`/`-o` value.
 * @property {string|undefined} title - The `--title` value.
 * @property {string|undefined} lang - The `--lang` value.
 * @property {string[]} inputs - The positional input paths, in order.
 */

/**
 * Parses the CLI arguments into flags and positional input paths.
 * @param {string[]} argv - The CLI arguments (excluding the node executable and script path).
 * @returns {ParsedArgs} The parsed arguments.
 * @throws {Error} When a flag that requires a value is given without one.
 */
function parseArgs(argv) {
   /** @type {ParsedArgs} The accumulated parse result. */
   const result = {
      help: false,
      out: undefined,
      title: undefined,
      lang: undefined,
      inputs: [],
   };

   for (let i = 0; i < argv.length; i += 1) {
      /** @type {string} The current argument. */
      const arg = argv[i];

      if (arg === '--help' || arg === '-h') {
         result.help = true;
      } else if (arg === '--out' || arg === '-o') {
         i += 1;
         if (i >= argv.length) {
            throw new Error(`Missing value for ${arg}`);
         }
         result.out = argv[i];
      } else if (arg === '--title') {
         i += 1;
         if (i >= argv.length) {
            throw new Error(`Missing value for ${arg}`);
         }
         result.title = argv[i];
      } else if (arg === '--lang') {
         i += 1;
         if (i >= argv.length) {
            throw new Error(`Missing value for ${arg}`);
         }
         result.lang = argv[i];
      } else {
         result.inputs.push(arg);
      }
   }

   return result;
}

/**
 * Resolves a single CLI input path into the file entries it contributes: a directory expands to every
 * `.csv`/`.xlsx`/`.zip` file directly inside it (sorted by name); a file resolves to itself.
 * @param {string} inputPath - The CLI-supplied input path.
 * @returns {string[]} The resolved file paths.
 * @throws {Error} When the path does not exist.
 */
function resolveInputFiles(inputPath) {
   /** @type {import('node:fs').Stats} */
   const stats = statSync(inputPath);

   if (stats.isDirectory()) {
      return readdirSync(inputPath)
         .filter((name) => SPREADSHEET_EXTENSIONS.has(path.extname(name).toLowerCase()))
         .sort()
         .map((name) => path.join(inputPath, name));
   }

   return [inputPath];
}

/**
 * Groups resolved file paths into the calls `decodeSpreadsheetFiles` expects: every `.xlsx`/`.zip` file
 * is its own single-entry call, and all loose `.csv` files are grouped into one shared call.
 * @param {string[]} files - The resolved file paths, in resolution order.
 * @returns {Array<{name: string, bytes: Uint8Array}>[]} The grouped file entries, one array per call.
 */
function groupFilesForDecoding(files) {
   /** @type {Array<{name: string, bytes: Uint8Array}>[]} The grouped calls, in file order. */
   const groups = [];
   /** @type {Array<{name: string, bytes: Uint8Array}>} The shared group of loose `.csv` entries. */
   const csvGroup = [];

   for (const file of files) {
      /** @type {{name: string, bytes: Uint8Array}} The file's entry. */
      const entry = {
         name: path.basename(file),
         bytes: readFileSync(file),
      };
      /** @type {string} The file's lowercased extension. */
      const ext = path.extname(file).toLowerCase();

      if (ext === '.csv') {
         csvGroup.push(entry);
      } else {
         groups.push([entry]);
      }
   }

   if (csvGroup.length > 0) {
      groups.push(csvGroup);
   }

   return groups;
}

/**
 * Derives the default output path from the first resolved input path: a directory writes
 * `<dir>/<dirname>.md`; a file replaces its extension with `.md`.
 * @param {string} firstInput - The first CLI-supplied input path.
 * @returns {string} The default output path.
 */
function defaultOutPath(firstInput) {
   if (statSync(firstInput).isDirectory()) {
      /** @type {string} The directory's own basename, used as both the folder name and the file name. */
      const dirName = path.basename(path.resolve(firstInput));
      return path.join(firstInput, `${dirName}.md`);
   }

   return `${firstInput.slice(0, firstInput.length - path.extname(firstInput).length)}.md`;
}

/**
 * Derives the default document title from the first CLI-supplied input path's basename, without its
 * extension (a directory's own name has no extension to strip).
 * @param {string} firstInput - The first CLI-supplied input path.
 * @returns {string} The default title.
 */
function defaultTitle(firstInput) {
   /** @type {string} The input path's basename. */
   const base = path.basename(path.resolve(firstInput));
   return statSync(firstInput).isDirectory() ? base : base.slice(0, base.length - path.extname(base).length);
}

/**
 * CLI entry point for the spreadsheet-to-markdown export: parses arguments, decodes every spreadsheet
 * input, renders the Markdown compendium reference document, and writes it to disk.
 * @param {string[]} argv - The CLI arguments (excluding the node executable and script path).
 * @returns {Promise<number>} Resolves to the process exit code.
 */
export async function runCli(argv) {
   try {
      /** @type {ParsedArgs} The parsed CLI arguments. */
      const args = parseArgs(argv);

      if (args.help) {
         console.log(USAGE);
         return 0;
      }

      if (args.inputs.length === 0) {
         console.error(USAGE);
         return 1;
      }

      /** @type {string[]} Every resolved input file, across all CLI-supplied inputs, in order. */
      const files = args.inputs.flatMap((input) => resolveInputFiles(input));

      /** @type {object[]} Every renderable document, across all decoded workbooks, in order. */
      const documents = groupFilesForDecoding(files)
         .flatMap((entries) => workbookToDocuments(decodeSpreadsheetFiles(entries)));

      if (documents.length === 0) {
         throw new Error(`No renderable documents found in ${args.inputs.join(', ')}`);
      }

      /** @type {string} The language file path. */
      const langPath = args.lang ?? DEFAULT_LANG_PATH;
      /** @type {object} The parsed language JSON. */
      const langJson = JSON.parse(readFileSync(langPath, 'utf-8'));

      /** @type {string} The output document title. */
      const title = args.title ?? defaultTitle(args.inputs[0]);
      /** @type {string} The output file path. */
      const out = args.out ?? defaultOutPath(args.inputs[0]);

      /** @type {string} The rendered Markdown document. */
      const markdown = renderCompendiumMarkdown(documents, {
         title,
         labels: createLabels(langJson),
      });

      writeFileSync(out, markdown, 'utf-8');
      console.log(`Wrote ${out} (${documents.length} documents)`);
      return 0;
   } catch (error) {
      console.error(error.message);
      return 1;
   }
}
