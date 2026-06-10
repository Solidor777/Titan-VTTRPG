<script>
   import { getContext } from 'svelte';
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
   import CharacterSheetWeaponMultiAttackButton
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponMultiAttackButton.svelte';
   import CharacterSheetWeaponAttacks
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte';
   import CharacterSheetCondensedAttackCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte';

   /**
    * @typedef {object} CharacterSheetWeaponProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetWeaponProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded weapon bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {boolean} Whether this Weapon is currently equipped, read reactively through the embedded bridge. */
   const equipped = $derived(document.data?.system.equipped);

   /** @type {number} Number of Attacks on this Weapon, read reactively through the embedded bridge. */
   const attackCount = $derived(document.data?.system.attack.length ?? 0);

   /** @type {number} Number of Checks on this Weapon, read reactively through the embedded bridge. */
   const checkCount = $derived(document.data?.system.check.length ?? 0);

   /** @type {string} The Weapon's Attack notes, read reactively through the embedded bridge. */
   const attackNotes = $derived(document.data?.system.attackNotes);

   /** @type {string} The Weapon's description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.system.description);
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <div class="button">
         {#if !equipped}
            <!--Toggle Equipped button-->
            <CharacterSheetItemEquipButton {equipped}/>
         {:else if attackCount > 0}
            <CharacterSheetCondensedAttackCheckButton/>
         {/if}
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

   <div class="section buttons">
      <div class="button">
         <CharacterSheetWeaponMultiAttackButton/>
      </div>

      <div class="button">
         <CharacterSheetItemEquipButton {equipped}/>
      </div>
   </div>

   <!--Attacks-->
   <div class="section">
      <CharacterSheetWeaponAttacks/>
   </div>

   <!--Attack notes-->
   {#if attackNotes !== '' && attackNotes !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={attackNotes}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if description !== '' && description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={description}/>
      </div>
   {/if}

   <!--Item Checks-->
   {#if checkCount > 0}
      <div class="section">
         <CharacterSheetItemChecks/>
      </div>
   {/if}

   <!--Footer (shared stats component; reads the weapon through the document context)-->
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

      &.buttons {
         @include flex-row;
         @include flex-group-center;

         .button:not(:first-child) {
            @include margin-left-standard;
         }
      }
   }
</style>
