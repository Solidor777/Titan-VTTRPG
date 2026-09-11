import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';

/**
 * Zips a set of named files into a single archive.
 * @param {Object<string, Uint8Array|string>} files - Map of archive-relative filename to its content;
 * string values are UTF-8 encoded automatically.
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
