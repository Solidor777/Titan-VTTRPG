<script>
   import autoSpendResolveChecks from '~/helpers/Settings/AutoSpendResolveChecks.js';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';
   import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';

   /**
    * @typedef {object} ItemChatMessageItemChecksProps
    * @property {object} [item] - The chat-message system snapshot (`document.data.system`) for the item.
    */

   /** @type {ItemChatMessageItemChecksProps} */
   const { item = void 0 } = $props();

   /** @type {boolean} Whether to automatically spend Resolve when rolling checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /**
    * Rolls a Check from the Item's roll data.
    * @param {number} idx - The index of the Check in the Item's check array.
    * @returns {Promise<void>}
    */
   async function rollItemCheck(idx) {

      // For each controlled character.
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Roll the check.
         await actor.system.requestItemCheck({
            itemRollData: item,
            checkIdx: idx
         });
      }
   }

   /**
    * Spends the Resolve necessary to perform the Check.
    * @param {number} resolveSpent - Amount of Resolve to spend.
    * @returns {Promise<void>}
    */
   async function spendResolve(resolveSpent) {

      // For each controlled character.
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Spend the resolve.
         await actor.system.spendResolve(resolveSpent);
      }
   }
</script>

<ol>
   <!--Each check-->
   {#each item.check as check, idx}
      <li>
         <!--Header-->
         {#if check.resolveCost}
            {#if autoSpendResolve}
               <!--Combined Item Check and Spend Resolve button-->
               <div class="button">
                  <ItemCheckButton
                     label={check.label}
                     attribute={check.attribute}
                     resolveCost={check.resolveCost}
                     onclick={() => rollItemCheck(idx)}
                  />
               </div>
            {:else}
               <!--Item Check Button-->
               <div class="button">
                  <ItemCheckButton
                     label={check.label}
                     attribute={check.attribute}
                     onclick={() => rollItemCheck(idx)}
                  />
               </div>

               <!--Resolve Cost Button-->
               <div class="button">
                  <SpendResolveButton
                     resolveCost={check.resolveCost}
                     onclick={() => spendResolve(check.resolveCost)}
                  />
               </div>
            {/if}
         {:else}
            <!--Check Button-->
            <div class="button">
               <ItemCheckButton
                  label={check.label}
                  attribute={check.attribute}
                  onclick={() => rollItemCheck(idx)}
               />
            </div>
         {/if}

         <!--Intrinsic check tags (shared component; config attribute — chat cards have no actor context)-->
         <CheckTags {idx}/>
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;

      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-large;
            @include padding-top-large;
         }

         .button {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               @include margin-top-large;
            }
         }
      }
   }
</style>
