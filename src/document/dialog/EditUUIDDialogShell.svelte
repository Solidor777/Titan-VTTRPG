<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import TextArea from '~/helpers/svelte-components/input/TextAreaInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type {TitanItem | TitanActor} The document to edit the UUID for. */
   export let document = void 0;

   /** @type {string | undefined} The UUID of the document. */
   let uuid = document.flags?.titan?.uuid;

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /**
    * Applies the edited UUID to the document and closes the dialog.
    */
   async function onApplyEdits() {
      if (document) {
         document.update({
            flags: {
               titan: {
                  uuid: uuid,
               },
            },
         });
      }
      ui.notifications.info(
         localize('editedUUIDForDocumentX%').replace(
            'X%',
            document.name,
         ),
      );
      return application.close();
   }

   /**
    * Cancels the edit and closes the dialog.
    */
   async function onCancel() {
      return application.close();
   }
</script>

<div class="edit-uuid-dialog">
   <!--Header-->
   <div class="header">
      <!--Image-->
      <img alt={document.img} src={document.img}/>

      <!--Name-->
      <div class="name">
         {document.name}
      </div>
   </div>

   <div class="section">
      {@html localize('editUUID.desc')}
   </div>

   <!--UUID-->
   <div class="input">
      <TextArea bind:value={uuid}/>
   </div>

   <!--Buttons-->
   <div class="buttons">
      <div class="button">
         <Button onclick={onApplyEdits}>
            {localize('applyEdits')}
         </Button>
      </div>

      <div class="button">
         <Button onclick={onCancel}>{localize('cancel')}</Button>
      </div>
   </div>
</div>

<style lang="scss">
   .edit-uuid-dialog {
      @include flex-column;
      @include font-size-normal;

      justify-items: flex-end;

      .header {
         @include flex-row;
         @include flex-group-center;

         img {
            width: 80px;
            border: none;
         }

         .name {
            @include font-size-large;
            @include margin-left-large;
         }
      }

      .section {
         @include flex-group-left;
      }

      .buttons {
         @include flex-row;
         @include flex-group-center;

         height: 100%;
         width: 100%;

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
