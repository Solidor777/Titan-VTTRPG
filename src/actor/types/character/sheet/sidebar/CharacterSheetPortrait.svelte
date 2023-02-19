<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import DocumentImagePicker from '~/documents/components/DocumentImagePicker.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   const document = getContext('DocumentStore');
</script>

<div class="portrait">
   <div class="image">
      <DocumentImagePicker path={'img'} alt={'character portrait'} />
   </div>
   <!--Take a long Rest Button-->
   <div
      class="button long-rest"
      use:tooltip={{ content: localize('longRest') }}
   >
      <IconButton
         icon={'fas fa-bed'}
         on:click={() => {
            $document.typeComponent.longRest(true);
         }}
      />
   </div>

   <!--Take a Short rest Button-->
   <div
      class="button short-rest"
      use:tooltip={{ content: localize('shortRest') }}
   >
      <IconButton
         icon={'fas fa-face-exhaling'}
         on:click={() => {
            $document.typeComponent.shortRest(true);
         }}
      />
   </div>

   <!--Reset Temp Effects button-->
   <div
      class="button clear"
      use:tooltip={{ content: localize('removeCombatEffects') }}
   >
      <IconButton
         icon={'fas fa-arrow-rotate-left'}
         on:click={() => {
            $document.typeComponent.removeCombatEffects(true);
         }}
      />
   </div>

   <!--Spend Resolve button-->
   <div
      class="button resolve"
      use:tooltip={{ content: localize('spendResolve') }}
   >
      <IconButton
         icon={'fas fa-bolt'}
         on:click={() => {
            $document.typeComponent.spendResolve(1, true);
         }}
      />
   </div>
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .portrait {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      position: relative;

      .image {
         width: 10rem;
         --border-style: none;
      }

      .button {
         position: absolute;

         &.long-rest {
            top: 0;
            left: 0;
         }

         &.short-rest {
            top: 0;
            right: 0;
         }

         &.clear {
            bottom: 0;
            left: 0;
         }

         &.resolve {
            bottom: 0;
            right: 0;
         }
      }
   }
</style>
