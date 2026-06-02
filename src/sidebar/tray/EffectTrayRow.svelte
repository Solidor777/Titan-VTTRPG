<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import applyEffectToTargets from '~/helpers/utility-functions/ApplyEffectToTargets.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   /**
    * @typedef {object} EffectTrayRowProps
    * @property {object} effect - The ActiveEffect document for this row.
    */

   /** @type {EffectTrayRowProps} */
   const { effect } = $props();

   /** @type {string} The localized label for the Apply to Target button. */
   const applyLabel = localize('effectTrayApply');
</script>

<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
>
   <img
      alt=""
      class="effect-tray-row-icon"
      src={effect.img}
   />
   <span class="effect-tray-row-name">{effect.name}</span>

   <!--Apply to Target button-->
   <div class="effect-tray-row-apply">
      <IconButton
         icon="fa-solid fa-bullseye-arrow"
         label={applyLabel}
         onclick={() => applyEffectToTargets(effect)}
         testId="effect-tray-apply"
         tooltip={applyLabel}
      />
   </div>
</div>

<style lang="scss">
   .effect-tray-row {
      @include flex-row;
      @include flex-group-left;
      @include padding-standard;

      width: 100%;

      .effect-tray-row-icon {
         width: 32px;
         height: 32px;
         border: none;
         object-fit: contain;
      }

      .effect-tray-row-name {
         @include margin-left-standard;

         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
      }

      .effect-tray-row-apply {
         margin-left: auto;
      }
   }
</style>
