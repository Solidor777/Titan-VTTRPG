<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { CREATE_ICON, EDIT_ICON } from '~/system/Icons.js';
   import ItemSheetCustomTraitTag from '~/document/types/item/sheet/ItemSheetCustomTraitTag.svelte';
   import TagContainer from '~/helpers/svelte-components/tag/TagContainer.svelte';
   import { slide } from 'svelte/transition';
   import IconLabelButton from '~/helpers/svelte-components/button/IconLabelButton.svelte';

   /**
    * @typedef {object} ItemSheetSidebarTraitsProps
    * @property {object[]} [itemTypeTraits] An optional input array of traits converted into Tags.
    * @property {Function | undefined} [editTraits] An optional function to start editing item-type specific traits.
    */

   /** @type {ItemSheetSidebarTraitsProps} */
   const { itemTypeTraits = [], editTraits = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * The complete list of traits converted into tags.
    * @type {object[]}
    */
   const tags = $derived.by(() => {
      const result = [...itemTypeTraits];
      for (let idx = 0; idx < document.data.system.customTrait.length; idx++) {
         result.push({
            id: document.data.system.customTrait[idx].uuid,
            component: ItemSheetCustomTraitTag,
            props: {
               idx: idx
            }
         });
      }
      return result;
   });
</script>

<div class="traits">
   {#if editTraits}
      <!--Edit Traits Button-->
      <div class="button">
         <IconLabelButton
            icon={EDIT_ICON}
            label={localize('editTraits')}
            onclick={() => {editTraits()}}
         />
      </div>
   {/if}

   <!--Add Custom Trait Button-->
   <div class="button">
      <IconLabelButton
         icon={CREATE_ICON}
         label={'addCustomTrait'}
         onclick={() => {document.data.addCustomTrait()}}
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
         @include margin-top-large;

         --titan-button-font-size: var(--titan-font-size-small);
         --titan-button-line-height: 20px;

         &:not(:first-child) {
            @include margin-left-standard;
         }
      }

      .tags {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
      }
   }
</style>
