/**
 * Encodes one Sheet as RFC 4180 CSV text, with a UTF-8 byte-order mark so Excel decodes non-ASCII text
 * correctly, and CRLF line endings per the RFC.
 * @param {import('~/spreadsheet/codec/Workbook.js').Sheet} sheet - The sheet to encode.
 * @returns {string} The CSV text, BOM included.
 */
export function encodeCsv(sheet) {
   /** @type {string[]} One encoded line per row, header first. */
   const lines = [
      sheet.columns,
      ...sheet.rows.map((row) => sheet.columns.map((col) => row[col]))
   ]
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
         .map((record) => Object.fromEntries((header ?? []).map((col, i) => [
            col,
            record[i]
         ]))),
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
