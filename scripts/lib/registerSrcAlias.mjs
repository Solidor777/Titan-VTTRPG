import module from 'node:module';

// Node loader-registration idiom: `module.register()` installs the '~/' alias resolve hook
// (scripts/lib/srcAliasHooks.mjs) into this process before any '~/' import elsewhere is resolved.
// This module is imported for its side effect only and exports nothing.
module.register(new URL('./srcAliasHooks.mjs', import.meta.url));
