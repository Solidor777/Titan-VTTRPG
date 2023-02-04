<script>
   import ResistanceCheckButton from '~/helpers/svelte-components/button/ResistanceCheckButton.svelte';
   import { getContext } from 'svelte';

   // Document reference
   const document = getContext('DocumentStore');

   $: complexity = $document.flags.titan.chatContext.results.extraSuccesses + 1;
</script>

<div class="buttons">
   <!--Reflexes-->
   {#if $document.flags.titan.chatContext.results.reflexesCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'reflexes'}
            difficulty={4}
            {complexity}
         />
      </div>
   {/if}

   <!--Resilience-->
   {#if $document.flags.titan.chatContext.results.resilienceCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'resilience'}
            difficulty={4}
            {complexity}
         />
      </div>
   {/if}

   <!--Willpower-->
   {#if $document.flags.titan.chatContext.results.willpowerCheck}
      <div class="button">
         <ResistanceCheckButton
            resistance={'willpower'}
            difficulty={4}
            {complexity}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .buttons {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;

      .button {
         @include tag-margin;
         --button-border-radius: 10px;
      }
   }
</style>
