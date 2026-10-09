import { expect, test } from './harness.js';
import { ensureProbe } from './componentProbe.js';
import { login } from './fixtures.js';
import {
   controlPlacedToken,
   createActor,
   createScene,
   placeToken,
   releaseTargets,
   setTokenElevation,
   setTokenSize,
   targetPlacedToken,
   targetedTokenIds,
   viewScene,
} from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The targeting and distance helpers on real placed tokens, called through the test-only probe's `helpers` (no shipped
 * code reads the distance yet). Actors are made through the Actors tab, tokens are dropped on chosen squares of a scene
 * of their own, targeted with the Target key, controlled with a click and resized in the Token Configuration window.
 * Each test deletes its tokens when it ends, so no square holds two tokens and the pointer never reaches a stacked one.
 * The expected distances are computed here from the tokens' stored positions and the scene grid's diagonal rule, read
 * from the Foundry constants, never from the helper.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the scene the tokens stand on. */
let sceneId;
/** @type {string[]} The ids of the tokens the current test placed (deleted when it ends). */
let placedTokenIds = [];

/**
 * A square of the grid.
 * @typedef {object} Square
 * @property {number} column - The grid column.
 * @property {number} row - The grid row.
 */

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   sceneId = await createScene(page, { name: 'E2E Target Helpers Scene' });
   await viewScene(page, sceneId);
   await ensureProbe(page);
});

