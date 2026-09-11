import { PLURAL_TYPE_LABELS, TYPE_ORDER } from '~/spreadsheet/markdown/Labels.js';

/**
 * @typedef {object} Section
 * @property {number} level - The heading level (1-3) this section renders at.
 * @property {string} text - The section's heading text (unescaped; rendering escapes it).
 * @property {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - This section's own
 *    documents, rendered directly under its heading (alphabetical by name).
 * @property {Section[]} children - Nested sections (type groups, spell traditions, or subfolders),
 *    rendered after `documents`.
 */

/**
 * @typedef {object} FolderNode
 * @property {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - Documents whose
 *    folder path ends exactly at this node.
 * @property {Object<string, FolderNode>} children - Child folder nodes, keyed by folder segment name.
 */

/**
 * Creates an empty folder trie node.
 * @returns {FolderNode} The new node.
 */
function createFolderNode() {
   return {
      documents: [],
      children: {},
   };
}

/**
 * Builds a folder trie from a set of foldered documents, keyed by each folder path segment.
 * @param {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - Documents with a
 *    non-empty `folderPath`.
 * @returns {FolderNode} The trie's root node (its own `documents` is always empty; callers only use
 *    `root.children`).
 */
function buildFolderTree(documents) {
   /** @type {FolderNode} The trie root. */
   const root = createFolderNode();

   for (const document of documents) {
      /** @type {FolderNode} The current node as the path is walked. */
      let node = root;
      for (const segment of document.folderPath) {
         if (!node.children[segment]) {
            node.children[segment] = createFolderNode();
         }
         node = node.children[segment];
      }
      node.documents.push(document);
   }

   return root;
}

/**
 * Sorts documents alphabetically by name, matching the compendium's ordering rule (`sort` is ignored).
 * @param {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - The documents to sort.
 * @returns {import('./WorkbookToDocuments.js').RenderableDocument[]} A new, sorted array.
 */
