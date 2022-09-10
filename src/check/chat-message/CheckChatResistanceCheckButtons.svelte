<script>
   import { getContext } from "svelte";
   import ResistanceCheckButton from "~/helpers/svelte-components/ResistanceCheckButton.svelte";

   // Results
   const document = getContext("DocumentSheetObject");
   $: results = $document.flags.titan.chatContext.results;
   $: complexity = results.extraSuccesses ? 1 + results.extraSuccesses : 1;
</script>

<div class="buttons">
   <!--Reflexes-->
   {#if results.reflexesCheck}
      <div class="button">
         <ResistanceCheckButton resistance={"reflexes"} difficulty={4} {complexity} />
      </div>
   {/if}

   <!--Resilience-->
   {#if results.resilienceCheck}
      <div class="button">
         <ResistanceCheckButton resistance={"resilience"} difficulty={4} {complexity} />
      </div>
   {/if}

   <!--Willpower-->
   {#if results.willpowerCheck}
      <div class="button">
         <ResistanceCheckButton resistance={"willpower"} difficulty={4} {complexity} />
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .buttons {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;

      .button {
         padding: 0.2rem;
         box-sizing: border-box;
         --button-border-radius: 10px;
      }
   }
</style>
