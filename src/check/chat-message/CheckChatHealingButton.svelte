<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   const document = getContext("DocumentSheetObject");

   // Results
   let results = $document.flags.titan.chatContext.results;

   async function healDamage(healing) {
      // Get the targets
      let userTargets = Array.from(game.user.targets);
      if (userTargets.length < 1) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      // For each target
      for (let idx = 0; idx < userTargets.length; idx++) {
         // If the target is valid
         const target = userTargets[idx]?.actor;
         if (target) {
            // Apply damage to the target
            await target.healDamage(healing);
         }
      }

      return;
   }
</script>

<!--Apply healing button-->
<div class="healing-button" data-titan-tooltip={localize("LOCAL.recoverStamina.label")}>
   <EfxButton
      on:click={() => {
         healDamage(results.healing);
      }}
   >
      <i class="fas fa-heart" />
      {`${localize("LOCAL.recoverStamina.label")} (${results.healing})`}
   </EfxButton>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .healing-button {
      @include flex-row;
      width: 100%;
      --button-border-radius: 10px;
      font-size: 1rem;
   }
</style>