test.afterEach(async () => {
   // Runs after a failed test too, so a test that left the scene is seen here.
   expect(await page.evaluate(() => canvas.scene.id), 'the test ended on the scene made for this file').toBe(sceneId);
   await closeAllApps(page);
   await releaseTargets(page);
   await page.evaluate(async (tokenIds) => {
      for (const scene of game.scenes) {
         await scene.deleteEmbeddedDocuments('Token', scene.tokens.filter((token) => tokenIds.includes(token.id))
            .map((token) => token.id));
      }
   }, placedTokenIds);
   placedTokenIds = [];
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Creates a Character through the Actors tab and drops its token on a grid square of the viewed scene, which no other
 * token covers.
 * @param {string} name - The actor's name; it starts with `E2E ` so the census finds it.
 * @param {Square} square - The square to drop the token on.
 * @returns {Promise<string>} The id of the placed token.
 */
async function createToken(name, square) {
   expect(
      await page.evaluate((square) => canvas.scene.tokens.some((token) => {
         /** @type {number} The token's first column. */
         const column = token._source.x / canvas.grid.size;
         /** @type {number} The token's first row. */
         const row = token._source.y / canvas.grid.size;
         return square.column >= column && square.column < column + token._source.width &&
            square.row >= row && square.row < row + token._source.height;
      }), square),
      'no token covers the square before the drop',
   ).toBe(false);

   /** @type {string} The placed token's id. */
   const tokenId = await placeToken(
      page,
      await createActor(page, {
         name,
         type: 'player',
      }),
      { square },
   );
   placedTokenIds.push(tokenId);
   expect(await squaresOf(tokenId), 'the drop put the token on the wanted square').toEqual([square]);
   return tokenId;
}

/**
 * Reads the squares a token covers from its stored position and size.
 * @param {string} tokenId - A token on the viewed scene.
 * @returns {Promise<Square[]>} The covered squares.
 */
async function squaresOf(tokenId) {
   return page.evaluate((tokenId) => {
      /** @type {TokenDocument} The token whose squares are read. */
      const token = canvas.scene.tokens.get(tokenId);

      /** @type {{column: number, row: number}[]} The covered squares. */
      const squares = [];
      for (let row = 0; row < token._source.height; row++) {
         for (let column = 0; column < token._source.width; column++) {
            squares.push({
               column: (token._source.x / canvas.grid.size) + column,
               row: (token._source.y / canvas.grid.size) + row,
            });
         }
      }
      return squares;
   }, tokenId);
}

/**
 * Reads the square at the middle of the viewed scene, which the drops are placed around so every pointer position
 * stays inside the window.
 * @returns {Promise<Square>} The square under the canvas pivot.
 */
async function middleSquare() {
   return page.evaluate(() => ({
      column: Math.round(canvas.stage.pivot.x / canvas.grid.size),
      row: Math.round(canvas.stage.pivot.y / canvas.grid.size),
   }));
}

/**
 * Computes the distance in spaces between two sets of squares on the viewed scene from the grid's diagonal rule: the
 * shortest distance over every pair of squares. A straight line costs 1 per space; the rule ALTERNATING_1 makes the
 * diagonal steps cost 1, 2, 1, 2 and so on (read: `GRID_DIAGONALS.ALTERNATING_1`, common/constants.mjs:624-629,
 * Foundry 14.364). The three axes (columns, rows and elevation levels apart) sorted from the largest, `di >= dj >= dk`,
 * cost `di + floor((dj + dk / 2) / 2)` (read: common/grid/square.mjs:508-530), which for no elevation difference is
 * `straight + floor(diagonal / 2)` over a longest axis `straight` and a diagonal count `diagonal`.
 * @param {Square[]} from - The squares of the first token.
 * @param {Square[]} to - The squares of the second token.
 * @param {number} [levels] - The whole spaces of elevation between the two tokens.
 * @returns {Promise<number>} The distance in spaces.
 */
async function expectedDistance(from, to, levels = 0) {
   expect(
      await page.evaluate(() => ({
         diagonals: canvas.grid.diagonals === CONST.GRID_DIAGONALS.ALTERNATING_1,
         distance: canvas.grid.distance,
         square: canvas.grid.type === CONST.GRID_TYPES.SQUARE,
      })),
      'the scene grid is a square grid with 1 unit per space and the alternating diagonal rule this formula covers',
   ).toEqual({
      diagonals: true,
      distance: 1,
      square: true,
   });

   /** @type {number} The shortest distance found. */
   let shortest = Infinity;
   for (const a of from) {
      for (const b of to) {
         /** @type {number} The columns apart. */
         const columns = Math.abs(a.column - b.column);
         /** @type {number} The rows apart. */
         const rows = Math.abs(a.row - b.row);
         /** @type {number[]} The three axes apart, the largest first. */
         const [di, dj, dk] = [
            columns,
            rows,
            levels,
         ].sort((first, second) => second - first);
         shortest = Math.min(shortest, di + Math.floor((dj + (dk / 2)) / 2));
      }
   }
   return shortest;
}

/**
 * Reads a token's stored elevation.
 * @param {string} tokenId - A token on the viewed scene.
 * @returns {Promise<number>} The elevation in grid units.
 */
async function elevationOf(tokenId) {
   return page.evaluate((tokenId) => canvas.scene.tokens.get(tokenId)._source.elevation, tokenId);
}

/**
 * Calls the system's `measureTokenDistance` on two tokens of the viewed scene.
 * @param {string} fromId - The first token's id.
 * @param {string} toId - The second token's id.
 * @returns {Promise<number|null>} The measured distance in spaces.
 */
async function measure(fromId, toId) {
   return page.evaluate(
      ({ fromId, toId }) => game.titan._probe.helpers.measureTokenDistance(
         canvas.scene.tokens.get(fromId),
         canvas.scene.tokens.get(toId),
      ),
      {
         fromId,
         toId,
      },
   );
}

/**
 * Reads the ids of the tokens `getTargetedCharacterTokens` returns.
 * @returns {Promise<string[]>} The returned tokens' ids, in order.
 */
async function helperTokenIds() {
   return page.evaluate(() => game.titan._probe.helpers.getTargetedCharacterTokens().map((token) => token.id));
}

/**
 * Reads the uuids of the actors `getTargetedCharacters` returns, and the uuids of the actors of the given tokens.
 * @param {string[]} tokenIds - The ids of the tokens whose actors are expected.
 * @returns {Promise<{found: string[], expected: string[]}>} The returned actors' uuids and the expected uuids.
 */
async function helperActorUuids(tokenIds) {
   return page.evaluate((tokenIds) => ({
      found: game.titan._probe.helpers.getTargetedCharacters().map((actor) => actor.uuid),
      expected: tokenIds.map((tokenId) => canvas.scene.tokens.get(tokenId).actor.uuid),
   }), tokenIds);
}

test('measures adjacent tokens as 1 space and tokens 21 spaces apart on a row as 21', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The first token. */
   const firstId = await createToken('E2E Target Helpers Row First', {
      column: middle.column - 11,
      row: middle.row,
   });
   /** @type {string} The token next to it. */
   const nextId = await createToken('E2E Target Helpers Row Next', {
      column: middle.column - 10,
      row: middle.row,
   });
   /** @type {string} The token 21 spaces along the row. */
   const farId = await createToken('E2E Target Helpers Row Far', {
      column: middle.column + 10,
      row: middle.row,
   });

   expect(await expectedDistance(await squaresOf(firstId), await squaresOf(nextId))).toBe(1);
   expect(await measure(firstId, nextId), 'adjacent tokens').toBe(1);
   expect(await expectedDistance(await squaresOf(firstId), await squaresOf(farId))).toBe(21);
   expect(await measure(firstId, farId), 'tokens 21 spaces apart').toBe(21);
   expect(await measure(farId, firstId), 'the distance is the same from the other token').toBe(21);
});

test('follows the diagonal rule of the scene grid for tokens apart on both axes', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The first token. */
   const firstId = await createToken('E2E Target Helpers Diagonal First', {
      column: middle.column - 3,
      row: middle.row - 3,
   });
   /** @type {string} The token 4 columns and 4 rows away. */
   const secondId = await createToken('E2E Target Helpers Diagonal Second', {
      column: middle.column + 1,
      row: middle.row + 1,
   });

   // Four diagonal steps cost 1, 2, 1, 2 = 6 spaces, where 4 equidistant diagonal steps would cost 4.
   /** @type {number} The distance by the grid's rule. */
   const expected = await expectedDistance(await squaresOf(firstId), await squaresOf(secondId));
   expect(expected).toBe(6);
   expect(await measure(firstId, secondId)).toBe(expected);
});

