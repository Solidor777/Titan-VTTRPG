<script>
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemStats from '~/document/types/item/components/ItemStats.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemEquipButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEquipButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import CondensedItemCheckButton from '~/document/svelte-components/check/CondensedItemCheckButton.svelte';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CharacterSheetEquipmentProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetEquipmentProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded equipment bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {boolean} The item's equipped state, read reactively through the embedded bridge. */
   const equipped = $derived(document.data?.system.equipped);

   /** @type {number} The item's check count, read reactively through the embedded bridge. */
   const checkLength = $derived(document.data?.system.check.length);

   /** @type {string} The item's description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.system.description);
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Toggle Equipped button-->
      {#if equipped === false || checkLength === 0}
         <div class="button">
            <CharacterSheetItemEquipButton {equipped}/>
         </div>
      {:else if (checkLength > 0)}
         <div class="button">
            <CondensedItemCheckButton/>
         </div>
      {/if}

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

   <!--Equip button-->
   {#if checkLength > 0}
      <div class="section">
         <CharacterSheetItemEquipButton {equipped}/>
      </div>
   {/if}

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

   <!--Footer (shared stats component; reads the equipment through the document context)-->
   <div class="section footer">
      <ItemStats/>
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
</style>
