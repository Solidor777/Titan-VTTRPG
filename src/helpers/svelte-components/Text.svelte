<script>
   import processTextData from '~/helpers/ProcessTextData.js';

   /**
    * @typedef {object} TextProps
    * @property {string | import('~/helpers/ProcessTextData.js').TextData} [text] - The text to display.
    */

   /** @type {TextProps} */
   let { text = undefined } = $props();
</script>
{processTextData(text)}
