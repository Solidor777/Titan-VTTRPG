/**
 * Registers the player-sheet render smoke batch.
 * @param {object} quench - The Quench API object passed by the `quenchReady` hook.
 * @returns {void}
 */
export default function registerPlayerSheetRenderBatch(quench) {
   // -----------------------------------------------------------------------
   // Batch — titan.render.player-sheet
   // Smoke-tests that a player-type actor's sheet can be rendered without error.
   // -----------------------------------------------------------------------
   quench.registerBatch(
      'titan.render.player-sheet',
      (/** @type {object} */ context) => {
         const {
            describe,
            it,
            assert,
            before,
            after,
         } = context;

         // The actor found by the batch (or null if none exist).
         /** @type {object | null} */ let actor = null;

         describe('Player sheet render smoke test', function () {
            // Locate a player-type actor before the suite runs.
            before(function () {
               // Find any player-type actor in the world actors collection.
               actor = game.actors.find((/** @type {object} */ a) => a.type === 'player') ?? null;
            });

            it('finds a player-type actor in the world', function () {
               assert.ok(
                  actor,
                  'No player-type actor found in the world — add one to run this batch.',
               );
            });

            it('renders the player sheet without error', async function () {
               if (!actor) {
                  this.skip();
                  return;
               }

               // Open the sheet; `true` forces a fresh render even if already open.
               await actor.sheet.render(true);

               // The AppV2 `element` property is the root HTMLElement once rendered.
               assert.ok(
                  actor.sheet.element,
                  'actor.sheet.element is absent after render — sheet did not mount correctly.',
               );
            });

            // Close the sheet after all tests in the suite finish.
            after(async function () {
               if (actor?.sheet?.rendered) {
                  await actor.sheet.close();
               }
            });
         });
      },
      { displayName: 'TITAN: Player sheet render smoke test' },
   );
}
