<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import CharacterWeaponAttackCheckLabel from "./CharacterWeaponAttackCheckLabel.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon id
   export let item = void 0;

   // Reference to the attack idx
   export let attackIdx = void 0;

   // Attack reference
   $: attack = item.system.attack[attackIdx];
</script>

<div class="attack">
   <div class="row header">
      <!--Attack Button-->
      <div class="attack-button">
         <EfxButton
            on:click={() => {
               application.rollAttackCheck(item._id, attackIdx);
            }}
         >
            <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
            {attack.label}
         </EfxButton>
      </div>
   </div>

   <!--Check Label-->
   <div class="check-label">
      <CharacterWeaponAttackCheckLabel {attack} />
   </div>

   <!--Traits-->
   {#if attack.trait.length > 0}
      <div class="traits">
         <!--Each trait -->
         {#each attack.trait as trait}
            <div class="trait">
               {#if trait.type === "number"}
                  <StatTag label={localize(`${trait.name}`)} value={trait.value} />
               {:else}
                  <Tag label={localize(`${trait.name}`)} />
               {/if}
            </div>
         {/each}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .attack {
      @include flex-column;
      @include flex-group-center;
      width: 100%;

      .check-label {
         margin-top: 0.5rem;
      }

      .traits {
         @include flex-row;
         @include flex-space-evenly;
         margin-top: 0.5rem;
         flex-wrap: wrap;
         width: 100%;

         .trait {
            margin: 0.25rem;
         }
      }
   }
</style>
