<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
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
   <!--Row header (click to expand)-->
   <button
      class="row-header"
      type="button"
      aria-label={`${document.data?.name}: ${localize(isExpanded ? 'collapse' : 'expand')}`}
      onclick={() => isExpanded = !isExpanded}
   >
      <img
         class="icon"
         src={document.data?.img}
         alt={document.data?.name}
      />
      <span class="name">{document.data?.name}</span>
      {#if isEffect && durationType !== 'permanent'}
         <span class="duration">
            <DurationTag
               type={durationType}
               remaining={durationRemaining}
            />
         </span>
      {/if}
   </button>

   {#if isExpanded}
      <EffectsDetailBody/>
   {/if}
</div>

<style lang="scss">
   .row {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      &:not(:first-child) {
         @include margin-top-standard;
      }

      &.expanded {
         @include panel-2;
         @include padding-standard;

         border-radius: var(--titan-border-radius);
      }

      .row-header {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         background: none;
         border: none;
         cursor: pointer;
         color: inherit;

         .icon {
            width: 30px;
            height: 30px;
            object-fit: contain;
         }

         .name {
            @include margin-left-standard;

            flex: 1;
            text-align: left;
         }
      }
   }
</style>
