<script>
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import ItemCheck from '~/check/types/item-check/ItemCheck.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import ItemCheckResolveButton from '~/helpers/svelte-components/button/ItemCheckResolveButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import {RESOLVE_ICON} from '~/system/Icons.js';
   import getControlledCharacters from "~/helpers/utility-functions/GetControlledCharacters.js";

   export let item = void 0;

   const autoSpendResolve = getSetting('autoSpendResolveChecks');

   /**
    * @param check
    */
   function getTagFromCheck(check) {
      let retVal = localize(`${check.attribute}`);
      if (check.skill && check.skill !== 'none') {
         retVal += ` (${localize(check.skill)})`;
      }
      retVal += ` ${check.difficulty}`;
      if (check.complexity) {
         retVal += `:${check.complexity}`;
      }

      return retVal;
   }

   /**
    * @param idx
    */
   async function rollItemCheck(idx) {
      const controlledCharacters = getControlledCharacters();
      if (controlledCharacters.length > 0) {
         // Initial roll data
         const itemRollData = item.system;
         itemRollData.name = item.name;
         itemRollData.img = item.img;

         // Roll for each controlled token
         for (const actor of controlledCharacters) {
            // Get the actor roll data
            const actorRollData = actor.system.getRollData();

            // Get a new item check
            const itemCheck = new ItemCheck({
               actorRollData: actorRollData,
               itemRollData: itemRollData,
               checkIdx: idx,
            });

            if (itemCheck.isValid) {
               // Spend resolve if appropriate
               if (
                  itemCheck.parameters.resolveCost &&
                  autoSpendResolve
               ) {
                  await actor.system.spendResolve(
                     itemCheck.parameters.resolveCost,
                     {playSound: false},
                  );
               }
               await itemCheck.evaluateCheck();
               await itemCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({actor: actor}),
                  rollMode: game.settings.get('core', 'rollMode'),
               });
            }
         }
      }
   }

   /**
    * @param resolveToSpend
    */
   async function spendResolve(resolveToSpend) {
      // Get controlled tokens
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {
         actor.system.spendResolve(resolveToSpend);
      }
   }
</script>

<ol>
   <!--Each check-->
   {#each item.system.check as check, idx}
      <li>
         <!--Header-->

         {#if check.resolveCost}
            {#if autoSpendResolve}
               <!--Combined Item Check and Spend Resolve button-->
               <div class="button">
                  <ItemCheckResolveButton
                     {check}
                     on:click={async () => {
                        rollItemCheck(idx);
                     }}
                  />
               </div>
            {:else}
               <!--Item Check Button-->
               <div class="button">
                  <ItemCheckButton
                     {check}
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
                  label={getTagFromCheck(check)}
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
            margin-top: var(--padding-large);
            padding-top: var(--padding-large);
         }

         .button {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               margin-top: var(--padding-large);
            }
         }

         .tags {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;
            flex-wrap: wrap;

            .tag {
               margin: var(--padding-large) var(--padding-standard) 0 var(--padding-standard);
            }
         }
      }
   }
</style>
