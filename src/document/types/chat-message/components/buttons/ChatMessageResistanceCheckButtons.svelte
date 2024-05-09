<script>
   import ResistanceCheckButton from '~/helpers/svelte-components/button/ResistanceCheckButton.svelte';

   export let reflexes = false;
   export let resilience = false;
   export let willpower = false;
   export let difficulty = 4;
   export let complexity = 1;
   export let damageToReduce = 0;
</script>

<div class="buttons">
   <!--Reflexes-->
   {#if reflexes}
      <div class="button">
         <ResistanceCheckButton
            resistance={'reflexes'}
            {difficulty}
            {complexity}
            {damageToReduce}
         />
      </div>
   {/if}

   <!--Resilience-->
   {#if resilience}
      <div class="button">
         <ResistanceCheckButton
            resistance={'resilience'}
            {difficulty}
            {complexity}
            {damageToReduce}
         />
      </div>
   {/if}

   <!--Willpower-->
   {#if willpower}
      <div class="button">
         <ResistanceCheckButton
            resistance={'willpower'}
            {difficulty}
            {complexity}
            {damageToReduce}
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
         --button-border-radius: var(--button-chat-message-border-radius);
      }
   }
</style>
