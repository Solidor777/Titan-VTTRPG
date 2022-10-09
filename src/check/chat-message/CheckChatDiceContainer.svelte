<script>
   import { getContext } from "svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import CheckChatDie from "./CheckChatDie.svelte";

   const document = getContext("DocumentStore");
</script>

<div class="container">
   <!--For each dice-->
   {#each $document.flags.titan.chatContext.results.dice as die, idx}
      <!-- svelte-ignore missing-declaration -->
      <div class="dice">
         <CheckChatDie {idx} />
      </div>
   {/each}

   {#if $document.flags.titan.chatContext.parameters.totalExpertise > 0}
      <div class="reset">
         <IconButton
            icon="fas fa-arrow-rotate-left"
            on:click={() => {
               console.log("click");
            }}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .container {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;

      .dice {
         @include tag-margin;
      }

      .reset {
         @include tag-margin;
      }
   }
</style>
