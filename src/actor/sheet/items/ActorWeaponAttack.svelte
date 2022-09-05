<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import ActorWeaponAttackCheckLabel from "./ActorWeaponAttackCheckLabel.svelte";
   import StatTag from "~/helpers/svelte-components/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/Tag.svelte";

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
            efx={ripple}
            on:click={() => {
               application.rollAttackCheck(item._id, attackIdx);
            }}
         >
            <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
            {attack.name}
         </EfxButton>
      </div>
   </div>

   <!--Check Label-->
   <div class="check-label">
      <ActorWeaponAttackCheckLabel {attack} />
   </div>

   <!--Traits-->
   {#if attack.traits.length > 0}
      <div class="traits">
         <!--Each trait -->
         {#each attack.traits as trait}
            <div class="trait">
               {#if trait.type === "number"}
                  <StatTag label={localize(`LOCAL.${trait.name}.label`)} value={trait.value} />
               {:else}
                  <Tag label={localize(`LOCAL.${trait.name}.label`)} />
               {/if}
            </div>
         {/each}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

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
         flex-wrap: wrap;
         width: 100%;

         .trait {
            margin: 0.25rem;
         }
      }
   }
</style>