test('measures the elevation set in the Token HUD as a third axis of the grid path', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The first token. */
   const firstId = await createToken('E2E Target Helpers Elevation First', {
      column: middle.column - 1,
      row: middle.row,
   });
   /** @type {string} The token on the square beside it. */
   const besideId = await createToken('E2E Target Helpers Elevation Beside', middle);

   // Level with each other the tokens are adjacent.
   expect(await elevationOf(besideId), 'the beside token starts at ground level').toBe(0);
   expect(await expectedDistance(await squaresOf(firstId), await squaresOf(besideId))).toBe(1);
   expect(await measure(firstId, besideId), 'level tokens').toBe(1);

   // Raised 3 grid units, the beside token is 3 spaces up and 1 across: the longest axis decides, 3 spaces.
   await setTokenElevation(page, besideId, 3);
   /** @type {number} The spaces of elevation between the tokens (the grid is 1 unit per space, asserted below). */
   const levels = Math.abs(await elevationOf(besideId) - await elevationOf(firstId));
   expect(levels).toBe(3);
   expect(await expectedDistance(await squaresOf(firstId), await squaresOf(besideId), levels)).toBe(3);
   expect(await measure(firstId, besideId), 'the raised token is 3 spaces away').toBe(3);
   expect(await measure(besideId, firstId), 'the same from the raised token').toBe(3);
});

test('measures from the nearest space a Large token covers, not from its center', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The token that becomes Large. */
   const largeId = await createToken('E2E Target Helpers Large Large', middle);
   await setTokenSize(page, largeId, 2);
   expect(await squaresOf(largeId), 'the Large token covers four squares from its top-left square').toEqual([
      {
         column: middle.column,
         row: middle.row,
      },
      {
         column: middle.column + 1,
         row: middle.row,
      },
      {
         column: middle.column,
         row: middle.row + 1,
      },
      {
         column: middle.column + 1,
         row: middle.row + 1,
      },
   ]);

   // The Medium token stands directly left of the Large token's left column: the nearest covered space is 1 away,
   // while the Large token's center is 1.5 columns and 0.5 rows from the Medium token's center.
   /** @type {string} The Medium token beside the Large token. */
   const besideId = await createToken('E2E Target Helpers Large Beside', {
      column: middle.column - 1,
      row: middle.row,
   });
   expect(await expectedDistance(await squaresOf(besideId), await squaresOf(largeId))).toBe(1);
   expect(await measure(besideId, largeId), 'adjacent to the Large token').toBe(1);

   /** @type {string} The Medium token four columns left of the Large token, level with its lower row. */
   const farId = await createToken('E2E Target Helpers Large Far', {
      column: middle.column - 4,
      row: middle.row + 1,
   });
   expect(await expectedDistance(await squaresOf(farId), await squaresOf(largeId))).toBe(4);
   expect(await measure(farId, largeId), 'four spaces from the nearest column of the Large token').toBe(4);
   expect(await measure(largeId, farId), 'the same from the Large token').toBe(4);
});

