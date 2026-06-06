<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetEffectToggleActiveButton
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectToggleActiveButton.svelte';
   import CharacterSheetEffectChecks
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte';
   import { DELETE_ICON, EDIT_ICON, SEND_TO_CHAT_ICON, SHEET_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetEffectProps
    * @property {boolean} [isExpanded] - Whether this effect is currently expanded.
    */

   /** @type {CharacterSheetEffectProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {string} The effect's duration type, read reactively through the embedded bridge. */
   const durationType = $derived(document.data?.system.duration.type);

   /** @type {string} The effect's custom duration label, read reactively through the embedded bridge. */
   const durationCustom = $derived(document.data?.system.duration.custom);

   /** @type {number} The effect's remaining duration, read reactively through the embedded bridge. */
   const durationRemaining = $derived(document.data?.system.duration.remaining);

   /** @type {boolean} Whether the effect is expired, read reactively through the embedded bridge. */
   const isExpired = $derived(document.data?.system.isExpired);

   /** @type {string} The effect's rich-text description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.description ?? '');

   /** @type {number} The effect's check count, read reactively through the embedded bridge. */
   const checkLength = $derived(document.data?.system.check.length ?? 0);

   /** @type {Array<object>} The effect's custom traits, read reactively through the embedded bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Duration-->
      {#if durationType !== 'permanent'}
         {#if durationType === 'initiative'}
            <!--Initiative-->
            <div class="field margin-right">
               <div class="label">
                  {localize('initiative')}
               </div>
               <div class="input">
                  <IntegerInput
                     min={0}
                     bind:value={
                        () => document.data?.system.duration.initiative ?? 0,
                        (newValue) => document.doc?.update({ system: { duration: { initiative: newValue } } })
                     }
                  />
               </div>
            </div>
         {/if}

         <div class="field">
            <div class="label">
               {durationType === 'custom'
                  ? durationCustom
                  : localize('turns')}
            </div>

            <!--Duration input-->
            <div class="input">
               <IntegerIncrementInput
                  min={0}
                  bind:value={
                     () => document.data?.system.duration.remaining ?? 0,
                     (newValue) => document.doc?.update({ system: { duration: { remaining: newValue } } })
                  }
               />
            </div>
         </div>
      {/if}

      <!--Toggle Active Button-->
      <CharacterSheetEffectToggleActiveButton/>

      <!--Send to Chat button-->
      <div class="button">
         <IconButton
            icon={SEND_TO_CHAT_ICON}
            label={localize('sendToChat')}
            onclick={() => document.doc?.sendToChat()}
            tooltip={'sendToChat'}
         />
      </div>

      <!--Edit Button-->
      <div class="button">
         <IconButton
            icon={document.data?.isOwner ? EDIT_ICON : SHEET_ICON}
            label={localize(document.data?.isOwner ? 'editItem' : 'viewItemSheet')}
            onclick={() => document.doc?.sheet.render(true)}
            tooltip={document.data?.isOwner ? 'editItem' : 'viewItemSheet'}
         />
      </div>

      <!--Delete Button-->
      <div class="button">
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            label={localize('deleteEffect')}
            onclick={() => sheetDocument.data.system.requestEffectDeletion(document.data?.id)}
            tooltip={'deleteEffect'}
         />
      </div>
   {/snippet}

   <!--Effect Description-->
   {#if description !== '' && description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={description}/>
      </div>
   {/if}

   <!--Checks-->
   {#if checkLength > 0}
      <div class="section">
         <CharacterSheetEffectChecks/>
      </div>
   {/if}

   <div class="section tags small-text">
      <!--Duration-->
      <div class="tag">
         <DurationTag
            type={durationType}
            remaining={durationRemaining}
            testId={'effect-row-duration'}
         />
      </div>

      <!--Expired-->
      {#if isExpired}
         <div class="tag">
            <Tag>{localize('expired')}</Tag>
         </div>
      {/if}

      <!--Traits-->
      {#each customTrait as trait}
         <div class="tag">
            <Tag tooltip={{ text: trait.description, localize: false }}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</CharacterSheetItem>

<style lang="scss">
   .button:not(:first-child) {
      @include margin-left-standard;
   }

   .section {
      width: 100%;

      &:not(.rich-text) {
         @include padding-bottom-large;
      }

      &:not(.rich-text, .tags) {
         @include padding-top-large;
      }

      &:not(:first-child) {
         @include border-top;
      }

      &.tags {
         @include flex-row;
         @include flex-group-center;

         flex-wrap: wrap;

         .tag {
            @include tag-container-child-margin;
         }
      }

      &:not(.tags, .buttons) {
         @include flex-column;
         @include flex-group-top;
      }

      &.small-text {
         @include font-size-small;
      }
   }

   .field {
      @include flex-row;
      @include flex-group-center;

      &.margin-right {
         @include margin-right-standard;
      }

      .label {
         @include margin-right-standard;
      }

      .input {
         --titan-input-width: 32px;
      }
   }
</style>
