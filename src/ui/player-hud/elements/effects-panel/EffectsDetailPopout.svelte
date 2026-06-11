<script>
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import EffectsDetailBody from '~/ui/player-hud/elements/effects-panel/EffectsDetailBody.svelte';
   import { clampPoint } from '~/ui/player-hud/HudGeometry.js';

   /**
    * @typedef {object} EffectsDetailPopoutProps
    * @property {TitanActiveEffect} effect - The selected effect.
    * @property {{x: number, y: number}} anchor - The clicked icon's viewport point.
    * @property {HudLayoutState} layoutState - Shared layout/UI state (for rect clamping).
    * @property {Function} onClose - Invoked when the popout dismisses.
    */

   /** @type {EffectsDetailPopoutProps} */
   const { effect, anchor, layoutState, onClose } = $props();

   /** @type {HTMLElement | undefined} The popout root, for outside-press containment checks. */
   let rootEl = $state();

   /** @type {number} The popout's measured width. */
   let width = $state(0);

   /** @type {number} The popout's measured height. */
   let height = $state(0);

   /** @type {{x: number, y: number}} The clamped popout point. */
   const point = $derived(clampPoint(anchor, { width, height }, layoutState.rect));

   /**
    * Dismisses the popout when a press lands outside it.
    * @param {PointerEvent} event - The window-level pointer event (capture phase).
    * @returns {void}
    */
   function onWindowPointerDown(event) {
      if (rootEl && !rootEl.contains(event.target)) {
         onClose();
      }
   }

   /**
    * Dismisses the popout on Escape, consuming the event so Foundry's core Escape handling
    * (which releases token control and would unmount the whole HUD) does not also fire.
    * @param {KeyboardEvent} event - The window-level keyboard event (capture phase).
    * @returns {void}
    */
   function onWindowKeyDown(event) {
      if (event.key === 'Escape') {
         onClose();
         event.preventDefault();
         event.stopImmediatePropagation();
      }
   }
</script>

<svelte:window
   onpointerdowncapture={onWindowPointerDown}
   onkeydowncapture={onWindowKeyDown}
/>

<div
   class="popout"
   style:left={`${point.x}px`}
   style:top={`${point.y}px`}
   bind:this={rootEl}
   bind:clientWidth={width}
   bind:clientHeight={height}
   data-testid="player-hud-effect-popout"
>
   <div class="title">
      <img
         src={effect.img}
         alt={effect.name}
      />
      <span>{effect.name}</span>
   </div>
   <EmbeddedDocumentProvider doc={effect}>
      <EffectsDetailBody/>
   </EmbeddedDocumentProvider>
</div>

<style lang="scss">
   .popout {
      @include panel-2;
      @include padding-standard;
      @include flex-column;
      @include flex-group-top;

      position: fixed;
      z-index: 1;
      width: 240px;
      border-radius: var(--titan-border-radius);

      .title {
         @include flex-row;
         @include flex-group-left;
         @include font-size-small;

         width: 100%;
         gap: var(--titan-spacing-standard);

         img {
            width: 24px;
            height: 24px;
            object-fit: contain;
         }
      }
   }
</style>
