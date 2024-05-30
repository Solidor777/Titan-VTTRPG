<script>
   import ResistanceCheckButton from '~/helpers/svelte-components/button/ResistanceCheckButton.svelte';
   import {getContext} from 'svelte';

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type number Calculated Complexity of the Resistance checks. */
   const complexity = $document.flags.titan.results.extraSuccesses + 1;
</script>

<div class="buttons">
   <!--Reflexes-->
   {#if $document.flags.titan.parameters.reflexesCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'reflexes'}
            {complexity}
         />
      </div>
   {/if}

   <!--Resilience-->
   {#if $document.flags.titan.parameters.resilienceCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'resilience'}
            {complexity}
         />
      </div>
   {/if}

   <!--Willpower-->
   {#if $document.flags.titan.parameters.willpowerCheck}
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
         @include tag-margin;

         --titan-button-border-radius: var(--titan-button-chat-message-border-radius);
      }
   }
</style>
