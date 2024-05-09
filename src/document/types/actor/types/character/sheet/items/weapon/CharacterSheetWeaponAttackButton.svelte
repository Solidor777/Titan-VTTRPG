<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { getContext } from 'svelte';
   import { ACCURACY_ICON, DICE_ICON, EXPERTISE_ICON, MELEE_ICON } from '~/system/Icons.js';

   // Reference to the docuement
   const document = getContext('document');

   // Check
   export let item = void 0;
   export let attack = void 0;

   // Calculate dice pool
   let dicePool = 0;
   $: {
      // Get base dice
      dicePool =
         $document.system.attribute[attack.attribute].value +
         $document.system.skill[attack.skill].training.value +
         $document.system.getAttackCheckMod(
            'expertise',
            item,
            attack,
            item.system.multiAttack,
         );

      // Cut the dice in half if multi attacking
      if (item.system.multiAtta) {
         // Round up or down, depending on the flurry trait
         let flurry = false;
         for (const trait of attack.trait) {
            if (trait.name === flurry) {
               flurry = true;
            }
         }

         dicePool = flurry
            ? Math.ceil(dicePool * 0.5)
            : Math.floor(dicePool * 0.5);
      }
   }

   // Calculate expertise
   let expertise = 0;
   $: {
      // Get base expertise
      expertise =
         $document.system.skill[attack.skill].expertise.value +
         $document.system.getAttackCheckMod(
            'expertise',
            item,
            attack,
            item.system.multiAttack,
         );

      // Cut the expertise in half if multi attacking
      if (item.system.multiAttack) {
         expertise = Math.floor(expertise * 0.5);
      }
   }
</script>

<div class="button {attack.attribute}">
   <Button on:click>
      <div class="button-inner">
         <i class="{attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}"/>
         <!--Pool-->
         <div class="pool">
            <i class="{DICE_ICON}"/>
            {dicePool}
         </div>

         <!--Expertise-->
         {#if expertise !== 0}
            <div class="expertise">
               <i class="{EXPERTISE_ICON}"/>
               {expertise}
            </div>
         {/if}
      </div>
   </Button>
</div>

<style lang="scss">
   .button {
      @include flex-row;

      &.body {
         --button-background: var(--body-color);
      }

      &.mind {
         --button-background: var(--mind-color);
      }

      &.soul {
         --button-background: var(--soul-color);
      }

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         line-height: normal;
         padding: var(--padding-standard);
         @include font-size-normal;

         i {
            margin-right: var(--padding-standard);
         }

         .pool {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            @include border-color-button;
            padding-left: var(--padding-standard);
            margin-left: var(--padding-standard);
         }

         .expertise {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            @include border-color-button;
            padding-left: var(--padding-standard);
            margin-left: var(--padding-standard);
         }
      }
   }
</style>
