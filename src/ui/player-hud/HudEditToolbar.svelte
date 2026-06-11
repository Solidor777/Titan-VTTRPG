<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} HudEditToolbarProps
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    */

   /** @type {HudEditToolbarProps} */
   const { layoutState } = $props();
</script>

<div
   class="edit-toolbar"
   data-testid="player-hud-edit-toolbar"
>
   <button
      type="button"
      data-testid="player-hud-edit-done"
      onclick={() => layoutState.editMode = false}
   >
      {localize('exitEditLayout')}
   </button>
   <button
      type="button"
      data-testid="player-hud-edit-reset"
      onclick={() => layoutState.reset()}
   >
      {localize('resetLayout')}
   </button>
   <button
      type="button"
      data-testid="player-hud-edit-settings"
      onclick={() => game.titan?.playerHudSettings?.render(true)}
   >
      <i class="fas fa-gear"></i>
      {localize('playerHudSettings')}
   </button>
</div>

<style lang="scss">
   .edit-toolbar {
      @include panel-1;
      @include padding-standard;
      @include flex-row;
      @include flex-group-center;

      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      gap: var(--titan-spacing-standard);
      pointer-events: auto;
      border-radius: var(--titan-border-radius);

      button {
         @include panel-2;
         @include padding-standard;

         border: none;
         border-radius: var(--titan-border-radius);
         color: inherit;
         cursor: pointer;
      }
   }
</style>
