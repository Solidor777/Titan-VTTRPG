<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /**
    * @typedef {object} CreateItemMacroDialogShellProps
    * @property {TitanItem} [item] The Item being edited.
    * @property {number} [slot] Slot on the hotbar that the macro will be assigned to.
    * @property {string} [uuid] UUID of the item that was dropped.
    */

   /** @type {CreateItemMacroDialogShellProps} */
   const {
      item = undefined,
      slot = undefined,
      uuid = undefined,
   } = $props();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   // Snapshot all three props into plain constants. item, slot, and uuid are fixed for this
   // dialog's lifetime — the dialog is mounted once and immediately unmounted on close. All
   // subsequent reads use these snapshots so the ignore below is applied exactly once.
   // svelte-ignore state_referenced_locally
   /** @type {TitanItem | undefined} Snapshot of the item prop for one-time dialog initialisation. */
   const itemSnapshot = item;
   // svelte-ignore state_referenced_locally
   /** @type {string | undefined} Snapshot of the uuid prop for one-time dialog initialisation. */
   const uuidSnapshot = uuid;
   // svelte-ignore state_referenced_locally
   /** @type {number | undefined} Snapshot of the slot prop for one-time dialog initialisation. */
   const slotSnapshot = slot;

   // Macro type.
   /** @type {string} */
   let macroType = $state('toggleDocumentSheet');
   const macroTypeOptions = [
      {
         value: 'toggleDocumentSheet',
         label: 'toggleItemSheet',
      },
   ];

   // Item check.
   /** @type {number} */
   let itemCheckIdx = $state(0);
   /** @type {*[]} */
   const itemCheckOptions = [];
   // If the item has item checks.
   if (itemSnapshot?.system.check.length > 0) {
      // Add item check to the macro type options.
      macroTypeOptions.push({
         value: 'itemCheck',
         label: 'itemCheck',
      });
      macroType = 'itemCheck';

      // Add the item checks to the item check select options.
      itemSnapshot.system.check.forEach((check, idx) => {
         itemCheckOptions.push({
            value: idx,
            label: `${check.label} (${idx + 1})`,
         });
      });
   }

   // Type-specific macro type.
   /** @type {number} */
   let attackIdx = $state(0);
   /** @type {*[]} */
   const attackOptions = [];
   switch (itemSnapshot?.type) {
      case 'weapon': {
         // If the item has attacks.
         if (itemSnapshot.system.attack.length > 0) {
            // Add Attack Check to the macro type options.
            macroTypeOptions.push({
               value: 'attackCheck',
               label: 'attackCheck',
            });
            macroType = 'attackCheck';

            // Add the attacks to the attack options.
            itemSnapshot.system.attack.forEach((attack, idx) => {
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
         if (itemSnapshot.system.duration.type === 'permanent') {
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
   let idMethod = $state('uuid');
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
   /** @type {string} */
   let img = $state(itemSnapshot?.img);

   // Macro name.
   /** @type {string} */
   let name = $state(itemSnapshot?.name);

   /**
    * Creates the macro based on the current settings and assigns it to the hotbar slot.
    * @returns {Promise<void>} Resolves when the macro is created and the dialog closes.
    */
   async function onCreateMacro() {
      let macro;
      switch (macroType) {
         case 'attackCheck': {
            macro = await game.titan.macros.getAttackCheckMacro(
               itemSnapshot,
               name,
               img,
               idMethod,
               attackIdx,
            );
            break;
         }

         case 'castingCheck': {
            macro = await game.titan.macros.getCastingCheckMacro(
               itemSnapshot,
               name,
               img,
               idMethod,
            );
            break;
         }

         case 'itemCheck': {
            macro = await game.titan.macros.getItemCheckMacro(
               itemSnapshot,
               name,
               img,
               idMethod,
               itemCheckIdx,
            );
            break;
         }

         case 'toggleEffectActive': {
            macro = await game.titan.macros.getToggleEffectActiveMacro(
               itemSnapshot,
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
               uuidSnapshot,
            );
            break;
         }

         default: {
            break;
         }
      }

      if (macro) {
         game.user.assignHotbarMacro(macro, slotSnapshot);
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
         <ImagePicker bind:value={img}/>
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
         <Button onclick={onCreateMacro}>
            <Text text="createMacro"/>
         </Button>
      </div>

      <div class="button">
         <Button onclick={onCancel}><Text text="cancel"/></Button>
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

            @include padding-top-standard;
            @include margin-top-standard;

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

            @include margin-right-large;
         }

         .input {
            @include flex-group-left;
            @include margin-left-large;

            height: 100%;
            width: 100%;

            --titan-input-height: 28px;
            --titan-input-width: 100%;
         }

         .button {
            @include flex-row;

            width: 100%;

            @include margin-top-large;

            &:not(:first-child) {
               @include margin-left-standard;
            }
         }
      }
   }
</style>
