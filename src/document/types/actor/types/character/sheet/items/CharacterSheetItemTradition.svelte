<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} CharacterSheetItemTraditionProps
    * @property {TitanItem} [item] Reference to the item.
    */

   /** @type {CharacterSheetItemTraditionProps} */
   const { item = undefined } = $props();

   /** @type {object} Reactive bridge to the parent document; descendants read live data via `data`. */
   const document = getContext('document');

   /** @type {string} Spell tradition, re-read reactively through the document store. */
   let tradition = $derived(document.data.items.get(item._id)?.system.tradition);
</script>

<!--Tradition-->
<div class="tradition">
   <!--Label-->
   <div class="label">
      {localize('tradition')}:
   </div>

   <!--Value-->
   <div class="value">
      {tradition}
   </div>
</div>

<style lang="scss">
   .tradition {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include padding-standard;

      background: var(--titan-tag-background);

      .label {
         @include margin-right-standard;
      }
   }
</style>
