<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import DocumentImagePicker from '~/document/components/DocumentImagePicker.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {LONG_REST_ICON, REMOVE_TEMP_EFFECTS_ICON, SHORT_REST_ICON, SPEND_RESOLVE_ICON} from '~/system/Icons.js';

   const document = getContext('document');
</script>

<div class="portrait">
   <div class="image">
      <DocumentImagePicker alt={'character portrait'} path={'img'}/>
   </div>
   <!--Take a long Rest Button-->
   <div
      class="button long-rest"
      use:tooltip={{ content: localize('longRest.desc') }}
   >
      <IconButton
         icon={LONG_REST_ICON}
         on:click={() => {
            $document.system.longRest();
         }}
      />
   </div>

   <!--Take a Short rest Button-->
   <div
      class="button short-rest"
      use:tooltip={{ content: localize('shortRest.desc') }}
   >
      <IconButton
         icon={SHORT_REST_ICON}
         on:click={() => {
            $document.system.shortRest();
         }}
      />
   </div>

   <!--Remove Temp Effects button-->
   <div
      class="button clear"
      use:tooltip={{ content: localize('removeCombatEffects') }}
   >
      <IconButton
         icon={REMOVE_TEMP_EFFECTS_ICON}
         on:click={() => {
            $document.system.removeCombatEffects();
         }}
      />
   </div>

   <!--Spend Resolve button-->
   <div
      class="button resolve"
      use:tooltip={{ content: localize('spendX%Resolve').replace('X%', 1) }}
   >
      <IconButton
         icon={SPEND_RESOLVE_ICON}
         on:click={() => {
            $document.system.spendResolve(1);
         }}
      />
   </div>
</div>

<style lang="scss">
   .portrait {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      position: relative;

      .image {
         width: 160px;

         --titan-border-style: none;
      }

      .button {
         position: absolute;

         &.long-rest {
            top: 0;
            right: 0;
         }

         &.short-rest {
            top: 0;
            left: 0;
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
