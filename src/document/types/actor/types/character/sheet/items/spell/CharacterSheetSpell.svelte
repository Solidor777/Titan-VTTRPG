<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
   import SpellStats from '~/document/types/item/types/spell/components/SpellStats.svelte';
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
   import CharacterSheetSpellCastingCheck
      from '~/document/types/actor/types/character/sheet/items/spell/CharacterSheetSpellCastingCheck.svelte';
   import CharacterSheetCondensedCastingCheckButton
      from '~/document/types/actor/types/character/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte';

   /**
    * @typedef {object} CharacterSheetSpellProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetSpellProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded spell bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {SpellAspect[]} Standard Spell Aspects, read reactively through the embedded bridge. */
   const aspect = $derived(document.data?.system.aspect ?? []);

   /** @type {object[]} Custom Spell Aspects, read reactively through the embedded bridge. */
   const customAspect = $derived(document.data?.system.customAspect ?? []);

   /** @type {object[]} Casting checks, read reactively through the embedded bridge. */
   const check = $derived(document.data?.system.check ?? []);

   /** @type {string} Rich-text description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.system.description);

   /** @type {SpellAspect[]} List of enabled Spell Aspects. */
   const enabledAspects = $derived(aspect.filter((aspect) => aspect.enabled));
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Cast Spell-->
      <div class="button">
         <CharacterSheetCondensedCastingCheckButton/>
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

   <!--Item Check Data-->
   <div class="section tags">
      <CharacterSheetSpellCastingCheck/>
   </div>

   <!--Spell Aspects-->
   {#if enabledAspects.length > 0 || customAspect.length > 0}
      <div class="section tags">
         <SpellAspectTags
            standardAspects={enabledAspects}
            customAspects={customAspect}
         />
      </div>
   {/if}

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

   <!--Footer (shared stats component; reads the spell through the document context)-->
   <div class="section footer">
      <SpellStats/>
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

      &:not(.rich-text, .tags, .footer) {
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

      &:not(.tags, .buttons, .footer) {
         @include flex-column;
         @include flex-group-top;
      }
   }
</style>
