/**
 * Registers all TITAN in-client Quench test batches.
 *
 * This function attaches a single `Hooks.on('quenchReady', ...)` listener that is COMPLETELY INERT
 * unless the Quench module (v0.10+) is installed and enabled. Quench fires `quenchReady` only from
 * its own `setup` hook, so this registration is a no-op in any world where Quench is absent.
 *
 * Quench batch API (v0.10):
 *   `quench.registerBatch(key, (context) => { const { describe, it, assert, before, after } = context; ... },
 *   { displayName })`
 *
 * Mocha's `this.skip()` (called inside an `it` body) marks a test as pending without failing it.
 * `it.skip(title, fn)` is also valid but registers a no-body pending entry; `this.skip()` is
 * preferred when the skip decision is made at runtime.
 *
 * @returns {void}
 */
export default function registerQuenchTests() {
   // Register all TITAN Quench batches once Quench signals it is ready.
   Hooks.on('quenchReady', (/** @type {object} */ quench) => {
      // -----------------------------------------------------------------------
      // Batch 1 — titan.render.player-sheet
      // Smoke-tests that a player-type actor's sheet can be rendered without error.
      // -----------------------------------------------------------------------
      quench.registerBatch(
         'titan.render.player-sheet',
         (/** @type {object} */ context) => {
            const {
               describe,
               it,
               assert,
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

      // -----------------------------------------------------------------------
      // Batch 2 — titan.checks.accuracy
      // Placeholder reserved for future check-result accuracy tests.
      // -----------------------------------------------------------------------
      quench.registerBatch(
         'titan.checks.accuracy',
         (/** @type {object} */ context) => {
            const { describe, it } = context;

            describe('Check accuracy (placeholder)', function () {
               it('asserts computed check results (to be implemented)', function () {
                  this.skip();
               });
            });
         },
         { displayName: 'TITAN: Check result accuracy (placeholder)' },
      );
   });
}
