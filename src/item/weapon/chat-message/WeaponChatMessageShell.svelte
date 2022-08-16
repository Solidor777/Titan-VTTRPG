<script>
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import WeaponChatAttackDescription from "./WeaponChatAttackDescription.svelte";
   import WeaponChatAttacks from "./WeaponChatAttacks.svelte";
</script>

<div class="weapon-chat-message">
   <ItemChatLabel />
   <ItemChatDescription />
   <WeaponChatAttackDescription />
   <WeaponChatAttacks />
   <ItemChatFooter />
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";

   .weapon-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }
</style>
