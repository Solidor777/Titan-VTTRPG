<script>
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import createAttributeCheckLabel from '~/helpers/utility-functions/CreateAttributeCheckLabel.js';

   /** @type string The Attribute to use for the Check. */
   export let attribute = void 0;

   /** @type string The Skill to use for the Check. */
   export let skill = void 0;

   /** @type number The minimum roll on a die to achieve a Success. */
   export let difficulty = void 0;

   /** @type number The minimum number of Successes needed to succeed at the Check. */
   export let complexity = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<AttributeTag {attribute} {tooltip}>
   {createAttributeCheckLabel(attribute, skill, difficulty, complexity)}
</AttributeTag>