test('measures nothing between tokens of two scenes', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The token on the first scene. */
   const firstId = await createToken('E2E Target Helpers Scenes First', {
      column: middle.column - 2,
      row: middle.row,
   });
   /** @type {string} The token that stands beside it. */
   const besideId = await createToken('E2E Target Helpers Scenes Beside', {
      column: middle.column + 2,
      row: middle.row,
   });
   expect(await measure(firstId, besideId), 'two tokens of one scene have a distance').toBe(
      await expectedDistance(await squaresOf(firstId), await squaresOf(besideId)),
   );

   /** @type {string} The second scene's id. */
   const otherSceneId = await createScene(page, { name: 'E2E Target Helpers Other Scene' });
   try {
      await viewScene(page, otherSceneId);
      /** @type {string} The token on the second scene. */
      const otherId = await createToken('E2E Target Helpers Scenes Other', await middleSquare());
      expect(
         await page.evaluate(
            ({ firstId, otherId, sceneId, otherSceneId }) => game.titan._probe.helpers.measureTokenDistance(
               game.scenes.get(sceneId).tokens.get(firstId),
               game.scenes.get(otherSceneId).tokens.get(otherId),
            ),
            {
               firstId,
               otherId,
               otherSceneId,
               sceneId,
            },
         ),
         'tokens of two scenes have no distance',
      ).toBeNull();
   }
   finally {
      await viewScene(page, sceneId);
   }
});

test('returns the targeted tokens and their actors in target order', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The first token. */
   const firstId = await createToken('E2E Target Helpers Targets First', {
      column: middle.column - 3,
      row: middle.row,
   });
   /** @type {string} The second token. */
   const secondId = await createToken('E2E Target Helpers Targets Second', {
      column: middle.column,
      row: middle.row,
   });

   await targetPlacedToken(page, secondId);
   await targetPlacedToken(page, firstId, { add: true });
   expect(await targetedTokenIds(page), 'the user targets the second token then the first').toEqual([
      secondId,
      firstId,
   ]);
   expect(await helperTokenIds()).toEqual([
      secondId,
      firstId,
   ]);

   /** @type {{found: string[], expected: string[]}} The actors the helper returns and the targeted tokens' actors. */
   const actors = await helperActorUuids([
      secondId,
      firstId,
   ]);
   expect(actors.found).toEqual(actors.expected);
});

test('a GM with no target gets the controlled tokens, and a target takes precedence over them', async () => {
   /** @type {Square} The middle of the scene. */
   const middle = await middleSquare();
   /** @type {string} The token the GM controls. */
   const controlledId = await createToken('E2E Target Helpers Fallback Controlled', {
      column: middle.column - 2,
      row: middle.row,
   });
   /** @type {string} The token the GM targets. */
   const targetedId = await createToken('E2E Target Helpers Fallback Targeted', {
      column: middle.column + 2,
      row: middle.row,
   });

   await controlPlacedToken(page, controlledId);
   await targetPlacedToken(page, targetedId);
   expect(await helperTokenIds(), 'the target takes precedence over the controlled token').toEqual([targetedId]);

   await releaseTargets(page);
   expect(await targetedTokenIds(page), 'the release left nothing targeted').toEqual([]);

   // Releasing a target hovers its token, which releases the control, so the GM takes control again.
   await controlPlacedToken(page, controlledId);
   expect(await helperTokenIds(), 'the controlled token stands in').toEqual([controlledId]);

   /** @type {{found: string[], expected: string[]}} The actors the helper returns and the controlled token's actor. */
   const actors = await helperActorUuids([controlledId]);
   expect(actors.found).toEqual(actors.expected);
});
