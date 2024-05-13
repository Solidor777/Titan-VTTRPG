<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {COLLAPSED_ICON, EXPANDED_ICON} from '~/system/Icons.js';

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;

   // Item
   export let item = void 0;

   // Optional override for the name teext
   export let name = false;
</script>

<div class="button">
   <Button
      on:click={() => isExpanded = !isExpanded}
   >
      <div class="button-inner">
         <!--Name-->
         <div class="name">{name === false ? item.name : name}</div>

         <!--Icon-->
         <i
            class="{isExpanded ? EXPANDED_ICON : COLLAPSED_ICON}"
         />
      </div>
   </Button>
</div>

<style lang="scss">
   .button {
      @include flex-row;
      margin-right: var(--padding-large);

      .button-inner {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         height: 100%;

         .name {
            @include flex-row;
            @include flex-group-center;
            padding: var(--padding-standard) 0;
            flex-wrap: wrap;
            width: 100%;
            line-height: normal;
         }

         i {
            width: 20px;
            margin-left: var(--padding-standard);
         }
      }
   }
</style>
