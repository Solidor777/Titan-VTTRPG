<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';

   // Context references
   const document = getContext('DocumentStore');

   // Reference to the weapon id
   export let item = void 0;

   // Reference to the attack idx
   export let attackIdx = void 0;

   // Attack reference
   $: attack = item.system.attack[attackIdx];
</script>

<div class="attack">
   <!--Header-->
   <div class="header {attack.attribute}">
      {#if item.system.equipped}
         <EfxButton
            on:click={() =>
               $document.typeComponent.rollAttackCheck(
                  { itemId: item._id, attackIdx: attackIdx },
                  false
               )}
         >
            <i
               class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}"
            />
            {attack.label}
         </EfxButton>
      {:else}
         <div class="label">
            <i
               class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}"
            />
            <div>{attack.label}</div>
         </div>
      {/if}
   </div>

   <!--Check Label-->
   <div class="check-stats">
      <!--Dice-->
      <div class="stat">
         <IconStatTag
            label={localize('dice')}
            value={$document.system.attribute[attack.attribute].value +
               $document.system.skill[attack.skill].training.value}
            icon={'fas fa-dice-d6'}
         />
      </div>

      <!--Damage-->
      <div class="stat">
         <IconStatTag
            icon={'fas fa-burst'}
            label={localize('damage')}
            value={`${attack.damage}${
               attack.plusExtraSuccessDamage
                  ? ` + ${localize('extraSuccesses.short')}`
                  : ''
            }`}
         />
      </div>

      <!--Training-->
      {#if $document.system.skill[attack.skill].training.value !== 0}
         <div class="stat">
            <IconStatTag
               label={localize('training')}
               value={$document.system.skill[attack.skill].training.value}
               icon={'fas fa-dumbbell'}
            />
         </div>
      {/if}

      <!--Expertise-->
      {#if $document.system.skill[attack.skill].expertise.value !== 0}
         <div class="stat">
            <IconStatTag
               label={localize('expertise')}
               value={$document.system.skill[attack.skill].expertise.value}
               icon={'fas fa-graduation-cap'}
            />
         </div>
      {/if}

      <!--Type-->
      <div class="stat">
         <IconTag
            icon={attack.type === 'melee' ? 'fas fa-sword' : 'fas fa-bow-arrow'}
            label={localize(attack.type)}
         />
      </div>

      <!--Range-->
      {#if attack.range !== 1}
         <div class="stat">
            <IconStatTag
               label={localize('range')}
               value={attack.range}
               icon={'fas fa-ruler'}
            />
         </div>
      {/if}

      <!--Attribute and skill-->
      <div class="stat">
         <AttributeTag
            attribute={attack.attribute}
            label={`${localize(attack.attribute)} (${localize(attack.skill)})`}
         />
      </div>

      <!--Traits-->
      {#each attack.trait as trait}
         <div
            class="stat"
            use:tooltip={{ content: localize(`${trait.name}.desc`) }}
         >
            {#if trait.type === 'number'}
               <StatTag label={localize(trait.name)} value={trait.value} />
            {:else}
               <Tag label={localize(trait.name)} />
            {/if}
         </div>
      {/each}

      <!--Custom Traits-->
      {#each attack.customTrait as trait}
         <div class="stat" use:tooltip={{ content: trait.description }}>
            <Tag label={trait.name} />
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';

   .attack {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         height: 2rem;

         .label {
            @include flex-row;
            @include flex-group-center;
            font-weight: bold;
         }

         &.body {
            --button-background: var(--body-color);
         }

         &.mind {
            --button-background: var(--mind-color);
         }

         &.soul {
            --button-background: var(--soul-color);
         }

         i {
            margin-right: 0.25rem;
         }
      }

      .check-stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;
         width: 100%;
         flex-wrap: wrap;

         .stat {
            @include tag-margin;
         }
      }
   }
</style>
