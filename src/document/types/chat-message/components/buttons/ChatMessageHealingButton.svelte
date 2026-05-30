<script>
   import applyHealingToTargets from '~/helpers/utility-functions/ApplyHealingToTargets.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { HEALING_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /**
    * @typedef {object} ChatMessageHealingButtonProps
    * @property {number} [healing] Amount of Healing to apply.
    */

   /** @type {ChatMessageHealingButtonProps} */
   const { healing = void 0 } = $props();
</script>

<ChatMessageButton onclick={() => applyHealingToTargets(healing)} tooltip={localize('applyHealing')}>
   <i class={HEALING_ICON}></i>
   {localize('healX%Damage').replace('X%', healing)}
</ChatMessageButton>
