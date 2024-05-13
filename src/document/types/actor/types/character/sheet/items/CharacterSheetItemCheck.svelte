<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import ItemCheckResolveButton from '~/helpers/svelte-components/button/ItemCheckResolveButton.svelte';
   import {DICE_ICON, EXPERTISE_ICON, SPEND_RESOLVE_ICON, TRAINING_ICON} from '~/system/Icons.js';

   // Reference to the docuement
   const document = getContext('document');

   // Reference to the item
   export let item = void 0;

   // The idx of the check
   export let checkIdx = void 0;

   const autoSpendResolve = getSetting('autoSpendResolveChecks');

   /** @type {string} The ID of the item. */
   $: check = item.system.check[checkIdx];

   function rollItemCheck() {
      return $document.system.requestItemCheck(
         {itemId: item._id, checkIdx: checkIdx},
      );
   }

   async function spendResolve() {
      return await $document.system.spendResolve(check.resolveCost);
   }

   // Calculate dice pool
   let dicePool = 0;
   $: {
      dicePool =
         $document.system.attribute[check.attribute].value +
         (check.skill && check.skill !== 'none'
            ? $document.system.skill[check.skill].training.value
            : 0) +
         $document.system.getItemCheckMod('dice', item, check);
   }

   // Calculate expertise
   let expertise = 0;
   $: {
      expertise =
         (check.skill && check.skill !== 'none'
            ? $document.system.skill[check.skill].expertise.value
            : 0) +
         $document.system.getItemCheckMod('expertise', item, check);
   }
</script>

<!--Check-->
{#if check}
   <div class="check">
      <!--Buttons-->
      <div class="buttons">
         {#if check.resolveCost}
            {#if autoSpendResolve}
               <!--Combined Item Check and Spend Resolve button-->
               <ItemCheckResolveButton
                  {check}
                  on:click={async () => rollItemCheck()}
               />
            {:else}
               <!--Item Check Button-->
               <div>
                  <ItemCheckButton {check} on:click={() => rollItemCheck()}/>
               </div>

               <!--Resolve Cost Button-->
               <div class="resolve-cost-button">
                  <SpendResolveButton
                     cost={check.resolveCost}
                     on:click={spendResolve}
                  />
               </div>
            {/if}
         {:else}
            <!--Check Button-->
            <ItemCheckButton {check} on:click={() => rollItemCheck()}/>
         {/if}
      </div>

      <div class="stats">
         <!--Attribute and skill-->
         <div class="stat">
            <AttributeTag
               attribute={check.attribute}
               label={`${localize(check.attribute)} (${localize(
                  check.skill,
               )}) ${check.difficulty}:${check.complexity}`}
            />
         </div>

         <!--Dice-->
         <div class="stat">
            <IconStatTag
               label={localize('dice')}
               value={dicePool}
               icon={DICE_ICON}
            />
         </div>

         <!--Training-->
         {#if check.skill && check.skill !== 'none' && $document.system.skill[check.skill].training.value !== 0}
            <div class="stat">
               <IconStatTag
                  label={localize('training')}
                  value={$document.system.skill[check.skill].training.value}
                  icon={TRAINING_ICON}
               />
            </div>
         {/if}

         <!--Expertise-->
         {#if expertise !== 0}
            <div class="stat">
               <IconStatTag
                  label={localize('expertise')}
                  value={expertise}
                  icon={EXPERTISE_ICON}
               />
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if check.resolveCost > 0}
            <div class="stat">
               <IconStatTag
                  label={localize('resolveCost')}
                  value={check.resolveCost}
                  icon={SPEND_RESOLVE_ICON}
               />
            </div>
         {/if}

         <!--Resistance Check-->
         {#if check.resistanceCheck !== 'none'}
            <div class="stat">
               <ResistedByTag resistance={check.resistanceCheck}/>
            </div>
         {/if}

         <!--Opposed Check-->
         {#if check.opposedCheck.enabled}
            <div class="stat">
               <OpposedCheckTag opposedCheck={check.opposedCheck}/>
            </div>
         {/if}
      </div>
   </div>
{/if}

<style lang="scss">
   .check {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .buttons {
         @include flex-row;

         .resolve-cost-button {
            margin-left: var(--padding-large);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;
         flex-wrap: wrap;

         .stat {
            @include tag-margin;
         }
      }
   }
</style>
