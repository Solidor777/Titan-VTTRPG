<script>
   import CheckLabel from "./components/CheckLabel.svelte";
   import CheckDiceContainer from "./components/CheckDiceContainer.svelte";
   import CheckResults from "./components/CheckResults.svelte";
</script>

<div class="check-chat-message">
   <CheckLabel />
   <CheckDiceContainer />
   <CheckResults />
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   @import "../../styles/Variables.scss";

   .check-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }
</style>
