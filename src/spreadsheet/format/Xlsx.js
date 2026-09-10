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
