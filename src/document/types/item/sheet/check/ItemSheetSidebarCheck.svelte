<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { DICE_ICON } from '~/system/Icons.js';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';
   import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';
   import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';

   /**
    * @typedef {object} ItemSheetSidebarCheckProps
    * @property {number} [idx] Index of the Check in the item's system data.
    */

   /** @type {ItemSheetSidebarCheckProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

{#if document.data?.system.check[idx]}
   <div class="check">
      <!--Label (color-coded to the check's attribute)-->
      <div class="label {document.data.system.check[idx].attribute}">

         <!--Name-->
         <div class="name">
            <IconLabel
               icon={DICE_ICON}
               label={{
                  text: document.data.system.check[idx].label,
                  localize: false,
               }}
            />
         </div>
      </div>

      <!--Expand Button-->
      <!--Function binding: a freshly added check renders before the state array grows, so the read
      falls back to the seeded default (expanded) instead of binding undefined.-->
      <ExpandButton
         bind:expanded={
            () => $appState.sidebar.checks.isExpanded[idx] ?? true,
            (value) => $appState.sidebar.checks.isExpanded[idx] = value
         }
      />

      <!--Check tags (shared component)-->
      {#if $appState.sidebar.checks.isExpanded[idx]}
         <div class="stats" transition:slide|local>
            <CheckTags {idx}/>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .label {
         @include bordered-label;
         @include flex-column;
         @include flex-group-top;
         @include attribute-colors;
      }

      .stats {
         @include border-bottom;
         @include flex-row;
         @include flex-group-center;
         @include padding-standard;

         width: 100%;
      }
   }
</style>
