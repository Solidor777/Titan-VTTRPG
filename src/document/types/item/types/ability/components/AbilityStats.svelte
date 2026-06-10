<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded ability or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The ability's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {boolean} Whether the ability is an Action, read reactively through the document bridge. */
   const action = $derived(document.data?.system.action);

   /** @type {boolean} Whether the ability is a Reaction, read reactively through the document bridge. */
   const reaction = $derived(document.data?.system.reaction);

   /** @type {boolean} Whether the ability is Passive, read reactively through the document bridge. */
   const passive = $derived(document.data?.system.passive);

   /** @type {number} The ability's XP cost, read reactively through the document bridge. */
   const xpCost = $derived(document.data?.system.xpCost);

   /** @type {Array<object>} The ability's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Action-->
   {#if action}
      <div class="stat">
         <Tag>{localize('action')}</Tag>
      </div>
   {/if}

   <!--Reaction-->
   {#if reaction}
      <div class="stat">
         <Tag>{localize('reaction')}</Tag>
      </div>
   {/if}

   <!--Passive-->
   {#if passive}
      <div class="stat">
         <Tag>{localize('passive')}</Tag>
      </div>
   {/if}

   <!--XP Cost-->
   {#if xpCost}
      <div class="stat">
         <StatTag
            label={localize('xpCost')}
            value={xpCost}
         />
      </div>
   {/if}

   <!--Custom Traits-->
   {#each customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
