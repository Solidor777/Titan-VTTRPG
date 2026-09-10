# Compendium Spreadsheet Export/Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a GM export any TITAN compendium (Actor, Item, or ActiveEffect pack) to an XLSX or CSV
spreadsheet, edit it externally, and import it back into the same or a new compendium — every field of
every document type, arrays included.

**Architecture:** Three layers with one-way dependencies: `codec/` (pure data transforms, no Foundry
globals), `format/` (CSV/XLSX/zip bytes ↔ a format-agnostic `Workbook`), `io/` (Foundry documents,
schema resolution, file download/upload) and `ui/` (two `TitanDialog` Svelte mounts) on top. Two new
hooks add the entry points to the Compendium sidebar.

**Tech Stack:** Vanilla JS + JSDoc (project convention), Svelte 5 for the two dialogs, `fflate` for zip.

**Spec:** `docs/superpowers/specs/2026-09-10-compendium-spreadsheet-design.md`

## Model/Effort directives

Per `~/.claude/docs/sdd-model-effort-tiers.md` and this project's `CLAUDE.md` (which mandates the named
`sdd-*` agents for this pipeline on non-Fable models — this session is Sonnet 5):

- **Dispatcher:** `sdd-dispatcher`-equivalent role run by the calling session itself (mainline dispatch),
  Sonnet, low effort — route tasks, escalate on BLOCKED/DONE_WITH_CONCERNS, never solve problems itself.
- **Implementer (default):** `sdd-implementer` (Sonnet, medium) for every task below.
  - **Escalate** to `sdd-implementer-highthink` (Sonnet, high) for Task 9 (BuildTables) and Task 10
    (ReadTables) on first BLOCKED/DONE_WITH_CONCERNS — these two tasks carry the plan's only genuinely
    intricate algorithm (nested-array path matching); Opus only if highthink also blocks.
  - **De-escalate** to `sdd-implementer-haiku` for Task 1 (dependency + zip wrapper) and Task 18
    (documentation) — single-file, mechanical.
- **Per-task reviewer:** `sdd-reviewer` (Sonnet, high) for every task; escalate to `sdd-reviewer-opus`
  for Task 9, Task 10, and Task 13 (ApplyImport's embedded-document depth handling).
- **Final reviewer:** `sdd-final-reviewer` (Opus, high), once, after Task 18.

## Buddy-check directives

Not offered. The buddy-checking skill's high-risk signals (irreversible external actions, security-
sensitive surface, ambiguous/contested spec) don't apply here: the spec is settled and approved, writes
are confined to compendium documents the GM explicitly targets, delete-missing is opt-in and previewed
before any write, and per-task review already runs at Sonnet-high/Opus-high per the ladder above.

## Global Constraints

- 120-character wrap limit; multi-line `{}` for all conditional scopes; multi-line objects/arrays with
  more than one entry; every Svelte tag with >1 attribute puts `>`/`/>` on its own line.
- Every variable is typed with a one-line comment; every function has a multi-line JSDoc comment with
  typed `@param`s and a typed `@returns` (including async).
- `:global` SCSS selectors are forbidden.
- No dynamic imports in shipping code (`src/**`, excluding `tests/**`). Vitest unit tests that need to
  install `foundry.data.fields.*` mocks before import MAY use dynamic `import()` — this is the
  established pattern in `tests/unit/BuildSchemaFromShape.test.js`.
- No test/e2e code compiled into the shipping build.
- New runtime dependency: `fflate`, pinned to an exact version (no `^`/`~` range) in `package.json`.
- Every deferred item or discovered bug is logged to `docs/TODO.md` / `docs/OPEN_BUGS.md` at the moment
  it's found, not batched to the end.
- Every code file lives under `src/spreadsheet/` per the module layout below; hooks live in
  `src/hooks/` and are wired in `src/index.js`, matching every other hook in the codebase.
