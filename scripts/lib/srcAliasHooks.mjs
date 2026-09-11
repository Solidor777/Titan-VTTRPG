import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * The repository root, resolved two directories above this hook module (`scripts/lib/`).
 * @type {string}
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Node module customization hook: resolves `~/`-prefixed specifiers to `src/` under the repository
 * root, mirroring the Vite `~/` alias so `src/` modules import unmodified from Node scripts. Every
 * other specifier passes through to the next resolver in the chain unchanged.
 * @param {string} specifier - The import specifier as written in the importing module.
 * @param {object} context - The resolution context (conditions, parent URL, import attributes).
 * @param {Function} nextResolve - The next resolve hook in the chain.
 * @returns {Promise<object>} The resolution result (`{ url, shortCircuit }` for `~/` specifiers,
 *    otherwise whatever `nextResolve` returns).
 */
export async function resolve(specifier, context, nextResolve) {
   if (specifier.startsWith('~/')) {
      /** @type {string} The resolved absolute filesystem path under `src/`. */
      const targetPath = path.join(repoRoot, 'src', specifier.slice(2));
      return {
         url: pathToFileURL(targetPath).href,
         shortCircuit: true,
      };
   }

   return nextResolve(specifier, context);
}
