<script>
   import CheckLabel from "./components/CheckLabel.svelte";
   import CheckDiceContainer from "./components/CheckDiceContainer.svelte";
   import CheckResults from "./components/CheckResults.svelte";

   // Context object
   export let chatContext = void 0;
</script>

<div class="check-chat-message">
   <div class="label {chatContext.parameters.resistance}">
      <CheckLabel label={chatContext.label} typeLabel={chatContext.typeLabel} />
   </div>
   <CheckDiceContainer dice={chatContext.results.dice} />
   <CheckResults results={chatContext.results} />
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   @import "../../styles/Variables.scss";

   .check-chat-message {
      .label {
         &.reflexes {
            --color-label: var(--color-reflexes-bright);
         }
         &.resilience {
            --color-label: var(--color-resilience-bright);
         }
         &.willpower {
            --color-label: var(--color-willpower-bright);
         }
      }
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }
</style>
