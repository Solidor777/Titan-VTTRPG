<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import CharacterSheetEffectChecks
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte';
   import { DELETE_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} EffectHudRowProps
    * @property {TitanActiveEffect} effect - The effect or condition to render.
    */

   /** @type {EffectHudRowProps} */
   const { effect } = $props();

   /** @type {object} Reactive bridge around the active actor. */
   const document = getContext('document');

   /** @type {boolean} Whether this row is expanded to show its detail. */
   let isExpanded = $state(false);

   /** @type {boolean} Whether this entry is a full effect (vs an inert condition). */
   const isEffect = $derived(effect.type === 'effect');

   /** @type {string} The entry's description HTML, sourced per subtype. */
   const description = $derived(
      isEffect
         ? (document.data.effects.get(effect.id)?.description ?? '')
         : (document.data.effects.get(effect.id)?.flags?.titan?.description ?? ''),
   );

   /** @type {number} The effect's embedded-check count (conditions have none). */
   const checkLength = $derived(
      isEffect ? (document.data.effects.get(effect.id)?.system.check.length ?? 0) : 0,
   );

   /** @type {string} The effect's duration type (effects only). */
   const durationType = $derived(
      isEffect ? document.data.effects.get(effect.id)?.system.duration.type : 'permanent',
   );

   /** @type {number} The effect's remaining duration. */
   const durationRemaining = $derived(
      document.data.effects.get(effect.id)?.system.duration?.remaining,
   );
</script>

<div
   class="row"
   class:expanded={isExpanded}
>
   <!--Row header (click to expand)-->
   <button
      class="row-header"
      type="button"
      onclick={() => isExpanded = !isExpanded}
   >
      <img
         class="icon"
         src={effect.img}
         alt={effect.name}
      />
      <span class="name">{effect.name}</span>
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
      <!--Description-->
      {#if description !== '' && description !== '<p></p>'}
         <div class="description">
            <RichText value={description}/>
         </div>
      {/if}

      <!--Embedded checks-->
      {#if checkLength > 0}
         <div class="checks">
            <CharacterSheetEffectChecks {effect}/>
         </div>
      {/if}

      <!--Controls-->
      <div class="controls">
         {#if isEffect}
            <IconButton
               icon={SEND_TO_CHAT_ICON}
               label={localize('sendToChat')}
               tooltip={localize('sendToChat')}
               onclick={() => effect.sendToChat()}
            />
         {/if}
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            label={localize('deleteEffect')}
            tooltip={localize('deleteEffect')}
            onclick={() => document.data.system.requestEffectDeletion(effect.id)}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .row {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      &.expanded {
         @include panel-2;
         @include padding-standard;
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

      .description,
      .checks {
         @include margin-top-standard;

         width: 100%;
      }

      .controls {
         @include flex-row;
         @include flex-group-right;
         @include margin-top-standard;

         width: 100%;
         gap: var(--titan-spacing-standard);
      }
   }
</style>
