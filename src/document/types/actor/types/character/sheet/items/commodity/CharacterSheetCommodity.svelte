<script>
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';
   import CommodityStats from '~/document/types/item/types/commodity/components/CommodityStats.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CharacterSheetCommodityProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetCommodityProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded commodity bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {number} The item's check count, read reactively through the embedded bridge. */
   const checkLength = $derived(document.data?.system.check.length);

   /** @type {string} The item's description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.system.description);
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Quantity-->
      <div class="field">
         <IntegerIncrementInput
            bind:value={
               () => document.data?.system.quantity ?? 0,
               (newValue) => document.doc?.update({ system: { quantity: newValue } })
            }
         />
      </div>

      <!--Send to Chat button-->
      <div class="button">
         <CharacterSheetItemSendToChatButton/>
      </div>

      <!--Edit Button-->
      <div class="button">
         <CharacterSheetItemEditButton/>
      </div>

      <!--Delete Button-->
      <div class="button">
         <CharacterSheetItemDeleteButton/>
      </div>
   {/snippet}

   <!--Item Checks-->
   {#if checkLength > 0}
      <div class="section">
         <CharacterSheetItemChecks/>
      </div>
   {/if}

   <!--Item Description-->
   {#if description !== '' && description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={description}/>
      </div>
   {/if}

   <!--Footer (shared stats component; reads the commodity through the document context)-->
   <div class="section footer">
      <CommodityStats/>
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

      &:not(.rich-text, .footer) {
         @include padding-top-large;
      }

      &:not(:first-child) {
         @include border-top;
      }

      &:not(.footer, .buttons) {
         @include flex-column;
         @include flex-group-top;
      }
   }

   .field {
      @include flex-row;
      @include flex-group-center;

      --titan-input-width: 80px;
   }
</style>
