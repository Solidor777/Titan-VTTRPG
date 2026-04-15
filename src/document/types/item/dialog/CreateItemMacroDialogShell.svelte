<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /** @type {TitanItem} The Item being edited. */
   export let item = void 0;

   // Slot on the hotbar that the macro will be assigned to.
   /** @type {number} */
   export let slot = void 0;

   // UUID of the item that was dropped.
   /** @type {string} */
   export let uuid = void 0;

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   // Macro type.
   /** @type {string} */
   let macroType = 'toggleDocumentSheet';
   const macroTypeOptions = [
      {
         value: 'toggleDocumentSheet',
         label: 'toggleItemSheet',
      },
   ];

   // Item check.
   /** @type {number} */
   let itemCheckIdx = 0;
   /** @type {*[]} */
   const itemCheckOptions = [];
   // If the item has item checks.
   if (item.system.check.length > 0) {
      // Add item check to the macro type options.
      macroTypeOptions.push({
         value: 'itemCheck',
         label: 'itemCheck',
      });
      macroType = 'itemCheck';

      // Add the item checks to the item check select options.
      item.system.check.forEach((check, idx) => {
         itemCheckOptions.push({
            value: idx,
            label: `${check.label} (${idx + 1})`,
         });
      });
   }

   // Type-specific macro type.
   /** @type {number} */
   let attackIdx = 0;
   /** @type {*[]} */
   const attackOptions = [];
   switch (item.type) {
      case 'weapon': {
         // If the item has attacks.
         if (item.system.attack.length > 0) {
            // Add Attack Check to the macro type options.
            macroTypeOptions.push({
               value: 'attackCheck',
               label: 'attackCheck',
            });
            macroType = 'attackCheck';

            // Add the attacks to the attack options.
            item.system.attack.forEach((attack, idx) => {
               attackOptions.push({
                  value: idx,
                  label: `${attack.label} (${idx + 1})`,
               });
            });
         }
         break;
      }

      case 'spell': {
         // Add Casting Check to the macro type options.
         macroTypeOptions.push({
            value: 'castingCheck',
            label: 'castingCheck',
         });
         macroType = 'castingCheck';
         break;
      }

      case 'effect': {
         // If this is a permanent effect.
         if (item.system.duration.type === 'permanent') {
            // Add toggle active effect to the macro type options.
            macroTypeOptions.push({
               value: 'toggleEffectActive',
               label: 'toggleEffectActive',
            });
            macroType = 'toggleEffectActive';
         }

         break;
      }
      default: {
         break;
      }
   }

   // ID method.
   /** @type {string} */
   let idMethod = 'uuid';
   const idMethodOptions = [
      {
         value: 'uuid',
         label: 'itemUuid',
      },
      {
         value: 'name',
         label: 'itemName',
      },
      {
         value: 'documentId',
         label: 'documentId',
      },
   ];

   // Macro image.
   let img = item.img;

   // Macro name.
   let name = item.name;

   /**
    * Creates the macro based on the current settings and assigns it to the hotbar slot.
    */
   async function onCreateMacro() {
      let macro;
      switch (macroType) {
         case 'attackCheck': {
            macro = await game.titan.macros.getAttackCheckMacro(
               item,
               name,
               img,
               idMethod,
               attackIdx,
            );
            break;
         }

         case 'castingCheck': {
            macro = await game.titan.macros.getCastingCheckMacro(
               item,
               name,
               img,
               idMethod,
            );
            break;
         }

         case 'itemCheck': {
            macro = await game.titan.macros.getItemCheckMacro(
               item,
               name,
               img,
               idMethod,
               itemCheckIdx,
            );
            break;
         }

         case 'toggleEffectActive': {
            macro = await game.titan.macros.getToggleEffectActiveMacro(
               item,
               name,
               img,
               idMethod,
            );
            break;
         }

         case 'toggleDocumentSheet': {
            macro = await game.titan.macros.getToggleDocumentSheetMacro(
               name,
               img,
               uuid,
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

      return application.close();
   }

   /**
    * Cancels macro creation and closes the dialog.
    */
   function onCancel() {
      return application.close();
   }
</script>

<div class="create-macro-dialog">
   <!--Header-->
   <div class="row">
      <!--Image-->
      <div class="image">
         <ImagePicker bind:src={img}/>
      </div>

      <!--Name-->
      <div class="input">
         <TextInput bind:value={name}/>
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
         <Select bind:value={macroType} options={macroTypeOptions}/>
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
            <Select bind:value={itemCheckIdx} options={itemCheckOptions}/>
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
            <Select bind:value={attackIdx} options={attackOptions}/>
         </div>
      </div>
   {/if}

   <!--ID Method-->
   <div class="row" use:tooltipAction={`idMethod.desc`}>
      <!--Label-->
      <div class="label">
         {localize('idMethod')}
      </div>

      <!--Input-->
      <div class="input">
         <Select bind:value={idMethod} options={idMethodOptions}/>
      </div>
   </div>

   <!--Buttons-->
   <div class="row">
      <div class="button">
         <Button on:click={onCreateMacro}>
            {localize('createMacro')}
         </Button>
      </div>

      <div class="button">
         <Button on:click={onCancel}>{localize('cancel')}</Button>
      </div>
   </div>
</div>

<style lang="scss">
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
            padding-top: var(--titan-spacing-standard);
            margin-top: var(--titan-spacing-standard);
            border-width: var(--titan-border-width);
         }

         .image {
            width: 80px;

            --titan-border-style: none;
         }

         .label {
            @include flex-group-right;

            font-weight: bold;
            height: 100%;
            width: 100%;
            margin-right: var(--titan-spacing-large);
         }

         .input {
            @include flex-group-left;

            margin-left: var(--titan-spacing-large);
            height: 100%;
            width: 100%;

            --titan-input-height: 28px;
            --titan-input-width: 100%;
         }

         .button {
            @include flex-row;

            width: 100%;
            margin-top: var(--titan-spacing-large);

            &:not(:first-child) {
               margin-left: var(--titan-spacing-standard);
            }
         }
      }
   }
</style>
