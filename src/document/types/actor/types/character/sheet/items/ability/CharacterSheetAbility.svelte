<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';

   /** @type {TitanItem} Reference to the Item document. */
   export let item = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;
</script>

<CharacterSheetItem {item} bind:isExpanded>
   <svelte:fragment slot="controls">
      <!--Check-->
      {#if item.system.check.length > 0}
         <div class="button">
            <CharacterSheetCondensedItemCheckButton itemId={item._id}/>
         </div>
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
   {#if !(isHTMLBlank(item.system.description))}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
      </div>
   {/if}

   <!--Footer-->
   <div class="section tags small-text">
      <!--Rarity-->
      <div class="tag">
         <RarityTag rarity={item.system.rarity}/>
      </div>

      <!--Action-->
      {#if item.system.action}
         <div class="tag">
            <Tag>{localize('action')}</Tag>
         </div>
      {/if}

      <!--Reaction-->
      {#if item.system.reaction}
         <div class="tag">
            <Tag>{localize('reaction')}</Tag>
         </div>
      {/if}

      <!--Passive-->
      {#if item.system.passive}
         <div class="tag">
            <Tag>{localize('passive')}</Tag>
         </div>
      {/if}

      <!--XP Cost-->
      {#if item.system.xpCost}
         <div class="tag">
            <StatTag
               label={localize('xpCost')}
               value={item.system.xpCost}
            />
         </div>
      {/if}

      <!--Custom Traits-->
      {#each item.system.customTrait as trait}
         <div class="tag">
            <Tag tooltip={trait.description}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</CharacterSheetItem>
