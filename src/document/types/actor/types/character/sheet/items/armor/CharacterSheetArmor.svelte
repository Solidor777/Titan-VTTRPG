<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
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
   import CharacterSheetArmorStats
      from '~/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmorStats.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';

   /**
    * @typedef {object} CharacterSheetArmorProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetArmorProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded armor bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {Array<object>} The armor's checks, read reactively through the embedded bridge. */
   const check = $derived(document.data?.system.check ?? []);

   /** @type {string} The armor's description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.system.description);
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Toggle Equipped button-->
      {#if (sheetDocument.data.system.equipped.armor === document.data?._id) === false || check.length === 0}
         <div class="button">
            <CharacterSheetItemEquipButton
               equipped={sheetDocument.data.system.equipped.armor === document.data?._id}
            />
         </div>
      {:else if check.length > 0}
         <div class="button">
            <CharacterSheetCondensedItemCheckButton/>
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
   {#if check.length > 0}
      <div class="section">
         <CharacterSheetItemEquipButton
            equipped={sheetDocument.data.system.equipped.armor === document.data?._id}
         />
      </div>
   {/if}

   <!--Armor Stats-->
   <div class="section tags">
      <CharacterSheetArmorStats/>
   </div>

   <!--Item Checks-->
   {#if check.length > 0}
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
      }

      &:not(.tags, .buttons) {
         @include flex-column;
         @include flex-group-top;
      }
   }
</style>
