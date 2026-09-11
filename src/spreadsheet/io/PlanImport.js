import { decodeXlsx } from '~/spreadsheet/format/Xlsx.js';
import { decodeCsv } from '~/spreadsheet/format/Csv.js';
import { unzipFilesAsText } from '~/spreadsheet/format/Zip.js';
import { readTables } from '~/spreadsheet/codec/ReadTables.js';
import { resolveTypeSchemasForPack } from '~/spreadsheet/io/ResolveTypeSchemas.js';
import { resolveDocumentNameAtDepth } from '~/spreadsheet/io/DocumentNameAtDepth.js';

/**
 * @typedef {object} PlanEntry
 * @property {string} documentType - The document's subtype name.
 * @property {'Actor'|'Item'|'ActiveEffect'} documentName - The document class the row is created or
 *    updated through, resolved from its depth, the pack type, and its subtype.
 * @property {string} id - The document's (already-remapped) 16-character Foundry id.
 * @property {string} parentId - The parent document's id, or '' for a top-level pack document.
 * @property {number} depth - 0 = top-level pack document, 1 = an owned item or a direct effect, 2 = an
 *    effect on an owned item.
 * @property {object} [source] - The full document source (creates only).
 * @property {object} [changes] - The changed fields only, excluding `_id` (updates only).
 * @property {string} [folderPath] - The document's target folder path (creates always; updates only at
 *    depth 0, where a folder move is possible). Undefined means the sheet carried no `_folder` column at
 *    all (leave the folder untouched on update); `''` means a present-but-blank cell (move to the pack
 *    root).
 */

/**
 * @typedef {object} ImportPlan
 * @property {PlanEntry[]} creates - Documents to create.
 * @property {PlanEntry[]} updates - Documents to update.
 * @property {Array<{id:string}>} deletes - Top-level pack documents to delete.
 * @property {Array<{path:string}>} folders - Folder paths to ensure exist.
 * @property {Array<{sheet:string,row:number,column:string,message:string}>} errors - Row/file-level
 *    validation failures; a non-empty array means the plan is not safe to apply as-is.
 * @property {'Actor'|'Item'|'ActiveEffect'} packType - The pack type the plan targets.
 */

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
 * @typedef {object} ExistingLookupContext
 * @property {Map<string, object>} byId - Every envelope keyed by its final id.
 * @property {CompendiumCollection|null} targetPack - The pack existing documents are looked up in.
 * @property {'Actor'|'Item'|'ActiveEffect'} packType - The target pack's document type.
 * @property {Map<string, Promise<object|null>>} cache - Memoized lookups by id (mutated).
 */

/**
 * Resolves the document a row already corresponds to in the target pack, or null when the row is new.
 * A top-level row is fetched from the pack by id; an embedded row is read out of its (recursively
 * resolved) parent's `items` or `effects` collection, so editing an owned item or effect and
 * re-importing plans an update rather than a duplicate create. An unresolvable parent — importing into a
 * brand-new compendium, or a parent that exists nowhere yet — yields null, and the row falls through to
 * the create path. Lookups are memoized by id so one parent is fetched once for all of its children.
 * @param {string} id - The (already-remapped) id to resolve.
 * @param {ExistingLookupContext} context - The shared lookup context.
 * @returns {Promise<object|null>} The existing document, or null.
 */
async function resolveExistingDocument(id, context) {
   if (context.cache.has(id)) {
      return context.cache.get(id);
   }

   /** @type {Promise<object|null>} The in-flight lookup, cached before it resolves to de-duplicate it. */
   const lookup = (async () => {
      /** @type {object|undefined} The row this id came from, absent when the id is only referenced. */
      const envelope = context.byId.get(id);
      /** @type {number} An id referenced but never declared in the file can only be a pack document. */
      const depth = envelope ? depthOf(envelope, context.byId) : 0;
      if (depth === 0) {
         return (await context.targetPack.getDocument(id)) ?? null;
      }

      /** @type {object|null} */
      const parent = await resolveExistingDocument(envelope.parentId, context);
      if (!parent) {
         return null;
      }
      /** @type {'Actor'|'Item'|'ActiveEffect'} */
      const documentName = resolveDocumentNameAtDepth(context.packType, depth, envelope.documentType);
      /** @type {object|undefined} The parent's embedded collection this row lives in. */
      const collection = documentName === 'Item' ? parent.items : parent.effects;
      return collection?.get(id) ?? null;
   })();

   context.cache.set(id, lookup);
   return lookup;
}

/**
 * Reads one or more uploaded spreadsheet files, decodes and validates every row against a target pack
 * (or against bare document construction for a new compendium), and returns a full ImportPlan without
 * writing anything.
 *
 * A malformed schema-typed cell anywhere in the file (e.g. non-numeric text in a number-typed field)
 * makes `readTables` throw; that failure is coarser than a per-row error — it aborts reading the whole
 * file rather than just the offending row — and is reported as a single file-level entry on the
 * `'_manifest'` sheet rather than propagating out of this function.
 * @param {File[]} files - The uploaded file(s): a single .xlsx, a single .csv, or a .zip/.csv set.
 * @param {CompendiumCollection|null} targetPack - The existing target pack, or null for a new compendium.
 * @param {boolean} deleteMissing - Whether top-level pack documents absent from the file should be
 *    planned for deletion (see this plan's Global Constraints for the embedded-document limitation).
 * @returns {Promise<ImportPlan>} The validated plan.
 */
