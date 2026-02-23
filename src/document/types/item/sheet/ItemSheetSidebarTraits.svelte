<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { CREATE_ICON, EDIT_ICON } from '~/system/Icons.js';
   import ItemSheetCustomTraitTag from '~/document/types/item/sheet/ItemSheetCustomTraitTag.svelte';
   import TagContainer from '~/helpers/svelte-components/tag/TagContainer.svelte';
   import { slide } from 'svelte/transition';
   import IconLabelButton from '~/helpers/svelte-components/button/IconLabelButton.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type Tag[] Optional input array of traits converted into Tags.*/
   export let inTags = [];

   /** @type Tag[] List of traits converted into tags. */
   let tags;

   // Add Custom Traits to the tags list.
   $: {
      tags = [...inTags];
      for (const [idx] in $document.system.customTrait) {
         tags.push({
            id: $document.system.customTrait[idx].uuid,
            component: ItemSheetCustomTraitTag,
            props: {
               idx: idx
            }
         });
      }
   }
</script>

<div class="traits">
   <!--Edit Traits Button-->
   <div class="button">
      <IconLabelButton
         icon={EDIT_ICON}
         label={localize('editTraits')}
         on:click={() => {$document.system.editArmorTraits()}}
      />
   </div>

   <!--Add Custom Trait Button-->
   <div class="button">
      <IconLabelButton
         icon={CREATE_ICON}
         label={localize('addCustomTrait')}
         on:click={() => {$document.addCustomTrait()}}
      />
   </div>

   <!--Traits-->
   {#if tags.length > 0}
      <div class="tags" transition:slide|local>
         <TagContainer {tags}/>
      </div>
   {/if}
</div>

<style lang="scss">
   .traits {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      .button {
         @include flex-row;
         @include flex-group-center;

         margin-top: var(--titan-spacing-large);

         --titan-button-font-size: var(--titan-font-size-small);
         --titan-button-line-height: 20px;

         &:not(:first-child) {
            margin-left: var(--titan-spacing-standard);
         }
      }

      .tags {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
      }
   }
</style>
