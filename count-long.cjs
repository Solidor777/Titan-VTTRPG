const fs = require('fs');
const path = require('path');
const fileCounts = {};
/**
 * @param dir
 */
function walk(dir) {
   const entries = fs.readdirSync(dir, { withFileTypes: true });
   for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) walk(fullPath);
      else if (e.name.endsWith('.js') || e.name.endsWith('.svelte')) {
         const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
         let inStyle = false, count = 0;
         for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('<style')) inStyle = true;
            if (line.trim().startsWith('</style>')) inStyle = false;
            if (!inStyle && line.length > 80) {
               const t = line.trim();
               if (
                  !t.startsWith('//') && !t.startsWith('*') &&
                  !t.startsWith('/*') && !t.startsWith('*/')
               ) count++;
            }
         }
         if (count > 0) fileCounts[fullPath] = count;
      }
   }
}
walk('src');
const sorted = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 30).forEach(([f, c]) => {
   const rel = f.split('titan' + path.sep + 'src' + path.sep)[1] || f;
   console.log(c + '\t' + rel);
});
