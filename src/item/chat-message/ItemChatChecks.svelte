<script>
   import { localize, getSetting } from '~/helpers/Utility.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import TitanItemCheck from '~/check/types/item-check/ItemCheck.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import ItemCheckResolveButton from '~/helpers/svelte-components/button/ItemCheckResolveButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';

   export let item = void 0;

   const autoSpendResolve = getSetting('autoSpendResolveChecks');

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

   async function rollItemCheck(idx) {
      const controlledTokens = Array.from(canvas.tokens.controlled);
      if (controlledTokens.length > 0) {
         // Initial roll data
         const itemRollData = item.system;
         itemRollData.name = item.name;
         itemRollData.img = item.img;

         // Roll for each controlled token
         for (
            let tokenIdx = 0;
            tokenIdx < controlledTokens.length;
            tokenIdx++
         ) {
            // If the target is valid
            const actor = controlledTokens[tokenIdx]?.actor;
            if (actor && actor.system.resource?.stamina) {
               // Get the actor roll data
               const actorRollData = actor.getRollData();

               // Get a new item check
               const itemCheck = new TitanItemCheck({
                  actorRollData: actorRollData,
                  itemRollData: itemRollData,
                  checkIdx: idx,
               });

               if (itemCheck.isValid) {
                  // Spend resolve if appropriate
                  if (
                     itemCheck.parameters.resolveCost &&
                     autoSpendResolve &&
                     actor.character
                  ) {
                     await actor.character.spendResolve(
                        itemCheck.parameters.resolveCost,
                        true,
                        false
                     );
                  }
                  await itemCheck.evaluateCheck();
                  await itemCheck.sendToChat({
                     user: game.user.id,
                     speaker: ChatMessage.getSpeaker({ actor: actor }),
                     rollMode: game.settings.get('core', 'rollMode'),
                  });
               }
            }
         }
      }
   }

   async function spendResolve(resolveToSpend) {
      // Get controlled tokens
      const controlledTokens = Array.from(canvas.tokens.controlled);
      if (controlledTokens.length > 0) {
         for (
            let tokenIdx = 0;
            tokenIdx < controlledTokens.length;
            tokenIdx++
         ) {
            // If the target is valid
            const character = controlledTokens[tokenIdx]?.actor?.character;
            if (character) {
               character.spendResolve(resolveToSpend, true, true);
            }
         }
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
               <ItemCheckButton {check} on:click={() => rollItemCheck(idx)} />
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
            <div class="stat label" />

            <!--Resolve Cost-->
            {#if check.resolveCost > 0}
               <div class="tag">
                  <IconStatTag
                     label={localize('resolveCost')}
                     value={check.resolveCost}
                     icon={'fas fa-bolt'}
                  />
               </div>
            {/if}

            <!--Resistance Check-->
            {#if check.resistanceCheck !== 'none'}
               <div class="tag">
                  <ResistedByTag resistance={check.resistanceCheck} />
               </div>
            {/if}

            <!--Opposed Check-->
            {#if check.opposedCheck.enabled}
               <div class="tag">
                  <OpposedCheckTag opposedCheck={check.opposedCheck} />
               </div>
            {/if}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import '../../Styles/Mixins.scss';

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
            margin-top: 0.5rem;
            padding-top: 0.5rem;
         }

         .button {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }
         }

         .tags {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;
            flex-wrap: wrap;

            .tag {
               margin: 0.5rem 0.25rem 0 0.25rem;
            }
         }
      }
   }
</style>
