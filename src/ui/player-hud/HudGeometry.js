/**
 * Computes the canvas-area rect the HUD may occupy (the viewport minus the sidebar).
 * @param {object} params - Measurement inputs.
 * @param {number} params.viewportWidth - The window inner width.
 * @param {number} params.viewportHeight - The window inner height.
 * @param {number} params.sidebarWidth - The sidebar's current rendered width.
 * @returns {{left: number, top: number, width: number, height: number}} The usable rect.
 */
export function computeCanvasRect({ viewportWidth, viewportHeight, sidebarWidth }) {
   return {
      left: 0,
      top: 0,
      width: Math.max(0, viewportWidth - sidebarWidth),
      height: viewportHeight,
   };
}

/**
 * Clamps a top-left point so an element of the given size stays fully inside the rect.
 * @param {{x: number, y: number}} point - The candidate top-left point.
 * @param {{width: number, height: number}} size - The element size.
 * @param {object} rect - The canvas rect.
 * @returns {{x: number, y: number}} The clamped point.
 */
export function clampPoint(point, size, rect) {
   return {
      x: Math.min(Math.max(point.x, rect.left), Math.max(rect.left, rect.left + rect.width - size.width)),
      y: Math.min(Math.max(point.y, rect.top), Math.max(rect.top, rect.top + rect.height - size.height)),
   };
}

/**
 * Resolves an anchored position to clamped viewport coordinates.
 * @param {{anchorX: string, anchorY: string, dx: number, dy: number}} position - The stored anchors.
 * @param {{width: number, height: number}} size - The element size.
 * @param {object} rect - The canvas rect.
 * @returns {{x: number, y: number}} The resolved top-left point.
 */
export function resolvePosition(position, size, rect) {
   /** @type {number} The unclamped x coordinate. */
   const x = position.anchorX === 'left'
      ? rect.left + position.dx
      : rect.left + rect.width - position.dx - size.width;

   /** @type {number} The unclamped y coordinate. */
   const y = position.anchorY === 'top'
      ? rect.top + position.dy
      : rect.top + rect.height - position.dy - size.height;

   return clampPoint({ x, y }, size, rect);
}

/**
 * Derives edge anchors from a resolved point, snapping to the nearest horizontal and vertical edge.
 * @param {{x: number, y: number}} point - The element's top-left point.
 * @param {{width: number, height: number}} size - The element size.
 * @param {object} rect - The canvas rect.
 * @returns {{anchorX: string, anchorY: string, dx: number, dy: number}} The derived anchors.
 */
export function deriveAnchors(point, size, rect) {
   /** @type {number} The element center x, relative to the rect. */
   const centerX = point.x - rect.left + (size.width / 2);

   /** @type {number} The element center y, relative to the rect. */
   const centerY = point.y - rect.top + (size.height / 2);

   /** @type {string} The nearest horizontal edge. */
   const anchorX = centerX <= rect.width / 2 ? 'left' : 'right';

   /** @type {string} The nearest vertical edge. */
   const anchorY = centerY <= rect.height / 2 ? 'top' : 'bottom';

   return {
      anchorX,
      anchorY,
      dx: Math.max(0, anchorX === 'left' ? point.x - rect.left : rect.left + rect.width - point.x - size.width),
      dy: Math.max(0, anchorY === 'top' ? point.y - rect.top : rect.top + rect.height - point.y - size.height),
   };
}
