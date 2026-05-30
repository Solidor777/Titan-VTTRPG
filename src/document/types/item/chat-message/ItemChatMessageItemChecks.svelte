<script>
   import autoSpendResolveChecks from '~/helpers/Settings/AutoSpendResolveChecks.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import { RESOLVE_ICON } from '~/system/Icons.js';
   import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /**
    * @typedef {object} ItemChatMessageItemChecksProps
    * @property {object} [item] - The titan flags data for the item.
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
               <ItemCheckButton {check} onclick={() => rollItemCheck(idx)}/>
            </div>
         {/if}

         <div class="tags">
            <!--Main Check Stats -->
            <div class="tag">
               <AttributeCheckTag
                  attribute={check.attribute}
                  difficulty={check.difficulty}
                  complexity={check.complexity}
                  skill={check.skill}
               />
            </div>

            <!--DC-->
            <div class="stat label"></div>

            <!--Resolve Cost-->
            {#if check.resolveCost > 0}
               <div class="tag">
                  <IconStatTag
                     label={localize('resolveCost')}
                     value={check.resolveCost}
                     icon={RESOLVE_ICON}
                  />
               </div>
            {/if}

            <!--Resistance Check-->
            {#if check.resistanceCheck !== 'none'}
               <div class="tag">
                  <ResistedByTag resistance={check.resistanceCheck}/>
               </div>
            {/if}

            <!--Opposed Check-->
            {#if check.opposedCheck.enabled}
               <div class="tag">
                  <OpposedCheckTag
                     attribute={check.opposedCheck.attribute}
                     skill={check.opposedCheck.skill}
                  />
               </div>
            {/if}
         </div>
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

         .tags {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;

            flex-wrap: wrap;

            .tag {
               margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 var(--titan-spacing-standard);
            }
         }
      }
   }
</style>
