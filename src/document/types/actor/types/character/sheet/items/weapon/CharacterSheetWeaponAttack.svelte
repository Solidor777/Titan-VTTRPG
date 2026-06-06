<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import camelize from '~/helpers/utility-functions/Camelize.js';
   import pushUnique from '~/helpers/utility-functions/PushUnique.js';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import {
      ACCURACY_ICON,
      DICE_ICON,
      EXPERTISE_ICON,
      MELEE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetWeaponAttackProps
    * @property {number} [attackIdx] The index of the attack in the attacks array.
    */

   /** @type {CharacterSheetWeaponAttackProps} */
   const { attackIdx = undefined } = $props();

   /** @type {object} The embedded weapon bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {object|undefined} The current attack data, re-read reactively through the embedded bridge. */
   const attack = $derived(document.data?.system.attack[attackIdx]);

   /** @type {boolean|undefined} Whether this Weapon is multi attacking, read through the embedded bridge. */
   const multiAttack = $derived(document.data?.system.multiAttack);

   /** @type {boolean|undefined} Whether this Weapon is equipped, read through the embedded bridge. */
   const equipped = $derived(document.data?.system.equipped);

   /** @type {string[]} The attack's trait names, mirroring the engine's attack-trait extraction. */
   const attackTraitNames = $derived(attack ? attack.trait.map((trait) => trait.name) : []);

   /** @type {string[]} Unique camelized custom-trait names from the weapon then the attack (engine recipe). */
   const customTraitNames = $derived.by(() => {
      /** @type {string[]} The collected unique camelized names. */
      const names = [];
      for (const trait of document.data?.system.customTrait ?? []) {
         pushUnique(names, camelize(trait.name));
      }
      for (const trait of attack?.customTrait ?? []) {
         pushUnique(names, camelize(trait.name));
      }
      return names;
   });

   /**
    * Reads the actor's conditional check modifier for one aspect of this attack, mirroring the engine
    * call shape used by initializeAttackCheckOptions.
    * @param {string} modifierType - The modifier type to read ('dice' | 'expertise' | 'damage').
    * @returns {number} The modifier for this aspect of the attack check.
    */
   function getCheckMod(modifierType) {
      return sheetDocument.data.system.getAttackCheckMod(
         modifierType,
         attack.attribute,
         attack.skill,
         multiAttack,
         attack.type,
         attackTraitNames,
         customTraitNames,
      );
   }

   /** @type {number} Actor-derived damage modifier added to the displayed attack damage. */
   const damageMod = $derived(getCheckMod('damage'));

   // Calculate dice pool.
   /** @type {number} Calculated total dice pool for the attack. */
   let dicePool = $derived.by(() => {

      // Get base dice.
      let pool =
         sheetDocument.data.system.attribute[attack.attribute].value +
         sheetDocument.data.system.skill[attack.skill].training.value +
         getCheckMod('dice');

      // Cut the dice in half if multi attacking.
      if (multiAttack) {
         // Round up or down, depending on the flurry trait.
         /** @type {boolean} Whether the flurry trait is active. */
         let flurry = false;
         for (const trait of attack.trait) {
            if (trait.name === 'flurry') {
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
         sheetDocument.data.system.skill[attack.skill].expertise.value +
         getCheckMod('expertise');

      // Cut the expertise in half if multi attacking.
      if (multiAttack) {
         exp = Math.floor(exp * 0.5);
      }

      return exp;
   });
</script>

<div class="attack">
   <!--Header-->
   <div class="header {attack.attribute}">
      {#if equipped}
         <DocumentOwnerButton
            onclick={() =>
               sheetDocument.data.system.requestAttackCheck({
                  itemId: document.data._id,
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

      <!--Training-->
      {#if sheetDocument.data.system.skill[attack.skill].training.value !== 0}
         <div class="stat">
            <IconStatTag
               icon={TRAINING_ICON}
               label={localize('training')}
               value={sheetDocument.data.system.skill[attack.skill].training.value}
            />
         </div>
      {/if}

      <!--Expertise-->
      {#if expertise !== 0}
         <div class="stat">
            <IconStatTag
               icon={EXPERTISE_ICON}
               label={localize('expertise')}
               value={expertise}
            />
         </div>
      {/if}

      <!--Intrinsic attack tags (shared component; damage carries the actor-derived modifier)-->
      <AttackTags
         {damageMod}
         idx={attackIdx}
      />
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
