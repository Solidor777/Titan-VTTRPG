<script>
   import { getContext } from 'svelte';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import DocumentNameInput from '~/document/svelte-components/input/DocumentNameInput.svelte';

   /**
    * @typedef {object} ItemSheetHeaderProps
    * @property {import('svelte').Snippet} [children] Optional secondary stats content rendered inside the header.
    */

   /** @type {ItemSheetHeaderProps} */
   const { children } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<!--Header-->
<div class="header">
   <!--Portrait-->
   <div class="portrait">
      <DocumentImagePicker alt={'item portrait'} bind:value={document.data.img}/>
   </div>

   <!--Name and Stats-->
   <div class="label-stats">
      <div class="name">
         <DocumentNameInput/>
      </div>

      <!--Secondary Stats-->
      <div class="secondary-stats">
         {@render children?.()}
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include flex-row;
      @include flex-group-left;
      @include panel-1;

      width: 100%;
      padding: var(--titan-spacing-standard) var(--titan-spacing-large);

      .portrait {
         width: 80px;

         --titan-border-style: none;
      }

      .label-stats {
         @include flex-column;
         @include flex-group-top-left;

         width: calc(100% - 88px);

         @include margin-left-large;

         .name {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
         }

         .secondary-stats {
            @include flex-row;
            @include flex-group-left;
            @include margin-top-large;

            width: 100%;
         }
      }
   }
</style>
