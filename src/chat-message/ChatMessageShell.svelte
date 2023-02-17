<svelte:options accessors={true} />

<script>
   import { setContext } from 'svelte';
   import { getContext } from 'svelte';
   import WeaponChatMessage from '~/item/types/weapon/chat-message/WeaponChatMessage.svelte';
   import ArmorChatMessage from '~/item/types/armor/chat-message/ArmorChatMessage.svelte';
   import SpellChatMessage from '~/item/types/spell/chat-message/SpellChatMessage.svelte';
   import AbilityChatMesssage from '~/item/types/ability/chat-message/AbilityChatMesssage.svelte';
   import EquipmentChatMessage from '~/item/types/equipment/chat-message/EquipmentChatMessage.svelte';
   import CommodityChatMessage from '~/item/types/commodity/chat-message/CommodityChatMessage.svelte';
   import EffectChatMessage from '~/item/types/effect/chat-message/EffectChatMessage.svelte';
   import ShieldChatMessage from '~/item/types/shield/chat-message/ShieldChatMessage.svelte';
   import AttributeCheckChatMessage from '~/check/types/attribute-check/AttributeCheckChatMessage.svelte';
   import ResistanceCheckChatMessage from '~/check/types/resistance-check/ResistanceCheckChatMessage.svelte';
   import ItemCheckChatMessage from '~/check/types/item-check/ItemCheckChatMessage.svelte';
   import CastingCheckChatMessage from '~/check/types/casting-check/CastingCheckChatMessage.svelte';
   import AttackCheckChatMessage from '~/check/types/attack-check/AttackCheckChatMessage.svelte';
   import PrivateRollChatMessage from '~/chat-message/PrivateRollChatMessage.svelte';
   import TurnReportChatMessage from '~/chat-message/report/TurnReportChatMessage.svelte';
   import DamageReportChatMessage from '~/chat-message/report/DamageReportChatMessage.svelte';
   import HealingReportChatMessage from '~/chat-message/report/HealingReportChatMessage.svelte';
   import SpendResolveReportChatMessage from '~/chat-message/report/SpendResolveReportChatMessage.svelte';
   import RemoveCombatEffectsReportChatMessage from '~/chat-message/report/RemoveCombatEffectsReportChatMessage.svelte';
   import ShortRestReportChatMessage from '~/chat-message/report/ShortRestReportChatMessage.svelte';
   import LongRestReportChatMessage from '~/chat-message/report/LongRestReportChatMessage.svelte';
   import TurnStartReportChatMessage from '~/chat-message/report/TurnStartReportChatMessage.svelte';
   import TurnEndReportChatMessage from '~/chat-message/report/TurnEndReportChatMessage.svelte';

   // Context object
   export let documentStore = void 0;

   // Setup
   setContext('DocumentStore', documentStore);
   const document = getContext('DocumentStore');

   // Selector for the chat message type
   function selectComponent() {
      if (game.user.isGM || !$document.blind) {
         const chatComponents = {
            attributeCheck: AttributeCheckChatMessage,
            resistanceCheck: ResistanceCheckChatMessage,
            attackCheck: AttackCheckChatMessage,
            castingCheck: CastingCheckChatMessage,
            itemCheck: ItemCheckChatMessage,
            armor: ArmorChatMessage,
            ability: AbilityChatMesssage,
            commodity: CommodityChatMessage,
            equipment: EquipmentChatMessage,
            effect: EffectChatMessage,
            shield: ShieldChatMessage,
            spell: SpellChatMessage,
            weapon: WeaponChatMessage,
            turnReport: TurnReportChatMessage,
            damageReport: DamageReportChatMessage,
            healingReport: HealingReportChatMessage,
            spendResolveReport: SpendResolveReportChatMessage,
            removeCombatEffectsReport: RemoveCombatEffectsReportChatMessage,
            shortRestReport: ShortRestReportChatMessage,
            longRestReport: LongRestReportChatMessage,
            turnStartReport: TurnStartReportChatMessage,
            turnEndReport: TurnEndReportChatMessage,
         };
         return chatComponents[$document.flags.titan.chatContext.type];
      }
      return PrivateRollChatMessage;
   }
</script>

<div>
   {#if $document}
      <svelte:component this={selectComponent()} />
   {/if}
</div>
