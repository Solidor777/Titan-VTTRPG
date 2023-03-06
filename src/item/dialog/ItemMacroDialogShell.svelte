<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import ImagePicker from '~/helpers/svelte-components/ImagePicker.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   // Item to create the macro for
   export let item = void 0;

   // Slot on the hotbar that the macro will be assign to
   export let slot = void 0;

   // UUID of the item that was dropped
   export let uuid = void 0;

   console.log(uuid);

   // Application reference
   const application = getContext('#external').application;

   // Macro type
   let macroType = 'toggleDocumentSheet';
   const macroTypeOptions = [
      {
         value: 'toggleDocumentSheet',
         label: localize('toggleItemSheet'),
      },
   ];

   // Item check
   let itemCheckIdx = 0;
   const itemCheckOptions = [];
   // If the item has item checks
   if (item.system.check.length > 0) {
      // Add item check to the macro type options
      macroTypeOptions.push({
         value: 'itemCheck',
         label: localize('itemCheck'),
      });
      macroType = 'itemCheck';

      // Add the item checks to the item check select
      item.system.check.forEach((check, idx) => {
         itemCheckOptions.push({
            value: idx,
            label: `${check.label} (${idx + 1})`,
         });
      });
   }

   // Type specific macro type
   let attackIdx = 0;
   const attackOptions = [];
   switch (item.type) {
      case 'weapon': {
         // If the item has attacks
         if (item.system.attack.length > 0) {
            // Add attack check to the macro type options
            macroTypeOptions.push({
               value: 'attackCheck',
               label: localize('attackCheck'),
            });
            macroType = 'attackCheck';

            // Add the attacks to the attack options
            item.system.attack.forEach((attack, idx) => {
               attackOptions.push({
                  value: idx,
                  label: `${attack.label} (${idx + 1})`,
               });
            });
            break;
         }
      }

      case 'spell': {
         // Add casting check to the macro type options
         macroTypeOptions.push({
            value: 'castingCheck',
            label: localize('castingCheck'),
         });
         macroType = 'castingCheck';
         break;
      }

      case 'effect': {
         // If this is a permanent effect
         if (item.system.duration.type === 'permanent') {
            // Add toggle active to the macro type options
            macroTypeOptions.push({
               value: 'toggleEffectActive',
               label: localize('toggleEffectActive'),
            });
            macroType = 'toggleEffectActive';
            break;
         }
      }
      default: {
         break;
      }
   }

   // ID method
   let idMethod = 'uuid';
   const idMethodOptions = [
      {
         value: 'uuid',
         label: localize('itemUuid'),
      },
      {
         value: 'name',
         label: localize('itemName'),
      },
      {
         value: 'id',
         label: localize('itemId'),
      },
   ];

   // Macro image
   let img = item.img;

   // Macro name
   let name = item.name;

   async function onCreateMacro() {
      let macro;
      switch (macroType) {
         case 'attackCheck': {
            macro = await game.titan.macros.getAttackCheckMacro(
               item,
               name,
               img,
               idMethod,
               attackIdx
            );
            break;
         }

         case 'castingCheck': {
            macro = await game.titan.macros.getCastingCheckMacro(
               item,
               name,
               img,
               idMethod
            );
            break;
         }

         case 'itemCheck': {
            macro = await game.titan.macros.getItemCheckMacro(
               item,
               name,
               img,
               idMethod,
               itemCheckIdx
            );
            break;
         }

         case 'toggleEffectActive': {
            macro = await game.titan.macros.getToggleEffectActiveMacro(
               item,
               name,
               img,
               idMethod
            );
            break;
         }

         case 'toggleDocumentSheet': {
            macro = await game.titan.macros.getToggleDocumentSheetMacro(
               name,
               img,
               uuid
            );
            break;
         }

         default: {
            break;
         }
      }

      if (macro) {
         game.user.assignHotbarMacro(macro, slot);
      }

      application.close();
      return;
   }

   async function onCancel() {
      application.close();
      return;
   }
</script>

<div class="create-macro-dialog">
   <!--Header-->
   <div class="row">
      <!--Image-->
      <div class="image">
         <ImagePicker bind:src={img} />
      </div>

      <!--Name-->
      <div class="input">
         <TextInput bind:value={name} />
      </div>
   </div>

   <!--Macro type-->
   <div class="row">
      <!--Label-->
      <div class="label">
         {localize('macroType')}
      </div>

      <!--Input-->
      <div class="input">
         <Select bind:value={macroType} options={macroTypeOptions} />
      </div>
   </div>

   {#if macroType === 'itemCheck'}
      <!--Item Check options-->
      <div class="row">
         <!--Label-->
         <div class="label">
            {localize('check')}
         </div>

         <!--Input-->
         <div class="input">
            <Select bind:value={itemCheckIdx} options={itemCheckOptions} />
         </div>
      </div>
   {:else if macroType === 'attackCheck'}
      <!--Attack Check options-->
      <div class="row">
         <!--Label-->
         <div class="label">
            {localize('attack')}
         </div>

         <!--Input-->
         <div class="input">
            <Select bind:value={attackIdx} options={attackOptions} />
         </div>
      </div>
   {/if}

   <!--ID Method-->
   <div class="row">
      <!--Label-->
      <div class="label">
         {localize('idMethod')}
      </div>

      <!--Input-->
      <div class="input">
         <Select bind:value={idMethod} options={idMethodOptions} />
      </div>
   </div>

   <!--Buttons-->
   <div class="row">
      <div class="button">
         <EfxButton on:click={onCreateMacro}>
            {localize('createMacro')}
         </EfxButton>
      </div>

      <div class="button">
         <EfxButton on:click={onCancel}>{localize('cancel')}</EfxButton>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .create-macro-dialog {
      @include flex-column;
      @include font-size-normal;
      justify-items: flex-end;

      .row {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         width: 100%;

         &:not(:first-child) {
            border-top: solid;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
            border-width: var(--border-width);
         }

         .image {
            width: 5rem;
            --border-style: none;
         }

         .label {
            @include flex-group-right;
            font-weight: bold;
            height: 100%;
            width: 100%;
            margin-right: 0.5rem;
         }

         .input {
            @include flex-group-left;
            margin-left: 0.5rem;
            height: 100%;
            width: 100%;
            --input-height: 1.8rem;
            --input-width: 100%;
         }

         .button {
            @include flex-row;
            width: 100%;
            margin-top: 0.5rem;

            &:not(:first-child) {
               margin-left: 0.25rem;
            }
         }
      }
   }
</style>
