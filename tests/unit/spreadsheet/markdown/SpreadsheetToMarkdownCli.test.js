import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';
import { encodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { workbookToDocuments } from '~/spreadsheet/markdown/WorkbookToDocuments.js';
import { renderCompendiumMarkdown } from '~/spreadsheet/markdown/RenderCompendiumMarkdown.js';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';

/** @type {string} The repository root, five directories above this test file. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** No schema-typed fields; column order falls back to first-seen and cells stay literally typed. */
const NO_SCHEMA = {};

/** @type {object} The system's real English localization map, used to match the CLI's default `--lang`. */
const realLang = JSON.parse(readFileSync(path.resolve(repoRoot, 'lang', 'en.json'), 'utf-8'));

/**
 * The fixed, gitignored sink every fixture and output file in this suite is written into. Every test
 * uses a deterministic file name inside it, so repeated runs overwrite rather than accumulate; nothing
 * in this suite is ever deleted.
 * @type {string}
 */
const sinkDir = path.resolve(repoRoot, 'debug', 'dumps', 'spreadsheet-to-markdown-cli');

beforeAll(() => {
   mkdirSync(sinkDir, { recursive: true });
});

/**
 * Builds the hand-made envelope set for a small Item pack: a weapon, an armor, and a spell inside a
 * `Magic` folder.
 * @returns {object[]} The document envelopes.
 */
function fixtureEnvelopes() {
   return [
      {
         documentType: 'weapon',
         source: {
            _id: 'a'.repeat(16),
            name: 'Sword',
            type: 'weapon',
            img: 'i.svg',
            sort: 1,
            system: {
               rarity: 'common',
               value: 5,
               attack: [],
               attackNotes: '',
               trait: [],
               check: [],
               description: '',
            },
         },
         parentId: '',
         folderPath: '',
      },
      {
         documentType: 'armor',
         source: {
            _id: 'b'.repeat(16),
            name: 'Plate',
            type: 'armor',
            img: 'i.svg',
            sort: 1,
            system: {
               rarity: 'common',
               value: 10,
               armor: { max: 3 },
               trait: [],
               check: [],
               description: '',
            },
         },
         parentId: '',
         folderPath: '',
      },
      {
         documentType: 'spell',
         source: {
            _id: 'c'.repeat(16),
            name: 'Fireball',
            type: 'spell',
            img: 'i.svg',
            sort: 1,
            system: {
               rarity: 'common',
               value: 0,
               xpCost: 1,
               tradition: '',
               castingCheck: {
                  attribute: 'mind',
                  skill: 'arcana',
                  difficulty: 4,
                  complexity: 1,
                  autoCalculateDC: true,
               },
               aspect: [],
               customAspect: [],
               customTrait: [],
               description: '',
            },
         },
         parentId: '',
         folderPath: 'Magic',
      },
   ];
}

/**
 * Writes the shared fixture pack as an `.xlsx` file at a deterministic path inside the sink directory,
 * overwriting whatever a previous run left there.
 * @param {string} fileName - The `.xlsx` file name to write inside the sink directory.
 * @returns {string} The written `.xlsx` file's absolute path.
 */
function writeFixtureXlsx(fileName) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
   const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
   /** @type {string} The written `.xlsx` file's path. */
   const xlsxPath = path.join(sinkDir, fileName);
   writeFileSync(xlsxPath, encodeXlsx(built));
   return xlsxPath;
}

/**
 * Runs the CLI script against the repo root, capturing stdout/stderr and never throwing on a non-zero
 * exit code.
 * @param {string[]} args - The CLI arguments.
 * @returns {{status: number, stdout: string, stderr: string}} The process result.
 */
function runCliProcess(args) {
   try {
      /** @type {string} Captured stdout. */
      const stdout = execFileSync('node', [
         'scripts/spreadsheet-to-markdown.mjs',
         ...args,
      ], {
         cwd: repoRoot,
         encoding: 'utf8',
      });
      return {
         status: 0,
         stdout,
         stderr: '',
      };
   } catch (error) {
      return {
         status: error.status,
         stdout: error.stdout ?? '',
         stderr: error.stderr ?? '',
      };
   }
}

