<script>
   import { getContext, setContext } from 'svelte';
   import WeaponChatMessage from '~/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte';
   import ArmorChatMessage from '~/document/types/item/types/armor/chat-message/ArmorChatMessage.svelte';
   import SpellChatMessage from '~/document/types/item/types/spell/chat-message/SpellChatMessage.svelte';
   import AbilityChatMesssage from '~/document/types/item/types/ability/chat-message/AbilityChatMesssage.svelte';
   import EquipmentChatMessage from '~/document/types/item/types/equipment/chat-message/EquipmentChatMessage.svelte';
   import CommodityChatMessage from '~/document/types/item/types/commodity/chat-message/CommodityChatMessage.svelte';
   import EffectChatMessage from '~/document/types/item/types/effect/chat-message/EffectChatMessage.svelte';
   import ShieldChatMessage from '~/document/types/item/types/shield/chat-message/ShieldChatMessage.svelte';
   import AttributeCheckChatMessage from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte';
   import ResistanceCheckChatMessage
      from '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessage.svelte';
   import ItemCheckChatMessage from '~/check/types/item-check/chat-message/ItemCheckChatMessage.svelte';
   import CastingCheckChatMessage from '~/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte';
   import AttackCheckChatMessage from '~/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte';
   import PrivateRollChatMessage
      from '~/document/types/chat-message/components/messages/ChatMessagePrivateRollMessage.svelte';
   import DamageReportChatMessage
      from '~/document/types/chat-message/report/types/damage/DamageReportChatMessageShell.svelte';
   import HealingReportChatMessage
      from '~/document/types/chat-message/report/types/healing/HealingReportChatMessageShell.svelte';
   import SpendResolveReportChatMessage
      from '~/document/types/chat-message/report/types/spend-resolve/SpendResolveReportChatMessageShell.svelte';
   import RemoveCombatEffectsReportChatMessage
      from '~/document/types/chat-message/report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessage.svelte';
   import ShortRestReportChatMessage
      from '~/document/types/chat-message/report/types/short-rest-report/ShortRestReportChatMessage.svelte';
   import LongRestReportChatMessage
      from '~/document/types/chat-message/report/types/long-rest/LongRestReportChatMessage.svelte';
   import TurnStartReportChatMessage
      from '~/document/types/chat-message/report/types/turn-start/TurnStartReportChatMessage.svelte';
   import TurnEndReportChatMessage
      from '~/document/types/chat-message/report/types/turn-end/TurnEndReportChatMessage.svelte';
   import TurnStartRevertReportChatMessage
      from '~/document/types/chat-message/report/types/turn-start-revert/TurnStartRevertReportChatMessage.svelte';
   import TurnEndRevertReportChatMessage
      from '~/document/types/chat-message/report/types/turn-end-revert/TurnEndRevertReportChatMessage.svelte';
   import EffectsExpiredReportChatMessage
      from '~/document/types/chat-message/report/types/effects-expired/EffectsExpiredReportChatMessage.svelte';
   import RendReportChatMessage
      from '~/document/types/chat-message/report/types/rend/RendReportChatMessageShell.svelte';
   import RepairsReportChatMessageShell
      from '~/document/types/chat-message/report/types/repairs/RepairsReportChatMessageShell.svelte';

   /**
    * @typedef {object} ChatMessageShellProps
    * @property {import('~/document/reactive/ReactiveDocument.svelte.js').default} [documentStore] The reactive
    * Document store for this chat message.
    */

   /** @type {ChatMessageShellProps} */
   const { documentStore = void 0 } = $props();

   // These captures are intentional: documentStore is stable for this component's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('document', documentStore);

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Selects the correct chat message component based on the message type.
    * @returns {object | undefined} The Svelte component constructor for the current message type.
    */
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
            damageReport: DamageReportChatMessage,
            healingReport: HealingReportChatMessage,
            spendResolveReport: SpendResolveReportChatMessage,
            removeCombatEffectsReport: RemoveCombatEffectsReportChatMessage,
            shortRestReport: ShortRestReportChatMessage,
            longRestReport: LongRestReportChatMessage,
            turnStartReport: TurnStartReportChatMessage,
            turnEndReport: TurnEndReportChatMessage,
            turnStartRevertReport: TurnStartRevertReportChatMessage,
            turnEndRevertReport: TurnEndRevertReportChatMessage,
            effectsExpiredReport: EffectsExpiredReportChatMessage,
            rendReport: RendReportChatMessage,
            repairsReport: RepairsReportChatMessageShell,
         };
         return chatComponents[$document.flags.titan.type];
      }
      return PrivateRollChatMessage;
   }
</script>

{#if $document}
   {@const SelectedComponent = selectComponent()}
   {#if SelectedComponent}
      <div>
         <SelectedComponent/>
      </div>
   {/if}
{/if}
