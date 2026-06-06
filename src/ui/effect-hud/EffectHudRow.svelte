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

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The HUD's top-level actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {boolean} Whether this row is expanded to show its detail. */
   let isExpanded = $state(false);

   /** @type {boolean} Whether this entry is a full effect (vs an inert condition). */
   const isEffect = $derived(document.data?.type === 'effect');

   /** @type {string} The entry's description HTML, sourced per subtype. */
   const description = $derived(
      isEffect
         ? (document.data?.description ?? '')
         : (document.data?.flags?.titan?.description ?? ''),
   );

   /** @type {number} The effect's embedded-check count (conditions have none). */
   const checkLength = $derived(isEffect ? (document.data?.system.check.length ?? 0) : 0);

   /** @type {string} The effect's duration type (effects only; defaults to permanent when absent). */
   const durationType = $derived(
      isEffect ? (document.data?.system.duration.type ?? 'permanent') : 'permanent',
   );

   /** @type {number} The effect's remaining duration (effects only; conditions carry no duration). */
   const durationRemaining = $derived(isEffect ? document.data?.system.duration?.remaining : undefined);
</script>

<div
   class="row"
   class:expanded={isExpanded}
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
      <!--Description-->
      {#if description !== '' && description !== '<p></p>'}
         <div class="description">
            <RichText value={description}/>
         </div>
      {/if}

      <!--Embedded checks (context-sourced, mirroring the sheet; the checkLength gate is reactive)-->
      {#if checkLength > 0}
         <div class="checks">
            <CharacterSheetEffectChecks/>
         </div>
      {/if}

      <!--Controls-->
      <div class="controls">
         {#if isEffect}
            <IconButton
               icon={SEND_TO_CHAT_ICON}
               label={localize('sendToChat')}
               tooltip={'sendToChat'}
               onclick={() => document.doc.sendToChat()}
            />
         {/if}
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            label={localize('deleteEffect')}
            tooltip={'deleteEffect'}
            onclick={() => sheetDocument.data.system.requestEffectDeletion(document.data?.id)}
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
