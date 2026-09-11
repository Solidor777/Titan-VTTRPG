import { describe, expect, it, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

/** @type {string[]} Temp directories created by this suite, cleaned up after every test. */
const tempDirs = [];

/**
 * Creates a fresh `mkdtemp` scratch directory and records it for post-test cleanup.
 * @returns {string} The created directory's path.
 */
function makeTempDir() {
   /** @type {string} The created temp directory's path. */
   const dir = mkdtempSync(path.join(tmpdir(), 'titan-markdown-cli-'));
   tempDirs.push(dir);
   return dir;
}

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
            system: { rarity: 'common', value: 5, attack: [], attackNotes: '', trait: [], check: [], description: '' },
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
 * Writes the shared fixture pack as an `.xlsx` file into a fresh temp directory.
 * @returns {{dir: string, xlsxPath: string}} The temp directory and the written `.xlsx` file's path.
 */
function writeFixtureXlsx() {
   /** @type {string} The scratch directory. */
   const dir = makeTempDir();
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
   const built = buildTables(fixtureEnvelopes(), 'wide', 'Item', NO_SCHEMA);
   /** @type {string} The written `.xlsx` file's path. */
   const xlsxPath = path.join(dir, 'items.xlsx');
   writeFileSync(xlsxPath, encodeXlsx(built));
   return { dir, xlsxPath };
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
      const stdout = execFileSync('node', ['scripts/spreadsheet-to-markdown.mjs', ...args], {
         cwd: repoRoot,
         encoding: 'utf8',
      });
      return { status: 0, stdout, stderr: '' };
   } catch (error) {
      return { status: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
   }
}

afterEach(() => {
   while (tempDirs.length > 0) {
      rmSync(tempDirs.pop(), { recursive: true, force: true });
   }
});

describe('spreadsheet-to-markdown CLI', () => {
   it('renders a workbook to its default output path and title, matching direct rendering', () => {
      /** @type {{dir: string, xlsxPath: string}} The fixture directory and `.xlsx` path. */
      const { xlsxPath } = writeFixtureXlsx();
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
         { title: 'items', labels: createLabels(realLang) },
      );

      expect(written).toBe(expected);
   });

   it('exits 1 with a stderr message for an Actor-pack workbook', () => {
      /** @type {string} The scratch directory. */
      const dir = makeTempDir();
      /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
      const built = buildTables(
         [{
            documentType: 'npc',
            source: { _id: 'a'.repeat(16), name: 'Goblin', type: 'npc', img: 'i.svg', sort: 1, system: {} },
            parentId: '',
            folderPath: '',
         }],
         'wide',
         'Actor',
         NO_SCHEMA,
      );
      /** @type {string} The written `.xlsx` file's path. */
      const xlsxPath = path.join(dir, 'actors.xlsx');
      writeFileSync(xlsxPath, encodeXlsx(built));

      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([xlsxPath]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim()).toBe(
         'Only Item compendium exports can be rendered as Markdown (this file is an Actor export)',
      );
   });

   it('exits 1 with a stderr message for a missing input path', () => {
      /** @type {{status: number, stdout: string, stderr: string}} The CLI process result. */
      const result = runCliProcess([path.join(makeTempDir(), 'does-not-exist.xlsx')]);

      expect(result.status).toBe(1);
      expect(result.stderr.trim().length).toBeGreaterThan(0);
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
