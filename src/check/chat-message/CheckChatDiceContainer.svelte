<script>
   import CheckChatDie from "./CheckChatDie.svelte";

   // Check reference
   export let dice = void 0;
</script>

<div class="container">
   <!--For each dice-->
   {#each dice as die, idx}
      <!-- svelte-ignore missing-declaration -->
      <div class="dice">
         <CheckChatDie {idx} />
      </div>
   {/each}
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
   }
</style>
