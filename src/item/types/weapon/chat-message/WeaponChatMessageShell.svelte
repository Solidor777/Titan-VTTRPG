<script>
   import { getContext } from "svelte";
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import WeaponChatAttacks from "./WeaponChatAttacks.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatValue from "~/item/chat-message/ItemChatValue.svelte";
   import ItemChatRarity from "~/item/chat-message/ItemChatRarity.svelte";
   import RichText from "../../../../helpers/svelte-components/RichText.svelte";
   import RarityTag from "../../../../helpers/svelte-components/tag/RarityTag.svelte";
   import ValueTag from "../../../../helpers/svelte-components/tag/ValueTag.svelte";
   import ItemChatChecks from "../../../chat-message/ItemChatChecks.svelte";

   // Chat context reference
   const document = getContext("DocumentStore");
   const item = $document.flags.titan.chatContext;
</script>

<div class="chat-message">
   <!--Header-->
   <ItemChatLabel />
   <div class="sections">
      <!--Attacks-->
      <div class="section">
         <WeaponChatAttacks />
      </div>

      <!--Attack Notes-->
      {#if item.system.attackNotes !== "" && item.system.attackNotes !== "<p></p>"}
         <div class="section rich-text">
            <RichText text={item.system.attackNotes} />
         </div>
      {/if}

      <!--Description-->
      {#if item.system.description !== "" && item.system.description !== "<p></p>"}
         <div class="section rich-text">
            <RichText text={item.system.description} />
         </div>
      {/if}

      <!--Checks-->
      {#if item.system.check.length > 0}
         <div class="section">
            <ItemChatChecks />
         </div>
      {/if}

      <!--Footer-->
      <div class="section space-evenly small-text">
         <RarityTag rarity={item.system.rarity} />
         <ValueTag value={item.system.value} />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../styles/Mixins.scss";
   @import "../../../../styles/Variables.scss";

   .chat-message {
      @include flex-column;
      @include font-size-normal;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .sections {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         .section {
            width: 100%;

            &:not(.rich-text) {
               padding: 0.5rem 0 0.5rem;
            }

            &:not(:first-child) {
               @include border-top;
            }

            &.space-evenly {
               @include flex-row;
               @include flex-space-evenly;
            }

            &:not(.space-evenly) {
               @include flex-column;
               @include flex-group-top;
            }

            &.small-text {
               @include font-size-small;
            }
         }
      }
   }
</style>
