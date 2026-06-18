<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
   import { clampPoint, deriveAnchors, resolvePosition } from '~/ui/player-hud/HudGeometry.js';

   /**
    * @typedef {object} HudElementFrameProps
    * @property {string} elementKey - The layout key for this element.
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {string} minimizeIcon - Font Awesome classes for the minimized chip icon.
    * @property {string} [chipCorner] - The minimize chip's corner: 'top-right' (the default), 'top-left', 'bottom-right', or 'bottom-left'.
    * @property {boolean} [resizable] - Whether edit mode offers a resize handle (effects panel).
    * @property {string} [testId] - Optional data-testid forwarded to the frame root.
    * @property {Snippet} children - The element content.
    */

   /** @type {HudElementFrameProps} */
   const {
      elementKey,
      layoutState,
      minimizeIcon,
      chipCorner = 'top-right',
      resizable = false,
      testId,
      children,
   } = $props();

   /** @type {number} The frame's measured width. */
   let width = $state(0);

   /** @type {number} The frame's measured height. */
   let height = $state(0);

   /** @type {{x: number, y: number} | null} Live position override while dragging. */
   let dragPoint = $state(null);

   /** @type {boolean} Whether this element is minimized. */
   const minimized = $derived(layoutState.minimized[elementKey] === true);

   /** @type {{x: number, y: number}} The resolved (or drag-overridden) top-left point. */
   const point = $derived(
      dragPoint ?? resolvePosition(
         layoutState.positions[elementKey],
         { width, height },
         layoutState.rect,
      ),
   );

   /**
    * Starts an edit-mode drag, tracking the pointer until release.
    * @param {PointerEvent} event - The initiating pointer event.
    * @returns {void}
    */
   function onDragStart(event) {
      if (!layoutState.editMode) {
         return;
      }
      event.preventDefault();

      /** @type {{x: number, y: number}} The pointer offset inside the element. */
      const grab = { x: event.clientX - point.x, y: event.clientY - point.y };

      /**
       * Tracks pointer movement, snapping to the drag grid and clamping into the canvas rect.
       * @param {PointerEvent} move - The move event.
       * @returns {void}
       */
      const onMove = (move) => {
         /** @type {number} The edit-mode drag snap grid, in pixels. */
         const snap = 8;

         dragPoint = clampPoint(
            {
               x: Math.round((move.clientX - grab.x) / snap) * snap,
               y: Math.round((move.clientY - grab.y) / snap) * snap,
            },
            { width, height },
            layoutState.rect,
         );
      };

      /**
       * Commits the drag: derives fresh anchors from the drop point and persists.
       * @returns {void}
       */
      const onUp = () => {
         window.removeEventListener('pointermove', onMove);
         window.removeEventListener('pointerup', onUp);
         if (dragPoint) {
            layoutState.positions[elementKey] = deriveAnchors(dragPoint, { width, height }, layoutState.rect);
            layoutState.persist();
            dragPoint = null;
         }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
   }

   /**
    * Starts an edit-mode resize drag (effects panel only).
    * @param {PointerEvent} event - The initiating pointer event.
    * @returns {void}
    */
   function onResizeStart(event) {
      event.preventDefault();
      event.stopPropagation();

      /** @type {{width: number, height: number}} The size at drag start. */
      const start = { width: layoutState.effectsPanelSize.width, height: layoutState.effectsPanelSize.height };

      /** @type {{x: number, y: number}} The pointer at drag start. */
      const origin = { x: event.clientX, y: event.clientY };

      /**
       * Tracks pointer movement into a clamped size.
       * @param {PointerEvent} move - The move event.
       * @returns {void}
       */
      const onMove = (move) => {
         layoutState.effectsPanelSize = {
            width: Math.max(180, start.width + (move.clientX - origin.x)),
            height: Math.max(120, start.height + (move.clientY - origin.y)),
         };
      };

      /**
       * Commits the resize.
       * @returns {void}
       */
      const onUp = () => {
         window.removeEventListener('pointermove', onMove);
         window.removeEventListener('pointerup', onUp);
         layoutState.persist();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
   }
</script>

<div
   class="hud-element"
   class:edit-mode={layoutState.editMode}
   role="group"
   style:left={`${point.x}px`}
   style:top={`${point.y}px`}
   bind:clientWidth={width}
   bind:clientHeight={height}
   data-testid={testId}
   onpointerdown={onDragStart}
>
   {#if minimized}
      <HudButton
         variant="restore"
         ariaLabel={localize('restoreElement')}
         testId={testId ? `${testId}-restore` : undefined}
         onclick={() => layoutState.toggleMinimized(elementKey)}
      >
         <i class={minimizeIcon}></i>
      </HudButton>
   {:else}
      <div class={`minimize-chip ${chipCorner}`}>
         <HudButton
            variant="chip"
            ariaLabel={localize('minimizeElement')}
            testId={testId ? `${testId}-minimize` : undefined}
            onclick={() => layoutState.toggleMinimized(elementKey)}
         >
            <i class="fas fa-minus"></i>
         </HudButton>
      </div>
      {@render children()}
      {#if resizable && layoutState.editMode}
         <button
            class="resize-handle"
            type="button"
            aria-label={localize('resizeElement')}
            data-testid={testId ? `${testId}-resize` : undefined}
            onpointerdown={onResizeStart}
         ></button>
      {/if}
   {/if}
</div>

<style lang="scss">
   .hud-element {
      position: absolute;
      pointer-events: auto;

      &.edit-mode {
         cursor: move;
         outline: 2px dashed var(--titan-panel-3-background);
         outline-offset: 2px;
      }

      // Positioning wrapper for the minimize chip; its surface and text come from HudButton.
      .minimize-chip {
         position: absolute;
         z-index: 2;
         opacity: 0.8;

         &:hover {
            opacity: 1;
         }

         &.top-right {
            top: 0;
            right: 0;
         }

         &.top-left {
            top: 0;
            left: 0;
         }

         &.bottom-right {
            bottom: 0;
            right: 0;
         }

         &.bottom-left {
            bottom: 0;
            left: 0;
         }
      }

      .resize-handle {
         position: absolute;
         right: 0;
         bottom: 0;
         width: 14px;
         height: 14px;
         padding: 0;
         border: none;
         cursor: nwse-resize;
         background: linear-gradient(135deg, transparent 50%, var(--titan-panel-3-background) 50%);
      }
   }
</style>
