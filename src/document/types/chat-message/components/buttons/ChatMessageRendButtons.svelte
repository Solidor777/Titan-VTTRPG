<script>
   import applyRendToTargets from '~/helpers/utility-functions/ApplyRendToTargets.js';
   import applyRepairsToTargets from '~/helpers/utility-functions/ApplyRepairsToTarget.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { REND_ICON, REPAIR_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /**
    * @typedef {object} ChatMessageRendButtonsProps
    * @property {number} [rend] Amount of Rend to apply.
    * @property {boolean} [magical] Whether the attack inflicting the Rend is Magical.
    */

   /** @type {ChatMessageRendButtonsProps} */
   const { rend = void 0, magical = false } = $props();
</script>

<div class="damage-buttons">
   <!--Apply Rend button-->
   <div class="button">
      <ChatMessageButton
         onclick={() => applyRendToTargets(rend, { magical })}
         tooltip={localize('rendArmor')}
      >
         <i class={REND_ICON}/>
         <div><Text text="rend"/></div>
      </ChatMessageButton>
   </div>

   <!--Repair Rend button-->
   <div class="button">
      <ChatMessageButton
         onclick={() => applyRepairsToTargets(rend)}
         tooltip={localize('repairArmor')}
      >
         <i class={REPAIR_ICON}/>
         <div><Text text="repair"/></div>
      </ChatMessageButton>
   </div>
</div>

<style lang="scss">
   .damage-buttons {
      @include flex-row;

      width: 100%;

      .button {
         @include flex-row;

         width: 100%;

         --titan-button-border-radius: var(--titan-button-border-radius);

         &:not(:first-child) {
            @include padding-left-standard;
         }

         &:not(:last-child) {
            @include padding-right-standard;
         }
      }

      .fas {
         @include font-size-extra-large;
         @include margin-right-standard;
      }
   }
</style>
