import { describe, it, expect } from 'vitest';
import {
   clampPoint,
   computeCanvasRect,
   deriveAnchors,
   resolveCascadeDirection,
   resolvePosition,
} from '~/ui/player-hud/HudGeometry.js';

/** @type {object} A 1000x800 canvas rect with a 300px sidebar already subtracted. */
const RECT = { left: 0, top: 0, width: 1000, height: 800 };

describe('computeCanvasRect', () => {
   it('subtracts the sidebar width from the viewport', () => {
      expect(computeCanvasRect({ viewportWidth: 1300, viewportHeight: 800, sidebarWidth: 300 }))
         .toEqual({ left: 0, top: 0, width: 1000, height: 800 });
   });
});

describe('resolvePosition', () => {
   it('resolves a left/bottom anchored position', () => {
      const position = { anchorX: 'left', anchorY: 'bottom', dx: 16, dy: 16 };
      expect(resolvePosition(position, { width: 100, height: 50 }, RECT)).toEqual({ x: 16, y: 734 });
   });

   it('resolves a right/top anchored position against the rect edge', () => {
      const position = { anchorX: 'right', anchorY: 'top', dx: 16, dy: 16 };
      expect(resolvePosition(position, { width: 100, height: 50 }, RECT)).toEqual({ x: 884, y: 16 });
   });

   it('clamps into the rect when the offset overflows (sidebar push)', () => {
      const position = { anchorX: 'right', anchorY: 'top', dx: -50, dy: 16 };
      expect(resolvePosition(position, { width: 100, height: 50 }, RECT).x).toBe(900);
   });
});

describe('clampPoint', () => {
   it('clamps a point so the element stays fully inside the rect', () => {
      expect(clampPoint({ x: 980, y: -20 }, { width: 100, height: 50 }, RECT)).toEqual({ x: 900, y: 0 });
   });
});

describe('deriveAnchors', () => {
   it('anchors to the nearest edges with non-negative offsets', () => {
      const anchors = deriveAnchors({ x: 850, y: 30 }, { width: 100, height: 50 }, RECT);
      expect(anchors).toEqual({ anchorX: 'right', anchorY: 'top', dx: 50, dy: 30 });
   });

   it('anchors left/bottom when the element center sits in that quadrant', () => {
      const anchors = deriveAnchors({ x: 20, y: 700 }, { width: 100, height: 50 }, RECT);
      expect(anchors).toEqual({ anchorX: 'left', anchorY: 'bottom', dx: 20, dy: 50 });
   });
});

describe('resolveCascadeDirection', () => {
   it('keeps the preferred direction when it fits', () => {
      expect(resolveCascadeDirection({ preferred: 'before', spaceBefore: 200, spaceAfter: 50, required: 150 }))
         .toBe('before');
   });

   it('flips when the preferred side cannot fit but the other can', () => {
      expect(resolveCascadeDirection({ preferred: 'before', spaceBefore: 100, spaceAfter: 300, required: 150 }))
         .toBe('after');
   });

   it('keeps the preferred direction when neither side fits', () => {
      expect(resolveCascadeDirection({ preferred: 'after', spaceBefore: 100, spaceAfter: 100, required: 150 }))
         .toBe('after');
   });
});
