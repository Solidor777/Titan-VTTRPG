<script>
   import {getContext} from 'svelte';
   import CharacterSheetRating from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRating.svelte';
   import CharacterSheetRatingButton
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRatingButton.svelte';
   import {ACCURACY_ICON, AWARENESS_ICON, DEFENSE_ICON, INITIATIVE_ICON, MELEE_ICON} from '~/system/Icons.js';

   const document = getContext('document');
</script>

<div class="ratings">
   <!--Initiative-->
   <div class="rating">
      <CharacterSheetRatingButton
         icon={INITIATIVE_ICON}
         key={'initiative'}
         onClick={() => {
            $document.requestInitiativeRoll();
         }}
      />
   </div>

   <!--Awareness-->
   <div class="rating">
      <CharacterSheetRating icon={AWARENESS_ICON} key={'awareness'}/>
   </div>

   <!--Defense-->
   <div class="rating">
      <CharacterSheetRating icon={DEFENSE_ICON} key={'defense'}/>
   </div>

   <!--Melee-->
   <div class="rating">
      <CharacterSheetRating icon={MELEE_ICON} key={'melee'}/>
   </div>

   <!--Accuracy-->
   <div class="rating">
      <CharacterSheetRating icon={ACCURACY_ICON} key={'accuracy'}/>
   </div>
</div>

<style lang="scss">
   .ratings {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      .rating {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;

            margin-top: var(--titan-padding-standard);
            padding-top: var(--titan-padding-standard);
         }
      }
   }
</style>