function sortByName(documents) {
   return [...documents].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Capitalises a tradition's first letter, leaving the rest of the text as written.
 * @param {string} text - The tradition text.
 * @returns {string} The capitalised text.
 */
function capitalizeFirst(text) {
   return text.length === 0 ? text : `${text[0].toUpperCase()}${text.slice(1)}`;
}

/**
 * Builds the root-level `Spells` type-group section per rule 3: documents with a blank
 * `system.tradition` render directly under the `Spells` heading with no tradition heading; documents
 * with a non-blank tradition are grouped under an H3 tradition heading, alphabetical by tradition text.
 * @param {import('./WorkbookToDocuments.js').RenderableDocument[]} spellDocuments - Unfoldered spells.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {Section} The `Spells` root section.
 */
function buildSpellRootSection(spellDocuments, labels) {
   /** @type {import('./WorkbookToDocuments.js').RenderableDocument[]} Spells with a blank tradition. */
   const blankTraditionDocuments = spellDocuments.filter((document) => !document.system.tradition);

   /** @type {Map<string, import('./WorkbookToDocuments.js').RenderableDocument[]>} Tradition text -> docs. */
   const traditionGroups = new Map();
   for (const document of spellDocuments) {
      if (!document.system.tradition) {
         continue;
      }
      /** @type {string} This spell's tradition, as written. */
      const tradition = document.system.tradition;
      if (!traditionGroups.has(tradition)) {
         traditionGroups.set(tradition, []);
      }
      traditionGroups.get(tradition).push(document);
   }

   /** @type {Section[]} One H3 section per non-blank tradition, alphabetical. */
   const traditionSections = [...traditionGroups.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((tradition) => ({
         level: 3,
         text: capitalizeFirst(tradition),
         documents: sortByName(traditionGroups.get(tradition)),
         children: [],
      }));

   return {
      level: 1,
      text: labels('spells', PLURAL_TYPE_LABELS.spell[1]),
      documents: sortByName(blankTraditionDocuments),
      children: traditionSections,
   };
}

/**
 * Builds a type-group section (a heading whose text is the plural type label, holding every document
 * of that type at the given level).
 * @param {string} type - The Item subtype.
 * @param {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - The type's documents.
 * @param {number} level - The heading level for this type group.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {Section} The type-group section.
 */
function buildTypeGroupSection(type, documents, level, labels) {
   /** @type {[string, string]} The `[plural, Plural]` English fallback for this type. */
   const [plural, pluralCapitalized] = PLURAL_TYPE_LABELS[type];

   return {
      level,
      text: labels(plural, pluralCapitalized),
      documents: sortByName(documents),
      children: [],
   };
}

/**
 * Builds a folder's section: its own heading (clamped at H3), its own documents (partitioned by type,
 * one level below the folder heading, when more than one type is present), then its child folders,
 * alphabetical by name. Foldered spells are never partitioned by tradition (the GM's folders win).
 * @param {string} name - The folder's own name.
 * @param {FolderNode} node - The folder's trie node.
 * @param {number} depth - The folder's 1-based nesting depth from the pack root.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {Section} The folder's section.
 */
function buildFolderSection(name, node, depth, labels) {
   /** @type {number} This folder's heading level, clamped at H3. */
   const level = Math.min(depth, 3);

   /** @type {Set<string>} The distinct Item subtypes among this folder's own documents. */
   const types = new Set(node.documents.map((document) => document.type));

   /** @type {import('./WorkbookToDocuments.js').RenderableDocument[]} This section's own documents. */
   let documents = [];
   /** @type {Section[]} This section's children: type groups (if multi-type), then subfolders. */
   const children = [];

   if (types.size > 1) {
      /** @type {number} The type-group heading level, one below the folder heading, clamped at H3. */
      const typeLevel = Math.min(level + 1, 3);
      for (const type of TYPE_ORDER) {
         /** @type {import('./WorkbookToDocuments.js').RenderableDocument[]} This folder's docs of `type`. */
         const documentsOfType = node.documents.filter((document) => document.type === type);
         if (documentsOfType.length > 0) {
            children.push(buildTypeGroupSection(type, documentsOfType, typeLevel, labels));
         }
      }
   }
   else {
      documents = sortByName(node.documents);
   }

   /** @type {string[]} Child folder names, alphabetical. */
   const childNames = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
   for (const childName of childNames) {
      children.push(buildFolderSection(childName, node.children[childName], depth + 1, labels));
   }

   return {
      level,
      text: name,
      documents,
      children,
   };
}

/**
 * Builds the compendium's section tree from a flat list of renderable Item documents, per the spec's
 * five tree rules: root-level documents are grouped by type (fixed `TYPE_ORDER`, unfoldered spells
 * further grouped by tradition), then every root folder renders alphabetically, each folder's own
 * heading clamped at H3 and its own documents partitioned by type when it holds more than one.
 * @param {import('./WorkbookToDocuments.js').RenderableDocument[]} documents - Every renderable document.
 * @param {function(string, string=): string} labels - The label resolver (`Labels.js`'s `label`).
 * @returns {{sections: Section[]}} The top-level sections, in rendering order.
 */
export function buildCompendiumTree(documents, labels) {
   /** @type {import('./WorkbookToDocuments.js').RenderableDocument[]} Documents with no folder path. */
   const rootDocuments = documents.filter((document) => document.folderPath.length === 0);
   /** @type {import('./WorkbookToDocuments.js').RenderableDocument[]} Documents inside a folder. */
   const folderedDocuments = documents.filter((document) => document.folderPath.length > 0);

   /** @type {Section[]} The tree's top-level sections. */
   const sections = [];

   for (const type of TYPE_ORDER) {
      /** @type {import('./WorkbookToDocuments.js').RenderableDocument[]} Root-level docs of `type`. */
      const documentsOfType = rootDocuments.filter((document) => document.type === type);
      if (documentsOfType.length === 0) {
         continue;
      }

      sections.push(
         type === 'spell'
            ? buildSpellRootSection(documentsOfType, labels)
            : buildTypeGroupSection(type, documentsOfType, 1, labels),
      );
   }

   /** @type {FolderNode} The root folder trie built from every foldered document. */
   const folderRoot = buildFolderTree(folderedDocuments);
   /** @type {string[]} Root folder names, alphabetical. */
   const rootFolderNames = Object.keys(folderRoot.children).sort((a, b) => a.localeCompare(b));
   for (const name of rootFolderNames) {
      sections.push(buildFolderSection(name, folderRoot.children[name], 1, labels));
   }

   return { sections };
}
