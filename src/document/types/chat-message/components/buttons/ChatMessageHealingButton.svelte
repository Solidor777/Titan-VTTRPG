<script>
   import applyHealingToTargets from '~/helpers/utility-functions/ApplyHealingToTargets.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { HEALING_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type integer Amount of Healing to apply. */
   export let healing = void 0;
</script>

<ChatMessageButton on:click={() => applyHealingToTargets(healing)} tooltip="{localize('applyHealing')}">
   <i class="{HEALING_ICON}"/>
   {localize('healX%Damage').replace('X%', healing)}
</ChatMessageButton>
