<script>
   import {createEventDispatcher} from 'svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type string Text to display if the value is not a path to valid image. */
   export let alt = 'img';

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type EventDispatcher Dispatcher for component Events. */
   const eventDispatcher = createEventDispatcher();

   /**
    * Creates an image picker pointing to the current source path.
    */
   function onEditImage() {
      if (!disabled) {
         const current = value;
         const filePicker = new FilePicker({
            type: 'image',
            current: current,
            callback: async (newPath) => {
               value = newPath;
               eventDispatcher('change');
            },
            top: application.position.top + 40,
            left: application.position.left + 10,
         });
         filePicker.browse();
      }
   }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img
   {alt}
   class={disabled ? 'disabled' : ''}
   on:click={onEditImage}
   on:keypress={onEditImage}
   src={value}
/>

<style>
   img {
      border-style: var(--titan-border-style);

      &:not(.disabled) {
         cursor: pointer;
      }
   }
</style>