- Known, disclosed simplifications versus a fully general reading of the spec (call these out to the
  user in the final report, don't silently narrow further):
  - Relational child-sheet columns use first-seen order, not schema field order (schema order is
    applied to the document sheet and to wide-layout columns).
  - The delete-missing import option only deletes top-level pack documents; an actor's embedded items/
    effects are never deleted by omission (only created/updated). This matches the spec's own scope for
    "pack documents absent from the file", which compendium indices only ever enumerate at the top level.

## Module Layout

```
src/spreadsheet/
  codec/
    Workbook.js            shared constants (FIXED_COLUMNS, FIXED_COLUMN_TYPES) + normalizePath + createEmptySheet
    FlattenDocument.js      document source -> flat {path: value}
    UnflattenRow.js         flat {path: value} -> document source (ABSENT sentinel, array compaction)
    DecodeCell.js           raw cell -> typed/decoded value (schema-driven where typed, literal otherwise)
    BuildTables.js          document envelopes -> Workbook (wide or relational), incl. _manifest
    ReadTables.js           Workbook -> document envelopes (layout auto-detected from _manifest)
  format/
    Zip.js                  fflate wrappers: zip/unzip named files
    Csv.js                  RFC 4180 writer + parser, one Sheet <-> one text
    Xlsx.js                 minimal .xlsx writer + reader over Zip.js
  io/
    ResolveTypeSchemas.js    CONFIG dataModels -> per-subtype {fieldTypes, fieldOrder}
    ExportCompendium.js      pack -> Workbook -> bytes -> foundry.utils.saveDataToFile
    PlanImport.js            files -> Workbook -> validated ImportPlan
    ApplyImport.js           ImportPlan -> create/update/delete documents
  ui/
    ExportDialog.js, ExportDialogShell.svelte
    ImportDialog.js, ImportDialogShell.svelte
src/hooks/
    OnGetCompendiumContextOptions.js   "Export to spreadsheet…" / "Import spreadsheet…" per pack entry
    OnRenderCompendiumDirectory.js     "Import spreadsheet…" header button on the Compendium sidebar tab
```

---

### Task 1: `fflate` dependency + Zip wrapper

**Files:**
- Modify: `package.json`
- Create: `src/spreadsheet/format/Zip.js`
- Test: `tests/unit/spreadsheet/format/Zip.test.js`

**Interfaces:**
- Produces: `zipFiles(files: Object<string, Uint8Array|string>): Uint8Array`,
  `unzipFilesAsText(bytes: Uint8Array): Object<string, string>`,
  `unzipFilesAsBytes(bytes: Uint8Array): Object<string, Uint8Array>`.

- [ ] **Step 1: Add the dependency**

Add to `package.json` `dependencies` (exact version, no range):

```json
"fflate": "0.8.3",
```

Run `npm install` and confirm `node_modules/fflate` and a matching `package-lock.json` entry exist.

- [ ] **Step 2: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { zipFiles, unzipFilesAsText, unzipFilesAsBytes } from '~/spreadsheet/format/Zip.js';

describe('Zip', () => {
   it('round-trips text files through zipFiles/unzipFilesAsText', () => {
      const bytes = zipFiles({ 'a.txt': 'hello', 'b.txt': 'wörld' });
      expect(unzipFilesAsText(bytes)).toEqual({ 'a.txt': 'hello', 'b.txt': 'wörld' });
   });

   it('round-trips raw bytes through unzipFilesAsBytes', () => {
      const original = new Uint8Array([1, 2, 3, 4]);
      const bytes = zipFiles({ 'raw.bin': original });
      expect(unzipFilesAsBytes(bytes)['raw.bin']).toEqual(original);
   });
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/format/Zip.test.js`
Expected: FAIL — cannot find module `~/spreadsheet/format/Zip.js`.

- [ ] **Step 3: Implement**

```js
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';

/**
 * Zips a set of named files into a single archive.
 * @param {Object<string, Uint8Array|string>} files - Map of archive-relative filename to its content;
 *    string values are UTF-8 encoded automatically.
 * @returns {Uint8Array} The zip archive bytes.
 */
export function zipFiles(files) {
   /** @type {Object<string, Uint8Array>} Byte-encoded file map required by fflate's zipSync. */
   const encoded = {};
   for (const [name, content] of Object.entries(files)) {
      encoded[name] = typeof content === 'string' ? strToU8(content) : content;
   }
   return zipSync(encoded, { level: 6 });
}

/**
 * Unzips an archive into a map of filename to UTF-8 decoded text content.
 * @param {Uint8Array} bytes - The zip archive bytes.
 * @returns {Object<string, string>} Map of archive-relative filename to its decoded text content.
 */
export function unzipFilesAsText(bytes) {
   /** @type {Object<string, Uint8Array>} The decompressed file map. */
   const decoded = unzipSync(bytes);
   /** @type {Object<string, string>} The text-decoded result. */
   const result = {};
   for (const [name, content] of Object.entries(decoded)) {
      result[name] = strFromU8(content);
   }
   return result;
}

/**
 * Unzips an archive into a map of filename to raw bytes, for binary formats like XLSX internals.
 * @param {Uint8Array} bytes - The zip archive bytes.
 * @returns {Object<string, Uint8Array>} Map of archive-relative filename to its raw byte content.
 */
export function unzipFilesAsBytes(bytes) {
   return unzipSync(bytes);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/format/Zip.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/spreadsheet/format/Zip.js tests/unit/spreadsheet/format/Zip.test.js
git commit -m "feat: add fflate dependency and a zip/unzip wrapper for the spreadsheet tool"
```

---

### Task 2: `codec/Workbook.js` — shared constants and path utilities

**Files:**
- Create: `src/spreadsheet/codec/Workbook.js`
- Test: `tests/unit/spreadsheet/codec/Workbook.test.js`

**Interfaces:**
- Consumes: nothing (first codec file).
- Produces: `FIXED_COLUMNS: string[]`, `FIXED_COLUMN_TYPES: Object<string,{type,nullable}>`,
  `normalizePath(path: string): string`, `createEmptySheet(name: string): {name, columns: [], rows: []}`.
  Every later codec/format file imports `FIXED_COLUMNS`/`FIXED_COLUMN_TYPES`/`normalizePath` from here
  rather than redefining them.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { FIXED_COLUMNS, FIXED_COLUMN_TYPES, normalizePath, createEmptySheet } from '~/spreadsheet/codec/Workbook.js';

describe('Workbook constants and utilities', () => {
   it('lists the fixed leading columns in order', () => {
      expect(FIXED_COLUMNS).toEqual(['_id', '_parentId', '_folder', 'name', 'type', 'img', 'sort']);
   });

   it('gives every fixed column a type entry', () => {
      for (const column of FIXED_COLUMNS) {
         expect(FIXED_COLUMN_TYPES[column]).toBeDefined();
      }
      expect(FIXED_COLUMN_TYPES.sort).toEqual({ type: 'number', nullable: false });
      expect(FIXED_COLUMN_TYPES._parentId).toEqual({ type: 'string', nullable: true });
   });

   it('normalizePath replaces numeric segments with a wildcard', () => {
      expect(normalizePath('system.attack.0.trait.1.name')).toBe('system.attack.*.trait.*.name');
      expect(normalizePath('system.rarity')).toBe('system.rarity');
   });

   it('createEmptySheet builds an empty sheet with the given name', () => {
      expect(createEmptySheet('weapon')).toEqual({ name: 'weapon', columns: [], rows: [] });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/Workbook.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * @typedef {object} Sheet
 * @property {string} name - The sheet's display/file name.
 * @property {string[]} columns - Column names, in display order.
 * @property {Array<Object<string, string|number|boolean|null|undefined>>} rows - Row data, each row a
 *    map of column name to cell value (undefined for a cell absent from the underlying file).
 */

/**
 * @typedef {object} Workbook
 * @property {Sheet[]} sheets - Every sheet in the workbook, `_manifest` first when present.
 */

/**
 * The fixed leading columns every document-type sheet carries, in display order, before any
 * type-specific `system.*`/`flags.*`/`prototypeToken.*` columns.
 * @type {string[]}
 */
export const FIXED_COLUMNS = ['_id', '_parentId', '_folder', 'name', 'type', 'img', 'sort'];

/**
 * Schema-equivalent type info for the fixed leading columns, since they live on the Document itself
 * rather than in a DataModel's `system` schema that `resolveFieldSchema` could walk.
 * @type {Object<string, {type: 'string'|'number'|'boolean', nullable: boolean}>}
 */
export const FIXED_COLUMN_TYPES = {
   _id: { type: 'string', nullable: false },
   _parentId: { type: 'string', nullable: true },
   _folder: { type: 'string', nullable: true },
   name: { type: 'string', nullable: false },
   type: { type: 'string', nullable: false },
   img: { type: 'string', nullable: false },
   sort: { type: 'number', nullable: false },
};

/**
 * Normalizes a concrete dotted field path by replacing every purely-numeric segment (an array index)
 * with `*`, matching the wildcard form schema-derived field paths use.
 * @param {string} path - The concrete dotted path, e.g. "system.attack.0.trait.1.name".
 * @returns {string} The normalized path, e.g. "system.attack.*.trait.*.name".
 */
export function normalizePath(path) {
   return path.split('.').map((segment) => (/^\d+$/.test(segment) ? '*' : segment)).join('.');
}

/**
 * Builds an empty Sheet with the given name.
 * @param {string} name - The sheet name.
 * @returns {Sheet} The empty sheet.
 */
export function createEmptySheet(name) {
   return { name, columns: [], rows: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/codec/Workbook.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/codec/Workbook.js tests/unit/spreadsheet/codec/Workbook.test.js
git commit -m "feat: add the spreadsheet Workbook model's shared constants and path utilities"
```

---

### Task 3: `format/Csv.js` — RFC 4180 writer and parser

**Files:**
- Create: `src/spreadsheet/format/Csv.js`
- Test: `tests/unit/spreadsheet/format/Csv.test.js`

**Interfaces:**
- Consumes: nothing beyond plain `Sheet` objects (see Task 2's typedef).
- Produces: `encodeCsv(sheet: Sheet): string`, `decodeCsv(text: string, sheetName?: string): Sheet`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { encodeCsv, decodeCsv } from '~/spreadsheet/format/Csv.js';

describe('Csv', () => {
   const sheet = {
      name: 'weapon',
      columns: ['_id', 'name', 'description'],
      rows: [
         { _id: 'a'.repeat(16), name: 'Sword', description: 'A "sharp", multi\nline blade.' },
         { _id: 'b'.repeat(16), name: 'Bow', description: '' },
      ],
   };

   it('encodes with a BOM, CRLF, and RFC 4180 quoting for commas/quotes/newlines', () => {
      const text = encodeCsv(sheet);
      expect(text.startsWith('﻿')).toBe(true);
      expect(text).toContain('\r\n');
      expect(text).toContain('"A ""sharp"", multi\nline blade."');
   });

   it('round-trips through decodeCsv, preserving blank cells as empty strings', () => {
      const decoded = decodeCsv(encodeCsv(sheet), 'weapon');
      expect(decoded).toEqual({
         name: 'weapon',
         columns: sheet.columns,
         rows: [
            { _id: 'a'.repeat(16), name: 'Sword', description: 'A "sharp", multi\nline blade.' },
            { _id: 'b'.repeat(16), name: 'Bow', description: '' },
         ],
      });
   });

   it('strips a leading byte-order mark on decode', () => {
      const decoded = decodeCsv('﻿a,b\r\n1,2\r\n', 'x');
      expect(decoded.rows).toEqual([{ a: '1', b: '2' }]);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/format/Csv.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * Encodes one Sheet as RFC 4180 CSV text, with a UTF-8 byte-order mark so Excel decodes non-ASCII text
 * correctly, and CRLF line endings per the RFC.
 * @param {import('~/spreadsheet/codec/Workbook.js').Sheet} sheet - The sheet to encode.
 * @returns {string} The CSV text, BOM included.
 */
export function encodeCsv(sheet) {
   /** @type {string[]} One encoded line per row, header first. */
   const lines = [sheet.columns, ...sheet.rows.map((row) => sheet.columns.map((col) => row[col]))]
      .map((cells) => cells.map(encodeCsvField).join(','));
   return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * Encodes a single CSV field, quoting it (and doubling internal quotes) whenever it contains a comma,
 * quote, or newline. A blank cell (undefined or null) encodes as an empty field.
 * @param {string|number|boolean|undefined|null} value - The cell value.
 * @returns {string} The encoded field, unquoted unless quoting is required.
 */
function encodeCsvField(value) {
   if (value === undefined || value === null) {
      return '';
   }
   /** @type {string} The field's text form. */
   const text = String(value);
   if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
   }
   return text;
}

/**
 * Parses RFC 4180 CSV text into a Sheet: the first record is the column names, every later record a
 * row object keyed by column name. Strips a leading UTF-8 byte-order mark if present.
 * @param {string} text - The CSV text.
 * @param {string} [sheetName] - The sheet name to assign (CSV carries no sheet name of its own).
 * @returns {import('~/spreadsheet/codec/Workbook.js').Sheet} The decoded sheet.
 */
export function decodeCsv(text, sheetName = 'Sheet1') {
   /** @type {string[][]} Every parsed record (row) as an array of field strings. */
   const records = parseCsvRecords(text.replace(/^﻿/, ''));
   const [header, ...dataRecords] = records;
   return {
      name: sheetName,
      columns: header ?? [],
      rows: dataRecords
         .filter((record) => !(record.length === 1 && record[0] === ''))
         .map((record) => Object.fromEntries((header ?? []).map((col, i) => [col, record[i]]))),
   };
}

/**
 * Parses raw CSV text into an array of records, each an array of field strings, honouring RFC 4180
 * quoting (doubled quotes escape a literal quote, and a quoted field may contain commas and newlines).
 * A single-column sheet whose sole cell is legitimately blank on every row is not fully distinguishable
 * from a trailing blank line under this parser; this system's sheets always carry multiple fixed
 * columns, so the ambiguity does not arise in practice.
 * @param {string} text - The raw CSV text.
 * @returns {string[][]} The parsed records.
 */
function parseCsvRecords(text) {
   /** @type {string[][]} Completed records. */
   const records = [];
   /** @type {string[]} Fields completed so far in the current record. */
   let fields = [];
   /** @type {string} Characters accumulated for the current field. */
   let field = '';
   /** @type {boolean} Whether the parser is inside a quoted field. */
   let inQuotes = false;

   for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (inQuotes) {
         if (ch === '"' && text[i + 1] === '"') {
            field += '"';
            i += 1;
         }
         else if (ch === '"') {
            inQuotes = false;
         }
         else {
            field += ch;
         }
         continue;
      }

      if (ch === '"') {
         inQuotes = true;
      }
      else if (ch === ',') {
         fields.push(field);
         field = '';
      }
      else if (ch === '\r') {
         // Ignore; a paired \n (or a lone \r, treated as a line end) below closes the record.
      }
      else if (ch === '\n') {
         fields.push(field);
         records.push(fields);
         fields = [];
         field = '';
      }
      else {
         field += ch;
      }
   }
   if (field !== '' || fields.length > 0) {
      fields.push(field);
      records.push(fields);
   }
   return records;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/format/Csv.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/format/Csv.js tests/unit/spreadsheet/format/Csv.test.js
git commit -m "feat: add the RFC 4180 CSV writer and parser for the spreadsheet tool"
```

---

### Task 4: `format/Xlsx.js` — minimal XLSX writer and reader

**Files:**
- Create: `src/spreadsheet/format/Xlsx.js`
- Test: `tests/unit/spreadsheet/format/Xlsx.test.js`

**Interfaces:**
- Consumes: `zipFiles`, `unzipFilesAsText` from `~/spreadsheet/format/Zip.js` (Task 1).
- Produces: `encodeXlsx(workbook: Workbook): Uint8Array`, `decodeXlsx(bytes: Uint8Array): Workbook`,
  `uniqueSheetNames(names: string[]): string[]` (exported for Task 9's manifest naming to reuse).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { encodeXlsx, decodeXlsx, uniqueSheetNames } from '~/spreadsheet/format/Xlsx.js';

describe('Xlsx', () => {
   const workbook = {
      sheets: [
         {
            name: 'weapon',
            columns: ['_id', 'name', 'damage', 'equipped', 'notes'],
            rows: [
               { _id: 'a'.repeat(16), name: 'Sword & Shield', damage: 5, equipped: true, notes: undefined },
               { _id: 'b'.repeat(16), name: 'Bow', damage: 0, equipped: false, notes: '"5"' },
            ],
         },
      ],
   };

   it('round-trips strings, numbers, booleans, and blanks through encode/decode', () => {
      const decoded = decodeXlsx(encodeXlsx(workbook));
      expect(decoded.sheets).toHaveLength(1);
      expect(decoded.sheets[0].name).toBe('weapon');
      expect(decoded.sheets[0].columns).toEqual(workbook.sheets[0].columns);
      expect(decoded.sheets[0].rows[0]).toEqual({
         _id: 'a'.repeat(16), name: 'Sword & Shield', damage: 5, equipped: true, notes: undefined,
      });
      expect(decoded.sheets[0].rows[1]).toEqual({
         _id: 'b'.repeat(16), name: 'Bow', damage: 0, equipped: false, notes: '"5"',
      });
   });

   it('escapes XML-significant characters and unescapes them back', () => {
      const decoded = decodeXlsx(encodeXlsx(workbook));
      expect(decoded.sheets[0].rows[0].name).toBe('Sword & Shield');
   });

   describe('uniqueSheetNames', () => {
      it('truncates to 31 characters and strips forbidden characters', () => {
         const [name] = uniqueSheetNames(['a very long sheet name that exceeds thirty one chars']);
         expect(name.length).toBeLessThanOrEqual(31);
      });

      it('de-duplicates collisions with a numeric suffix', () => {
         const names = uniqueSheetNames(['weapon', 'weapon']);
         expect(names[0]).toBe('weapon');
         expect(names[1]).not.toBe('weapon');
         expect(new Set(names).size).toBe(2);
      });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/format/Xlsx.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
import { zipFiles, unzipFilesAsText } from '~/spreadsheet/format/Zip.js';

/**
 * Escapes text for safe inclusion as XML element content (not attribute values, which this module
 * never builds from untrusted text).
 * @param {string} text - The raw text.
 * @returns {string} The XML-escaped text.
 */
function escapeXml(text) {
   return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Reverses escapeXml, plus the numeric-character-reference and quote/apostrophe entities a real
 * spreadsheet application (Excel, Google Sheets) may emit.
 * @param {string} text - The XML text content.
 * @returns {string} The unescaped text.
 */
function unescapeXml(text) {
   return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&amp;/g, '&');
}

/**
 * Converts a zero-based column index to its spreadsheet letter reference (0 -> A, 25 -> Z, 26 -> AA).
 * @param {number} index - Zero-based column index.
 * @returns {string} The column letter reference.
 */
function columnLetter(index) {
   /** @type {string} The accumulated letters, built least-significant-first then reversed. */
   let letters = '';
   /** @type {number} The remaining index value being converted. */
   let remaining = index;
   do {
      letters = String.fromCharCode(65 + (remaining % 26)) + letters;
      remaining = Math.floor(remaining / 26) - 1;
   } while (remaining >= 0);
   return letters;
}

/**
 * Converts a spreadsheet column letter reference to its zero-based index (A -> 0, Z -> 25, AA -> 26).
 * @param {string} letters - The column letters.
 * @returns {number} The zero-based column index.
 */
function columnIndex(letters) {
   return [...letters].reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
}

/**
 * Builds the XML for a single cell, dispatching on the runtime type of its value. Every string cell is
 * written as an inline string (t="inlineStr") so the writer needs no shared-strings table.
 * @param {string|number|boolean|null|undefined} value - The cell value (null/undefined for blank).
 * @param {number} rowIndex - Zero-based row index.
 * @param {number} colIndex - Zero-based column index.
 * @returns {string} The cell XML, or an empty string for a blank cell.
 */
function buildCellXml(value, rowIndex, colIndex) {
   /** @type {string} The A1-style cell reference. */
   const ref = `${columnLetter(colIndex)}${rowIndex + 1}`;
   if (value === undefined || value === null) {
      return '';
   }
   if (typeof value === 'boolean') {
      return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
   }
   if (typeof value === 'number') {
      return `<c r="${ref}"><v>${value}</v></c>`;
   }
   return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

/**
 * Builds the XML for a single worksheet from a Sheet model: the header row (column names) followed by
 * one row per data row.
 * @param {import('~/spreadsheet/codec/Workbook.js').Sheet} sheet - The sheet to render.
 * @returns {string} The worksheet XML document.
 */
function buildSheetXml(sheet) {
   /** @type {Array<Array<string|number|boolean|undefined>>} Header row, then every data row's cells. */
   const allRows = [sheet.columns, ...sheet.rows.map((row) => sheet.columns.map((col) => row[col]))];

   /** @type {string[]} XML for each row. */
   const rowsXml = allRows.map((cells, rowIndex) => {
      /** @type {string[]} XML for each cell in this row (blank cells contribute nothing). */
      const cellsXml = cells.map((value, colIndex) => buildCellXml(value, rowIndex, colIndex));
      return `<row r="${rowIndex + 1}">${cellsXml.join('')}</row>`;
   });

   return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + `<sheetData>${rowsXml.join('')}</sheetData></worksheet>`;
}

/**
 * Truncates and de-duplicates sheet names to Excel's 31-character limit, stripping the characters
 * Excel forbids in a sheet name (`[ ] : * ? / \`).
 * @param {string[]} names - The desired sheet names, in order.
 * @returns {string[]} The final sheet names, unique and each 31 characters or fewer.
 */
export function uniqueSheetNames(names) {
   /** @type {Set<string>} Names already assigned, to detect and resolve collisions. */
   const used = new Set();
   return names.map((rawName) => {
      /** @type {string} The name with forbidden characters stripped. */
      const cleaned = rawName.replace(/[[\]:*?/\\]/g, '');
      /** @type {string} The candidate name, truncated and made unique below. */
      let candidate = cleaned.slice(0, 31);
      let suffix = 1;
      while (used.has(candidate)) {
         /** @type {string} The numeric collision-breaking suffix, e.g. "~2". */
         const tag = `~${(suffix += 1)}`;
         candidate = `${cleaned.slice(0, 31 - tag.length)}${tag}`;
      }
      used.add(candidate);
      return candidate;
   });
}

/**
 * Builds the top-level `[Content_Types].xml` declaring the workbook and each worksheet part.
 * @param {number} sheetCount - Number of worksheets in the workbook.
 * @returns {string} The content-types XML document.
 */
function buildContentTypesXml(sheetCount) {
   /** @type {string[]} One <Override> per worksheet part. */
   const overrides = [];
   for (let i = 1; i <= sheetCount; i += 1) {
      overrides.push(
         `<Override PartName="/xl/worksheets/sheet${i}.xml" `
         + 'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      );
   }
   return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" '
      + 'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + `${overrides.join('')}</Types>`;
}

/**
 * Builds the package-level relationship pointing at the workbook part (`_rels/.rels`).
 * @returns {string} The package-rels XML document.
 */
function buildPackageRelsXml() {
   return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" '
      + 'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
      + 'Target="xl/workbook.xml"/></Relationships>';
}

/**
 * Builds `xl/workbook.xml`, listing every sheet by its final (already-truncated/de-duplicated) name.
 * @param {string[]} sheetNames - The final sheet names, in order.
 * @returns {string} The workbook XML document.
 */
function buildWorkbookXml(sheetNames) {
   /** @type {string[]} One <sheet> element per worksheet. */
   const sheetTags = sheetNames.map((name, i) => (
      `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
   ));
   return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${sheetTags.join('')}</sheets></workbook>`;
}

/**
 * Builds `xl/_rels/workbook.xml.rels`, mapping each sheet relationship id to its worksheet part.
 * @param {number} sheetCount - Number of worksheets.
 * @returns {string} The workbook-rels XML document.
 */
function buildWorkbookRelsXml(sheetCount) {
   /** @type {string[]} One <Relationship> per worksheet. */
   const rels = [];
   for (let i = 1; i <= sheetCount; i += 1) {
      rels.push(
         `<Relationship Id="rId${i}" `
         + 'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
         + `Target="worksheets/sheet${i}.xml"/>`,
      );
   }
   return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + `${rels.join('')}</Relationships>`;
}

/**
 * Encodes a Workbook model as XLSX file bytes.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The workbook to encode.
 * @returns {Uint8Array} The .xlsx file bytes.
 */
export function encodeXlsx(workbook) {
   /** @type {string[]} Final sheet names, truncated/de-duplicated to Excel's limits. */
   const sheetNames = uniqueSheetNames(workbook.sheets.map((sheet) => sheet.name));

   /** @type {Object<string, string>} Archive-relative filename to XML text content. */
   const files = {
      '[Content_Types].xml': buildContentTypesXml(workbook.sheets.length),
      '_rels/.rels': buildPackageRelsXml(),
      'xl/workbook.xml': buildWorkbookXml(sheetNames),
      'xl/_rels/workbook.xml.rels': buildWorkbookRelsXml(workbook.sheets.length),
   };
   workbook.sheets.forEach((sheet, i) => {
      files[`xl/worksheets/sheet${i + 1}.xml`] = buildSheetXml(sheet);
   });

   return zipFiles(files);
}

/**
 * Parses `xl/sharedStrings.xml` into an ordered array of decoded string values.
 * @param {string} xml - The shared-strings XML document.
 * @returns {string[]} The shared strings, in file order.
 */
function parseSharedStrings(xml) {
   /** @type {string[]} */
   const strings = [];
   const siPattern = /<si>([\s\S]*?)<\/si>/g;
   let siMatch = siPattern.exec(xml);
   while (siMatch !== null) {
      /** @type {string[]} Every <t> run's decoded text within this <si> (rich text splits across runs). */
      const parts = [...siMatch[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1]));
      strings.push(parts.join(''));
      siMatch = siPattern.exec(xml);
   }
   return strings;
}

/**
 * Parses `xl/workbook.xml` into the ordered list of sheet names.
 * @param {string} xml - The workbook XML document.
 * @returns {string[]} The sheet names, in declared order.
 */
function parseSheetNames(xml) {
   return [...xml.matchAll(/<sheet[^>]*\bname="([^"]*)"/g)].map((m) => unescapeXml(m[1]));
}

/**
 * Decodes one cell's value from its attribute string and inner XML, dispatching on the `t` attribute:
 * `inlineStr` (this module's own writer), `s` (shared string, real spreadsheet apps), `str` (a
 * formula's cached string result), `b` (boolean), and no `t` / `n` (number).
 * @param {string} attrs - The cell element's raw attribute text.
 * @param {string} inner - The cell element's inner XML (empty for a self-closing cell).
 * @param {string[]} sharedStrings - The shared-string table.
 * @returns {string|number|boolean|undefined} The decoded value, or undefined for a blank cell.
 */
function decodeXlsxCellValue(attrs, inner, sharedStrings) {
   /** @type {RegExpMatchArray|null} */
   const typeMatch = attrs.match(/\bt="([^"]*)"/);
   const type = typeMatch?.[1];

   if (type === 'inlineStr') {
      /** @type {string[]} Every <t> run's decoded text (rich text splits across runs). */
      const parts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1]));
      return parts.join('');
   }

   /** @type {RegExpMatchArray|null} The cached value, from a <v> element. */
   const valueMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
   if (!valueMatch) {
      return undefined;
   }
   const rawValue = valueMatch[1];

   if (type === 's') {
      return sharedStrings[Number(rawValue)] ?? '';
   }
   if (type === 'str') {
      return unescapeXml(rawValue);
   }
   if (type === 'b') {
      return rawValue === '1';
   }
   return Number(rawValue);
}

/**
 * Parses one worksheet's XML into an array of rows, each an array of decoded cell values indexed by
 * column position (a gap for a cell absent from the XML stays undefined).
 * @param {string} xml - The worksheet XML document.
 * @param {string[]} sharedStrings - The shared-string table for `t="s"` cells.
 * @returns {Array<Array<string|number|boolean|undefined>>} The decoded rows.
 */
function parseSheetXml(xml, sharedStrings) {
   /** @type {Array<Array<string|number|boolean|undefined>>} */
   const rows = [];
   const rowPattern = /<row[^>]*>([\s\S]*?)<\/row>/g;
   let rowMatch = rowPattern.exec(xml);
   while (rowMatch !== null) {
      /** @type {Array<string|number|boolean|undefined>} */
      const row = [];
      const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
      let cellMatch = cellPattern.exec(rowMatch[1]);
      while (cellMatch !== null) {
         /** @type {string} The cell element's raw attributes, whichever branch matched. */
         const attrs = cellMatch[1] ?? cellMatch[3] ?? '';
         /** @type {string} The cell element's inner XML (empty for a self-closing cell). */
         const inner = cellMatch[2] ?? '';
         /** @type {RegExpMatchArray|null} */
         const refMatch = attrs.match(/\br="([A-Z]+)(\d+)"/);
         if (refMatch) {
            row[columnIndex(refMatch[1])] = decodeXlsxCellValue(attrs, inner, sharedStrings);
         }
         cellMatch = cellPattern.exec(rowMatch[1]);
      }
      rows.push(row);
      rowMatch = rowPattern.exec(xml);
   }
   return rows;
}

/**
 * Decodes .xlsx file bytes into a Workbook model, treating the first row of every worksheet as the
 * header (column names) and every subsequent row as data. Understands shared strings, inline strings,
 * formula-cached strings, numbers, and booleans — the cell types real spreadsheet applications (Excel,
 * Google Sheets) as well as this module's own writer produce.
 * @param {Uint8Array} bytes - The .xlsx file bytes.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The decoded workbook.
 */
export function decodeXlsx(bytes) {
   /** @type {Object<string,string>} Every archive entry's text content. */
   const files = unzipFilesAsText(bytes);
   /** @type {string[]} Shared string table entries (empty if the file has none). */
   const sharedStrings = files['xl/sharedStrings.xml'] ? parseSharedStrings(files['xl/sharedStrings.xml']) : [];
   /** @type {string[]} Ordered sheet names read from xl/workbook.xml. */
   const sheetNames = parseSheetNames(files['xl/workbook.xml']);

   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet[]} */
   const sheets = sheetNames.map((name, i) => {
      /** @type {Array<Array<string|number|boolean|undefined>>} Every row of raw cells, header first. */
      const rows = parseSheetXml(files[`xl/worksheets/sheet${i + 1}.xml`] ?? '', sharedStrings);
      const [header, ...dataRows] = rows;
      return {
         name,
         columns: header ?? [],
         rows: dataRows.map((cells) => Object.fromEntries((header ?? []).map((col, c) => [col, cells[c]]))),
      };
   });

   return { sheets };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/format/Xlsx.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/format/Xlsx.js tests/unit/spreadsheet/format/Xlsx.test.js
git commit -m "feat: add the minimal XLSX writer and reader for the spreadsheet tool"
```

---

### Task 5: `io/ResolveTypeSchemas.js` — schema-driven field type resolution

**Files:**
- Create: `src/spreadsheet/io/ResolveTypeSchemas.js`
- Test: `tests/unit/spreadsheet/io/ResolveTypeSchemas.test.js`

**Interfaces:**
- Consumes: nothing project-local; walks `foundry.data.fields.*` instances directly.
- Produces: `resolveFieldSchema(field, prefix, into?): Object<string,{type,nullable}>` and
  `resolveTypeSchemas(packType: 'Actor'|'Item'|'ActiveEffect'): Object<string,{fieldTypes, fieldOrder}>`.
  Task 8 (DecodeCell) and Task 9/10 (BuildTables/ReadTables) consume `{fieldTypes, fieldOrder}` per
  document subtype. `fieldTypes` keys are normalized paths (see `normalizePath` from Task 2) mapping to
  `{type: 'string'|'number'|'boolean', nullable: boolean}`; a path with no entry is an untyped bag
  (rules elements, traits, aspects, `flags.*`, or any array-of-objects field) and decodes with literal
  rules instead.

This file follows the existing `foundry.data.fields.*`-mocking test pattern in
`tests/unit/BuildSchemaFromShape.test.js` (read it first): install stand-in field classes on
`globalThis.foundry.data.fields`, then dynamically import the module under test.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/** Minimal stand-in for a Foundry DataField, matching real DataField's own instance-property copying. */
class MockField {
   /**
    * @param {object} options - The field configuration (e.g. nullable).
    */
   constructor(options = {}) {
      Object.assign(this, options);
   }
}

/** Stand-in for StringField. */
class MockStringField extends MockField {}
/** Stand-in for NumberField. */
class MockNumberField extends MockField {}
/** Stand-in for BooleanField. */
class MockBooleanField extends MockField {}
/** Stand-in for ObjectField (untyped bag — resolveFieldSchema must NOT add an entry for one). */
class MockObjectField extends MockField {}

/** Stand-in for ArrayField, capturing its element field. */
class MockArrayField extends MockField {
   /**
    * @param {MockField} element - The element field.
    * @param {object} [options] - Field options.
    */
   constructor(element, options = {}) {
      super(options);
      /** @type {MockField} */
      this.element = element;
   }
}

/** Stand-in for SchemaField, capturing its sub-fields map. */
class MockSchemaField extends MockField {
   /**
    * @param {object} fields - Map of sub-field name to MockField.
    * @param {object} [options] - Field options.
    */
   constructor(fields, options = {}) {
      super(options);
      /** @type {object} */
      this.fields = fields;
   }
}

/** @type {Function} */
let resolveFieldSchema;
/** @type {Function} */
let resolveTypeSchemas;

beforeAll(async () => {
   globalThis.foundry.data = {
      fields: {
         StringField: MockStringField,
         NumberField: MockNumberField,
         BooleanField: MockBooleanField,
         ObjectField: MockObjectField,
         ArrayField: MockArrayField,
         SchemaField: MockSchemaField,
      },
   };
   ({ resolveFieldSchema, resolveTypeSchemas } = await import('~/spreadsheet/io/ResolveTypeSchemas.js'));
});

afterAll(() => {
   delete globalThis.foundry.data;
});

describe('resolveFieldSchema', () => {
   it('walks a SchemaField into dotted paths with type and nullable info', () => {
      const schema = new MockSchemaField({
         rarity: new MockStringField({ nullable: false }),
         value: new MockNumberField({ nullable: false }),
         equipped: new MockBooleanField({ nullable: false }),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.rarity': { type: 'string', nullable: false },
         'system.value': { type: 'number', nullable: false },
         'system.equipped': { type: 'boolean', nullable: false },
      });
   });

   it('normalizes an array of primitives to a wildcard path', () => {
      const schema = new MockSchemaField({
         statuses: new MockArrayField(new MockStringField({ nullable: false })),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.statuses.*': { type: 'string', nullable: false },
      });
   });

   it('adds no entry for an untyped object bag, at top level or inside an array', () => {
      const schema = new MockSchemaField({
         customTrait: new MockArrayField(new MockObjectField()),
         flagsLikeBag: new MockObjectField(),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({});
   });

   it('recurses into a nested SchemaField', () => {
      const schema = new MockSchemaField({
         castingCheck: new MockSchemaField({
            difficulty: new MockNumberField({ nullable: false }),
         }),
      });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.castingCheck.difficulty': { type: 'number', nullable: false },
      });
   });

   it('reads nullable from the field instance', () => {
      const schema = new MockSchemaField({ armor: new MockStringField({ nullable: true }) });
      expect(resolveFieldSchema(schema, 'system', {})).toEqual({
         'system.armor': { type: 'string', nullable: true },
      });
   });
});

describe('resolveTypeSchemas', () => {
   it('builds fieldTypes and a matching fieldOrder per registered subtype', () => {
      /** Stand-in DataModel exposing a static `schema`. */
      class WeaponDataModel {
         static get schema() {
            return new MockSchemaField({
               rarity: new MockStringField({ nullable: false }),
               value: new MockNumberField({ nullable: false }),
            });
         }
      }
      globalThis.CONFIG = {
         Item: {
            dataModels: { weapon: WeaponDataModel },
            documentClass: { schema: new MockSchemaField({}) },
         },
      };
      const result = resolveTypeSchemas('Item');
      expect(result.weapon.fieldTypes).toEqual({
         'system.rarity': { type: 'string', nullable: false },
         'system.value': { type: 'number', nullable: false },
      });
      expect(result.weapon.fieldOrder).toEqual(['system.rarity', 'system.value']);
   });

   it('adds prototypeToken.* paths for Actor packs only', () => {
      class PlayerDataModel {
         static get schema() {
            return new MockSchemaField({});
         }
      }
      globalThis.CONFIG = {
         Actor: {
            dataModels: { player: PlayerDataModel },
            documentClass: {
               schema: new MockSchemaField({
                  prototypeToken: new MockSchemaField({ actorLink: new MockBooleanField({ nullable: false }) }),
               }),
            },
         },
      };
      const result = resolveTypeSchemas('Actor');
      expect(result.player.fieldTypes['prototypeToken.actorLink']).toEqual({ type: 'boolean', nullable: false });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/io/ResolveTypeSchemas.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * Maps a leaf DataField instance to the primitive coercion type DecodeCell understands.
 * @param {foundry.data.fields.DataField} field - The leaf field.
 * @returns {'string'|'number'|'boolean'|undefined} The primitive type, or undefined for an
 *    ObjectField/unrecognized field, which decodes with untyped-bag literal rules instead.
 */
function primitiveTypeOf(field) {
   const { fields } = foundry.data;
   if (field instanceof fields.NumberField) return 'number';
   if (field instanceof fields.BooleanField) return 'boolean';
   if (field instanceof fields.StringField) return 'string';
   return undefined;
}

/**
 * Walks a Foundry SchemaField (or any DataField) into a flat map of dotted path to primitive type
 * info, used to drive schema-aware cell decoding. An ArrayField's element is walked under a `.*`
 * wildcard segment (see `normalizePath`); an ObjectField (or any field with no recognized primitive
 * type) contributes no entry, so its path — and everything under it — decodes with the untyped-bag
 * literal rules in DecodeCell instead.
 * @param {foundry.data.fields.DataField} field - The field to walk.
 * @param {string} prefix - The dotted path prefix accumulated so far.
 * @param {Object<string, {type: string, nullable: boolean}>} [into] - The map being built (mutated and
 *    returned).
 * @returns {Object<string, {type: string, nullable: boolean}>} The flat path -> type-info map.
 */
export function resolveFieldSchema(field, prefix, into = {}) {
   const { fields } = foundry.data;
   if (field instanceof fields.SchemaField) {
      for (const [key, sub] of Object.entries(field.fields)) {
         resolveFieldSchema(sub, `${prefix}.${key}`, into);
      }
      return into;
   }
   if (field instanceof fields.ArrayField) {
      resolveFieldSchema(field.element, `${prefix}.*`, into);
      return into;
   }
   /** @type {'string'|'number'|'boolean'|undefined} */
   const primitiveType = primitiveTypeOf(field);
   if (primitiveType !== undefined) {
      into[prefix] = { type: primitiveType, nullable: field.nullable === true };
   }
   return into;
}

/**
 * Builds the per-document-subtype field-schema info (used for column ordering and typed cell decoding)
 * for every subtype registered under a pack's document type, including the Document class's own
 * `prototypeToken` sub-schema for Actor packs (the TypeDataModel's schema alone only covers `system.*`).
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type.
 * @returns {Object<string, {fieldTypes: Object<string,{type:string,nullable:boolean}>, fieldOrder: string[]}>}
 *    Map of document subtype name to its resolved schema info. `fieldOrder` mirrors `fieldTypes`'
 *    declaration order (JS preserves string-key insertion order), used to sort spreadsheet columns.
 */
export function resolveTypeSchemas(packType) {
   /** @type {Object<string, typeof foundry.abstract.TypeDataModel>} */
   const dataModels = CONFIG[packType].dataModels;
   /** @type {object} The Document class's own schema (adds prototypeToken for Actor packs). */
   const documentSchema = CONFIG[packType].documentClass.schema;

   /** @type {Object<string, {fieldTypes: object, fieldOrder: string[]}>} */
   const result = {};
   for (const [subtype, DataModelClass] of Object.entries(dataModels)) {
      /** @type {Object<string, {type:string,nullable:boolean}>} */
      const fieldTypes = {};
      resolveFieldSchema(DataModelClass.schema, 'system', fieldTypes);
      if (packType === 'Actor' && documentSchema.fields.prototypeToken) {
         resolveFieldSchema(documentSchema.fields.prototypeToken, 'prototypeToken', fieldTypes);
      }
      result[subtype] = { fieldTypes, fieldOrder: Object.keys(fieldTypes) };
   }
   return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/io/ResolveTypeSchemas.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/io/ResolveTypeSchemas.js tests/unit/spreadsheet/io/ResolveTypeSchemas.test.js
git commit -m "feat: resolve per-subtype field schemas from CONFIG dataModels for the spreadsheet tool"
```

---

### Task 6: `codec/FlattenDocument.js`

**Files:**
- Create: `src/spreadsheet/codec/FlattenDocument.js`
- Test: `tests/unit/spreadsheet/codec/FlattenDocument.test.js`

**Interfaces:**
- Consumes: nothing (pure recursion over plain objects/arrays).
- Produces: `flattenDocument(source: object): Object<string,*>`. Task 9 (BuildTables) merges `_parentId`/
  `_folder` into this function's output before building sheet rows.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { flattenDocument } from '~/spreadsheet/codec/FlattenDocument.js';

describe('flattenDocument', () => {
   it('flattens top-level scalars and nested objects with dotted paths', () => {
      const source = {
         _id: 'a'.repeat(16),
         name: 'Sword',
         type: 'weapon',
         img: 'icons/sword.svg',
         sort: 100000,
         system: { rarity: 'common', castingCheck: { difficulty: 4 } },
      };
      expect(flattenDocument(source)).toEqual({
         _id: 'a'.repeat(16),
         name: 'Sword',
         type: 'weapon',
         img: 'icons/sword.svg',
         sort: 100000,
         'system.rarity': 'common',
         'system.castingCheck.difficulty': 4,
      });
   });

   it('flattens arrays with numeric-index segments, including nested arrays', () => {
      const source = {
         system: {
            attack: [
               { label: 'Slash', trait: [{ name: 'Reach' }] },
            ],
         },
      };
      expect(flattenDocument(source)).toEqual({
         'system.attack.0.label': 'Slash',
         'system.attack.0.trait.0.name': 'Reach',
      });
   });

   it('preserves an explicit null value (e.g. an unequipped nullable id field)', () => {
      expect(flattenDocument({ system: { equipped: { armor: null } } })).toEqual({
         'system.equipped.armor': null,
      });
   });

   it('produces no columns for an empty array', () => {
      expect(flattenDocument({ system: { rulesElement: [] } })).toEqual({});
   });

   it('excludes _stats, ownership, items, effects, and folder', () => {
      const source = {
         name: 'Goblin',
         _stats: { compendiumSource: null },
         ownership: { default: 0 },
         folder: 'someFolderId',
         items: [{ name: 'Dagger' }],
         effects: [{ name: 'Poisoned' }],
      };
      expect(flattenDocument(source)).toEqual({ name: 'Goblin' });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/FlattenDocument.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * Top-level document keys never flattened: server/compendium-owned metadata (`_stats`, `ownership`) and
 * embedded-document collections, which the caller (BuildTables) walks separately as their own document
 * envelopes. `folder` is likewise excluded — the caller supplies a resolved `_folder` path instead.
 * @type {Set<string>}
 */
const EXCLUDED_TOP_LEVEL_KEYS = new Set(['_stats', 'ownership', 'items', 'effects', 'folder']);

/**
 * Recursively flattens one value into the accumulator, dotting object keys and array indices onto the
 * given path. An empty array contributes no entries (there is nothing to index); `null` is preserved as
 * a real value (e.g. a cleared nullable id field).
 * @param {string} path - The dotted path accumulated so far.
 * @param {*} value - The value at that path.
 * @param {Object<string,*>} flat - The accumulator map (mutated).
 */
function flattenValue(path, value, flat) {
   if (Array.isArray(value)) {
      value.forEach((element, index) => flattenValue(`${path}.${index}`, element, flat));
      return;
   }
   if (value !== null && typeof value === 'object') {
      for (const [key, sub] of Object.entries(value)) {
         flattenValue(`${path}.${key}`, sub, flat);
      }
      return;
   }
   flat[path] = value;
}

/**
 * Flattens a document's own persisted source (as returned by `Document#toObject()`) into a flat map of
 * dotted path to value, excluding server/compendium-owned metadata and embedded-document collections
 * (see EXCLUDED_TOP_LEVEL_KEYS).
 * @param {object} source - The document's source data.
 * @returns {Object<string,*>} The flat path -> value map.
 */
export function flattenDocument(source) {
   /** @type {Object<string,*>} */
   const flat = {};
   for (const [key, value] of Object.entries(source)) {
      if (EXCLUDED_TOP_LEVEL_KEYS.has(key)) continue;
      flattenValue(key, value, flat);
   }
   return flat;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/codec/FlattenDocument.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/codec/FlattenDocument.js tests/unit/spreadsheet/codec/FlattenDocument.test.js
git commit -m "feat: add the document-source flattener for the spreadsheet tool"
```

---

### Task 7: `codec/UnflattenRow.js`

**Files:**
- Create: `src/spreadsheet/codec/UnflattenRow.js`
- Test: `tests/unit/spreadsheet/codec/UnflattenRow.test.js`

**Interfaces:**
- Consumes: nothing (pure recursion over a flat map).
- Produces: `ABSENT: symbol` (re-exported by Task 8's `DecodeCell.js` for callers that only import from
  there), `unflattenRow(flat: Object<string,*>): object`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { unflattenRow, ABSENT } from '~/spreadsheet/codec/UnflattenRow.js';

describe('unflattenRow', () => {
   it('rebuilds nested objects and drops ABSENT leaves entirely', () => {
      expect(unflattenRow({
         name: 'Sword',
         'system.rarity': ABSENT,
         'system.value': 5,
      })).toEqual({ name: 'Sword', system: { value: 5 } });
   });

   it('preserves explicit null and empty-string values', () => {
      expect(unflattenRow({ 'system.equipped.armor': null, name: '' })).toEqual({
         system: { equipped: { armor: null } }, name: '',
      });
   });

   it('rebuilds an array and compacts a gap, dropping a fully-blank element', () => {
      expect(unflattenRow({
         'system.attack.0.label': 'Slash',
         'system.attack.0.damage': 5,
         'system.attack.1.label': ABSENT,
         'system.attack.1.damage': ABSENT,
         'system.attack.2.label': 'Stab',
         'system.attack.2.damage': 3,
      })).toEqual({
         system: {
            attack: [
               { label: 'Slash', damage: 5 },
               { label: 'Stab', damage: 3 },
            ],
         },
      });
   });

   it('treats an element with only blank (null/empty-string) leaves as blank, dropping it', () => {
      expect(unflattenRow({
         'system.attack.0.label': '',
         'system.attack.0.damage': ABSENT,
         'system.attack.1.label': 'Stab',
         'system.attack.1.damage': 3,
      })).toEqual({ system: { attack: [{ label: 'Stab', damage: 3 }] } });
   });

   it('rebuilds nested arrays (trait array inside an attack array)', () => {
      expect(unflattenRow({
         'system.attack.0.label': 'Slash',
         'system.attack.0.trait.0.name': 'Reach',
         'system.attack.0.trait.1.name': ABSENT,
      })).toEqual({ system: { attack: [{ label: 'Slash', trait: [{ name: 'Reach' }] }] } });
   });

   it('returns an empty object for an all-ABSENT input', () => {
      expect(unflattenRow({ name: ABSENT, 'system.rarity': ABSENT })).toEqual({});
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/UnflattenRow.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * Sentinel marking a decoded cell that should leave the target field untouched (schema default on
 * create, existing value preserved on update). Never appears in unflattenRow's return value.
 * @type {symbol}
 */
export const ABSENT = Symbol('spreadsheet-absent');

/**
 * Determines whether a reconstructed node counts as blank for the array-element-existence rule: a node
 * is blank if it is ABSENT, null, the empty string, or an object/array whose values are all blank. Any
 * other value (including 0 and false) is non-blank.
 * @param {*} value - A value produced by buildNode.
 * @returns {boolean} Whether the value counts as blank.
 */
function isBlankValue(value) {
   if (value === ABSENT || value === null || value === '') {
      return true;
   }
   if (Array.isArray(value)) {
      return value.every(isBlankValue);
   }
   if (typeof value === 'object') {
      return Object.values(value).every(isBlankValue);
   }
   return false;
}

/**
 * Recursively builds a nested value (object, compacted array, or a bare leaf) from entries sharing a
 * common path prefix (already stripped from their segment arrays).
 * @param {Array<{segments: string[], value: *}>} entries - Entries relative to this node.
 * @returns {*} A nested object, a compacted array, or (for a single no-segments entry) the leaf value.
 */
function buildNode(entries) {
   if (entries.length === 1 && entries[0].segments.length === 0) {
      return entries[0].value;
   }

   /** @type {Map<string, Array<{segments: string[], value: *}>>} Child entries grouped by first segment. */
   const children = new Map();
   for (const entry of entries) {
      const [head, ...rest] = entry.segments;
      if (!children.has(head)) {
         children.set(head, []);
      }
      children.get(head).push({ segments: rest, value: entry.value });
   }

   /** @type {string[]} */
   const keys = [...children.keys()];
   /** @type {boolean} Whether every child key is a numeric index (an array node). */
   const isArrayNode = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));

   if (isArrayNode) {
      /** @type {Array<{index:number, value:*}>} Every candidate index with its built node, sorted ascending. */
      const candidates = keys
         .map((key) => ({ index: Number(key), value: buildNode(children.get(key)) }))
         .sort((a, b) => a.index - b.index);
      // Keep only elements with at least one non-blank cell, then reindex densely (ascending order).
      return candidates.filter((c) => !isBlankValue(c.value)).map((c) => c.value);
   }

   /** @type {object} */
   const node = {};
   for (const key of keys) {
      /** @type {*} */
      const built = buildNode(children.get(key));
      if (built !== ABSENT) {
         node[key] = built;
      }
   }
   return node;
}

/**
 * Reconstructs a (possibly partial) document source object from a flat map of dotted path to decoded
 * cell value, applying the wide-layout array-element-existence and index-compaction rules: an array
 * element survives only if at least one of its cells is non-blank (a value other than ABSENT, null, or
 * the empty string); surviving elements are reindexed densely in ascending order.
 * @param {Object<string, *>} flat - Map of dotted field path to decoded cell value.
 * @returns {object} The reconstructed document source (or partial source, for an update row).
 */
export function unflattenRow(flat) {
   /** @type {Array<{segments: string[], value: *}>} */
   const entries = Object.entries(flat).map(([path, value]) => ({ segments: path.split('.'), value }));
   /** @type {*} */
   const result = buildNode(entries);
   return result === ABSENT ? {} : result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/codec/UnflattenRow.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/codec/UnflattenRow.js tests/unit/spreadsheet/codec/UnflattenRow.test.js
git commit -m "feat: add the row unflattener with array compaction for the spreadsheet tool"
```

---

### Task 8: `codec/DecodeCell.js`

**Files:**
- Create: `src/spreadsheet/codec/DecodeCell.js`
- Test: `tests/unit/spreadsheet/codec/DecodeCell.test.js`

**Interfaces:**
- Consumes: `ABSENT` from `~/spreadsheet/codec/UnflattenRow.js` (Task 7, re-exported here so ReadTables
  only needs to import from this file), `FIXED_COLUMN_TYPES`, `normalizePath` from
  `~/spreadsheet/codec/Workbook.js` (Task 2).
- Produces: `decodeCell(rawValue, fieldSchema): *`, `lookupFieldSchema(fieldTypes, path): {type,nullable}|undefined`,
  `decodeRow(row, columns, fieldTypes): Object<string,*>`. Task 10 (ReadTables) is the primary consumer.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { decodeCell, lookupFieldSchema, decodeRow, ABSENT } from '~/spreadsheet/codec/DecodeCell.js';

describe('decodeCell — typed (schema-known) fields', () => {
   const numberField = { type: 'number', nullable: false };
   const stringField = { type: 'string', nullable: false };
   const nullableStringField = { type: 'string', nullable: true };
   const booleanField = { type: 'boolean', nullable: false };

   it('decodes a non-blank value per its declared type', () => {
      expect(decodeCell('5', numberField)).toBe(5);
      expect(decodeCell(5, numberField)).toBe(5);
      expect(decodeCell('true', booleanField)).toBe(true);
      expect(decodeCell(false, booleanField)).toBe(false);
      expect(decodeCell('Sword', stringField)).toBe('Sword');
   });

   it('throws on an unparseable typed value', () => {
      expect(() => decodeCell('not-a-number', numberField)).toThrow();
      expect(() => decodeCell('maybe', booleanField)).toThrow();
   });

   it('decodes a blank cell per nullability/type: null, empty string, or ABSENT', () => {
      expect(decodeCell(undefined, nullableStringField)).toBe(null);
      expect(decodeCell('', nullableStringField)).toBe(null);
      expect(decodeCell(undefined, stringField)).toBe('');
      expect(decodeCell(undefined, numberField)).toBe(ABSENT);
      expect(decodeCell(undefined, booleanField)).toBe(ABSENT);
   });
});

describe('decodeCell — untyped bag (no fieldSchema)', () => {
   it('auto-detects booleans, numbers, and null from CSV text', () => {
      expect(decodeCell('true', undefined)).toBe(true);
      expect(decodeCell('false', undefined)).toBe(false);
      expect(decodeCell('5', undefined)).toBe(5);
      expect(decodeCell('null', undefined)).toBe(null);
      expect(decodeCell('Reach', undefined)).toBe('Reach');
   });

   it('passes through an already-typed XLSX value unchanged', () => {
      expect(decodeCell(5, undefined)).toBe(5);
      expect(decodeCell(true, undefined)).toBe(true);
   });

   it('unwraps a double-quoted cell to force a literal string', () => {
      expect(decodeCell('"5"', undefined)).toBe('5');
      expect(decodeCell('"true"', undefined)).toBe('true');
   });

   it('decodes a blank cell to ABSENT', () => {
      expect(decodeCell(undefined, undefined)).toBe(ABSENT);
      expect(decodeCell('', undefined)).toBe(ABSENT);
   });
});

describe('lookupFieldSchema', () => {
   it('matches a fixed column by its literal name', () => {
      expect(lookupFieldSchema({}, 'sort')).toEqual({ type: 'number', nullable: false });
   });

   it('matches a schema-typed path after normalizing array indices', () => {
      const fieldTypes = { 'system.attack.*.range': { type: 'number', nullable: false } };
      expect(lookupFieldSchema(fieldTypes, 'system.attack.2.range')).toEqual({ type: 'number', nullable: false });
   });

   it('returns undefined for a path with no schema entry', () => {
      expect(lookupFieldSchema({}, 'system.rulesElement.0.value')).toBeUndefined();
   });
});

describe('decodeRow', () => {
   it('decodes every column using its resolved field schema', () => {
      const row = { _id: 'a'.repeat(16), sort: '100000', 'system.value': '5' };
      const fieldTypes = { 'system.value': { type: 'number', nullable: false } };
      expect(decodeRow(row, ['_id', 'sort', 'system.value'], fieldTypes)).toEqual({
         _id: 'a'.repeat(16), sort: 100000, 'system.value': 5,
      });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/DecodeCell.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
import { ABSENT } from '~/spreadsheet/codec/UnflattenRow.js';
import { FIXED_COLUMN_TYPES, normalizePath } from '~/spreadsheet/codec/Workbook.js';

export { ABSENT };

/** @type {RegExp} Matches a cell whose entire text is wrapped in double quotes (forced-string convention). */
const QUOTED_STRING_PATTERN = /^"(.*)"$/s;

/**
 * Decodes one untyped-bag cell using literal rules: `true`/`false` -> boolean, `null` -> null, text
 * that parses as a finite number -> number, a fully double-quoted cell -> that text with the quotes
 * stripped (forces a literal string, e.g. `"5"` -> the string `5`), anything else -> the text as-is.
 * An already-typed value (from XLSX) passes through unchanged.
 * @param {string|number|boolean} rawValue - The non-blank raw cell value.
 * @returns {string|number|boolean|null} The decoded literal value.
 */
function decodeLiteral(rawValue) {
   if (typeof rawValue !== 'string') {
      return rawValue;
   }
   /** @type {RegExpMatchArray|null} */
   const quotedMatch = rawValue.match(QUOTED_STRING_PATTERN);
   if (quotedMatch) {
      return quotedMatch[1];
   }
   if (rawValue === 'true' || rawValue === 'false') {
      return rawValue === 'true';
   }
   if (rawValue === 'null') {
      return null;
   }
   if (Number.isFinite(Number(rawValue))) {
      return Number(rawValue);
   }
   return rawValue;
}

/**
 * Decodes one raw cell value into its final typed value, following the spec's cell-encoding rules:
 * when `fieldSchema` is known (a typed, schema-driven field), a non-blank value is coerced to that
 * type and a blank value resolves to null (nullable), empty string (non-nullable string), or ABSENT;
 * when `fieldSchema` is undefined (an untyped bag — rules elements, traits, `flags.*`, or any
 * array-of-objects field), a non-blank value follows the literal rules and a blank value is ABSENT.
 * @param {string|number|boolean|undefined} rawValue - The raw cell value (undefined for a blank cell;
 *    already typed for XLSX, always a string for CSV).
 * @param {{type: 'string'|'number'|'boolean', nullable: boolean}|undefined} fieldSchema - The field's
 *    resolved schema type info, or undefined for an untyped bag.
 * @returns {string|number|boolean|null|symbol} The decoded value, or the ABSENT sentinel.
 */
export function decodeCell(rawValue, fieldSchema) {
   /** @type {boolean} */
   const isBlank = rawValue === undefined || rawValue === '';

   if (!fieldSchema) {
      return isBlank ? ABSENT : decodeLiteral(rawValue);
   }

   if (isBlank) {
      if (fieldSchema.nullable) return null;
      if (fieldSchema.type === 'string') return '';
      return ABSENT;
   }

   switch (fieldSchema.type) {
      case 'number': {
         /** @type {number} */
         const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
         if (!Number.isFinite(numeric)) {
            throw new Error(`Expected a number, got "${rawValue}"`);
         }
         return numeric;
      }
      case 'boolean': {
         if (typeof rawValue === 'boolean') return rawValue;
         if (rawValue === 'true') return true;
         if (rawValue === 'false') return false;
         throw new Error(`Expected true or false, got "${rawValue}"`);
      }
      default:
         return String(rawValue);
   }
}

/**
 * Resolves a concrete dotted column path's field schema: the fixed-column type if the path names one
 * of them, else the schema-typed entry for its normalized (wildcarded) form, else undefined (untyped
 * bag).
 * @param {Object<string, {type:string,nullable:boolean}>} fieldTypes - The document subtype's resolved
 *    schema-typed field map (see resolveTypeSchemas), keyed by normalized path.
 * @param {string} path - The concrete column path.
 * @returns {{type:string,nullable:boolean}|undefined} The resolved field schema, if any.
 */
export function lookupFieldSchema(fieldTypes, path) {
   return FIXED_COLUMN_TYPES[path] ?? fieldTypes[normalizePath(path)];
}

/**
 * Decodes one sheet row's raw cell values into a flat path -> value map.
 * @param {Object<string,*>} row - The raw row (column name -> raw cell value).
 * @param {string[]} columns - The sheet's column names, in order.
 * @param {Object<string, {type:string,nullable:boolean}>} fieldTypes - The document subtype's resolved
 *    schema-typed field map.
 * @returns {Object<string,*>} The decoded flat map (ABSENT-valued entries retained; unflattenRow drops
 *    them appropriately).
 */
export function decodeRow(row, columns, fieldTypes) {
   /** @type {Object<string,*>} */
   const flat = {};
   for (const column of columns) {
      flat[column] = decodeCell(row[column], lookupFieldSchema(fieldTypes, column));
   }
   return flat;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/codec/DecodeCell.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/codec/DecodeCell.js tests/unit/spreadsheet/codec/DecodeCell.test.js
git commit -m "feat: add schema-driven and literal cell decoding for the spreadsheet tool"
```

---

### Task 9: `codec/BuildTables.js` — wide and relational table building

**This is the plan's most intricate task. Read this task's prose carefully before coding; if the
nested-array matcher logic doesn't make sense from the comments alone, re-derive it from the worked
example in Step 3 before asking to escalate.**

**Files:**
- Create: `src/spreadsheet/codec/BuildTables.js`
- Test: `tests/unit/spreadsheet/codec/BuildTables.test.js`

**Interfaces:**
- Consumes: `flattenDocument` (Task 6), `FIXED_COLUMNS`, `createEmptySheet` (Task 2, unused directly but
  keep the import style consistent — actually only `FIXED_COLUMNS` is needed).
- Produces:
  - `/** @typedef {object} DocumentEnvelope @property {string} documentType @property {object} source
    @property {string} [parentId] @property {string} [folderPath] */` (declared here; Task 10 and
    Task 11 reference it via `@typedef` import comments).
  - `buildTables(envelopes: DocumentEnvelope[], layout: 'wide'|'relational', packType: string,
    typeSchemas: Object<string,{fieldTypes,fieldOrder}>): Workbook`.
  - Also exported for Task 10 to reuse: `detectArrayPaths(paths: string[]): string[]`,
    `buildArrayPathMatcher(arrayPath: string, allArrayPaths: string[]): (path: string) => {index,subField}|null`.

**Key concept — how a nested array path is matched against a concrete flattened path.** `detectArrayPaths`
collapses every numeric index out of a discovered path's array segments, so the nested trait array of
`system.attack.0.trait.1.name` is recorded as the array path `"system.attack.trait"` (indices removed,
field names kept in order) — a SEPARATE, longer entry alongside `"system.attack"` (the attack array
itself). To go back from an array path string to "where do the numeric indices sit in a real path", the
rule is: a numeric index follows array-path segment `i` exactly when the prefix `segments[0..i]` is
itself a member of the full detected-array-paths set. For `"system.attack.trait"` with segments
`[system, attack, trait]`: `"system"` alone is never a detected array path (no index follows it) but
`"system.attack"` is (an index follows `"attack"`) and `"system.attack.trait"` is (an index follows
`"trait"`, since it's the array path itself). `buildArrayPathMatcher` and its import-side inverse
`buildArrayPathExpander` (Task 10) both implement exactly this rule — read `buildArrayPathMatcher`'s
JSDoc example carefully; it is the crux of relational-layout support at every nesting depth this
codebase actually uses (weapon attacks, and attacks' nested traits).

- [ ] **Step 1: Write the failing test — wide layout**

```js
import { describe, it, expect } from 'vitest';
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';

/** A minimal typeSchemas stand-in: no schema-typed fields, so column order falls back to first-seen. */
const NO_SCHEMA = {};

describe('buildTables — wide layout', () => {
   it('builds one sheet per document type with fixed columns first, plus a _manifest sheet', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), name: 'Sword', type: 'weapon', img: 'i.svg', sort: 1, system: { rarity: 'common' } } },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      expect(workbook.sheets[0].name).toBe('_manifest');
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns.slice(0, 7)).toEqual(['_id', '_parentId', '_folder', 'name', 'type', 'img', 'sort']);
      expect(weaponSheet.columns).toContain('system.rarity');
      expect(weaponSheet.rows[0]).toMatchObject({ _id: 'a'.repeat(16), name: 'Sword', 'system.rarity': 'common', _parentId: '', _folder: '' });
   });

   it('expands arrays into indexed dotted columns and unions columns across documents', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { attack: [{ damage: 5 }] } } },
         { documentType: 'weapon', source: { _id: 'b'.repeat(16), system: { attack: [{ damage: 1 }, { damage: 2 }] } } },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).toContain('system.attack.0.damage');
      expect(weaponSheet.columns).toContain('system.attack.1.damage');
      expect(weaponSheet.rows[0]['system.attack.1.damage']).toBeUndefined();
   });

   it('records _parentId and _folder from the envelope', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16) }, parentId: 'b'.repeat(16), folderPath: 'Loot/Rare' },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.rows[0]._parentId).toBe('b'.repeat(16));
      expect(weaponSheet.rows[0]._folder).toBe('Loot/Rare');
   });

   it('orders non-fixed columns by schema field order, falling back to first-seen for the rest', () => {
      const typeSchemas = { weapon: { fieldTypes: {}, fieldOrder: ['system.value', 'system.rarity'] } };
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { rarity: 'common', value: 5, extra: 'x' } } },
      ];
      const weaponSheet = buildTables(envelopes, 'wide', 'Item', typeSchemas).sheets.find((s) => s.name === 'weapon');
      /** @type {string[]} */
      const rest = weaponSheet.columns.slice(7);
      expect(rest.indexOf('system.value')).toBeLessThan(rest.indexOf('system.rarity'));
      expect(rest).toContain('system.extra');
   });

   it('writes manifest rows naming layout, packType, and one entry per data sheet', () => {
      const envelopes = [{ documentType: 'weapon', source: { _id: 'a'.repeat(16) } }];
      const manifest = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA).sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         { key: 'layout', value: 'wide', documentType: '', arrayPath: '' },
         { key: 'packType', value: 'Item', documentType: '', arrayPath: '' },
         { key: 'sheet', value: 'weapon', documentType: 'weapon', arrayPath: '' },
      ]));
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/BuildTables.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement wide layout + manifest**

```js
import { flattenDocument } from '~/spreadsheet/codec/FlattenDocument.js';
import { FIXED_COLUMNS, normalizePath } from '~/spreadsheet/codec/Workbook.js';

/**
 * @typedef {object} DocumentEnvelope
 * @property {string} documentType - The subtype name (e.g. "weapon", "npc", "effect").
 * @property {object} source - The document's own persisted fields (Document#toObject()).
 * @property {string} [parentId] - The owning document's id, for an embedded item or effect.
 * @property {string} [folderPath] - Slash-separated folder path from the pack root (top-level only).
 */

/**
 * Orders discovered column paths so schema-declared fields precede fields with no known order,
 * preserving the schema's own field order and falling back to first-seen order for anything the schema
 * doesn't name (untyped bag contents, flags.*, and any unresolved field).
 * @param {string[]} paths - Every discovered concrete dotted path, in first-seen order.
 * @param {string[]} fieldOrder - The type's schema-declared paths, in schema order (wildcards for array
 *    elements, e.g. "system.attack.*.damage").
 * @returns {string[]} The paths, reordered.
 */
export function orderColumns(paths, fieldOrder) {
   /** @type {Map<string, number>} Schema order index per normalized (wildcarded) path. */
   const orderIndex = new Map(fieldOrder.map((path, i) => [path, i]));
   /** @type {Map<string, number>} First-seen index, used as the fallback and as the tiebreaker rank base. */
   const seenIndex = new Map(paths.map((path, i) => [path, i]));

   return [...paths].sort((a, b) => {
      /** @type {number} */
      const rankA = orderIndex.get(normalizePath(a)) ?? (fieldOrder.length + seenIndex.get(a));
      /** @type {number} */
      const rankB = orderIndex.get(normalizePath(b)) ?? (fieldOrder.length + seenIndex.get(b));
      return rankA - rankB;
   });
}

/**
 * Detects every array path present among a document type's discovered columns. A path is recorded the
 * moment a numeric segment is encountered while scanning: the array path is the field-name-only prefix
 * accumulated so far (indices never join the prefix), so a nested array yields two entries — its own
 * array path and its parent's — exactly matching the interspersed structure a concrete path actually
 * has. Returned outermost-first (fewest segments) so parent arrays are laid out before nested ones.
 * @param {string[]} paths - Discovered concrete dotted paths (fixed columns already excluded).
 * @returns {string[]} Distinct array paths, e.g. ["system.attack", "system.attack.trait"].
 */
export function detectArrayPaths(paths) {
   /** @type {Set<string>} */
   const arrayPaths = new Set();
   for (const path of paths) {
      /** @type {string[]} Field-name segments accumulated so far (indices are never pushed here). */
      let prefix = [];
      for (const segment of path.split('.')) {
         if (/^\d+$/.test(segment)) {
            arrayPaths.add(prefix.join('.'));
         }
         else {
            prefix = [...prefix, segment];
         }
      }
   }
   return [...arrayPaths].sort((a, b) => a.split('.').length - b.split('.').length);
}

/**
 * Builds a matcher for one array path against concrete flattened row paths. See this task's header
 * note for the full derivation. Example: for arrayPath "system.attack.trait" with allArrayPaths
 * ["system.attack", "system.attack.trait"], the concrete path "system.attack.0.trait.1.name" matches
 * with `{index: "0.1", subField: "name"}`; the concrete path "system.attack.0.damage" does NOT match
 * (it belongs to the shallower "system.attack" array path instead — its remainder after consuming
 * "system.attack.<N>" doesn't start with "trait", so segment-comparison fails).
 * @param {string} arrayPath - The array path being matched, e.g. "system.attack.trait".
 * @param {string[]} allArrayPaths - Every array path detected for the document type.
 * @returns {(path: string) => {index: string, subField: string}|null} A matcher returning the dotted
 *    index and remaining sub-field path for a concrete path belonging to this array, or null.
 */
export function buildArrayPathMatcher(arrayPath, allArrayPaths) {
   /** @type {string[]} */
   const segments = arrayPath.split('.');
   /** @type {Set<string>} */
   const arraySet = new Set(allArrayPaths);
   /** @type {boolean[]} Whether a numeric index follows segment i, for each i. */
   const indexFollows = segments.map((_, i) => arraySet.has(segments.slice(0, i + 1).join('.')));

   return (path) => {
      /** @type {string[]} */
      const pathSegments = path.split('.');
      /** @type {string[]} Numeric indices consumed, in order. */
      const indices = [];
      let cursor = 0;
      for (let i = 0; i < segments.length; i += 1) {
         if (pathSegments[cursor] !== segments[i]) return null;
         cursor += 1;
         if (indexFollows[i]) {
            if (!/^\d+$/.test(pathSegments[cursor] ?? '')) return null;
            indices.push(pathSegments[cursor]);
            cursor += 1;
         }
      }
      /** @type {string[]} The remaining segments: the sub-field within this specific array element. */
      const subFieldSegments = pathSegments.slice(cursor);
      // Empty, or containing a further numeric segment, means this path belongs to a DEEPER nested
      // array instead (that array's own matcher pulls it into its own child sheet).
      if (subFieldSegments.length === 0 || subFieldSegments.some((seg) => /^\d+$/.test(seg))) {
         return null;
      }
      return { index: indices.join('.'), subField: subFieldSegments.join('.') };
   };
}

/**
 * Builds the `_manifest` sheet recording the layout, pack type, and one row per data sheet.
 * @param {'wide'|'relational'} layout - The array layout used.
 * @param {string} packType - The pack's document type.
 * @param {Array<{sheet:string,documentType:string,arrayPath:string}>} entries - One entry per data sheet.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Sheet} The manifest sheet.
 */
function buildManifestSheet(layout, packType, entries) {
   /** @type {Array<Object<string,string>>} */
   const rows = [
      { key: 'layout', value: layout, documentType: '', arrayPath: '' },
      { key: 'packType', value: packType, documentType: '', arrayPath: '' },
      { key: 'version', value: '1', documentType: '', arrayPath: '' },
      ...entries.map((e) => ({ key: 'sheet', value: e.sheet, documentType: e.documentType, arrayPath: e.arrayPath })),
   ];
   return { name: '_manifest', columns: ['key', 'value', 'documentType', 'arrayPath'], rows };
}

/**
 * Builds one wide-layout sheet for a document type: fixed columns first, then every other discovered
 * column (arrays expanded into indexed dotted columns), ordered by schema field order.
 * @param {string} documentType - The document type (also the sheet name).
 * @param {Array<Object<string,*>>} flatRows - One flat row map per document (fixed columns included).
 * @param {{fieldOrder: string[]}} [typeSchema] - The type's resolved schema order info.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Sheet} The built sheet.
 */
function buildWideSheet(documentType, flatRows, typeSchema) {
   /** @type {Set<string>} Every non-fixed column discovered across all rows, first-seen order. */
   const discovered = new Set();
   for (const row of flatRows) {
      for (const path of Object.keys(row)) {
         if (!FIXED_COLUMNS.includes(path)) discovered.add(path);
      }
   }
   /** @type {string[]} */
   const rest = orderColumns([...discovered], typeSchema?.fieldOrder ?? []);
   return { name: documentType, columns: [...FIXED_COLUMNS, ...rest], rows: flatRows };
}

/**
 * Builds a Workbook from a list of document envelopes for one pack export.
 * @param {DocumentEnvelope[]} envelopes - Every document to export (top-level and embedded).
 * @param {'wide'|'relational'} layout - The array layout to use.
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type, recorded in the manifest.
 * @param {Object<string, {fieldTypes: object, fieldOrder: string[]}>} typeSchemas - Per document-type
 *    schema info from resolveTypeSchemas, used only to order columns.
 * @returns {import('~/spreadsheet/codec/Workbook.js').Workbook} The built workbook, manifest first.
 */
export function buildTables(envelopes, layout, packType, typeSchemas) {
   /** @type {Map<string, DocumentEnvelope[]>} Envelopes grouped by document type, first-seen order. */
   const byType = new Map();
   for (const envelope of envelopes) {
      if (!byType.has(envelope.documentType)) byType.set(envelope.documentType, []);
      byType.get(envelope.documentType).push(envelope);
   }

   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet[]} */
   const sheets = [];
   /** @type {Array<{sheet:string, documentType:string, arrayPath:string}>} */
   const manifestEntries = [];

   for (const [documentType, docs] of byType) {
      /** @type {Array<Object<string,*>>} This type's flat row maps, fixed columns merged in. */
      const flatRows = docs.map((doc) => ({
         ...flattenDocument(doc.source),
         _parentId: doc.parentId ?? '',
         _folder: doc.folderPath ?? '',
      }));
      /** @type {{fieldTypes:object,fieldOrder:string[]}|undefined} */
      const typeSchema = typeSchemas[documentType];

      if (layout === 'wide') {
         sheets.push(buildWideSheet(documentType, flatRows, typeSchema));
         manifestEntries.push({ sheet: documentType, documentType, arrayPath: '' });
      }
      else {
         /** @type {{documentSheet: object, childSheets: Array<{sheet:object,arrayPath:string}>}} */
         const relational = buildRelationalSheets(documentType, flatRows, typeSchema);
         sheets.push(relational.documentSheet);
         manifestEntries.push({ sheet: relational.documentSheet.name, documentType, arrayPath: '' });
         for (const child of relational.childSheets) {
            sheets.push(child.sheet);
            manifestEntries.push({ sheet: child.sheet.name, documentType, arrayPath: child.arrayPath });
         }
      }
   }

   return { sheets: [buildManifestSheet(layout, packType, manifestEntries), ...sheets] };
}
```

Leave `buildRelationalSheets`/`buildChildSheet` undefined for now (Step 3 covers wide layout only) —
add a temporary throwing stub so the file is syntactically complete:

```js
function buildRelationalSheets() {
   throw new Error('relational layout not yet implemented');
}
```

- [ ] **Step 4: Run the wide-layout tests to verify they pass**

Run: `npx vitest run tests/unit/spreadsheet/codec/BuildTables.test.js`
Expected: PASS (5 tests, the wide-layout describe block only).

- [ ] **Step 5: Write the failing test — relational layout**

Append to the same test file:

```js
describe('buildTables — relational layout', () => {
   it('drops array columns from the document sheet and puts them in a child sheet keyed by _id and _index', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), name: 'Sword', system: { rarity: 'common', attack: [{ label: 'Slash', damage: 5 }, { label: 'Stab', damage: 3 }] } } },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const weaponSheet = workbook.sheets.find((s) => s.name === 'weapon');
      expect(weaponSheet.columns).not.toEqual(expect.arrayContaining(['system.attack.0.label']));
      expect(weaponSheet.columns).toContain('system.rarity');

      /** @type {object} */
      const attackSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack');
      expect(attackSheet.columns).toEqual(['_id', '_index', 'label', 'damage']);
      expect(attackSheet.rows).toEqual([
         { _id: 'a'.repeat(16), _index: '0', label: 'Slash', damage: 5 },
         { _id: 'a'.repeat(16), _index: '1', label: 'Stab', damage: 3 },
      ]);
   });

   it('builds a separate child sheet per nesting level, with a compound dotted _index', () => {
      const envelopes = [
         { documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { attack: [{ label: 'Slash', trait: [{ name: 'Reach' }, { name: 'Heavy' }] }] } } },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      /** @type {object} */
      const attackSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack');
      expect(attackSheet.columns).toEqual(['_id', '_index', 'label']);

      /** @type {object} */
      const traitSheet = workbook.sheets.find((s) => s.name === 'weapon.system.attack.trait');
      expect(traitSheet.rows).toEqual([
         { _id: 'a'.repeat(16), _index: '0.0', name: 'Reach' },
         { _id: 'a'.repeat(16), _index: '0.1', name: 'Heavy' },
      ]);
   });

   it('records each child sheet in the manifest with its array path', () => {
      const envelopes = [{ documentType: 'weapon', source: { _id: 'a'.repeat(16), system: { attack: [{ damage: 5 }] } } }];
      /** @type {object} */
      const manifest = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA).sheets.find((s) => s.name === '_manifest');
      expect(manifest.rows).toEqual(expect.arrayContaining([
         { key: 'sheet', value: 'weapon.system.attack', documentType: 'weapon', arrayPath: 'system.attack' },
      ]));
   });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/BuildTables.test.js`
Expected: FAIL — `buildRelationalSheets` throws.

- [ ] **Step 7: Implement relational layout**

Replace the throwing stub with:

```js
/**
 * Whether a discovered concrete path belongs to some array (i.e. some detected array path's matcher
 * accepts it), used to exclude array-derived columns from the document sheet's own scalar columns.
 * @param {string} path - A concrete discovered path.
 * @param {Array<(path:string)=>object|null>} matchers - One matcher per detected array path.
 * @returns {boolean} True if the path belongs to some array.
 */
function isUnderAnyArrayPath(path, matchers) {
   return matchers.some((matcher) => matcher(path) !== null);
}

/**
 * Builds one child sheet for a single array path: one row per surviving array element across every
 * document row of the type, keyed by the owning document's `_id` and a dotted `_index` (one entry per
 * array nesting level within this arrayPath, so a trait nested inside an attack gets an index like
 * "0.1" — attack index 0, trait index 1).
 * @param {string} documentType - The owning type, used to name the sheet.
 * @param {string} arrayPath - The array's field path (e.g. "system.attack.trait").
 * @param {string[]} allArrayPaths - Every array path detected for the document type.
 * @param {Array<Object<string,*>>} flatRows - Every document's full flat row map (`_id` included).
 * @returns {{sheet: import('~/spreadsheet/codec/Workbook.js').Sheet, arrayPath: string}} The child sheet.
 */
function buildChildSheet(documentType, arrayPath, allArrayPaths, flatRows) {
   /** @type {(path:string) => {index:string,subField:string}|null} */
   const matcher = buildArrayPathMatcher(arrayPath, allArrayPaths);

   /** @type {Set<string>} Sub-field column names, first-seen order. */
   const subFields = new Set();
   /** @type {Map<string, Map<string, object>>} Element data grouped by document id then dotted index. */
   const byDocument = new Map();

   for (const row of flatRows) {
      /** @type {Map<string, object>} */
      const elements = byDocument.get(row._id) ?? new Map();
      byDocument.set(row._id, elements);
      for (const [path, value] of Object.entries(row)) {
         /** @type {{index:string,subField:string}|null} */
         const match = matcher(path);
         if (!match) continue;
         subFields.add(match.subField);
         if (!elements.has(match.index)) elements.set(match.index, {});
         elements.get(match.index)[match.subField] = value;
      }
   }

   /** @type {Array<Object<string,*>>} */
   const rows = [];
   for (const [id, elements] of byDocument) {
      for (const [index, fields] of elements) {
         rows.push({ _id: id, _index: index, ...fields });
      }
   }

   return {
      arrayPath,
      sheet: { name: `${documentType}.${arrayPath}`, columns: ['_id', '_index', ...subFields], rows },
   };
}

/**
 * Builds the relational-layout document sheet (scalar columns only) plus one child sheet per array
 * path detected for the type.
 * @param {string} documentType - The document type (also the document sheet's name).
 * @param {Array<Object<string,*>>} flatRows - One flat row map per document (fixed columns included).
 * @param {{fieldOrder: string[]}} [typeSchema] - The type's resolved schema order info.
 * @returns {{documentSheet: import('~/spreadsheet/codec/Workbook.js').Sheet, childSheets: Array<{sheet:object,arrayPath:string}>}}
 */
function buildRelationalSheets(documentType, flatRows, typeSchema) {
   /** @type {Set<string>} Every non-fixed column discovered across all rows. */
   const discovered = new Set();
   for (const row of flatRows) {
      for (const path of Object.keys(row)) {
         if (!FIXED_COLUMNS.includes(path)) discovered.add(path);
      }
   }

   /** @type {string[]} */
   const arrayPaths = detectArrayPaths([...discovered]);
   /** @type {Array<(path:string)=>object|null>} One matcher per array path, reused below. */
   const matchers = arrayPaths.map((arrayPath) => buildArrayPathMatcher(arrayPath, arrayPaths));

   /** @type {string[]} */
   const scalarColumns = orderColumns(
      [...discovered].filter((p) => !isUnderAnyArrayPath(p, matchers)),
      typeSchema?.fieldOrder ?? [],
   );
   /** @type {Array<Object<string,*>>} */
   const documentRows = flatRows.map((row) => {
      /** @type {Object<string,*>} */
      const picked = {};
      for (const column of [...FIXED_COLUMNS, ...scalarColumns]) picked[column] = row[column];
      return picked;
   });

   /** @type {Array<{sheet:object,arrayPath:string}>} */
   const childSheets = arrayPaths.map((arrayPath) => buildChildSheet(documentType, arrayPath, arrayPaths, flatRows));

   return {
      documentSheet: { name: documentType, columns: [...FIXED_COLUMNS, ...scalarColumns], rows: documentRows },
      childSheets,
   };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/codec/BuildTables.test.js`
Expected: PASS (all 8 tests).

- [ ] **Step 9: Commit**

```bash
git add src/spreadsheet/codec/BuildTables.js tests/unit/spreadsheet/codec/BuildTables.test.js
git commit -m "feat: build wide and relational spreadsheet tables from document envelopes"
```

---

### Task 10: `codec/ReadTables.js` — reading a Workbook back into document envelopes

**Files:**
- Create: `src/spreadsheet/codec/ReadTables.js`
- Test: `tests/unit/spreadsheet/codec/ReadTables.test.js`

**Interfaces:**
- Consumes: `decodeRow` (Task 8), `unflattenRow` (Task 7), `detectArrayPaths`, `buildArrayPathMatcher`
  (both re-exported from Task 9's `BuildTables.js` — import them from there, don't re-derive), `DocumentEnvelope`
  typedef (Task 9).
- Produces: `readTables(workbook: Workbook, typeSchemas: Object<string,{fieldTypes,fieldOrder}>):
  {layout: 'wide'|'relational', packType: string, envelopes: Array<DocumentEnvelope & {sheetName:string, rowNumber:number}>}`.
  Task 12 (PlanImport) is the sole consumer.

Read Task 9's header note again before starting — `buildArrayPathExpander` below is the mechanical
inverse of `buildArrayPathMatcher`: given a dotted `_index` and a sub-field name, it re-inserts the
index's digits back at the same segment positions the matcher would have pulled them from.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';
import { readTables } from '~/spreadsheet/codec/ReadTables.js';

const NO_SCHEMA = {};

describe('readTables — wide layout', () => {
   it('round-trips a wide-layout workbook back into document envelopes', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), name: 'Sword', type: 'weapon', img: 'i.svg', sort: 1, system: { rarity: 'common', attack: [{ label: 'Slash', damage: 5 }] } },
            parentId: '',
            folderPath: 'Loot',
         },
      ];
      const workbook = buildTables(envelopes, 'wide', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.layout).toBe('wide');
      expect(result.packType).toBe('Item');
      expect(result.envelopes).toHaveLength(1);
      expect(result.envelopes[0]).toMatchObject({
         documentType: 'weapon',
         parentId: '',
         folderPath: 'Loot',
         source: {
            _id: 'a'.repeat(16), name: 'Sword', type: 'weapon', img: 'i.svg', sort: 1,
            system: { rarity: 'common', attack: [{ label: 'Slash', damage: 5 }] },
         },
      });
   });

   it('falls back to first-seen-type-per-sheet when no _manifest sheet is present', () => {
      const handMade = {
         sheets: [
            { name: 'weapon', columns: ['_id', 'name'], rows: [{ _id: 'a'.repeat(16), name: 'Axe' }] },
         ],
      };
      const result = readTables(handMade, NO_SCHEMA);
      expect(result.envelopes[0]).toMatchObject({ documentType: 'weapon', source: { _id: 'a'.repeat(16), name: 'Axe' } });
   });
});

