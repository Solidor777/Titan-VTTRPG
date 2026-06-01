<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import ImageButton from '~/helpers/svelte-components/button/ImageButton.svelte';

   /**
    * @typedef {object} ImagePickerProps
    * @property {string} [value] - The image path value to bind to.
    * @property {string} [alt] - Text to display if the value is not a path to a valid image.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {Function} [onchange] - Callback invoked after a new image path is selected.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {ImagePickerProps} */
   let {
      value = $bindable(void 0),
      alt = 'img',
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /** Creates an image picker pointing to the current source path. */
   function onEditImage() {
      if (!disabled) {
         const current = value;
         const filePicker = new foundry.applications.apps.FilePicker.implementation({
            type: 'image',
            current: current,
            callback: async (newPath) => {
               value = newPath;
               onchange?.();
            },
            position: {
               top: application.position.top + 40,
               left: application.position.left + (application.position.width - application.position.width) + 10,
            },
         });
         filePicker.browse();
      }
   }
</script>

<ImageButton
   {alt}
   onclick={onEditImage}
   src={value}
   {testId}
   {tooltip}
/>
