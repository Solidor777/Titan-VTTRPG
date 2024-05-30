<script>
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import {RESOLVE_ICON} from '~/system/Icons.js';
   import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';

   export let item = void 0;

   const autoSpendResolve = getSetting('autoSpendResolveChecks');

   /**
    * Calculates the formatted text showing a Check's Attribute, Skill, Difficulty, and Complexity.
    * @param {ItemCheckTemplate} check - The Check to get the text for.
    * @returns {string} The formatted text showing a Check's Attribute, Skill, Difficulty, and Complexity.
    */
   function calculateCheckDCText(check) {

      // Start with the Attribute of the check
      let retVal = localize(`${check.attribute}`);

      // Add the Skill if appropriate
      if (check.skill !== 'none') {
         retVal += ` (${localize(check.skill)})`;
      }

      // Add the Difficulty of the check
      retVal += ` ${check.difficulty}`;

      // Add the Complexity if appropriate
      if (check.complexity) {
         retVal += `:${check.complexity}`;
      }

      return retVal;
   }

   /**
    * Rolls a Check from the Item's roll data.
    * @param {ItemCheckTemplate} idx - The idx of the Check in the Item's check array.
    */
   async function rollItemCheck(idx) {

      // For each controlled character
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Roll the check
         await actor.system.requestItemCheck({
            itemRollData: item,
            checkIdx: idx
         });
      }
   }

   /**
    * Spends the Resolve necessary to perform the Check.
    * @param {number} resolveSpent - Amount of Resolve to spend.
    */
   async function spendResolve(resolveSpent) {

      // For each controlled character
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Spend the resolve
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
                     on:click={() => rollItemCheck(idx)}
                  />
               </div>
            {:else}
               <!--Item Check Button-->
               <div class="button">
                  <ItemCheckButton
                     label={check.label}
                     attribute={check.attribute}
                     on:click={() => rollItemCheck(idx)}
                  />
               </div>

               <!--Resolve Cost Button-->
               <div class="button">
                  <SpendResolveButton
                     cost={check.resolveCost}
                     on:click={() => spendResolve(check.resolveCost)}
                  />
               </div>
            {/if}
         {:else}
            <!--Check Button-->
            <div class="button">
               <ItemCheckButton {check} on:click={() => rollItemCheck(idx)}/>
            </div>
         {/if}

         <div class="tags">
            <!--Main Check Stats -->
            <div class="tag">
               <AttributeTag
                  label={calculateCheckDCText(check)}
                  attribute={check.attribute}
               />
            </div>

            <!--DC-->
            <div class="stat label"/>

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
                  <OpposedCheckTag opposedCheck={check.opposedCheck}/>
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

            margin-top: var(--titan-padding-large);
            padding-top: var(--titan-padding-large);
         }

         .button {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               margin-top: var(--titan-padding-large);
            }
         }

         .tags {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;

            flex-wrap: wrap;

            .tag {
               margin: var(--titan-padding-large) var(--titan-padding-standard) 0 var(--titan-padding-standard);
            }
         }
      }
   }
</style>