describe('readTables — relational layout', () => {
   it('round-trips a relational-layout workbook, merging child-sheet rows back into their parent', () => {
      const envelopes = [
         {
            documentType: 'weapon',
            source: { _id: 'a'.repeat(16), system: { attack: [{ label: 'Slash', trait: [{ name: 'Reach' }, { name: 'Heavy' }] }, { label: 'Stab' }] } },
         },
      ];
      const workbook = buildTables(envelopes, 'relational', 'Item', NO_SCHEMA);
      const result = readTables(workbook, NO_SCHEMA);
      expect(result.layout).toBe('relational');
      expect(result.envelopes[0].source.system.attack).toEqual([
         { label: 'Slash', trait: [{ name: 'Reach' }, { name: 'Heavy' }] },
         { label: 'Stab' },
      ]);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/codec/ReadTables.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
import { decodeRow } from '~/spreadsheet/codec/DecodeCell.js';
import { unflattenRow } from '~/spreadsheet/codec/UnflattenRow.js';
import { buildArrayPathMatcher } from '~/spreadsheet/codec/BuildTables.js';

/**
 * Reads the `_manifest` sheet (if present) into its layout/packType header values and one entry per
 * data sheet. Falls back to "every sheet is a wide-layout document sheet named after its own type,
 * packType unknown" when no manifest is present, so a hand-made file still imports.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The decoded workbook.
 * @returns {{layout: 'wide'|'relational', packType: string, entries: Array<{sheet:string,documentType:string,arrayPath:string}>}}
 */
function readManifest(workbook) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet|undefined} */
   const manifestSheet = workbook.sheets.find((s) => s.name === '_manifest');
   if (!manifestSheet) {
      return {
         layout: 'wide',
         packType: '',
         entries: workbook.sheets.map((sheet) => ({ sheet: sheet.name, documentType: sheet.name, arrayPath: '' })),
      };
   }

   /** @type {string} */
   let layout = 'wide';
   /** @type {string} */
   let packType = '';
   /** @type {Array<{sheet:string,documentType:string,arrayPath:string}>} */
   const entries = [];
   for (const row of manifestSheet.rows) {
      if (row.key === 'layout') layout = row.value;
      else if (row.key === 'packType') packType = row.value;
      else if (row.key === 'sheet') entries.push({ sheet: row.value, documentType: row.documentType, arrayPath: row.arrayPath });
   }
   return { layout, packType, entries };
}

/**
 * Builds a function that expands one relational child-sheet cell (a sub-field name plus its dotted
 * `_index`) back into the concrete flattened path it came from — the mechanical inverse of
 * `buildArrayPathMatcher` (see Task 9's header note): a numeric index segment is spliced back in after
 * array-path segment `i` exactly when `buildArrayPathMatcher` would have consumed one there.
 * @param {string} arrayPath - The child sheet's array path, e.g. "system.attack.trait".
 * @param {string[]} allArrayPaths - Every array path for the document type (from the manifest).
 * @returns {(index: string, subField: string) => string} The path-expansion function.
 */
function buildArrayPathExpander(arrayPath, allArrayPaths) {
   /** @type {string[]} */
   const segments = arrayPath.split('.');
   /** @type {Set<string>} */
   const arraySet = new Set(allArrayPaths);
   /** @type {boolean[]} */
   const indexFollows = segments.map((_, i) => arraySet.has(segments.slice(0, i + 1).join('.')));

   return (index, subField) => {
      /** @type {string[]} */
      const indexParts = index.split('.');
      /** @type {string[]} */
      const result = [];
      let indexCursor = 0;
      segments.forEach((segment, i) => {
         result.push(segment);
         if (indexFollows[i]) {
            result.push(indexParts[indexCursor]);
            indexCursor += 1;
         }
      });
      return [...result, subField].join('.');
   };
}

/**
 * Collects every relational child-sheet cell for a document type into a flat-path-map addition, keyed
 * by owning document id, ready to be merged into that document's own decoded flat row before
 * unflattening. Child-sheet cells always decode with the untyped-bag literal rules (array-of-object
 * fields have no per-field schema type in this system — see resolveFieldSchema's ObjectField handling).
 * @param {string} documentType - The owning document type.
 * @param {string[]} arrayPaths - Every array path for this document type, from the manifest.
 * @param {Array<{sheet:string,documentType:string,arrayPath:string}>} manifestEntries - Every manifest entry.
 * @param {Map<string, import('~/spreadsheet/codec/Workbook.js').Sheet>} sheetsByName - Sheets by name.
 * @returns {Map<string, Object<string,*>>} Document id -> additional flat entries from child sheets.
 */
function collectChildFlatEntries(documentType, arrayPaths, manifestEntries, sheetsByName) {
   /** @type {Map<string, Object<string,*>>} */
   const result = new Map();
   for (const arrayPath of arrayPaths) {
      /** @type {{sheet:string}|undefined} */
      const entry = manifestEntries.find((e) => e.documentType === documentType && e.arrayPath === arrayPath);
      /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet|undefined} */
      const sheet = entry && sheetsByName.get(entry.sheet);
      if (!sheet) continue;

      /** @type {(index:string, subField:string) => string} */
      const expand = buildArrayPathExpander(arrayPath, arrayPaths);
      for (const row of sheet.rows) {
         /** @type {string} */
         const id = row._id;
         /** @type {Object<string,*>} */
         const flat = result.get(id) ?? {};
         result.set(id, flat);
         for (const column of sheet.columns) {
            if (column === '_id' || column === '_index') continue;
            flat[expand(row._index, column)] = decodeRow({ [column]: row[column] }, [column], {})[column];
         }
      }
   }
   return result;
}

/**
 * Reads a Workbook (as produced by BuildTables, or a hand-made equivalent) back into document
 * envelopes ready for validation and import.
 * @param {import('~/spreadsheet/codec/Workbook.js').Workbook} workbook - The decoded workbook.
 * @param {Object<string, {fieldTypes: object, fieldOrder: string[]}>} typeSchemas - Per document-type
 *    schema info from resolveTypeSchemas, used for schema-driven decode of document-sheet columns.
 * @returns {{layout:'wide'|'relational', packType:string, envelopes: Array<import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope & {sheetName:string, rowNumber:number}>}}
 */
export function readTables(workbook, typeSchemas) {
   /** @type {{layout:string,packType:string,entries:Array<{sheet:string,documentType:string,arrayPath:string}>}} */
   const manifest = readManifest(workbook);

   /** @type {Map<string, string[]>} Array paths per document type, from non-blank manifest entries. */
   const arrayPathsByType = new Map();
   for (const entry of manifest.entries) {
      if (!entry.arrayPath) continue;
      /** @type {string[]} */
      const list = arrayPathsByType.get(entry.documentType) ?? [];
      list.push(entry.arrayPath);
      arrayPathsByType.set(entry.documentType, list);
   }

   /** @type {Map<string, import('~/spreadsheet/codec/Workbook.js').Sheet>} */
   const sheetsByName = new Map(workbook.sheets.map((s) => [s.name, s]));

   /** @type {Array<import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope & {sheetName:string,rowNumber:number}>} */
   const envelopes = [];
   for (const entry of manifest.entries.filter((e) => !e.arrayPath)) {
      /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet|undefined} */
      const sheet = sheetsByName.get(entry.sheet);
      if (!sheet) continue;

      /** @type {string[]} */
      const arrayPaths = arrayPathsByType.get(entry.documentType) ?? [];
      /** @type {Map<string, Object<string,*>>} */
      const childFlatById = collectChildFlatEntries(entry.documentType, arrayPaths, manifest.entries, sheetsByName);
      /** @type {{fieldTypes:object}} */
      const typeSchema = typeSchemas[entry.documentType] ?? { fieldTypes: {} };

      sheet.rows.forEach((row, rowIndex) => {
         /** @type {Object<string,*>} */
         const flat = { ...decodeRow(row, sheet.columns, typeSchema.fieldTypes), ...(childFlatById.get(row._id) ?? {}) };
         /** @type {object} */
         const source = unflattenRow(flat);
         /** @type {string} */
         const parentId = source._parentId || '';
         /** @type {string} */
         const folderPath = source._folder || '';
         delete source._parentId;
         delete source._folder;
         envelopes.push({
            documentType: entry.documentType,
            source,
            parentId,
            folderPath,
            sheetName: entry.sheet,
            rowNumber: rowIndex + 2, // +1 for the header row, +1 to present as a 1-indexed spreadsheet row.
         });
      });
   }

   return { layout: manifest.layout, packType: manifest.packType, envelopes };
}
```

Note on `buildArrayPathMatcher`'s unused import: `collectChildFlatEntries` and `buildArrayPathExpander`
don't call `buildArrayPathMatcher` directly (only its inverse), so remove that import if the linter
flags it as unused — it isn't needed once the expander is written independently. (The header note above
still applies conceptually; the expander re-derives the same `indexFollows` logic rather than sharing
code with the matcher, since the two run in opposite directions over different inputs.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/codec/ReadTables.test.js`
Expected: PASS (3 tests). If the unused-import lint step (Task 18) flags `buildArrayPathMatcher`,
remove that import line now rather than waiting.

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/codec/ReadTables.js tests/unit/spreadsheet/codec/ReadTables.test.js
git commit -m "feat: read a spreadsheet workbook back into document envelopes"
```

---

### Task 11: `io/ExportCompendium.js`

**Files:**
- Create: `src/spreadsheet/io/ExportCompendium.js`
- Test: `tests/unit/spreadsheet/io/ExportCompendium.test.js`

**Interfaces:**
- Consumes: `buildTables` (Task 9), `encodeXlsx` (Task 4), `encodeCsv` (Task 3), `zipFiles` (Task 1),
  `resolveTypeSchemas` (Task 5).
- Produces: `exportCompendium(pack, format: 'xlsx'|'csv', layout: 'wide'|'relational'): Promise<void>`.
  Task 15 (ExportDialog) is the sole consumer. Calls `foundry.utils.saveDataToFile` — mock it in tests.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCompendium } from '~/spreadsheet/io/ExportCompendium.js';

/** Minimal stand-in for an owned Item/ActiveEffect document. */
function makeDoc(type, id, system = {}, effects = []) {
   return { type, id, effects, toObject: () => ({ _id: id, name: id, type, system }) };
}

describe('exportCompendium', () => {
   beforeEach(() => {
      globalThis.CONFIG = { Item: { dataModels: {}, documentClass: { schema: { fields: {} } } } };
      globalThis.foundry.utils.saveDataToFile = vi.fn();
   });

   it('walks embedded items and their effects into the export and triggers a download', async () => {
      /** @type {object} A weapon with one effect on it. */
      const weapon = makeDoc('weapon', 'a'.repeat(16), { rarity: 'common' }, [makeDoc('effect', 'c'.repeat(16))]);
      /** @type {object} An actor owning that weapon. */
      const actor = { type: 'npc', id: 'b'.repeat(16), items: [weapon], effects: [], folder: null, toObject: () => ({ _id: 'b'.repeat(16), name: 'Goblin', type: 'npc' }) };
      /** @type {object} A pack stand-in. */
      const pack = {
         metadata: { type: 'Actor', label: 'Test Actors' },
         folders: [],
         getDocuments: async () => [actor],
      };

      await exportCompendium(pack, 'csv', 'wide');

      expect(globalThis.foundry.utils.saveDataToFile).toHaveBeenCalledOnce();
      /** @type {[Uint8Array|string, string, string]} */
      const [, mimeType, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Test Actors.zip');
      expect(mimeType).toBe('application/zip');
   });

   it('downloads a single .csv when the workbook has exactly one sheet', async () => {
      globalThis.CONFIG = { Item: { dataModels: {}, documentClass: { schema: { fields: {} } } } };
      /** @type {object} */
      const pack = { metadata: { type: 'Item', label: 'Empty Items' }, folders: [], getDocuments: async () => [] };
      await exportCompendium(pack, 'csv', 'wide');
      /** @type {[Uint8Array|string, string, string]} */
      const [, , filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Empty Items.csv');
   });

   it('downloads a .xlsx for xlsx format', async () => {
      /** @type {object} */
      const pack = { metadata: { type: 'Item', label: 'Weapons' }, folders: [], getDocuments: async () => [] };
      await exportCompendium(pack, 'xlsx', 'wide');
      /** @type {[Uint8Array|string, string, string]} */
      const [, mimeType, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0];
      expect(filename).toBe('Weapons.xlsx');
      expect(mimeType).toBe('application/octet-stream');
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/io/ExportCompendium.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
import { buildTables } from '~/spreadsheet/codec/BuildTables.js';
import { encodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { encodeCsv } from '~/spreadsheet/format/Csv.js';
import { zipFiles } from '~/spreadsheet/format/Zip.js';
import { resolveTypeSchemas } from '~/spreadsheet/io/ResolveTypeSchemas.js';

/**
 * Resolves a document's folder into a slash-separated path of folder names from the pack root,
 * escaping a literal slash inside a folder's own name.
 * @param {Folder|null|undefined} folder - The document's folder, or nullish for the pack root.
 * @returns {string} The folder path, or an empty string for the pack root.
 */
function resolveFolderPath(folder) {
   if (!folder) {
      return '';
   }
   /** @type {string[]} Folder names from root to leaf. */
   const names = [];
   /** @type {Folder|null} */
   let current = folder;
   while (current) {
      names.unshift(current.name.replace(/\//g, '\\/'));
      current = current.folder ?? null;
   }
   return names.join('/');
}

/**
 * Recursively collects one document (and, for an actor, its embedded items and their effects) into
 * flat DocumentEnvelope entries.
 * @param {Actor|Item|ActiveEffect} document - The document to collect.
 * @param {string|null} parentId - The owning document's id, or null for a top-level document.
 * @param {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope[]} envelopes - Accumulator (mutated).
 */
function collectEnvelope(document, parentId, envelopes) {
   envelopes.push({
      documentType: document.type,
      source: document.toObject(),
      parentId: parentId ?? undefined,
      folderPath: parentId ? undefined : resolveFolderPath(document.folder),
   });
   for (const item of document.items ?? []) {
      collectEnvelope(item, document.id, envelopes);
      for (const effect of item.effects ?? []) {
         collectEnvelope(effect, item.id, envelopes);
      }
   }
   for (const effect of document.effects ?? []) {
      collectEnvelope(effect, document.id, envelopes);
   }
}

/**
 * Replaces characters unsafe in a filename.
 * @param {string} text - The raw text.
 * @returns {string} The filesystem-safe text.
 */
function safeFilename(text) {
   return text.replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * Exports every document in a compendium pack (including embedded items and effects) to a spreadsheet
 * file and triggers a browser download.
 * @param {CompendiumCollection} pack - The pack to export.
 * @param {'xlsx'|'csv'} format - The file format.
 * @param {'wide'|'relational'} layout - The array layout.
 * @returns {Promise<void>} Resolves once the download has been triggered.
 */
export async function exportCompendium(pack, format, layout) {
   /** @type {Array<Actor|Item|ActiveEffect>} */
   const documents = await pack.getDocuments();
   /** @type {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope[]} */
   const envelopes = [];
   for (const document of documents) {
      collectEnvelope(document, null, envelopes);
   }

   /** @type {object} Per-subtype schema info, used for column ordering. */
   const typeSchemas = resolveTypeSchemas(pack.metadata.type);
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
   const workbook = buildTables(envelopes, layout, pack.metadata.type, typeSchemas);
   /** @type {string} */
   const label = safeFilename(pack.metadata.label);

   if (format === 'xlsx') {
      foundry.utils.saveDataToFile(encodeXlsx(workbook), 'application/octet-stream', `${label}.xlsx`);
      return;
   }
   if (workbook.sheets.length === 1) {
      foundry.utils.saveDataToFile(encodeCsv(workbook.sheets[0]), 'text/csv', `${label}.csv`);
      return;
   }
   /** @type {Object<string, string>} One CSV file per sheet, keyed by filename. */
   const files = {};
   for (const sheet of workbook.sheets) {
      files[`${safeFilename(sheet.name)}.csv`] = encodeCsv(sheet);
   }
   foundry.utils.saveDataToFile(zipFiles(files), 'application/zip', `${label}.zip`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/io/ExportCompendium.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/io/ExportCompendium.js tests/unit/spreadsheet/io/ExportCompendium.test.js
git commit -m "feat: export a compendium pack to an xlsx/csv spreadsheet download"
```

