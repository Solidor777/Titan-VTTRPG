<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import { ATTACK_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/weapon/AttackTraits.js';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import {
      ACCURACY_ICON,
      DAMAGE_ICON,
      DICE_ICON,
      EXPERTISE_ICON,
      MELEE_ICON,
      RANGE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} CharacterSheetWeaponAttackProps
    * @property {TitanItem} [item] The Item this component belongs to.
    * @property {number} [attackIdx] The index of the attack in the attacks array.
    */

   /** @type {CharacterSheetWeaponAttackProps} */
   const { item = undefined, attackIdx = undefined } = $props();

   // Attack reference, read reactively through document.data (its identity changes on every update).
   /** @type {object} The current attack data. */
   const attack = $derived(document.data.items.get(item._id)?.system.attack[attackIdx]);

   /** @type {boolean} Whether this Weapon is multi attacking, read reactively through document.data. */
   const multiAttack = $derived(document.data.items.get(item._id)?.system.multiAttack);

   /** @type {boolean} Whether this Weapon is equipped, read reactively through document.data. */
   const equipped = $derived(document.data.items.get(item._id)?.system.equipped);

   // Calculate dice pool.
   /** @type {number} Calculated total dice pool for the attack. */
   let dicePool = $derived.by(() => {

      // Get base dice.
      let pool =
         document.data.system.attribute[attack.attribute].value +
         document.data.system.skill[attack.skill].training.value +
         document.data.system.getAttackCheckMod(
            'expertise',
            item,
            attack,
            multiAttack,
         );

      // Cut the dice in half if multi attacking.
      if (multiAttack) {
         // Round up or down, depending on the flurry trait.
         /** @type {boolean} Whether the flurry trait is active. */
         let flurry = false;
         for (const trait of attack.trait) {
            if (trait.name === flurry) {
               flurry = true;
            }
         }

         pool = flurry
            ? Math.ceil(pool * 0.5)
            : Math.floor(pool * 0.5);
      }

      return pool;
   });

   // Calculate expertise.
   /** @type {number} Calculated total expertise for the attack. */
   let expertise = $derived.by(() => {

      // Get base expertise.
      let exp =
         document.data.system.skill[attack.skill].expertise.value +
         document.data.system.getAttackCheckMod(
            'expertise',
            item,
            attack,
            multiAttack,
         );

      // Cut the expertise in half if multi attacking.
      if (multiAttack) {
         exp = Math.floor(exp * 0.5);
      }

      return exp;
   });

   /** @type {object} Descriptions of each attack trait. */
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

<div class="attack">
   <!--Header-->
   <div class="header {attack.attribute}">
      {#if equipped}
         <DocumentOwnerButton
            onclick={() =>
               document.data.system.requestAttackCheck({
                  itemId: item._id,
                  attackIdx: attackIdx,
               })}
         >
            <i
               class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            ></i>
            {attack.label}
         </DocumentOwnerButton>
      {:else}
         <div class="label">
            <i
               class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            ></i>
            <div>{attack.label}</div>
         </div>
      {/if}
   </div>

   <!--Check Label-->
   <div class="check-stats">
      <!--Dice-->
      <div class="stat">
         <IconStatTag
            icon={DICE_ICON}
            label={localize('dice')}
            value={dicePool}
         />
      </div>

      <!--Damage-->
      <div class="stat">
         <IconStatTag
            icon={DAMAGE_ICON}
            label={localize('damage')}
            value={`${
               attack.damage +
               document.data.system.getAttackCheckMod(
                  'damage',
                  item,
                  attack,
                  multiAttack,
               )
            }${
               attack.plusExtraSuccessDamage
                  ? ` + ${localize('extraSuccesses.short')}`
                  : ''
            }`}
         />
      </div>

      <!--Training-->
      {#if document.data.system.skill[attack.skill].training.value !== 0}
         <div class="stat">
            <IconStatTag
               label={localize('training')}
               value={document.data.system.skill[attack.skill].training.value}
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

      <!--Type-->
      <div class="stat">
         <IconTag
            icon={attack.type === 'melee' ? MELEE_ICON :  ACCURACY_ICON}
            label={localize(attack.type)}
         />
      </div>

      <!--Range-->
      {#if attack.range !== 1}
         <div class="stat">
            <IconStatTag
               label={localize('range')}
               value={attack.range}
               icon={RANGE_ICON}
            />
         </div>
      {/if}

      <!--Attribute and skill-->
      <div class="stat">
         <AttributeCheckTag
            attribute={attack.attribute}
            skill={attack.skill}
         />
      </div>

      <!--Traits-->
      {#each attack.trait as trait}
         <div class="stat">
            <TraitTag
               label={localize(trait.name)}
               value={trait.value}
               tooltip={traitDescriptions[trait.name]}
            />
         </div>
      {/each}

      <!--Custom Traits-->
      {#each attack.customTrait as trait}
         <div class="stat">
            <Tag tooltip={{ text: trait.description, localize: false }}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   .attack {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include attribute-button;

         height: 32px;

         .label {
            @include flex-row;
            @include flex-group-center;

            font-weight: bold;
         }

         i {
            @include margin-right-standard;
         }
      }

      .check-stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;

         width: 100%;
         flex-wrap: wrap;

         .stat {
            @include tag-container-child-margin;
         }
      }
   }
</style>
