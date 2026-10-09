/**
 * Measures the distance in grid spaces between two tokens: between the nearest spaces they occupy, using the scene
 * grid's own path measurement (its diagonal rule). Measuring from centers would put an adjacent Large token 1.5 or 2
 * spaces away. A token occupying no space (a gridless scene) is measured from its center.
 * Foundry's measurement applies unchanged, so:
 * - Elevation counts. The occupied spaces carry the token's elevation (client/documents/token.mjs:1466-1486) and the
 * square grid measures a path between elevated points in three dimensions (common/grid/square.mjs:493, 543-545), so
 * tokens at different elevations are farther apart than their positions on the scene.
 * - When the scene holds the token's level, a space that walls or surfaces hide from the token's own position is not
 * occupied (client/documents/token.mjs:1431-1459, 1482); when every space is hidden, the token's center is the only
 * point measured.
 * @param {TokenDocument} [fromToken] - The first token.
 * @param {TokenDocument} [toToken] - The second token.
 * @returns {number|null} The distance in spaces (grid units ÷ the grid's units per space), or null when either token
 * is missing or they are on different scenes.
 */
export default function measureTokenDistance(fromToken, toToken) {
   if (!fromToken || !toToken || !fromToken.parent || fromToken.parent !== toToken.parent) {
      return null;
   }

   /** @type {foundry.grid.BaseGrid} The scene's grid. */
   const grid = fromToken.parent.grid;

   /**
    * Gets the center points of the spaces a token occupies, or its own center when it occupies none.
    * @param {TokenDocument} token - The token whose spaces are read.
    * @returns {{x: number, y: number}[]} The points on the scene, in pixels.
    */
   const getPoints = (token) => {
      /** @type {object[]} The grid offsets the token occupies. */
      const offsets = token.getOccupiedGridSpaceOffsets();
      return offsets.length > 0 ? offsets.map((offset) => grid.getCenterPoint(offset)) : [token.getCenterPoint()];
   };

   /** @type {number} The shortest distance found, in grid units. */
   let shortest = Infinity;
   for (const fromPoint of getPoints(fromToken)) {
      for (const toPoint of getPoints(toToken)) {
         shortest = Math.min(shortest, grid.measurePath([
            fromPoint,
            toPoint,
         ]).distance);
      }
   }
   return shortest / grid.distance;
}
