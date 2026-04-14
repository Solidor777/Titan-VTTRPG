<script>
   import processTextData from '~/helpers/ProcessTextData.js';

   /** @type {string|TextData} The Text to display. */
   export let text = void 0;
</script>
{processTextData(text)}
