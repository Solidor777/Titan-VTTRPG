<script>

   import CharacterSheetEffectCheck
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte';

   /**
    * @typedef {object} CharacterSheetEffectChecksProps
    * @property {TitanActiveEffect} [effect] Reference to the effect Active Effect document.
    */

   /** @type {CharacterSheetEffectChecksProps} */
   const { effect = undefined } = $props();
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each effect.system.check as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetEffectCheck effectId={effect.id} {checkIdx}/>
      </div>
   {/each}

</div>

<style lang="scss">
   .checks {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .check {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-standard;
            @include padding-top-standard;
         }
      }
   }
</style>