export async function planImport(files, targetPack, deleteMissing) {
   /** @type {import('~/spreadsheet/codec/Workbook.js').Workbook} */
   let workbook;
   // The type schemas needed to decode a row aren't known until we know packType, which readTables
   // itself extracts from the manifest — so read once with no schemas (falls back to untyped-literal
   // decode for every column), recover packType, then re-read with the real schemas if it differs.
   /** @type {{packType:string}} */
   let probe;
   try {
      workbook = await decodeFiles(files);
      probe = readTables(workbook, {});
   }
   catch (error) {
      // A corrupt/unreadable upload (a malformed xlsx zip, an unparseable csv) fails before packType is
      // even known; report it as a single file-level error rather than crashing the import.
      return {
         creates: [], updates: [], deletes: [], folders: [],
         errors: [{ sheet: '_manifest', row: 0, column: '', message: `Failed to read the file: ${error.message}` }],
         packType: '',
      };
   }
   /** @type {string} */
   const packType = probe.packType;

   if (targetPack && packType && targetPack.metadata.type !== packType) {
      return {
         creates: [], updates: [], deletes: [], folders: [],
         errors: [{
            sheet: '_manifest', row: 0, column: 'packType',
            message: `The file's document type (${packType}) does not match the target pack `
               + `(${targetPack.metadata.type}).`,
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
   /** @type {object} Per-subtype schema info (own type plus everything it can embed), for typed decode. */
   const typeSchemas = resolveTypeSchemasForPack(resolvedPackType);

   /** @type {{layout:string, packType:string, envelopes: Array<object>}} */
   let readResult;
   try {
      readResult = readTables(workbook, typeSchemas);
   }
   catch (error) {
      // A malformed schema-typed cell anywhere in the file aborts the whole read; report it as a single
      // file-level error rather than crashing the import, at the cost of per-row precision.
      return {
         creates: [], updates: [], deletes: [], folders: [],
         errors: [{ sheet: '_manifest', row: 0, column: '', message: `Failed to read the file: ${error.message}` }],
         packType: resolvedPackType,
      };
   }
   /** @type {Array<object>} */
   const { envelopes } = readResult;

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

   /** @type {ImportPlan} */
   const plan = { creates: [], updates: [], deletes: [], folders: [], errors: [], packType: resolvedPackType };
   /** @type {Set<string>} Folder paths already queued. */
   const queuedFolders = new Set();
   /** @type {Set<string>} Every top-level id present in the file, for the delete-missing pass. */
   const fileTopLevelIds = new Set();

   /** @type {Array<object>} Parents before children. */
   const ordered = [...envelopes].sort((a, b) => depthOf(a, byId) - depthOf(b, byId));

   /** @type {ExistingLookupContext} Shared across every row so each parent is fetched at most once. */
   const lookupContext = { byId, targetPack, packType: resolvedPackType, cache: new Map() };

   for (const envelope of ordered) {
      /** @type {string} */
      const id = envelope.source._id;
      /** @type {number} */
      const depth = depthOf(envelope, byId);
      /** @type {string} */
      const parentId = envelope.parentId ?? '';
      /** @type {'Actor'|'Item'|'ActiveEffect'} The document class this row is validated and written as. */
      const documentName = resolveDocumentNameAtDepth(resolvedPackType, depth, envelope.documentType);

      if (depth === 0) {
         fileTopLevelIds.add(id);
         if (envelope.folderPath && !queuedFolders.has(envelope.folderPath)) {
            queuedFolders.add(envelope.folderPath);
            plan.folders.push({ path: envelope.folderPath });
         }
      }

      /** @type {object|null} The pack document this row already corresponds to, at any depth. */
      const existing = targetPack ? await resolveExistingDocument(id, lookupContext) : null;

      try {
         if (existing) {
            /** @type {object} The row's fields without the id (updateSource takes changes only). */
            const { _id, ...changes } = envelope.source;
            existing.updateSource(changes, { dryRun: true });
            plan.updates.push({
               documentType: envelope.documentType, documentName, id, parentId, depth, changes,
               // Top-level only: an update row's folder move is applied separately from `changes`, since
               // the sheet's `_folder` path must be resolved to the TARGET pack's folder id, not reused
               // from `envelope.source` (which never carries a `folder` field at all — see
               // FlattenDocument.js's EXCLUDED_TOP_LEVEL_KEYS).
               folderPath: depth === 0 ? envelope.folderPath : undefined,
            });
         }
         else {
            // Validation runs against the class the row will actually be created through: an owned
            // weapon row in an Actor pack is an Item, not an Actor, and the Actor class rejects it.
            /** @type {typeof Actor|typeof Item|typeof ActiveEffect} */
            const DocumentClass = getDocumentClass(documentName);
            // eslint-disable-next-line no-new -- constructed only to run full schema validation.
            new DocumentClass(envelope.source);
            plan.creates.push({
               documentType: envelope.documentType, documentName, id, parentId, depth,
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
