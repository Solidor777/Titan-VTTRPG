<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import CharacterSheetItemToggleActiveButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemToggleActiveButton.svelte';

   /** @type {TitanItem} Reference to the Item document. */
   export let item = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;
</script>

<CharacterSheetItem {item} bind:isExpanded>
   <svelte:fragment slot="controls">
      <!--Duration-->
      {#if item.system.duration.type !== 'permanent'}
         {#if item.system.duration.type === 'initiative'}
            <!--Initiative-->
            <div class="field margin-right">
               <div class="label">
                  {localize('initiative')}
               </div>
               <div class="input">
                  <IntegerInput
                     min={0}
                     bind:value={item.system.duration.initiative}
                     onchange={() => {
                           item.update({
                              system: {
                                 duration: {
                                    initiative:
                                       item.system.duration.initiative,
                                 },
                              },
                           });
                        }}
                  />
               </div>
            </div>
         {/if}

         <div class="field">
            <div class="label">
               {item.system.duration.type === 'custom'
                  ? item.system.duration.custom
                  : localize('turns')}
            </div>

            <!--Duration input-->
            <div class="input">
               <IntegerIncrementInput
                  min={0}
                  bind:value={item.system.duration.remaining}
                  onchange={() => {
                        item.update({
                           system: {
                              duration: {
                                 remaining: item.system.duration.remaining,
                              },
                           },
                        });
                     }}
               />
            </div>
         </div>
      {:else}
         <!--Toggle Active Button-->
         <CharacterSheetItemToggleActiveButton {item}/>
      {/if}

      <!--Send to Chat button-->
      <div class="button">
         <CharacterSheetItemSendToChatButton {item}/>
      </div>

      <!--Edit Button-->
      <div class="button">
         <CharacterSheetItemEditButton {item}/>
      </div>

      <!--Delete Button-->
      <div class="button">
         <CharacterSheetItemDeleteButton itemId={item._id}/>
      </div>
   </svelte:fragment>

   <!--Item Checks-->
   {#if item.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks {item}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if item.system.description !== '' && item.system.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
      </div>
   {/if}

   <div class="section tags small-text">
      <!--Duration-->
      <div class="tag">
         <DurationTag
            type={item.system.duration.type}
            remaining={item.system.duration.remaining}
         />
      </div>

      <!--Expired-->
      {#if item.system.duration.type !== 'permanent' && item.system.duration.remaining <= 0}
         <div class="tag">
            <Tag>{localize('expired')}</Tag>
         </div>
      {/if}

      <!--Traits-->
      {#each item.system.customTrait as trait}
         <div class="tag">
            <Tag tooltip={trait.description}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</CharacterSheetItem>

<style lang="scss">
   .button:not(:first-child) {
      @include margin-left-standard;
   }

   .section {
      width: 100%;

      &:not(.rich-text) {
         @include padding-bottom-large;
      }

      &:not(.rich-text, .tags) {
         @include padding-top-large;
      }

      &:not(:first-child) {
         @include border-top;
      }

      &.tags {
         @include flex-row;
         @include flex-group-center;

         flex-wrap: wrap;

         .tag {
            @include tag-container-child-margin;
         }
      }

      &:not(.tags, .buttons) {
         @include flex-column;
         @include flex-group-top;
      }

      &.small-text {
         @include font-size-small;
      }
   }

   .field {
      @include flex-row;
      @include flex-group-center;

      &.margin-right {
         @include margin-right-standard;
      }

      .label {
         @include margin-right-standard;
      }

      .input {
         --titan-input-width: 32px;
      }
   }
</style>
