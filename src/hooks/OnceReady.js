import onHotbarDrop from '~/hooks/OnHotbarDrop.js';

/**
 * Attached to the Ready hook.
 * Sets up hot-bar dropping.
 */
export default function onceReady() {
   // Register sub-hooks
   Hooks.on('hotbarDrop', onHotbarDrop);
}
