<script>
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import AbilityStats from '~/document/types/item/types/ability/components/AbilityStats.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CharacterSheetAbilityProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetAbilityProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded ability bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Check-->
      {#if document.data?.system.check.length > 0}
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

   <!--Item Checks-->
   {#if document.data?.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks/>
      </div>
   {/if}

   <!--Item Description-->
   {#if !(isHTMLBlank(document.data?.system.description))}
      <div class="section rich-text">
         <RichText value={document.data?.system.description}/>
      </div>
   {/if}

   <!--Footer (shared stats component; reads the ability through the document context)-->
   <div class="section footer">
      <AbilityStats/>
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
