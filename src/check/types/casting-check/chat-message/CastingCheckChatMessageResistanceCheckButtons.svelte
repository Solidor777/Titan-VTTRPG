<script>
   import ResistanceCheckButton from '~/helpers/svelte-components/button/ResistanceCheckButton.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {number} Calculated Complexity of the Resistance checks. */
   const complexity = $derived(document.data.flags.titan.results.extraSuccesses + 1);
</script>

<div class="buttons">
   <!--Reflexes-->
   {#if document.data.flags.titan.parameters.reflexesCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'reflexes'}
            {complexity}
         />
      </div>
   {/if}

   <!--Resilience-->
   {#if document.data.flags.titan.parameters.resilienceCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'resilience'}
            {complexity}
         />
      </div>
   {/if}

   <!--Willpower-->
   {#if document.data.flags.titan.parameters.willpowerCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'willpower'}
            {complexity}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .buttons {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      flex-wrap: wrap;

      .button {
         @include tag-container-child-margin;

         --titan-button-border-radius: var(--titan-button-border-radius);
      }
   }
</style>
