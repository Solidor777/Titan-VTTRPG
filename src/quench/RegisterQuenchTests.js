import registerPlayerSheetRenderBatch from '~/quench/batches/player-sheet-render.batch.js';

/**
 * Registers all TITAN in-client Quench batches once Quench signals it is ready. Completely inert
 * unless the Quench module (v0.10+) is installed and enabled in the world.
 * @returns {void}
 */
export default function registerQuenchTests() {
   Hooks.on('quenchReady', (/** @type {object} */ quench) => {
      registerPlayerSheetRenderBatch(quench);
   });
}