describe('spreadsheet-to-markdown CLI', () => {
   it('renders a workbook to its default output path and title, matching direct rendering', () => {
      /** @type {string} The fixture `.xlsx` path. */
      const xlsxPath = writeFixtureXlsx('default-out.xlsx');
      /** @type {string} The default output path: the input path with its extension replaced by `.md`. */
      const expectedOut = xlsxPath.replace(/\.xlsx$/, '.md');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([xlsxPath]);

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(`Wrote ${expectedOut} (3 documents)`);

      /** @type {string} The written Markdown file's contents. */
      const written = readFileSync(expectedOut, 'utf-8');
      /** @type {object[]} The documents decoded directly from the same envelope fixture. */
      const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
      /** @type {string} The expected Markdown, rendered directly for byte comparison. */
      const expected = renderCompendiumMarkdown(
         workbookToDocuments(built),
         {
            title: 'default-out',
            labels: createLabels(realLang),
         },
      );

      expect(written).toBe(expected);
   });

   it('renders with an explicit --title and --out, overriding the input-derived defaults', () => {
      /** @type {string} The fixture `.xlsx` path. */
      const xlsxPath = writeFixtureXlsx('custom-out.xlsx');
      /** @type {string} The explicit output path, distinct from the input-derived default. */
      const outPath = path.join(sinkDir, 'custom-out-explicit.md');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([
         xlsxPath,
         '--title',
         'Custom Title',
         '--out',
         outPath,
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(`Wrote ${outPath} (3 documents)`);

      /** @type {string} The written Markdown file's contents. */
      const written = readFileSync(outPath, 'utf-8');
      /** @type {object[]} The documents decoded directly from the same envelope fixture. */
      const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
      /** @type {string} The expected Markdown, rendered directly with the explicit title. */
      const expected = renderCompendiumMarkdown(
         workbookToDocuments(built),
         {
            title: 'Custom Title',
            labels: createLabels(realLang),
         },
      );

      expect(written).toBe(expected);
   });

   it('renders every spreadsheet file directly inside a directory input', () => {
      /** @type {string} The directory input, containing one `.xlsx` and nothing else. */
      const dirPath = path.join(sinkDir, 'dir-input');
      mkdirSync(dirPath, { recursive: true });
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
      writeFileSync(path.join(dirPath, 'items.xlsx'), encodeXlsx(built));
      /** @type {string} The default output path for a directory input: `<dir>/<dirname>.md`. */
      const expectedOut = path.join(dirPath, 'dir-input.md');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([dirPath]);

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(`Wrote ${expectedOut} (3 documents)`);

      /** @type {string} The written Markdown file's contents. */
      const written = readFileSync(expectedOut, 'utf-8');
      /** @type {string} The expected Markdown, rendered directly with the directory-derived title. */
      const expected = renderCompendiumMarkdown(
         workbookToDocuments(built),
         {
            title: 'dir-input',
            labels: createLabels(realLang),
         },
      );

      expect(written).toBe(expected);
   });

   it('exits 1 with a stderr message for an Actor-pack workbook and does not write the output file', () => {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(
         [{
            documentType: 'npc',
            source: {
               _id: 'a'.repeat(16),
               name: 'Goblin',
               type: 'npc',
               img: 'i.svg',
               sort: 1,
               system: {},
            },
            parentId: '',
            folderPath: '',
         }],
         'wide',
         'Actor',
         NO_SCHEMA,
      );
      /** @type {string} The written `.xlsx` file's path. */
      const xlsxPath = path.join(sinkDir, 'actor-pack.xlsx');
      writeFileSync(xlsxPath, encodeXlsx(built));
      /** @type {string} The default output path a failed run must not touch. */
      const outPath = xlsxPath.replace(/\.xlsx$/, '.md');
      /** @type {string} A sentinel written before the run, to prove the CLI leaves it untouched on error. */
      const sentinel = 'sentinel: actor-pack must not overwrite this file';
      writeFileSync(outPath, sentinel, 'utf-8');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([xlsxPath]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim()).toBe(
         'Only Item compendium exports can be rendered as Markdown (this file is an Actor export)',
      );
      expect(readFileSync(outPath, 'utf-8')).toBe(sentinel);
   });

   it('exits 1 with a stderr message for a missing input path and does not write the output file', () => {
      /** @type {string} A CLI input path that does not exist on disk. */
      const missingPath = path.join(sinkDir, 'does-not-exist.xlsx');
      /** @type {string} The default output path a failed run must not touch. */
      const outPath = missingPath.replace(/\.xlsx$/, '.md');
      /** @type {string} A sentinel written before the run, to prove the CLI leaves it untouched on error. */
      const sentinel = 'sentinel: missing-path run must not overwrite this file';
      writeFileSync(outPath, sentinel, 'utf-8');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([missingPath]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim().length).toBeGreaterThan(0);
      expect(readFileSync(outPath, 'utf-8')).toBe(sentinel);
   });

   it('exits 1 with a stderr message when a directory input has no spreadsheet files', () => {
      /** @type {string} The directory input, containing no `.csv`/`.xlsx`/`.zip` files. */
      const dirPath = path.join(sinkDir, 'empty-dir-input');
      mkdirSync(dirPath, { recursive: true });
      writeFileSync(path.join(dirPath, 'notes.txt'), 'not a spreadsheet', 'utf-8');
      /** @type {string} The default output path a failed run must not touch. */
      const outPath = path.join(dirPath, 'empty-dir-input.md');
      /** @type {string} A sentinel written before the run, to prove the CLI leaves it untouched on error. */
      const sentinel = 'sentinel: empty-dir-input must not overwrite this file';
      writeFileSync(outPath, sentinel, 'utf-8');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([dirPath]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim().length).toBeGreaterThan(0);
      expect(readFileSync(outPath, 'utf-8')).toBe(sentinel);
   });

   it('exits 1 with a stderr message for an undecodable input file and does not write the output file', () => {
      /** @type {string} An `.xlsx`-named file that is not valid zip/xlsx data. */
      const junkPath = path.join(sinkDir, 'junk.xlsx');
      writeFileSync(junkPath, 'not a real xlsx file', 'utf-8');
      /** @type {string} The default output path a failed run must not touch. */
      const outPath = junkPath.replace(/\.xlsx$/, '.md');
      /** @type {string} A sentinel written before the run, to prove the CLI leaves it untouched on error. */
      const sentinel = 'sentinel: junk.xlsx must not overwrite this file';
      writeFileSync(outPath, sentinel, 'utf-8');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([junkPath]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim().length).toBeGreaterThan(0);
      expect(readFileSync(outPath, 'utf-8')).toBe(sentinel);
   });

   it('exits 1 with a stderr message when --lang points at a missing file', () => {
      /** @type {string} The fixture `.xlsx` path. */
      const xlsxPath = writeFixtureXlsx('missing-lang.xlsx');
      /** @type {string} A `--lang` path that does not exist on disk. */
      const missingLangPath = path.join(sinkDir, 'does-not-exist-lang.json');
      /** @type {string} The default output path a failed run must not touch. */
      const outPath = xlsxPath.replace(/\.xlsx$/, '.md');
      /** @type {string} A sentinel written before the run, to prove the CLI leaves it untouched on error. */
      const sentinel = 'sentinel: missing-lang run must not overwrite this file';
      writeFileSync(outPath, sentinel, 'utf-8');

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([
         xlsxPath,
         '--lang',
         missingLangPath,
      ]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim().length).toBeGreaterThan(0);
      expect(readFileSync(outPath, 'utf-8')).toBe(sentinel);
   });

   it('prints usage and exits 0 for --help', () => {
      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess(['--help']);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Usage: node scripts/spreadsheet-to-markdown.mjs');
   });

   it('prints usage to stderr and exits 1 when given no inputs', () => {
      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Usage: node scripts/spreadsheet-to-markdown.mjs');
   });
});
