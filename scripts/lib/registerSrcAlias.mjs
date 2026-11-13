import module from 'node:module';
import { resolve } from './srcAliasHooks.mjs';

// Installs the '~/' alias resolve hook (scripts/lib/srcAliasHooks.mjs) into this process before any '~/' import
// elsewhere is resolved. `module.registerHooks()` runs the hook in-thread and synchronously; the older
// `module.register()` runs it on a loader thread and is deprecated (DEP0205), and the warning it prints lands in the
// CLI's stderr. This module is imported for its side effect only and exports nothing.
module.registerHooks({ resolve });
