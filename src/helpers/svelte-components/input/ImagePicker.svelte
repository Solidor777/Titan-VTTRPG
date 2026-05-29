<script>
   import { createEventDispatcher } from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import ImageButton from '~/helpers/svelte-components/button/ImageButton.svelte';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {string} Text to display if the value is not a path to valid image. */
   export let alt = 'img';

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {EventDispatcher} Dispatcher for component Events. */
   const eventDispatcher = createEventDispatcher();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /** Creates an image picker pointing to the current source path. */
   function onEditImage() {
      if (!disabled) {
         const current = value;
         const filePicker = new foundry.applications.apps.FilePicker({
            type: 'image',
            current: current,
            callback: async (newPath) => {
               value = newPath;
               eventDispatcher('change');
            },
            position: {
               top: application.position.top + 40,
               left: application.position.left + (application.position.width - application.options.width) + 10,
            }
         });
         filePicker.browse();
      }
   }
</script>

<ImageButton
   {alt}
   onclick={onEditImage}
   src={value}
   {tooltip}
/>
