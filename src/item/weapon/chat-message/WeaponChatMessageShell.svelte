<script>
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import WeaponChatAttackDescription from "./WeaponChatAttackDescription.svelte";
   import WeaponChatAttacks from "./WeaponChatAttacks.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatValue from "~/item/chat-message/ItemChatValue.svelte";
   import ItemChatRarity from "~/item/chat-message/ItemChatRarity.svelte";
</script>

<div class="weapon-chat-message">
   <ItemChatLabel />
   <div class="info-container">
      <div class="info">
         <ItemChatDescription />
      </div>
      <div class="info">
         <WeaponChatAttackDescription />
      </div>
      <div class="info">
         <WeaponChatAttacks />
      </div>
      <div class="info">
         <ItemChatFooter>
            <ItemChatValue />
            <ItemChatRarity />
         </ItemChatFooter>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";

   .weapon-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .info-container {
         width: 100%;
         .info {
            &:not(:first-child) {
               @include border-top;
            }
         }
      }
   }
</style>
