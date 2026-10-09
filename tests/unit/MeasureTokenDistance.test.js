import { describe, it, expect } from 'vitest';
import measureTokenDistance from '~/helpers/utility-functions/MeasureTokenDistance.js';

/**
 * Builds a fake scene with a 100-pixel square grid measuring 5 units per space and the equidistant diagonal rule.
 * @returns {object} The fake scene.
 */
function squareScene() {
   return {
      grid: {
         distance: 5,

         /**
          * Returns an offset's center point.
          * @param {{i: number, j: number}} offset - The grid offset (row i, column j).
          * @returns {{x: number, y: number}} The offset's center, in pixels.
          */
         getCenterPoint: ({ i, j }) => ({
            x: (j * 100) + 50,
            y: (i * 100) + 50,
         }),

         /**
          * Measures a two-waypoint path with the equidistant diagonal rule.
          * @param {{x: number, y: number}[]} waypoints - The two points of the path.
          * @returns {{distance: number}} The path's distance in grid units.
          */
         measurePath: ([a, b]) => ({
            distance: (Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 100) * 5,
         }),
      },
   };
}

/**
 * Builds a fake token document occupying the given grid offsets.
 * @param {object} scene - The scene the token stands on.
 * @param {{i: number, j: number}[]} offsets - The occupied offsets (empty on a gridless scene).
 * @param {{x: number, y: number}} [center] - The token's center point.
 * @returns {object} The fake token document.
 */
function tokenDocument(scene, offsets, center = {
   x: 0,
   y: 0,
}) {
   return {
      getCenterPoint: () => center,
      getOccupiedGridSpaceOffsets: () => offsets,
      parent: scene,
   };
}

describe('measureTokenDistance', () => {
   it('measures adjacent tokens as 1 space', () => {
      /** @type {object} A scene with a square grid. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [
            {
               i: 0,
               j: 0,
            },
         ]),
         tokenDocument(scene, [
            {
               i: 0,
               j: 1,
            },
         ]),
      )).toBe(1);
   });

   it('measures between the nearest spaces a large token occupies, not its center', () => {
      /** @type {object} A scene with a square grid. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [
            {
               i: 0,
               j: 0,
            },
         ]),
         tokenDocument(scene, [
            {
               i: 0,
               j: 1,
            },
            {
               i: 0,
               j: 2,
            },
            {
               i: 1,
               j: 1,
            },
            {
               i: 1,
               j: 2,
            },
         ]),
      )).toBe(1);
   });

   it('measures 21 spaces along a row', () => {
      /** @type {object} A scene with a square grid. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [
            {
               i: 0,
               j: 0,
            },
         ]),
         tokenDocument(scene, [
            {
               i: 0,
               j: 21,
            },
         ]),
      )).toBe(21);
   });

   it('measures center to center when a token occupies no space (gridless)', () => {
      /** @type {object} A scene with a square grid. */
      const scene = squareScene();
      expect(measureTokenDistance(
         tokenDocument(scene, [], {
            x: 0,
            y: 0,
         }),
         tokenDocument(scene, [], {
            x: 300,
            y: 0,
         }),
      )).toBe(3);
   });

   it('measures nothing without both tokens on one scene', () => {
      /** @type {object} A token on one scene. */
      const token = tokenDocument(squareScene(), []);
      expect(measureTokenDistance(undefined, token)).toBeNull();
      expect(measureTokenDistance(token, undefined)).toBeNull();
      expect(measureTokenDistance(token, tokenDocument(squareScene(), []))).toBeNull();
   });
});
