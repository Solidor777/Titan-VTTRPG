<script>
   import { getContext } from 'svelte';
   import PortraitBars from '~/ui/player-hud/elements/portrait/PortraitBars.svelte';
   import PortraitUtilityRow from '~/ui/player-hud/elements/portrait/PortraitUtilityRow.svelte';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {boolean} Whether the editable-bars popover is open. */
   let barsOpen = $state(false);

   /**
    * Computes a resource's fill percentage.
    * @param {string} resource - The resource key to measure.
    * @returns {number} The 0-100 fill percentage.
    */
   function pct(resource) {
      /** @type {number} The resource maximum. */
      const max = document.data.system.resource[resource].max;
      return max > 0
         ? Math.min(100, Math.max(0, (document.data.system.resource[resource].value / max) * 100))
         : 0;
   }
</script>

<div class="round-token">
   <button
      class="rings"
      type="button"
      aria-label={document.data.name}
      data-testid="player-hud-round-portrait"
      onclick={() => barsOpen = !barsOpen}
   >
      <div
         class="ring"
         style:background={`conic-gradient(var(--titan-stamina-background) 0 ${pct('stamina')}%, var(--titan-panel-3-background) ${pct('stamina')}% 100%)`}
      ></div>
      <div
         class="ring inner"
         style:background={`conic-gradient(var(--titan-resolve-background) 0 ${pct('resolve')}%, var(--titan-panel-3-background) ${pct('resolve')}% 100%)`}
      ></div>
      <img
         src={document.data.img}
         alt={document.data.name}
      />
   </button>
   <span class="name">{document.data.name}</span>
   {#if barsOpen}
      <div
         class="bars-popover"
         data-testid="player-hud-bars-popover"
      >
         <PortraitBars/>
      </div>
   {/if}
   <PortraitUtilityRow/>
</div>

<style lang="scss">
   .round-token {
      @include flex-column;
      @include flex-group-top;

      width: 170px;
      gap: var(--titan-spacing-standard);

      .rings {
         position: relative;
         width: 110px;
         height: 110px;
         padding: 0;
         background: none;
         border: none;
         cursor: pointer;

         .ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;

            &.inner {
               inset: 6px;
            }
         }

         img {
            position: absolute;
            inset: 12px;
            width: calc(100% - 24px);
            height: calc(100% - 24px);
            object-fit: cover;
            border-radius: 50%;
         }
      }

      .name {
         @include font-size-small;
      }

      .bars-popover {
         @include panel-2;
         @include padding-standard;

         width: 100%;
         border-radius: var(--titan-border-radius);
      }
   }
</style>
