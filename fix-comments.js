const fs = require('fs');
const path = require('path');

const MAX_LEN = 80;

/**
 * @param text
 * @param firstLinePrefix
 * @param continuationPrefix
 * @param maxLen
 */
function wrapText(text, firstLinePrefix, continuationPrefix, maxLen) {
   if (
      text.includes('http://') ||
      text.includes('https://') ||
      text.includes('~/')
   ) {
      return [firstLinePrefix + text];
   }
   const words = text.split(' ');
   const lines = [];
   let current = firstLinePrefix;
   for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (current === firstLinePrefix) {
         current += word;
      } else if ((current + ' ' + word).length <= maxLen) {
         current += ' ' + word;
      } else {
         lines.push(current);
         current = continuationPrefix + word;
      }
   }
   if (current.trim()) lines.push(current);
   return lines;
}

/**
 * @param filePath
 */
function processFile(filePath) {
   const content = fs.readFileSync(filePath, 'utf8');
   const lines = content.split('\n');
   const newLines = [];
   let changed = false;
   let inStyle = false;

   for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('<style')) inStyle = true;
      if (line.trim().startsWith('</style>')) inStyle = false;

      if (line.length <= MAX_LEN || inStyle) {
         newLines.push(line);
         continue;
      }

      const t = line.trim();

      // Case 1: Single-line /** @type {Type} description */
      if (t.startsWith('/**') && t.endsWith('*/') && t.includes('@type ')) {
         const indentMatch = line.match(/^(\s*)/);
         const indent = indentMatch ? indentMatch[1] : '';
         const inner = t.slice(3, -2).trim();
         const innerLine = indent + ' * ' + inner;
         if (innerLine.length <= MAX_LEN) {
            newLines.push(indent + '/**');
            newLines.push(innerLine);
            newLines.push(indent + ' */');
            changed = true;
            continue;
         }
         // Split type tag from description
         const typeMatch = inner.match(/^(@type\s+\{[^}]+\})\s+(.*)/);
         if (typeMatch) {
            const tag = typeMatch[1];
            const desc = typeMatch[2];
            const tagLine = indent + ' * ' + tag;
            const descLine = indent + ' * ' + desc;
            if (descLine.length <= MAX_LEN) {
               newLines.push(indent + '/**');
               newLines.push(tagLine);
               newLines.push(descLine);
               newLines.push(indent + ' */');
               changed = true;
               continue;
            }
         }
         newLines.push(line);
         continue;
      }

      // Case 2: JSDoc tag line * @param, @property, @returns, etc.
      if (/^\s+\*\s+@/.test(line)) {
         const indentMatch = line.match(/^(\s*\*\s+)/);
         if (!indentMatch) { newLines.push(line); continue; }
         const prefix = indentMatch[1];
         const text = line.slice(prefix.length);
         const continuationPrefix = prefix + '   ';

         const tagMatch = text.match(
            /^(@(?:param|property)\s+\{[^}]+\}\s+\S+\s+)/
         );
         const returnsMatch = text.match(/^(@returns\s+\{[^}]+\}\s+)/);
         const genericTagMatch = text.match(
            /^(@\w+(?:\s+\{[^}]+\})?\s+)/
         );

         let tagPart = '';
         let descPart = text;

         if (tagMatch) {
            tagPart = tagMatch[1];
            descPart = text.slice(tagPart.length);
         } else if (returnsMatch) {
            tagPart = returnsMatch[1];
            descPart = text.slice(tagPart.length);
         } else if (genericTagMatch) {
            tagPart = genericTagMatch[1];
            descPart = text.slice(tagPart.length);
         }

         const firstPrefix = prefix + tagPart;
         if (
            (firstPrefix + descPart).length > MAX_LEN &&
            descPart.includes(' ')
         ) {
            const wrapped = wrapText(
               descPart,
               firstPrefix,
               continuationPrefix,
               MAX_LEN
            );
            if (
               wrapped.length > 1 ||
               (wrapped.length === 1 && wrapped[0].length <= MAX_LEN)
            ) {
               newLines.push(...wrapped);
               changed = true;
               continue;
            }
         }
         newLines.push(line);
         continue;
      }

      // Case 3: JSDoc body text * description (not a tag)
      if (/^\s+\*\s+[^@*]/.test(line)) {
         const indentMatch = line.match(/^(\s*\*\s+)/);
         if (!indentMatch) { newLines.push(line); continue; }
         const prefix = indentMatch[1];
         const text = line.slice(prefix.length);
         const continuationPrefix = prefix.replace(/\s+$/, '') + ' ';

         if (
            (prefix + text).length > MAX_LEN &&
            text.includes(' ') &&
            !text.includes('http://') &&
            !text.includes('https://')
         ) {
            const wrapped = wrapText(
               text,
               prefix,
               continuationPrefix,
               MAX_LEN
            );
            if (wrapped.length > 1) {
               newLines.push(...wrapped);
               changed = true;
               continue;
            }
         }
         newLines.push(line);
         continue;
      }

      // Case 4: Line comments //
      if (/^\s+\/\//.test(line)) {
         const indentMatch = line.match(/^(\s+\/\/\s*)/);
         if (!indentMatch) { newLines.push(line); continue; }
         const prefix = indentMatch[1];
         const text = line.slice(prefix.length);
         const baseIndent = line.match(/^(\s+)/)[1];
         const continuationPrefix = baseIndent + '// ';

         if (
            (prefix + text).length > MAX_LEN &&
            text.includes(' ') &&
            !text.includes('http://') &&
            !text.includes('https://')
         ) {
            const wrapped = wrapText(
               text,
               prefix,
               continuationPrefix,
               MAX_LEN
            );
            if (wrapped.length > 1) {
               newLines.push(...wrapped);
               changed = true;
               continue;
            }
         }
         newLines.push(line);
         continue;
      }

      newLines.push(line);
   }

   if (changed) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      return true;
   }
   return false;
}

/**
 * @param dir
 */
function walk(dir) {
   const entries = fs.readdirSync(dir, { withFileTypes: true });
   let fixedFiles = 0;
   for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
         fixedFiles += walk(fullPath);
      } else if (
         e.name.endsWith('.js') ||
         e.name.endsWith('.svelte')
      ) {
         if (processFile(fullPath)) fixedFiles++;
      }
   }
   return fixedFiles;
}

const fixedFiles = walk('src');
console.log('Fixed files:', fixedFiles);

let remaining = 0;
/**
 * @param dir
 */
function walkCount(dir) {
   const entries = fs.readdirSync(dir, { withFileTypes: true });
   for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) walkCount(fullPath);
      else if (e.name.endsWith('.js') || e.name.endsWith('.svelte')) {
         const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
         let inStyle = false;
         for (const line of lines) {
            if (line.trim().startsWith('<style')) inStyle = true;
            if (line.trim().startsWith('</style>')) inStyle = false;
            if (!inStyle && line.length > 80) {
               const t = line.trim();
               if (
                  t.startsWith('//') ||
                  t.startsWith('*') ||
                  t.startsWith('/*')
               ) remaining++;
            }
         }
      }
   }
}
walkCount('src');
console.log('Remaining long comment lines:', remaining);
