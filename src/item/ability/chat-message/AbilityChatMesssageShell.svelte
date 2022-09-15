<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatRarity from "~/item/chat-message/ItemChatRarity.svelte";
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import Tag from "~/helpers/svelte-components/Tag.svelte";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="spell-chat-message">
   <ItemChatLabel />
   <div class="info-container">
      <div class="info">
         <ItemChatDescription />
      </div>

      <div class="info">
         <ItemChatFooter>
            <!--Action-->
            <div class="tag">
               <ItemChatRarity />
            </div>

            {#if chatContext.system.action}
               <div class="tag">
                  <Tag label={localize("LOCAL.action.label")} />
               </div>
            {/if}

            <!--Reaction-->
            {#if chatContext.system.reaction}
               <div class="tag">
                  <Tag label={localize("LOCAL.reaction.label")} />
               </div>
            {/if}

            <!--Passive-->
            {#if chatContext.system.passive}
               <div class="tag">
                  <Tag label={localize("LOCAL.passive.label")} />
               </div>
            {/if}
         </ItemChatFooter>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";

   .spell-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .info-container {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         .info {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;

            &:not(:first-child) {
               @include border-top;
            }

            &.top-padding {
               padding-top: 0.5rem;
            }

            .tag {
               margin: 0.25rem 0.5rem 0.25rem 0;
            }
         }
      }
   }
</style>
