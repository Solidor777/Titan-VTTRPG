<script>
   import applyRendToTargets from '~/helpers/utility-functions/ApplyRendToTargets.js';
   import applyRepairsToTargets from '~/helpers/utility-functions/ApplyRepairsToTarget.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {REND_ICON, REPAIR_ICON} from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type integer Amount of Rend to apply. */
   export let rend = void 0;

   /** @type boolean Whether the attack inflicting the Rend is Magical. */
   export let magical = false;
</script>

<div class="damage-buttons">
   <!--Apply Rend button-->
   <div class="button">
      <ChatMessageButton
         on:click={() => applyRendToTargets(rend, {magical: magical})}
         tooltip="{localize('rendArmor')}"
      >
         <i class="{REND_ICON}"/>
         <div>{localize('rend')}</div>
      </ChatMessageButton>
   </div>

   <!--Repair Rend button-->
   <div class="button">
      <ChatMessageButton
         on:click={() => applyRepairsToTargets(rend)}
         tooltip="{localize('repairArmor')}"
      >
         <i class="{REPAIR_ICON}"/>
         <div>{localize('repair')}</div>
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

         --titan-button-border-radius: var(--titan-button-chat-message-border-radius);

         &:not(:first-child) {
            padding-left: var(--titan-padding-standard);
         }

         &:not(:last-child) {
            padding-right: var(--titan-padding-standard);
         }
      }

      .fas {
         @include font-size-extra-large;

         margin-right: var(--titan-padding-standard);
      }
   }
</style>
