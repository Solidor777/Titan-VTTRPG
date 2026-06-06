<script>
   import { getContext } from 'svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetItemExpandButtonProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    * @property {string|false} [name] Optional override for the name text.
    */

   /** @type {CharacterSheetItemExpandButtonProps} */
   let { isExpanded = $bindable(undefined), name = false } = $props();

   /** @type {object} The embedded document bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<div class="button">
   <DocumentOwnerButton
      onclick={() => {
         if (document.doc && !document.doc.isMarkedForDeletion) {
            isExpanded = !isExpanded;
         }
      }}
   >
      <div class="button-inner">
         <!--Name-->
         <div class="name">{name === false ? document.data?.name : name}</div>

         <!--Icon-->
         <i class={isExpanded ? EXPANDED_ICON : COLLAPSED_ICON}></i>
      </div>
   </DocumentOwnerButton>
</div>

<style lang="scss">
   .button {
      @include flex-row;
      @include margin-right-large;

      .button-inner {
         @include flex-row;
         @include flex-space-between;

         .name {
            @include flex-row;
            @include flex-group-center;

            flex-wrap: wrap;
            width: 100%;
         }

         i {
            width: 20px;

            @include margin-left-standard;
         }
      }
   }
</style>
