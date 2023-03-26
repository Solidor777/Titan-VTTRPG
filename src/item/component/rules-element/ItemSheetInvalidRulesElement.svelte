<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
   export let idx = void 0;
   export let element = void 0;

   // Setup tabs
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
            icon={'fas fa-trash'}
            on:click={() => {
               $document.typeComponent.removeRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

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
         margin-bottom: 0.5rem;
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         margin: 0.5rem 0.25rem 0 0;
      }
   }
</style>
