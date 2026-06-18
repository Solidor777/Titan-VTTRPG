<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import EffectsDetailBody from '~/ui/player-hud/elements/effects-panel/EffectsDetailBody.svelte';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {boolean} Whether this row is expanded to show its detail. */
   let isExpanded = $state(false);

   /** @type {boolean} Whether this entry is a full effect (vs an inert condition). */
   const isEffect = $derived(document.data?.type === 'effect');

   /** @type {string} The effect's duration type (effects only; defaults to permanent when absent). */
   const durationType = $derived(
      isEffect ? (document.data?.system.duration.type ?? 'permanent') : 'permanent',
   );

   /** @type {number} The effect's remaining duration (effects only; conditions carry no duration). */
   const durationRemaining = $derived(isEffect ? document.data?.system.duration.remaining : undefined);
</script>

<div
   class="row"
   class:expanded={isExpanded}
   data-testid="player-hud-effect-row"
>
   <!--Row header (click to expand): icon centred against the stacked name/duration column-->
   <HudButton
      variant="ghost"
      ariaLabel={`${document.data?.name}: ${localize(isExpanded ? 'collapse' : 'expand')}`}
      onclick={() => isExpanded = !isExpanded}
   >
      <img
         class="icon"
         src={document.data?.img}
         alt={document.data?.name}
      />
      <span class="text">
         <span class="name">{document.data?.name}</span>
         {#if isEffect && durationType !== 'permanent'}
            <span class="duration">
               <DurationTag
                  type={durationType}
                  remaining={durationRemaining}
               />
            </span>
         {/if}
      </span>
   </HudButton>

   {#if isExpanded}
      <div class="detail">
         <EffectsDetailBody/>
      </div>
   {/if}
</div>

<style lang="scss">
   // Each effect sits on its own panel, spaced from its neighbours, so rows stay visually distinct.
   .row {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      @include padding-standard;

      width: 100%;
      border-radius: var(--titan-border-radius);

      &:not(:first-child) {
         @include margin-top-standard;
      }

      // The header's icon + stacked name/duration column (the button shell is HudButton's ghost variant).
      .icon {
         flex-shrink: 0;
         width: 30px;
         height: 30px;
         object-fit: contain;
      }

      .text {
         @include flex-column;
         @include flex-group-top-left;
         @include margin-left-standard;

         flex: 1;
         min-width: 0;
         gap: 2px;

         // Truncate rather than overflow the panel when the row is narrow.
         .name {
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
         }
      }

      // The detail shares the row's panel; a top margin separates it from the header.
      .detail {
         @include margin-top-standard;

         width: 100%;
      }
   }
</style>
