import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** @type {string} The repository root, resolved from this script's location. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string} The directory holding the dated compendium snapshots; `.gitignore` keeps them untracked. */
const docsDir = path.join(repoRoot, 'docs');

/** @type {string} The Google Docs id of the TITAN Rules Compendium. */
const DOCUMENT_ID = '1Zc2YLPeIR6cYP5gBPtvZB8gzxcrx10FJUkPE6EuOYDA';

/** @type {string} Google's Markdown export of the document; the link must be shared with "anyone with the link". */
const EXPORT_URL = `https://docs.google.com/document/d/${DOCUMENT_ID}/export?format=md`;

/** @type {string} The file name prefix shared by every dated snapshot. */
const SNAPSHOT_PREFIX = 'TITAN Rules Compendium - Source - ';

/** @type {string} The file name prefix shared by every saved diff. */
const DIFF_PREFIX = 'TITAN Rules Compendium - Diff - ';

/** @type {RegExp} Matches a snapshot file name; group 1 is the month, 2 the day and 3 the year. */
const SNAPSHOT_PATTERN = /^TITAN Rules Compendium - Source - (\d{2})_(\d{2})_(\d{4})\.md$/;

/**
 * Formats a date as the MM_DD_YYYY stamp used in snapshot file names.
 * @param {Date} date - The date to format, read in local time.
 * @returns {string} The date as month, day and year joined by underscores.
 */
function stampOf(date) {
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   return `${month}_${day}_${date.getFullYear()}`;
}

/**
 * Lists the snapshots in the docs folder, oldest first.
 * @returns {{stamp: string, file: string, sortKey: string}[]} One entry per snapshot; `sortKey` is YYYYMMDD.
 */
function listSnapshots() {
   const snapshots = [];
   for (const file of readdirSync(docsDir)) {
      const match = SNAPSHOT_PATTERN.exec(file);
      if (match) {
         snapshots.push({
            stamp: `${match[1]}_${match[2]}_${match[3]}`,
            file,
            sortKey: `${match[3]}${match[1]}${match[2]}`,
         });
      }
   }
   return snapshots.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/**
 * Downloads the compendium as Markdown.
 * @returns {Promise<string>} The document text with LF line endings.
 * @throws {Error} When the request fails, the response is not text, or the text is empty.
 */
async function download() {
   const response = await fetch(EXPORT_URL, { redirect: 'follow' });
   if (!response.ok) {
      throw new Error(`The download failed: HTTP ${response.status} ${response.statusText}.`);
   }
   const type = response.headers.get('content-type') ?? '';
   if (!type.startsWith('text/')) {
      throw new Error(`The download returned "${type}" instead of text; check that the link is shared with anyone.`);
   }
   const text = (await response.text()).replace(/\r\n/g, '\n');
   if (text.trim().length === 0) {
      throw new Error('The download was empty.');
   }
   return text;
}

/**
 * Builds a unified diff between two files with `git diff --no-index`, which is on every machine that has this repo.
 * @param {string} oldFile - The older snapshot path.
 * @param {string} newFile - The newer snapshot path.
 * @returns {string} The unified diff, empty when the files match.
 * @throws {Error} When git cannot compare the files.
 */
function diffFiles(oldFile, newFile) {
   const result = spawnSync(
      'git',
      [
         'diff',
         '--no-index',
         '--no-color',
         '--unified=3',
         '--ignore-cr-at-eol',
         '--',
         oldFile,
         newFile,
      ],
      {
         encoding: 'utf8',
         maxBuffer: 1 << 28,
      },
   );

   // `git diff --no-index` exits 1 when the files differ and 0 when they match; anything else is a failure.
   if (result.status !== 0 && result.status !== 1) {
      throw new Error(`git diff failed: ${result.stderr}`);
   }
   return result.stdout;
}

/**
 * Downloads today's compendium, saves it as a dated snapshot, and diffs it against the previous snapshot.
 * @returns {Promise<void>} Resolves once the snapshot and the diff are written.
 */
async function main() {
   const text = await download();
   const todayStamp = stampOf(new Date());
   const todayFile = `${SNAPSHOT_PREFIX}${todayStamp}.md`;
   const todayPath = path.join(docsDir, todayFile);

   // The comparison base is the newest snapshot that is not today's, so a second run on the same day still shows the
   // changes since the last day and a re-run overwrites today's snapshot.
   const previous = listSnapshots().filter((snapshot) => snapshot.file !== todayFile).pop();
   const sameDayExisted = existsSync(todayPath);
   writeFileSync(todayPath, text);
   console.log(`${sameDayExisted ? 'Updated' : 'Saved'} ${path.relative(repoRoot, todayPath)}.`);

   if (!previous) {
      console.log('There is no earlier snapshot to compare with.');
      return;
   }

   const diff = diffFiles(path.join(docsDir, previous.file), todayPath);
   if (diff.length === 0) {
      console.log(`No changes since ${previous.stamp}.`);
      return;
   }

   const diffPath = path.join(docsDir, `${DIFF_PREFIX}${previous.stamp} to ${todayStamp}.diff`);
   writeFileSync(diffPath, diff);
   const added = diff.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++')).length;
   const removed = diff.split('\n').filter((line) => line.startsWith('-') && !line.startsWith('---')).length;
   console.log(`Changes since ${previous.stamp}: ${added} lines added, ${removed} removed.`);
   console.log(`Saved ${path.relative(repoRoot, diffPath)}.`);
}

main().catch((error) => {
   console.error(error.message);
   process.exitCode = 1;
});
