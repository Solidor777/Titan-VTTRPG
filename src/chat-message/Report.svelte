<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Document reference
   const document = getContext('DocumentStore');

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
            await target.typeComponent.healDamage(healing, true);
         }
      }

      return;
   }
</script>

<!--Apply healing button-->
<div
   class="healing-button"
   use:tooltip={{ content: localize('recoverStamina') }}
>
   <EfxButton
      on:click={() => {
         healDamage($document.flags.titan.chatContext.results.healing);
      }}
   >
      <i class="fas fa-heart" />
      {`${localize('recoverStamina')} (${
         $document.flags.titan.chatContext.results.healing
      })`}
   </EfxButton>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

   .healing-button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: 10px;
   }
</style>
