<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Document reference
   const document = getContext("DocumentStore");

   async function applyDamage(damage, ignoreArmor) {
      // Get the targets
      let userTargets = Array.from(game.user.targets);
      if (userTargets.length < 1) {
         userTargets = Array.from(canvas.tokens.controlled);
      }

      // For each target
      for (let idx = 0; idx < userTargets.length; idx++) {
         // If the target is valid
         const target = userTargets[idx]?.actor;
         if (target && target.system.resource?.stamina) {
            // Apply damage to the target
            await target.typeComponent.applyDamage(damage, ignoreArmor);
         }
      }

      return;
   }

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
         if (target && target.system.resource?.stamina) {
            // Apply damage to the target
            await target.typeComponent.healDamage(healing);
         }
      }

      return;
   }
</script>

<div class="damage-buttons">
   <!--Apply damage button-->
   <div class="button" data-tooltip={localize("applyDamage")}>
      <EfxButton
         on:click={() => {
            applyDamage($document.flags.titan.chatContext.results.damage, false);
         }}><i class="fas fa-burst" /></EfxButton
      >
   </div>

   <!--Apply damage ignore armor button-->
   <div class="button" data-tooltip={localize("applyDamageIgnoreArmor")}>
      <EfxButton
         on:click={() => {
            applyDamage($document.flags.titan.chatContext.results.damage, true);
         }}><i class="fas fa-shield-slash" /></EfxButton
      >
   </div>

   <!--Apply half damage button-->
   <div class="button" data-tooltip={localize("applyHalfDamage")}>
      <EfxButton
         on:click={() => {
            applyDamage(Math.ceil($document.flags.titan.chatContext.results.damage / 2), false);
         }}><i class="fas fa-heart-half-stroke" /></EfxButton
      >
   </div>

   <!--Apply healing button-->
   <div class="button" data-tooltip={localize("healDamage")}>
      <EfxButton
         on:click={() => {
            healDamage($document.flags.titan.chatContext.results.damage);
         }}><i class="fas fa-heart" /></EfxButton
      >
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .damage-buttons {
      @include flex-row;
      width: 100%;

      .button {
         @include flex-row;
         width: 100%;
         --button-border-radius: 10px;

         &:not(:first-child) {
            padding-left: 0.25rem;
         }

         &:not(:last-child) {
            padding-right: 0.25rem;
         }
      }

      .fas {
         @include font-size-extra-large;
      }
   }
</style>
