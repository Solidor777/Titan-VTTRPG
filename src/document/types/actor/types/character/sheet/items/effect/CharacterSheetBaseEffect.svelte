<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import CharacterSheetItem
   from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetEffectToggleActiveButton
   from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectToggleActiveButton.svelte';
   import { DELETE_ICON, EDIT_ICON, SHEET_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetBaseEffectProps
    * @property {boolean} [isExpanded] - Whether this effect is currently expanded.
    */

   /** @type {CharacterSheetBaseEffectProps} */
   let { isExpanded = $bindable() } = $props();

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {string} The effect's core description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.description ?? '');
</script>

<!--A `base` effect row: only core's effect data (name, image, disabled flag, description); it opens core's sheet-->
<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Toggle Active Button (the native disabled flag)-->
      <CharacterSheetEffectToggleActiveButton/>

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
      <div class="rich-text">
         <RichText value={description}/>
      </div>
   {/if}
</CharacterSheetItem>

<style lang="scss">
   .button {
      @include margin-left-standard;
   }

   .rich-text {
      width: 100%;
   }
</style>
