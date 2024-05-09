<script>
   import applyDamageToTargets from '~/helpers/utility-functions/ApplyDamageToTargets.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { OVERKILL_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type number Amount of Damage to apply. */
   export let damage = void 0;
</script>


<ChatMessageButton
   on:click={() =>applyDamageToTargets(damage, {ignoreArmor: true})}
   tooltip="{localize('applyOverkillDamage')}"
>
   <i class="{OVERKILL_ICON}"/>
   {localize('X%OverkillDamage').replace('X%', damage)}
</ChatMessageButton>
