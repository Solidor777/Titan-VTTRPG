<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import EffectTrayRow from '~/sidebar/tray/EffectTrayRow.svelte';

   /** @type {object} The reactive tray state from context. */
   const trayState = getContext('trayState');

   // The lowercased search term, computed once per filter change rather than per element.
   /** @type {string} The lowercased search filter text. */
   const search = $derived(trayState.filter.toLowerCase());

   // The effects of the selected pack, filtered by the search text and sorted by name.
   /** @type {object[]} The filtered, sorted effects to display. */
   const filtered = $derived(
      trayState.effects
         .filter((effect) => effect.name.toLowerCase().includes(search))
         .sort((a, b) => a.name.localeCompare(b.name)),
   );
</script>

{#if trayState.compendiums.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-no-packs"
   >
      {localize('effectTrayNoPacks')}
   </p>
{:else if filtered.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-empty"
   >
      {localize('effectTrayEmpty')}
   </p>
{:else}
   <ol
      class="effect-tray-list"
      data-testid="effect-tray-list"
   >
      {#each filtered as effect (effect.id)}
         <li>
            <EffectTrayRow {effect} />
         </li>
      {/each}
   </ol>
{/if}

<style lang="scss">
   .effect-tray-empty {
      @include padding-standard;

      width: 100%;
      text-align: center;
      opacity: 0.75;
   }

   .effect-tray-list {
      @include flex-column;
      @include flex-group-top;
      @include list;

      width: 100%;
      overflow-y: auto;
      list-style: none;

      li {
         @include flex-row;
         @include flex-space-between;

         width: 100%;

         &:not(:first-child) {
            @include margin-top-standard;
         }
      }
   }
</style>
