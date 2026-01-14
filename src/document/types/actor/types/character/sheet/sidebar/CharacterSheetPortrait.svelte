<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import { LONG_REST_ICON, REMOVE_TEMP_EFFECTS_ICON, SHORT_REST_ICON, SPEND_RESOLVE_ICON } from '~/system/Icons.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="portrait">
   <!--Image Picker-->
   <div class="image">
      <DocumentImagePicker alt={'character portrait'} bind:value={$document.img}/>
   </div>

   <!--Buttons for managing resources-->
   <div class="buttons">
      <!--Take a Long Rest Button-->
      <div
         class="button"
         use:tooltipAction="{localize('longRest.desc')}"
      >
         <DocumentOwnerIconButton
            icon={LONG_REST_ICON}
            on:click={() => {
            $document.system.longRest();
         }}
         />
      </div>

      <!--Take a Short Rest Button-->
      <div
         class="button"
         use:tooltipAction="{localize('shortRest.desc')}"
      >
         <DocumentOwnerIconButton
            icon={SHORT_REST_ICON}
            on:click={() => {
            $document.system.shortRest();
         }}
         />
      </div>

      <!--Remove Combat Effects button-->
      <div
         class="button"
         use:tooltipAction="{localize('removeCombatEffects.desc')}"
      >
         <DocumentOwnerIconButton
            icon={REMOVE_TEMP_EFFECTS_ICON}
            on:click={() => {
            $document.system.removeCombatEffects();
         }}
         />
      </div>

      <!--Spend Resolve button-->
      <div
         class="button"
         use:tooltipAction="{localize('spendX%Resolve').replace('X%', 1)}"
      >
         <DocumentOwnerIconButton
            icon={SPEND_RESOLVE_ICON}
            on:click={() => {
            $document.system.spendResolve(1);
         }}
         />
      </div>
   </div>

   <div class="actor-link">
      <DocumentOwnerIconButton icon={SPEND_RESOLVE_ICON}/>
   </div>
</div>

<style lang="scss">
   .portrait {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      height: 100%;

      .image {
         width: 160px;

         --titan-border-style: none;
      }

      .buttons {
         @include flex-column;
         @include flex-group-center;
         @include border-left;

         padding-left: var(--titan-padding-standard);
         height: 160px;

         .button {
            @include flex-column;

            height: 100%;
            flex-grow: 2;
         }
      }

      .actor-link {
         position: absolute;
         top: 0;
         left: 0;
      }
   }
</style>