---

### Task 12: `io/PlanImport.js`

**Files:**
- Create: `src/spreadsheet/io/PlanImport.js`
- Test: `tests/unit/spreadsheet/io/PlanImport.test.js`

**Interfaces:**
- Consumes: `decodeXlsx` (Task 4), `decodeCsv` (Task 3), `unzipFilesAsText` (Task 1), `readTables`
  (Task 10), `resolveTypeSchemas` (Task 5).
- Produces:
  - `/** @typedef {object} PlanEntry @property {string} documentType @property {string} id
    @property {string} parentId @property {number} depth @property {object} [source] (creates only)
    @property {object} [changes] (updates only) @property {string} [folderPath] (creates only) */`
  - `/** @typedef {object} ImportPlan @property {PlanEntry[]} creates @property {PlanEntry[]} updates
    @property {Array<{id:string}>} deletes @property {Array<{path:string}>} folders
    @property {Array<{sheet:string,row:number,column:string,message:string}>} errors
    @property {'Actor'|'Item'|'ActiveEffect'} packType */`
  - `planImport(files: File[], targetPack: CompendiumCollection|null, deleteMissing: boolean): Promise<ImportPlan>`.
  Task 13 (ApplyImport) and Task 16 (ImportDialog) are the consumers. `depth` is 0 for a top-level pack
  document, 1 for an item (or an effect directly on an actor/item-pack item), 2 for an effect on an
  owned item — Task 13 uses it to route each entry through the right Foundry API (top-level
  create/update vs. a parent instance's `createEmbeddedDocuments`/`updateEmbeddedDocuments`).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planImport } from '~/spreadsheet/io/PlanImport.js';

/** Builds a minimal in-browser File-like object carrying CSV text. */
function csvFile(name, text) {
   return { name, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

describe('planImport', () => {
   beforeEach(() => {
      globalThis.CONFIG = {
         Item: { dataModels: {}, documentClass: class { constructor(source) { Object.assign(this, source); } } },
      };
      globalThis.foundry.utils.randomID = () => 'x'.repeat(16);
      globalThis.getDocumentClass = (name) => globalThis.CONFIG[name].documentClass;
   });

   it('plans a create for a row with no existing pack document', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\n'
         + 'layout,wide,,\r\npackType,Item,,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = '﻿_id,_parentId,_folder,name,type,img,sort\r\n'
         + `${'a'.repeat(16)},,,Sword,weapon,i.svg,1\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} A target pack with no existing documents. */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toEqual([]);
      expect(plan.creates).toHaveLength(1);
      expect(plan.creates[0]).toMatchObject({ documentType: 'weapon', id: 'a'.repeat(16), depth: 0, parentId: '' });
   });

   it('plans an update for a row whose id already exists in the target pack, via a dry-run validation', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = `﻿_id,_parentId,_folder,name\r\n${'a'.repeat(16)},,,Renamed Sword\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} A pretend existing document supporting a dry-run updateSource. */
      const existing = { updateSource: vi.fn() };
      /** @type {object} */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => existing, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toEqual([]);
      expect(plan.updates).toHaveLength(1);
      expect(existing.updateSource).toHaveBeenCalledWith({ name: 'Renamed Sword' }, { dryRun: true });
   });

   it('records a construction error without throwing', async () => {
      globalThis.CONFIG.Item.documentClass = class { constructor() { throw new Error('invalid'); } };
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = `﻿_id,name\r\n${'a'.repeat(16)},Sword\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Item' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.creates).toHaveLength(0);
      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0].message).toContain('invalid');
   });

   it('assigns a fresh id to a blank _id and to a non-Foundry-id file-local key, remapping references', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Actor,,\r\nsheet,npc,npc,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const npc = '﻿_id,_parentId,name\r\nnew-goblin,,Goblin\r\n';
      /** @type {string} */
      const weapon = '﻿_id,_parentId,name\r\n,new-goblin,Dagger\r\n';
      globalThis.CONFIG.Actor = { dataModels: {}, documentClass: class { constructor(source) { Object.assign(this, source); } } };
      const files = [csvFile('_manifest.csv', manifest), csvFile('npc.csv', npc), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Actor' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      /** @type {object} */
      const npcCreate = plan.creates.find((c) => c.documentType === 'npc');
      /** @type {object} */
      const weaponCreate = plan.creates.find((c) => c.documentType === 'weapon');
      expect(npcCreate.id).toMatch(/^[a-zA-Z0-9]{16}$/);
      expect(weaponCreate.parentId).toBe(npcCreate.id);
      expect(weaponCreate.depth).toBe(1);
   });

   it('plans a delete for every top-level pack index entry absent from the file when deleteMissing is true', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\nsheet,weapon,weapon,\r\n';
      /** @type {string} */
      const weapon = `﻿_id,name\r\n${'a'.repeat(16)},Sword\r\n`;
      const files = [csvFile('_manifest.csv', manifest), csvFile('weapon.csv', weapon)];
      /** @type {object} */
      const targetPack = {
         metadata: { type: 'Item' },
         getDocument: async () => null,
         getIndex: async () => [{ _id: 'a'.repeat(16), type: 'weapon' }, { _id: 'z'.repeat(16), type: 'weapon' }],
      };

      const plan = await planImport(files, targetPack, true);

      expect(plan.deletes).toEqual([{ id: 'z'.repeat(16) }]);
   });

   it('refuses a file whose packType does not match the target pack', async () => {
      /** @type {string} */
      const manifest = '﻿key,value,documentType,arrayPath\r\nlayout,wide,,\r\npackType,Item,,\r\n';
      const files = [csvFile('_manifest.csv', manifest)];
      /** @type {object} */
      const targetPack = { metadata: { type: 'Actor' }, getDocument: async () => null, getIndex: async () => [] };

      const plan = await planImport(files, targetPack, false);

      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0].message).toMatch(/does not match/);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/io/PlanImport.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
import { decodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { decodeCsv } from '~/spreadsheet/format/Csv.js';
import { unzipFilesAsText } from '~/spreadsheet/format/Zip.js';
import { readTables } from '~/spreadsheet/codec/ReadTables.js';
import { resolveTypeSchemas } from '~/spreadsheet/io/ResolveTypeSchemas.js';

/**
 * Derives a sheet name from an uploaded or archived filename by stripping its extension and any
 * directory prefix.
 * @param {string} filename - The archive-relative or uploaded filename.
 * @returns {string} The derived sheet name.
 */
function sheetNameFromFilename(filename) {
   return filename.split('/').pop().replace(/\.csv$/i, '');
}

/**
 * Decodes one or more uploaded files into a single Workbook: a lone `.xlsx`, a lone `.zip` of CSVs, or
 * one-or-more loose `.csv` files (each becomes one sheet, named after its filename).
 * @param {File[]} files - The uploaded file(s).
 * @returns {Promise<import('~/spreadsheet/codec/Workbook.js').Workbook>} The decoded workbook.
 */
async function decodeFiles(files) {
   if (files.length === 1 && files[0].name.toLowerCase().endsWith('.xlsx')) {
      return decodeXlsx(new Uint8Array(await files[0].arrayBuffer()));
   }
   if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
      /** @type {Object<string,string>} filename -> csv text. */
      const entries = unzipFilesAsText(new Uint8Array(await files[0].arrayBuffer()));
      return { sheets: Object.entries(entries).map(([name, text]) => decodeCsv(text, sheetNameFromFilename(name))) };
   }
   /** @type {import('~/spreadsheet/codec/Workbook.js').Sheet[]} */
   const sheets = [];
   for (const file of files) {
      sheets.push(decodeCsv(await file.text(), sheetNameFromFilename(file.name)));
   }
   return { sheets };
}

/**
 * Ensures an envelope's document id is a valid 16-character Foundry id: a blank id gets a fresh id, and
 * a non-blank invalid id (a file-local key, e.g. "new-goblin") is replaced by a fresh id, remembered in
 * `idRemap` so every later reference to that key resolves to the same real id.
 * @param {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope} envelope - Mutated in place.
 * @param {Map<string,string>} idRemap - The file-local-key -> real-id map (mutated).
 */
function remapId(envelope, idRemap) {
   /** @type {string} */
   const rawId = envelope.source._id ?? '';
   if (/^[a-zA-Z0-9]{16}$/.test(rawId)) {
      return;
   }
   if (rawId === '') {
      envelope.source._id = foundry.utils.randomID(16);
      return;
   }
   if (!idRemap.has(rawId)) {
      idRemap.set(rawId, foundry.utils.randomID(16));
   }
   envelope.source._id = idRemap.get(rawId);
}

/**
 * Computes an envelope's nesting depth (0 = top-level pack document, 1 = its embedded item or direct
 * effect, 2 = an effect on an embedded item), following `parentId` links through the id -> envelope map.
 * @param {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope} envelope - The envelope.
 * @param {Map<string, import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope>} byId - Every
 *    envelope keyed by its (already-remapped) id.
 * @returns {number} The nesting depth.
 */
function depthOf(envelope, byId) {
   /** @type {number} */
   let depth = 0;
   /** @type {import('~/spreadsheet/codec/BuildTables.js').DocumentEnvelope} */
   let current = envelope;
   while (current.parentId) {
      depth += 1;
      current = byId.get(current.parentId);
      if (!current) {
         break;
      }
   }
   return depth;
}

/**
 * Reads one or more uploaded spreadsheet files, decodes and validates every row against a target pack
 * (or against bare document construction for a new compendium), and returns a full ImportPlan without
 * writing anything.
 * @param {File[]} files - The uploaded file(s): a single .xlsx, a single .csv, or a .zip/.csv set.
 * @param {CompendiumCollection|null} targetPack - The existing target pack, or null for a new compendium.
 * @param {boolean} deleteMissing - Whether top-level pack documents absent from the file should be
 *    planned for deletion (see this plan's Global Constraints for the embedded-document limitation).
 * @returns {Promise<import('~/spreadsheet/io/PlanImport.js').ImportPlan>} The validated plan.
 */
export async function planImport(files, targetPack, deleteMissing) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
   const workbook = await decodeFiles(files);

   // The type schemas needed to decode a row aren't known until we know packType, which readTables
   // itself extracts from the manifest — so read once with no schemas (falls back to untyped-literal
   // decode for every column), recover packType, then re-read with the real schemas if it differs.
   /** @type {{packType:string}} */
   const probe = readTables(workbook, {});
   /** @type {string} */
   const packType = probe.packType;

   if (targetPack && packType && targetPack.metadata.type !== packType) {
      return {
         creates: [], updates: [], deletes: [], folders: [],
         errors: [{
            sheet: '_manifest', row: 0, column: 'packType',
            message: `The file's document type (${packType}) does not match the target pack (${targetPack.metadata.type}).`,
         }],
         packType: packType || targetPack.metadata.type,
      };
   }
   if (!targetPack && !packType) {
      return {
         creates: [], updates: [], deletes: [], folders: [],
         errors: [{
            sheet: '_manifest', row: 0, column: 'packType',
            message: 'The file has no _manifest sheet naming its document type, and no target pack was selected '
               + 'to infer it from. Select an existing pack, or export from a pack that produced a manifest.',
         }],
         packType: '',
      };
   }

   /** @type {string} The pack type driving schema resolution and document construction. */
   const resolvedPackType = packType || targetPack.metadata.type;
   /** @type {object} Per-subtype schema info, used for validation and typed decode. */
   const typeSchemas = resolveTypeSchemas(resolvedPackType);
   /** @type {{layout:string, packType:string, envelopes: Array<object>}} */
   const { envelopes } = readTables(workbook, typeSchemas);

   /** @type {Map<string, string>} File-local key -> freshly generated real id. */
   const idRemap = new Map();
   for (const envelope of envelopes) {
      remapId(envelope, idRemap);
   }
   for (const envelope of envelopes) {
      if (envelope.parentId && idRemap.has(envelope.parentId)) {
         envelope.parentId = idRemap.get(envelope.parentId);
      }
   }

   /** @type {Map<string, object>} Envelope by its final id, for depth resolution. */
   const byId = new Map(envelopes.map((e) => [e.source._id, e]));

   /** @type {import('~/spreadsheet/io/PlanImport.js').ImportPlan} */
   const plan = { creates: [], updates: [], deletes: [], folders: [], errors: [], packType: resolvedPackType };
   /** @type {Set<string>} Folder paths already queued. */
   const queuedFolders = new Set();
   /** @type {Set<string>} Every top-level id present in the file, for the delete-missing pass. */
   const fileTopLevelIds = new Set();

   /** @type {Array<object>} Parents before children. */
   const ordered = [...envelopes].sort((a, b) => depthOf(a, byId) - depthOf(b, byId));

   for (const envelope of ordered) {
      /** @type {string} */
      const id = envelope.source._id;
      /** @type {number} */
      const depth = depthOf(envelope, byId);
      /** @type {string} */
      const parentId = envelope.parentId ?? '';

      if (depth === 0) {
         fileTopLevelIds.add(id);
         if (envelope.folderPath && !queuedFolders.has(envelope.folderPath)) {
            queuedFolders.add(envelope.folderPath);
            plan.folders.push({ path: envelope.folderPath });
         }
      }

      /** @type {object|null} */
      const existing = (depth === 0 && targetPack) ? await targetPack.getDocument(id) : null;

      try {
         if (existing) {
            /** @type {object} The row's fields without the id (updateSource takes changes only). */
            const { _id, ...changes } = envelope.source;
            existing.updateSource(changes, { dryRun: true });
            plan.updates.push({ documentType: envelope.documentType, id, parentId, depth, changes });
         }
         else {
            /** @type {typeof Actor|typeof Item|typeof ActiveEffect} */
            const DocumentClass = getDocumentClass(plan.packType);
            // eslint-disable-next-line no-new -- constructed only to run full schema validation.
            new DocumentClass(envelope.source);
            plan.creates.push({
               documentType: envelope.documentType, id, parentId, depth,
               source: envelope.source, folderPath: envelope.folderPath,
            });
         }
      }
      catch (error) {
         plan.errors.push({ sheet: envelope.sheetName, row: envelope.rowNumber, column: '', message: error.message });
      }
   }

   if (deleteMissing && targetPack) {
      /** @type {Array<{_id:string,type:string}>} */
      const index = await targetPack.getIndex();
      for (const indexEntry of index) {
         if (!fileTopLevelIds.has(indexEntry._id)) {
            plan.deletes.push({ id: indexEntry._id });
         }
      }
   }

   return plan;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/io/PlanImport.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/io/PlanImport.js tests/unit/spreadsheet/io/PlanImport.test.js
git commit -m "feat: validate an uploaded spreadsheet into an import plan"
```

---

### Task 13: `io/ApplyImport.js`

**Files:**
- Create: `src/spreadsheet/io/ApplyImport.js`
- Test: `tests/unit/spreadsheet/io/ApplyImport.test.js`

**Interfaces:**
- Consumes: an `ImportPlan` (Task 12).
- Produces: `applyImport(plan, targetPack: CompendiumCollection|null, newCompendiumLabel?: string):
  Promise<{pack: CompendiumCollection, created: number, updated: number, deleted: number}>`. Task 16
  (ImportDialog) is the sole consumer.

Depth routing (see Task 12): depth 0 uses the pack-level `DocumentClass.createDocuments`/`.update()`/
`.deleteDocuments`; depth 1+ uses the resolved parent document instance's
`createEmbeddedDocuments`/`updateEmbeddedDocuments`. Deletes are always depth 0 (see this plan's Global
Constraints on the delete-missing limitation), so the delete pass needs no depth handling at all.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyImport } from '~/spreadsheet/io/ApplyImport.js';

describe('applyImport', () => {
   beforeEach(() => {
      globalThis.getDocumentClass = vi.fn();
   });

   it('creates top-level documents via DocumentClass.createDocuments with keepId', async () => {
      /** @type {object[]} */
      const createdDocs = [{ id: 'a'.repeat(16) }];
      /** @type {object} */
      const ItemClass = { createDocuments: vi.fn(async () => createdDocs) };
      globalThis.getDocumentClass = () => ItemClass;
      /** @type {object} */
      const pack = { locked: false, collection: 'world.test', metadata: { type: 'Item' } };
      /** @type {object} */
      const plan = {
         packType: 'Item', folders: [],
         creates: [{ documentType: 'weapon', id: 'a'.repeat(16), parentId: '', depth: 0, source: { _id: 'a'.repeat(16) }, folderPath: '' }],
         updates: [], deletes: [],
      };

      const result = await applyImport(plan, pack);

      expect(ItemClass.createDocuments).toHaveBeenCalledWith(
         [{ _id: 'a'.repeat(16), folder: null }],
         { pack: 'world.test', keepId: true },
      );
      expect(result).toEqual({ pack, created: 1, updated: 0, deleted: 0 });
   });

   it('creates an embedded item via the resolved parent actor instance', async () => {
      /** @type {object[]} */
      const createdActors = [{ id: 'p'.repeat(16), items: { get: () => undefined } }];
      /** @type {object[]} */
      const createdItems = [{ id: 'i'.repeat(16) }];
      /** @type {object} */
      const ActorClass = { createDocuments: vi.fn(async () => createdActors) };
      createdActors[0].createEmbeddedDocuments = vi.fn(async () => createdItems);
      globalThis.getDocumentClass = (name) => (name === 'Actor' ? ActorClass : undefined);
      /** @type {object} */
      const pack = { locked: false, collection: 'world.test', metadata: { type: 'Actor' } };
      /** @type {object} */
      const plan = {
         packType: 'Actor', folders: [],
         creates: [
            { documentType: 'npc', id: 'p'.repeat(16), parentId: '', depth: 0, source: { _id: 'p'.repeat(16) }, folderPath: '' },
            { documentType: 'weapon', id: 'i'.repeat(16), parentId: 'p'.repeat(16), depth: 1, source: { _id: 'i'.repeat(16) }, folderPath: '' },
         ],
         updates: [], deletes: [],
      };

      const result = await applyImport(plan, pack);

      expect(createdActors[0].createEmbeddedDocuments).toHaveBeenCalledWith('Item', [{ _id: 'i'.repeat(16) }], { keepId: true });
      expect(result.created).toBe(2);
   });

   it('updates a top-level document by fetching it from the pack and calling update', async () => {
      /** @type {object} */
      const existing = { update: vi.fn() };
      /** @type {object} */
      const pack = { locked: false, collection: 'world.test', metadata: { type: 'Item' }, getDocument: async () => existing };
      /** @type {object} */
      const plan = {
         packType: 'Item', folders: [],
         creates: [], deletes: [],
         updates: [{ documentType: 'weapon', id: 'a'.repeat(16), parentId: '', depth: 0, changes: { name: 'New Name' } }],
      };

      const result = await applyImport(plan, pack);

      expect(existing.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(result.updated).toBe(1);
   });

   it('refuses to apply into a locked pack', async () => {
      /** @type {object} */
      const pack = { locked: true, metadata: { label: 'Locked Pack' } };
      await expect(applyImport({ packType: 'Item', creates: [], updates: [], deletes: [], folders: [] }, pack))
         .rejects.toThrow(/locked/);
   });

   it('deletes top-level documents by id via DocumentClass.deleteDocuments', async () => {
      /** @type {object} */
      const ItemClass = { deleteDocuments: vi.fn(async () => []) };
      globalThis.getDocumentClass = () => ItemClass;
      /** @type {object} */
      const pack = { locked: false, collection: 'world.test', metadata: { type: 'Item' } };
      /** @type {object} */
      const plan = { packType: 'Item', creates: [], updates: [], folders: [], deletes: [{ id: 'z'.repeat(16) }] };

      const result = await applyImport(plan, pack);

      expect(ItemClass.deleteDocuments).toHaveBeenCalledWith(['z'.repeat(16)], { pack: 'world.test' });
      expect(result.deleted).toBe(1);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/io/ApplyImport.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/**
 * Resolves which embedded document type a given nesting depth represents for a pack type: depth 0 is
 * the pack's own type; depth 1 is "Item" for an Actor pack (an owned item) or "ActiveEffect" otherwise
 * (a direct effect); depth 2 is always "ActiveEffect" (an effect on an owned item).
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type.
 * @param {number} depth - The nesting depth.
 * @returns {'Actor'|'Item'|'ActiveEffect'} The document type at that depth.
 */
function embeddedTypeAt(packType, depth) {
   if (depth === 0) {
      return packType;
   }
   if (depth === 1) {
      return packType === 'Actor' ? 'Item' : 'ActiveEffect';
   }
   return 'ActiveEffect';
}

/**
 * Groups an array by a key function, preserving first-seen key order.
 * @template T
 * @param {T[]} items - The items to group.
 * @param {(item: T) => string} keyOf - Derives each item's group key.
 * @returns {Map<string, T[]>} The grouped items.
 */
function groupBy(items, keyOf) {
   /** @type {Map<string, T[]>} */
   const groups = new Map();
   for (const item of items) {
      /** @type {string} */
      const key = keyOf(item);
      if (!groups.has(key)) {
         groups.set(key, []);
      }
      groups.get(key).push(item);
   }
   return groups;
}

/**
 * Rebuilds a folder's slash-separated path from the pack root, mirroring the export side's escaping so
 * paths compare equal.
 * @param {Folder} folder - The folder to compute the path for.
 * @returns {string} The folder's path.
 */
function folderPathOf(folder) {
   /** @type {string[]} */
   const names = [];
   /** @type {Folder|null} */
   let current = folder;
   while (current) {
      names.unshift(current.name.replace(/\//g, '\\/'));
      current = current.folder ?? null;
   }
   return names.join('/');
}

/**
 * Resolves a list of slash-separated folder paths against a pack's existing folders, creating any
 * missing folders (and their missing ancestors, since paths are processed shortest-first) in the pack.
 * @param {string[]} paths - The folder paths to resolve.
 * @param {CompendiumCollection} pack - The target pack.
 * @returns {Promise<Map<string,string>>} Map of folder path to its (existing or newly created) folder id.
 */
async function resolveFolders(paths, pack) {
   /** @type {Map<string,string>} path -> folder id. */
   const resolved = new Map();
   for (const folder of pack.folders ?? []) {
      resolved.set(folderPathOf(folder), folder.id);
   }

   /** @type {string[]} */
   const sortedPaths = [...new Set(paths)].filter(Boolean).sort((a, b) => a.split('/').length - b.split('/').length);
   for (const path of sortedPaths) {
      if (resolved.has(path)) {
         continue;
      }
      /** @type {string[]} */
      const segments = path.split('/');
      /** @type {string} */
      const parentPath = segments.slice(0, -1).join('/');
      /** @type {Folder[]} */
      const [created] = await Folder.createDocuments(
         [{ name: segments[segments.length - 1], type: pack.metadata.type, folder: resolved.get(parentPath) ?? null }],
         { pack: pack.collection },
      );
      resolved.set(path, created.id);
   }
   return resolved;
}

/**
 * Applies a validated ImportPlan: creates the target compendium if requested, creates missing folders,
 * then creates and updates documents depth-first (top-level before embedded, so a newly created or
 * fetched parent instance exists before embedding into it), then deletes top-level documents if planned.
 * @param {import('~/spreadsheet/io/PlanImport.js').ImportPlan} plan - The validated plan.
 * @param {CompendiumCollection|null} targetPack - The existing target pack, or null to create one.
 * @param {string} [newCompendiumLabel] - The label for a newly created compendium (required if
 *    targetPack is null).
 * @returns {Promise<{pack: CompendiumCollection, created: number, updated: number, deleted: number}>}
 */
export async function applyImport(plan, targetPack, newCompendiumLabel) {
   /** @type {CompendiumCollection} */
   const pack = targetPack ?? await CompendiumCollection.createCompendium({
      type: plan.packType,
      label: newCompendiumLabel,
      name: newCompendiumLabel.slugify(),
   });

   if (pack.locked) {
      throw new Error(`The pack "${pack.metadata.label}" is locked and cannot be imported into.`);
   }

   /** @type {Map<string,string>} Folder path -> resolved folder id. */
   const folderIds = await resolveFolders(plan.folders.map((f) => f.path), pack);
   /** @type {Map<string, object>} Resolved document instances, keyed by id, filled in per depth. */
   const resolved = new Map();

   /** @type {number[]} Distinct depths present in the plan, ascending. */
   const depths = [...new Set([...plan.creates, ...plan.updates].map((e) => e.depth))].sort((a, b) => a - b);

   /** @type {number} */
   let createdCount = 0;
   /** @type {number} */
   let updatedCount = 0;

   for (const depth of depths) {
      /** @type {Map<string, object[]>} Creates at this depth, grouped by parent id ('' for top-level). */
      const createsByParent = groupBy(plan.creates.filter((c) => c.depth === depth), (c) => c.parentId ?? '');
      for (const [parentId, group] of createsByParent) {
         /** @type {object[]} */
         const data = group.map((c) => ({
            ...c.source,
            ...(depth === 0 ? { folder: folderIds.get(c.folderPath) ?? null } : {}),
         }));
         /** @type {object[]} */
         const docs = depth === 0
            ? await getDocumentClass(embeddedTypeAt(plan.packType, depth)).createDocuments(data, { pack: pack.collection, keepId: true })
            : await resolved.get(parentId).createEmbeddedDocuments(embeddedTypeAt(plan.packType, depth), data, { keepId: true });
         docs.forEach((doc, i) => resolved.set(group[i].id, doc));
         createdCount += docs.length;
      }

      /** @type {Map<string, object[]>} Updates at this depth, grouped by parent id. */
      const updatesByParent = groupBy(plan.updates.filter((u) => u.depth === depth), (u) => u.parentId ?? '');
      for (const [parentId, group] of updatesByParent) {
         if (depth === 0) {
            for (const update of group) {
               /** @type {object} */
               const document = await pack.getDocument(update.id);
               await document.update(update.changes);
               resolved.set(update.id, document);
            }
         }
         else {
            /** @type {object} The resolved parent instance: created/updated earlier in this same pass, or
             * (a parent whose own fields are unchanged, only its embedded child changed) fetched fresh. */
            const parent = resolved.get(parentId) ?? await pack.getDocument(parentId);
            await parent.updateEmbeddedDocuments(
               embeddedTypeAt(plan.packType, depth),
               group.map((u) => ({ _id: u.id, ...u.changes })),
            );
            /** @type {string} The parent's embedded-collection property name at this depth. */
            const collectionKey = embeddedTypeAt(plan.packType, depth) === 'Item' ? 'items' : 'effects';
            for (const update of group) {
               resolved.set(update.id, parent[collectionKey].get(update.id));
            }
         }
         updatedCount += group.length;
      }
   }

   if (plan.deletes.length) {
      await getDocumentClass(plan.packType).deleteDocuments(plan.deletes.map((d) => d.id), { pack: pack.collection });
   }

   return { pack, created: createdCount, updated: updatedCount, deleted: plan.deletes.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/io/ApplyImport.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/spreadsheet/io/ApplyImport.js tests/unit/spreadsheet/io/ApplyImport.test.js
git commit -m "feat: apply a validated import plan's creates/updates/deletes to a compendium pack"
```

---

### Task 14: `ui/ExportDialog.js` + `ExportDialogShell.svelte`

**Files:**
- Create: `src/spreadsheet/ui/ExportDialog.js`
- Create: `src/spreadsheet/ui/ExportDialogShell.svelte`
- Test: `tests/unit/spreadsheet/ui/ExportDialog.test.js`

**Interfaces:**
- Consumes: `TitanDialog` (`~/helpers/dialogs/Dialog.js`), `exportCompendium` (Task 11), the shared
  `Select` (`~/helpers/svelte-components/input/select/Select.svelte`) and `Button`
  (`~/helpers/svelte-components/button/Button.svelte`) primitives.
- Produces: `ExportDialog` (a `TitanDialog` subclass constructed with a `pack`), used by Task 16's hook.

This task's unit test targets only the plain-JS `ExportDialog.js` wrapper (constructor options), not the
Svelte shell — Svelte component behavior in this codebase is exercised through Playwright, per
`tests/components/` + `tests/e2e/`, not Vitest. Task 17 covers the shell end-to-end.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest';

vi.mock('~/spreadsheet/ui/ExportDialogShell.svelte', () => ({ default: class {} }));

describe('ExportDialog', () => {
   it('titles the dialog with the pack label and passes the pack to the shell', async () => {
      const { default: ExportDialog } = await import('~/spreadsheet/ui/ExportDialog.js');
      /** @type {object} */
      const pack = { metadata: { label: 'Test Weapons' } };
      /** @type {object} */
      const dialog = new ExportDialog(pack);
      expect(dialog.options.window.title).toContain('Test Weapons');
      expect(dialog.options.content.props.pack).toBe(pack);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/ui/ExportDialog.test.js`
Expected: FAIL — module not found. (`TitanDialog`'s own `foundry.applications.api.ApplicationV2` base
is not mocked in the shared test setup; if this test also fails on that, add a minimal
`globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } }`
stand-in at the top of the test file before the dynamic imports, mirroring the mocking pattern already
used for `foundry.data.fields` elsewhere in this plan.)

- [ ] **Step 3: Implement `ExportDialog.js`**

```js
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import ExportDialogShell from '~/spreadsheet/ui/ExportDialogShell.svelte';

/**
 * Dialog offering format (xlsx/csv) and layout (wide/relational) choices, then exporting a compendium
 * pack to a downloaded spreadsheet file.
 * @extends {TitanDialog}
 */
export default class ExportDialog extends TitanDialog {
   /**
    * Builds the dialog window and passes the target pack to the export shell component.
    * @param {CompendiumCollection} pack - The pack to export.
    */
   constructor(pack) {
      super({
         title: `${localize('exportToSpreadsheet')} (${pack.metadata.label})`,
         content: {
            class: ExportDialogShell,
            props: { pack },
         },
         id: `export-spreadsheet-dialog-${pack.collection}`,
      });
   }
}
```

- [ ] **Step 4: Write `ExportDialogShell.svelte`**

```svelte
<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { exportCompendium } from '~/spreadsheet/io/ExportCompendium.js';

   /**
    * @typedef {object} ExportDialogShellProps
    * @property {CompendiumCollection} pack - The pack to export.
    */

   /** @type {ExportDialogShellProps} */
   const { pack } = $props();

   /** @type {'xlsx'|'csv'} The selected file format. */
   let format = $state('xlsx');

   /** @type {'wide'|'relational'} The selected array layout. */
   let layout = $state('wide');

   /** @type {boolean} Whether an export is currently running (disables the button to prevent a double-click). */
   let exporting = $state(false);

   /** Runs the export and closes the dialog once the download has been triggered. */
   async function onExport() {
      exporting = true;
      await exportCompendium(pack, format, layout);
      exporting = false;
   }
</script>

<div class="titan-export-dialog">
   <Select
      options={[
         { value: 'xlsx', label: localize('xlsxFormat') },
         { value: 'csv', label: localize('csvFormat') },
      ]}
      bind:value={format}
      testId="export-format-select"
   />
   <Select
      options={[
         { value: 'wide', label: localize('wideLayout') },
         { value: 'relational', label: localize('relationalLayout') },
      ]}
      bind:value={layout}
      testId="export-layout-select"
   />
   <Button
      disabled={exporting}
      onclick={onExport}
      testId="export-confirm-button"
   >
      {localize('exportToSpreadsheet')}
   </Button>
</div>

<style lang="scss">
   .titan-export-dialog {
      @include flex-column;

      gap: var(--titan-spacing-md);
      padding: var(--titan-spacing-md);
   }
</style>
```

- [ ] **Step 5: Add the four new localization keys**

Add to `lang/en.json` (alphabetically among existing top-level keys, matching the file's existing
convention — check the file for the correct insertion points rather than appending):

```json
"csvFormat": "CSV",
"exportToSpreadsheet": "Export to Spreadsheet",
"importSpreadsheet": "Import Spreadsheet",
"relationalLayout": "Relational (one array per sheet)",
"wideLayout": "Wide (one row per document)",
"xlsxFormat": "Excel Workbook (.xlsx)",
```

(Task 15 needs `importSpreadsheet` too — adding it here now avoids touching `lang/en.json` again in
that task.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/ui/ExportDialog.test.js`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/spreadsheet/ui/ExportDialog.js src/spreadsheet/ui/ExportDialogShell.svelte \
   tests/unit/spreadsheet/ui/ExportDialog.test.js lang/en.json
git commit -m "feat: add the compendium spreadsheet export dialog"
```

---

### Task 15: `ui/ImportDialog.js` + `ImportDialogShell.svelte`

**Files:**
- Create: `src/spreadsheet/ui/ImportDialog.js`
- Create: `src/spreadsheet/ui/ImportDialogShell.svelte`
- Test: `tests/unit/spreadsheet/ui/ImportDialog.test.js`

**Interfaces:**
- Consumes: `TitanDialog`, `planImport`/`applyImport` (Tasks 12–13), `Select`, `Button`,
  `CheckboxInput` (`~/helpers/svelte-components/input/CheckboxInput.svelte`) primitives.
- Produces: `ImportDialog` (a `TitanDialog` subclass constructed with a pack or `null`), used by Task 16.

As with Task 14, this task's Vitest coverage targets the plain-JS wrapper; the interactive flow (file
selection, preview, apply) is covered end-to-end in Task 17.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest';

vi.mock('~/spreadsheet/ui/ImportDialogShell.svelte', () => ({ default: class {} }));

describe('ImportDialog', () => {
   it('preselects the given pack and titles the dialog generically when none is given', async () => {
      const { default: ImportDialog } = await import('~/spreadsheet/ui/ImportDialog.js');
      /** @type {object} */
      const pack = { metadata: { label: 'Test Weapons' }, collection: 'world.test' };

      /** @type {object} */
      const withPack = new ImportDialog(pack);
      expect(withPack.options.content.props.initialPack).toBe(pack);

      /** @type {object} */
      const withoutPack = new ImportDialog(null);
      expect(withoutPack.options.content.props.initialPack).toBeNull();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/spreadsheet/ui/ImportDialog.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ImportDialog.js`**

```js
import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import ImportDialogShell from '~/spreadsheet/ui/ImportDialogShell.svelte';

/**
 * Dialog for importing a spreadsheet file into an existing or new compendium: choose files, a target
 * pack (or a new one), whether to delete pack documents absent from the file, preview the resulting
 * plan, then apply it.
 * @extends {TitanDialog}
 */
export default class ImportDialog extends TitanDialog {
   /**
    * Builds the dialog window, preselecting a target pack when opened from that pack's context menu.
    * @param {CompendiumCollection|null} initialPack - The preselected target pack, or null.
    */
   constructor(initialPack) {
      super({
         title: localize('importSpreadsheet'),
         content: {
            class: ImportDialogShell,
            props: { initialPack },
         },
         id: `import-spreadsheet-dialog-${initialPack?.collection ?? 'new'}`,
      });
   }

   /**
    * @override
    * @returns {object} Wider default size than the base dialog, to fit the file picker and preview table.
    */
   static DEFAULT_OPTIONS = {
      position: { width: 480, height: 'auto' },
      window: { resizable: true, minimizable: false },
   };
}
```

- [ ] **Step 4: Write `ImportDialogShell.svelte`**

```svelte
<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { planImport } from '~/spreadsheet/io/PlanImport.js';
   import { applyImport } from '~/spreadsheet/io/ApplyImport.js';

   /**
    * @typedef {object} ImportDialogShellProps
    * @property {CompendiumCollection|null} initialPack - The preselected target pack, or null.
    */

   /** @type {ImportDialogShellProps} */
   const { initialPack } = $props();

   /** @type {'existing'|'new'} Whether to target an existing pack or create a new compendium. */
   let targetMode = $state(initialPack ? 'existing' : 'new');

   /** @type {string} The collection id of the selected existing pack. */
   let targetCollection = $state(initialPack?.collection ?? '');

   /** @type {string} The label for a newly created compendium. */
   let newCompendiumLabel = $state('');

   /** @type {boolean} Whether pack documents absent from the file should be deleted. */
   let deleteMissing = $state(false);

   /** @type {File[]} The currently selected files. */
   let selectedFiles = $state([]);

   /** @type {import('~/spreadsheet/io/PlanImport.js').ImportPlan|null} The last computed plan, if any. */
   let plan = $state(null);

   /** @type {boolean} Whether planning or applying is currently running. */
   let busy = $state(false);

   /** @type {Array<{value:string,label:string}>} Every pack whose type is known once a plan has run. */
   const packOptions = $derived(
      (game.packs.contents ?? [...game.packs])
         .filter((pack) => !plan || pack.metadata.type === plan.packType)
         .map((pack) => ({ value: pack.collection, label: pack.metadata.label })),
   );

   /** Reads the chosen files from the native file input into local state. */
   function onFilesChosen(event) {
      selectedFiles = [...event.target.files];
      plan = null;
   }

   /** Resolves the current target pack (or null, for "new compendium"), from the selected collection id. */
   function resolveTargetPack() {
      return targetMode === 'existing' ? game.packs.get(targetCollection) ?? null : null;
   }

   /** Runs planImport against the current selections and stores the resulting plan. */
   async function onPreview() {
      busy = true;
      plan = await planImport(selectedFiles, resolveTargetPack(), deleteMissing);
      busy = false;
   }

   /** Applies the current plan, then closes by unmounting (the dialog's own close button remains available). */
   async function onApply() {
      busy = true;
      try {
         /** @type {{created:number, updated:number, deleted:number}} */
         const result = await applyImport(plan, resolveTargetPack(), newCompendiumLabel);
         ui.notifications.info(
            localize('importSpreadsheetComplete', {
               created: result.created,
               updated: result.updated,
               deleted: result.deleted,
            }),
         );
      } catch (error) {
         ui.notifications.error(`TITAN | ${error.message}`);
         return;
      } finally {
         busy = false;
      }
      plan = null;
      selectedFiles = [];
   }
</script>

<div class="titan-import-dialog">
   <input
      accept=".xlsx,.csv,.zip"
      data-testid="import-file-input"
      multiple
      onchange={onFilesChosen}
      type="file"
   />

   <Select
      options={[
         { value: 'existing', label: localize('importIntoExisting') },
         { value: 'new', label: localize('importIntoNew') },
      ]}
      bind:value={targetMode}
      testId="import-target-mode-select"
   />

   {#if targetMode === 'existing'}
      <Select
         options={packOptions}
         bind:value={targetCollection}
         testId="import-target-pack-select"
      />
   {:else}
      <input
         bind:value={newCompendiumLabel}
         data-testid="import-new-label-input"
         placeholder={localize('newCompendiumLabel')}
         type="text"
      />
   {/if}

   <label>
      <CheckboxInput bind:value={deleteMissing} testId="import-delete-missing-checkbox" />
      <Text text={localize('deletePackDocumentsAbsentFromFile')} />
   </label>

   <Button
      disabled={busy || selectedFiles.length === 0}
      onclick={onPreview}
      testId="import-preview-button"
   >
      {localize('previewImport')}
   </Button>

   {#if plan}
      <div class="titan-import-preview" data-testid="import-preview-summary">
         <Text
            text={localize('importPlanSummary', {
               creates: plan.creates.length,
               updates: plan.updates.length,
               deletes: plan.deletes.length,
            })}
         />
         {#if plan.errors.length > 0}
            <ul>
               {#each plan.errors as error (error.sheet + error.row + error.column)}
                  <li>{error.sheet} row {error.row}: {error.message}</li>
               {/each}
            </ul>
         {/if}
      </div>
      <Button
         disabled={busy || plan.errors.length > 0}
         onclick={onApply}
         testId="import-apply-button"
      >
         {localize('applyImport')}
      </Button>
   {/if}
</div>

<style lang="scss">
   .titan-import-dialog {
      @include flex-column;

      gap: var(--titan-spacing-md);
      padding: var(--titan-spacing-md);
   }

   .titan-import-preview ul {
      @include flex-column;

      color: var(--titan-error-color);
      gap: var(--titan-spacing-xs);
      max-height: 200px;
      overflow-y: auto;
   }
</style>
```

**Verify against the live app before committing:** `game.packs` is a `WorldCollection`-like iterable
(`for...of` works directly); check whether `.contents` is actually needed on top of the raw iterable in
this Foundry v14 build (the `[...game.packs]` fallback above already covers both cases, so this is a
low-risk check, not a blocking one) — simplify to whichever form the rest of this codebase already uses
by grepping `game.packs` usage in `src/sidebar/tray/GetEffectCompendiums.js` (it filters `game.packs`
directly, confirming the plain-iterable form works and the `.contents` fallback can be dropped).

- [ ] **Step 5: Add the remaining localization keys**

Add to `lang/en.json` alongside Task 14's keys:

```json
"applyImport": "Apply Import",
"deletePackDocumentsAbsentFromFile": "Delete pack documents absent from the file",
"importIntoExisting": "Existing Compendium",
"importIntoNew": "New Compendium",
"importPlanSummary": "{creates} to create, {updates} to update, {deletes} to delete.",
"importSpreadsheetComplete": "Import complete: {created} created, {updated} updated, {deleted} deleted.",
"newCompendiumLabel": "New Compendium Name",
"previewImport": "Preview",
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/spreadsheet/ui/ImportDialog.test.js`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/spreadsheet/ui/ImportDialog.js src/spreadsheet/ui/ImportDialogShell.svelte \
   tests/unit/spreadsheet/ui/ImportDialog.test.js lang/en.json
git commit -m "feat: add the compendium spreadsheet import dialog"
```

---

### Task 16: Hooks — context menu entries and the sidebar header button

**Files:**
- Create: `src/hooks/OnGetCompendiumContextOptions.js`
- Create: `src/hooks/OnRenderCompendiumDirectory.js`
- Modify: `src/index.js` (register both hooks alongside the existing ones)
- Test: `tests/unit/hooks/OnGetCompendiumContextOptions.test.js`

**Interfaces:**
- Consumes: `ExportDialog` (Task 14), `ImportDialog` (Task 15).
- Produces: nothing consumed elsewhere — this is the final wiring task that makes the feature reachable
  from the UI.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import onGetCompendiumContextOptions from '~/hooks/OnGetCompendiumContextOptions.js';

describe('onGetCompendiumContextOptions', () => {
   beforeEach(() => {
      globalThis.game = {
         user: { isGM: true },
         packs: { get: (id) => (id === 'test.weapons' ? { metadata: { type: 'Item' } } : undefined) },
      };
   });

   it('adds an export entry visible only for a GM on a supported pack type', () => {
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const exportEntry = options.find((o) => o.label === 'exportToSpreadsheet');
      /** @type {object} A pack li stand-in. */
      const li = { dataset: { pack: 'test.weapons' } };
      expect(exportEntry.visible(li)).toBe(true);

      globalThis.game.user.isGM = false;
      expect(exportEntry.visible(li)).toBe(false);
   });

   it('hides the export entry for an unsupported pack type', () => {
      globalThis.game.packs.get = () => ({ metadata: { type: 'RollTable' } });
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const exportEntry = options.find((o) => o.label === 'exportToSpreadsheet');
      expect(exportEntry.visible({ dataset: { pack: 'test.weapons' } })).toBe(false);
   });

   it('adds an import entry visible for any GM regardless of pack type', () => {
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const importEntry = options.find((o) => o.label === 'importSpreadsheet');
      expect(importEntry.visible({ dataset: { pack: 'test.weapons' } })).toBe(true);
   });
});
```

Note: `localize('exportToSpreadsheet')` in the real handler returns the localized string, but this test
mocks nothing for `localize` — before writing the implementation, check whether this codebase's
`localize()` helper falls back to the raw key when `game.i18n` is unset (many of this project's own hook
tests rely on exactly that fallback; grep `src/helpers/utility-functions/Localize.js` and an existing
hook test like `tests/unit/hooks/` for the established pattern) so the assertions above comparing
against the raw key string continue to work without an i18n mock.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/hooks/OnGetCompendiumContextOptions.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
import localize from '~/helpers/utility-functions/Localize.js';
import ExportDialog from '~/spreadsheet/ui/ExportDialog.js';
import ImportDialog from '~/spreadsheet/ui/ImportDialog.js';

/** @type {string[]} Document types the spreadsheet export tool supports. */
const SUPPORTED_EXPORT_TYPES = ['Actor', 'Item', 'ActiveEffect'];

/**
 * Resolves the CompendiumCollection for a compendium-directory entry element.
 * @param {HTMLElement} li - The directory entry element (carries `data-pack`).
 * @returns {CompendiumCollection|undefined} The resolved pack, if any.
 */
function getPack(li) {
   return game.packs.get(li.dataset.pack ?? li.closest('[data-pack]')?.dataset.pack);
}

/**
 * Adds "Export to spreadsheet…" and "Import spreadsheet…" entries to a compendium's context menu.
 * @param {ApplicationV2} _application - The CompendiumDirectory instance (unused).
 * @param {object[]} options - Array of ContextMenuEntry objects to be mutated.
 */
export default function onGetCompendiumContextOptions(_application, options) {
   options.push({
      label: localize('exportToSpreadsheet'),
      icon: '<i class="fas fa-file-export"></i>',
      visible: (li) => {
         if (!game.user.isGM) {
            return false;
         }
         /** @type {CompendiumCollection|undefined} */
         const pack = getPack(li);
         return Boolean(pack) && SUPPORTED_EXPORT_TYPES.includes(pack.metadata.type);
      },
      onClick: (_event, li) => new ExportDialog(getPack(li)).render(true),
   });

   options.push({
      label: localize('importSpreadsheet'),
      icon: '<i class="fas fa-file-import"></i>',
      visible: () => game.user.isGM,
      onClick: (_event, li) => new ImportDialog(getPack(li) ?? null).render(true),
   });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/hooks/OnGetCompendiumContextOptions.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the header button hook**

```js
import localize from '~/helpers/utility-functions/Localize.js';
import ImportDialog from '~/spreadsheet/ui/ImportDialog.js';

/**
 * Injects an "Import spreadsheet…" button into the Compendium sidebar tab's header for a GM. Verify the
 * exact header-actions container selector against the live `CompendiumDirectory` DOM before finalizing
 * (inspect the rendered sidebar tab, or its template under
 * `client/applications/sidebar/tabs/compendium-directory.mjs` in the Foundry source corpus) — this falls
 * back to the tab's outer `.directory-header` element if a dedicated actions row isn't found, so it
 * degrades to "button appended at the top of the header" rather than failing silently.
 * @param {ApplicationV2} _application - The CompendiumDirectory instance (unused).
 * @param {HTMLElement} element - The rendered sidebar tab's root element.
 */
export default function onRenderCompendiumDirectory(_application, element) {
   if (!game.user.isGM) {
      return;
   }
   /** @type {HTMLElement|null} */
   const controls =
      element.querySelector('.directory-header .header-actions') ?? element.querySelector('.directory-header');
   if (!controls || controls.querySelector('[data-action="titanImportSpreadsheet"]')) {
      return;
   }

   /** @type {HTMLButtonElement} */
   const button = document.createElement('button');
   button.type = 'button';
   button.dataset.action = 'titanImportSpreadsheet';
   button.dataset.testid = 'titan-import-spreadsheet-button';
   button.innerHTML = `<i class="fas fa-file-import"></i> ${localize('importSpreadsheet')}`;
   button.addEventListener('click', () => new ImportDialog(null).render(true));
   controls.appendChild(button);
}
```

- [ ] **Step 6: Wire both hooks in `src/index.js`**

Read `src/index.js` first to match its existing hook-import/registration block exactly (alphabetized
imports, `Hooks.on` calls grouped with the other directory-context hooks such as
`OnGetItemDirectoryEntryContext`). Add:

```js
import onGetCompendiumContextOptions from '~/hooks/OnGetCompendiumContextOptions.js';
import onRenderCompendiumDirectory from '~/hooks/OnRenderCompendiumDirectory.js';
```

and, alongside the other `Hooks.on(...)` registrations:

```js
Hooks.on('getCompendiumContextOptions', onGetCompendiumContextOptions);
Hooks.on('renderCompendiumDirectory', onRenderCompendiumDirectory);
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/OnGetCompendiumContextOptions.js src/hooks/OnRenderCompendiumDirectory.js \
   src/index.js tests/unit/hooks/OnGetCompendiumContextOptions.test.js
git commit -m "feat: wire the spreadsheet export/import entry points into the Compendium sidebar"
```

---

### Task 17: End-to-end coverage

**Files:**
- Create: `tests/e2e/compendium-spreadsheet.spec.js`

**Interfaces:**
- Consumes: `tests/shared/builders.js` factory functions (for a seeded actor/item/effect fixture set —
  read that file first to reuse an existing builder rather than hand-writing fixture payloads), the
  Playwright `page` fixture per this codebase's shared-world e2e convention (see
  `references/architecture.md`'s Test layout section — one boot per file, module-scoped shared `page`).

Read `tests/e2e/permissions-ownership.spec.js` or another recent spec first for the current
boot/login/page-evaluate conventions (E2E GM 1 seat, `page.evaluate` running in-client, `expect.poll`
instead of fixed sleeps — see the `e2e-output-pipes-lie` and `e2e-user-seats` project memory notes).
The test bodies below assume: a module-scoped shared `page` already logged in as the E2E GM seat (per
`references/architecture.md`'s Test layout section), a right-click on a compendium directory entry opens
Foundry's native context menu as a list of `.context-item` elements filtered by their text, and this
codebase's production bundle exposes no test-only API (Strict Rule: no dynamic imports/test code in the
shipping build) — so every scenario drives the real UI and intercepts the real browser download, exactly
as a GM would. Adjust the two CSS selectors marked below if the live DOM differs once run.

- [ ] **Step 1: Export produces a manifest and one row per effect, via a real triggered download**

```js
import { test, expect } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';

/**
 * Opens the Compendium sidebar tab and right-clicks the named pack's directory entry, waiting for its
 * context menu to appear.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {string} packLabel - The pack's display label, e.g. "TITAN Effects".
 * @returns {Promise<void>} Resolves once the context menu is visible.
 */
async function openPackContextMenu(page, packLabel) {
   await page.locator('#sidebar-tabs [data-tab="compendium"]').click();
   await page.locator('.directory-item[data-pack]', { hasText: packLabel }).click({ button: 'right' });
   await page.locator('.context-menu').waitFor();
}

test('exporting the seeded effects pack produces a manifest and one row per effect', async ({ page }) => {
   await openPackContextMenu(page, 'TITAN Effects');
   /** @type {Promise<import('@playwright/test').Download>} */
   const downloadPromise = page.waitForEvent('download');
   await page.locator('.context-item', { hasText: 'Export to Spreadsheet' }).click();
   // Default format/layout (xlsx/wide) exports as a single .xlsx with no dialog interaction needed —
   // the context-menu action opens the dialog; accept its defaults by clicking the confirm button.
   await page.locator('[data-testid="export-confirm-button"]').click();
   /** @type {import('@playwright/test').Download} */
   const download = await downloadPromise;
   /** @type {string} */
   const path = await download.path();
   /** @type {Buffer} */
   const bytes = await require('node:fs/promises').readFile(path);
   /** @type {Object<string,Uint8Array>} */
   const entries = unzipSync(new Uint8Array(bytes));
   expect(Object.keys(entries)).toContain('xl/worksheets/sheet1.xml');
   /** @type {string} */
   const workbookXml = strFromU8(entries['xl/workbook.xml']);
   expect(workbookXml).toContain('_manifest');
   expect(workbookXml).toContain('effect');
});
```

- [ ] **Step 2: Full export → mutate → import-into-existing round trip**

```js
test('a mutated exported CSV file imports back into the same pack, updating a field', async ({ page }) => {
   await openPackContextMenu(page, 'TITAN Effects');
   /** @type {Promise<import('@playwright/test').Download>} */
   const downloadPromise = page.waitForEvent('download');
   await page.locator('.context-item', { hasText: 'Export to Spreadsheet' }).click();
   await page.locator('[data-testid="export-format-select"]').selectOption('csv');
   await page.locator('[data-testid="export-confirm-button"]').click();
   /** @type {string} */
   const zipPath = await (await downloadPromise).path();

   /** @type {Object<string,Uint8Array>} */
   const entries = unzipSync(new Uint8Array(await require('node:fs/promises').readFile(zipPath)));
   /** @type {string} */
   const effectCsv = strFromU8(entries['effect.csv']);
   // Replace the first effect's `name` column value with a fixed marker string, locating the `name`
   // column by the header row rather than assuming its position.
   /** @type {string[]} */
   const lines = effectCsv.replace(/^﻿/, '').split('\r\n').filter(Boolean);
   /** @type {string[]} */
   const header = lines[0].split(',');
   /** @type {number} */
   const nameIndex = header.indexOf('name');
   /** @type {string[]} */
   const firstDataRow = lines[1].split(',');
   firstDataRow[nameIndex] = 'E2E Renamed Effect';
   lines[1] = firstDataRow.join(',');
   /** @type {string} */
   const rewritten = `﻿${lines.join('\r\n')}\r\n`;

   /** @type {string} */
   const tmpPath = require('node:path').join(require('node:os').tmpdir(), 'titan-e2e-effect.csv');
   await require('node:fs/promises').writeFile(tmpPath, rewritten);

   await openPackContextMenu(page, 'TITAN Effects');
   await page.locator('.context-item', { hasText: 'Import Spreadsheet' }).click();
   await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpPath);
   await page.locator('[data-testid="import-preview-button"]').click();
   /** @type {import('@playwright/test').Locator} */
   const summary = page.locator('[data-testid="import-preview-summary"]');
   await expect(summary).toContainText('1 to update');
   await page.locator('[data-testid="import-apply-button"]').click();

   /** @type {string} */
   const updatedName = await page.evaluate(async () => {
      /** @type {object} */
      const pack = game.packs.get('titan.effects');
      /** @type {object[]} */
      const index = await pack.getIndex();
      /** @type {object} */
      const renamed = await pack.getDocument(index.find((e) => e.name === 'E2E Renamed Effect')._id);
      return renamed.name;
   });
   expect(updatedName).toBe('E2E Renamed Effect');
});
```

- [ ] **Step 3: Import into a new compendium**

```js
test('importing into "New Compendium" creates a pack with the imported documents', async ({ page }) => {
   await openPackContextMenu(page, 'TITAN Effects');
   /** @type {Promise<import('@playwright/test').Download>} */
   const downloadPromise = page.waitForEvent('download');
   await page.locator('.context-item', { hasText: 'Export to Spreadsheet' }).click();
   await page.locator('[data-testid="export-format-select"]').selectOption('csv');
   await page.locator('[data-testid="export-confirm-button"]').click();
   /** @type {string} */
   const zipPath = await (await downloadPromise).path();

   await page.locator('#sidebar-tabs [data-tab="compendium"]').click();
   await page.locator('[data-testid="titan-import-spreadsheet-button"]').click();
   await page.locator('[data-testid="import-file-input"]').setInputFiles(zipPath);
   await page.locator('[data-testid="import-target-mode-select"]').selectOption('new');
   await page.locator('[data-testid="import-new-label-input"]').fill('E2E Imported Effects');
   await page.locator('[data-testid="import-preview-button"]').click();
   await page.locator('[data-testid="import-apply-button"]').click();

   /** @type {number} */
   const newPackSize = await page.evaluate(async () => {
      /** @type {object|undefined} */
      const pack = [...game.packs].find((p) => p.metadata.label === 'E2E Imported Effects');
      return pack ? (await pack.getIndex()).size ?? (await pack.getIndex()).length : 0;
   });
   expect(newPackSize).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Delete-missing option**

```js
test('deleteMissing removes a top-level pack document absent from the imported file', async ({ page }) => {
   await openPackContextMenu(page, 'TITAN Effects');
   /** @type {Promise<import('@playwright/test').Download>} */
   const downloadPromise = page.waitForEvent('download');
   await page.locator('.context-item', { hasText: 'Export to Spreadsheet' }).click();
   await page.locator('[data-testid="export-format-select"]').selectOption('csv');
   await page.locator('[data-testid="export-confirm-button"]').click();
   /** @type {string} */
   const zipPath = await (await downloadPromise).path();

   /** @type {Object<string,Uint8Array>} */
   const entries = unzipSync(new Uint8Array(await require('node:fs/promises').readFile(zipPath)));
   /** @type {string[]} */
   const lines = strFromU8(entries['effect.csv']).replace(/^﻿/, '').split('\r\n').filter(Boolean);
   /** @type {string} The id column value being removed, read before dropping the row. */
   const removedId = lines[1].split(',')[0];
   /** @type {string} The file with its first data row removed (one fewer effect than the live pack). */
   const rewritten = `﻿${[lines[0], ...lines.slice(2)].join('\r\n')}\r\n`;
   /** @type {string} */
   const tmpPath = require('node:path').join(require('node:os').tmpdir(), 'titan-e2e-effect-missing.csv');
   await require('node:fs/promises').writeFile(tmpPath, rewritten);

   await openPackContextMenu(page, 'TITAN Effects');
   await page.locator('.context-item', { hasText: 'Import Spreadsheet' }).click();
   await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpPath);
   await page.locator('[data-testid="import-delete-missing-checkbox"]').click();
   await page.locator('[data-testid="import-preview-button"]').click();
   await page.locator('[data-testid="import-apply-button"]').click();

   /** @type {boolean} */
   const stillExists = await page.evaluate(async (id) => {
      /** @type {object} */
      const pack = game.packs.get('titan.effects');
      return Boolean(await pack.getDocument(id));
   }, removedId);
   expect(stillExists).toBe(false);
});
```

- [ ] **Step 5: Locked pack refusal**

```js
test('importing into a locked pack is refused, leaving the pack unchanged', async ({ page }) => {
   await page.evaluate(async () => {
      await game.packs.get('titan.effects').configure({ locked: true });
   });

   try {
      await openPackContextMenu(page, 'TITAN Effects');
      await page.locator('.context-item', { hasText: 'Import Spreadsheet' }).click();
      /** @type {string} A trivial, valid single-row CSV — the refusal must happen at apply, not at parse. */
      const tmpPath = require('node:path').join(require('node:os').tmpdir(), 'titan-e2e-locked.csv');
      await require('node:fs/promises').writeFile(tmpPath, '﻿_id,name\r\n,E2E Should Not Be Created\r\n');
      await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpPath);
      await page.locator('[data-testid="import-preview-button"]').click();
      await page.locator('[data-testid="import-apply-button"]').click();

      await expect(page.locator('.notification.error')).toBeVisible();
      /** @type {boolean} */
      const created = await page.evaluate(async () => {
         /** @type {object[]} */
         const index = await game.packs.get('titan.effects').getIndex();
         return index.some((e) => e.name === 'E2E Should Not Be Created');
      });
      expect(created).toBe(false);
   }
   finally {
      await page.evaluate(async () => {
         await game.packs.get('titan.effects').configure({ locked: false });
      });
   }
});
```

- [ ] **Step 6: Run the full suite and confirm no regression**

Run: `npm run test:e2e:fast -- compendium-spreadsheet`
Expected: PASS (5 tests). Then run the full suite per this project's throttled runner
(`npm run test:e2e`) to confirm no regression elsewhere, per the `e2e-output-pipes-lie` memory note —
read counts from the incremental log file, not the process exit code.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/compendium-spreadsheet.spec.js
git commit -m "test: add e2e coverage for compendium spreadsheet export/import"
```

---

### Task 18: Documentation updates

**Files:**
- Modify: `.claude/skills/titan-codebase/references/architecture.md`
- Modify: `.claude/skills/titan-codebase/references/conventions.md`
- Modify: `README.md`
- Modify: `docs/TODO.md` / `docs/OPEN_BUGS.md` (only if Tasks 1–17 surfaced anything not already logged)

- [ ] **Step 1: Add the module to `architecture.md`**

Add a new bullet to the "Top-level `src/` layout" list (alongside the existing `src/spreadsheet/`-sized
entries), matching the file's existing prose style:

```markdown
- `src/spreadsheet/` — Compendium spreadsheet export/import: `codec/` (pure document <-> flat-path <->
  Workbook transforms, no Foundry globals), `format/` (RFC 4180 CSV and a minimal from-scratch XLSX
  reader/writer over `fflate`, the project's one spreadsheet dependency), `io/` (schema resolution from
  `CONFIG.<Type>.dataModels`, pack export, and import planning/applying), and `ui/` (the Export/Import
  `TitanDialog` Svelte shells). Reached from the Compendium sidebar's pack context menu and header
  button (`OnGetCompendiumContextOptions.js`, `OnRenderCompendiumDirectory.js`).
```

- [ ] **Step 2: Add the two hooks to the hook wiring list**

In the "`src/hooks/` wiring" section, add a line near the other directory-context hooks:

```markdown
- `OnGetCompendiumContextOptions.js` adds "Export to spreadsheet…" (Actor/Item/ActiveEffect packs, GM
  only) and "Import spreadsheet…" (any pack, GM only) entries to the Compendium directory's context
  menu; `OnRenderCompendiumDirectory.js` adds a matching header button to that sidebar tab.
```

- [ ] **Step 3: Document the spreadsheet table conventions in `conventions.md`**

Append a new section:

```markdown
## Compendium spreadsheet conventions

Exported sheets always carry the fixed leading columns `_id, _parentId, _folder, name, type, img, sort`
before type-specific `system.*`/`flags.*`/`prototypeToken.*` columns. Wide layout expands arrays into
indexed dotted columns (`system.attack.0.damage`); relational layout puts each array in its own
`<type>.<arrayPath>` child sheet keyed by `_id` + a dotted `_index`. A `_manifest` sheet records the
layout, pack type, and sheet-to-type/array-path mapping; import falls back to "every sheet is a
wide-layout document sheet named after its type" when no manifest is present. CSV cells inside an
untyped bag (rules elements, traits, `flags.*`) auto-detect booleans/numbers/null; wrap a cell in
literal double quotes (e.g. `"5"`) to force a literal string. See
`docs/superpowers/specs/2026-09-10-compendium-spreadsheet-design.md` for the full design.
```

- [ ] **Step 4: Add a user-facing README section**

Read `README.md` first to match its existing heading level and tone, then add a section (heading level
matching the file's existing top-level feature sections) covering: where to find the Export/Import
entries (Compendium sidebar), the format and layout choices, the cell-encoding rules from Step 3 above
in plain language for a non-technical GM, and the upsert-by-id / opt-in delete-missing import behavior.

- [ ] **Step 5: Log any deferred findings**

If any task above surfaced a real limitation beyond the two already disclosed in this plan's Global
Constraints (e.g. a v14 API detail that didn't match this plan's assumptions and required a documented
workaround), log it to `docs/TODO.md` (deferred work) or `docs/OPEN_BUGS.md` (a bug) now, per this
project's documentation rules — do not leave it only in a commit message or PR description.

- [ ] **Step 6: Run the full test suite one last time**

```bash
npm run test
npm run build
npm run eslint
npm run stylelint
```

Expected: all green, matching this project's CI gate (`.github/workflows/ci.yml`).

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/titan-codebase/references/architecture.md \
   .claude/skills/titan-codebase/references/conventions.md README.md docs/TODO.md docs/OPEN_BUGS.md
git commit -m "docs: document the compendium spreadsheet export/import feature"
```

---

## Final Report To The User

After Task 18, report:
- The two checked-in XLSX fixtures this plan defers to the user (one saved by Excel, one exported by
  Google Sheets from a real export produced during Task 4/17) still need to be produced and added under
  `tests/fixtures/spreadsheet/`, with a follow-up unit test added to `Xlsx.test.js` reading them. Flag
  this explicitly — it is real, disclosed scope this plan cannot finish without the user's spreadsheet
  applications.
- The two disclosed simplifications from Global Constraints (relational child-sheet column order;
  delete-missing is top-level only).
- Final unit/e2e counts, and the branch name for merge review.
