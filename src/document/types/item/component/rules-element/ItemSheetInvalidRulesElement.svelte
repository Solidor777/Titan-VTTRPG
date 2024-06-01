<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {DELETE_ICON} from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
   export let idx = void 0;
   export let element = void 0;

</script>

{#if element && element.operation === 'flatModifier'}
   <div class="element" transition:slide|local>
      <!--Element Operation-->
      <div class="title">
         {localize('invalidRulesElement')}
      </div>

      <!--Delete Element-->
      <div class="delete-button">
         <IconButton
            icon={DELETE_ICON}
            on:click={() => {
               $document.system.removeRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   .element {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-1;

      width: 100%;
      height: 100%;

      .title {
         @include flex-row;
         @include flex-group-left;

         flex-wrap: wrap;
         width: 100%;
         margin: 0 var(--titan-padding-standard) 0 var(--titan-padding-standard);
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;

         height: 100%;
         margin: var(--titan-padding-large) var(--titan-padding-standard) 0 0;
      }
   }
</style>
