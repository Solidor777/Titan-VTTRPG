<script>
   import applyDamageToTargets from '~/helpers/utility-functions/ApplyDamageToTargets.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { OVERKILL_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /**
    * @typedef {object} ChatMessageOverkillDamageButtonProps
    * @property {number} [damage] Amount of Damage to apply.
    */

   /** @type {ChatMessageOverkillDamageButtonProps} */
   const { damage = void 0 } = $props();
</script>

<ChatMessageButton
   onclick={() => applyDamageToTargets(damage, { ignoreArmor: true })}
   tooltip={'applyOverkillDamage'}
>
   <i class={OVERKILL_ICON}></i>
   {localize('X%OverkillDamage').replace('X%', damage)}
</ChatMessageButton>
