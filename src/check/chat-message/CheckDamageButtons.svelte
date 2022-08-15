<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "../../helpers/svelte-components/EfxButton.svelte";
   const document = getContext("DocumentSheetObject");

   // Results
   let results = $document.flags.titan.data.chatContext.results;

   async function applyDamage(damage, ignoreArmor) {
      // Parse the damage data
      const damageData = {
         damage: damage,
         ignoreArmor: ignoreArmor,
      };

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
            await target.applyDamage(damageData);
         }
      }

      return;
   }
</script>

<div class="damage-buttons">
   <!--Apply damage button-->
   <div class="button" data-titan-tooltip={localize("LOCAL.applyDamage.label")}>
      <EfxButton
         efx={ripple}
         on:click={() => {
            applyDamage($document.flags.titan.data.chatContext.results.damage, false);
         }}><i class="fas fa-bolt" /></EfxButton
      >
   </div>

   <!--Apply damage ignore armor button-->
   <div class="button" data-titan-tooltip={localize("LOCAL.applyDamageIgnoreArmor.label")}>
      <EfxButton
         efx={ripple}
         on:click={() => {
            applyDamage($document.flags.titan.data.chatContext.results.damage, true);
         }}><i class="fas fa-shield-slash" /></EfxButton
      >
   </div>

   <!--Apply half damage button-->
   <div class="button" data-titan-tooltip={localize("LOCAL.applyDamageIgnoreArmor.label")}>
      <EfxButton
         efx={ripple}
         on:click={() => {
            applyDamage(Math.ceil($document.flags.titan.data.chatContext.results.damage / 2), false);
         }}><i class="fas fa-circle-half-stroke" /></EfxButton
      >
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .damage-buttons {
      @include flex-row;
      width: 100%;
      margin-top: 0.5rem;

      .button {
         padding: 0.2rem;
         box-sizing: border-box;
         width: 25%;
         --button-border-radius: 10px;
      }

      .fas {
         font-size: 1.5rem;
      }
   }
</style>
