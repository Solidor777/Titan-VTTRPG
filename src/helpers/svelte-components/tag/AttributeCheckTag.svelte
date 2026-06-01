<script>
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import createAttributeCheckLabel from '~/helpers/utility-functions/CreateAttributeCheckLabel.js';

   /**
    * @typedef {object} AttributeCheckTagProps
    * Props for this component.
    * @property {string} [attribute] - The Attribute to use for the Check.
    * @property {string} [skill] - The Skill to use for the Check.
    * @property {number} [difficulty] - The minimum roll on a die to achieve a Success.
    * @property {number} [complexity] - The minimum number of Successes needed to succeed at the Check.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string} [testId] - Optional test identifier forwarded to the root element of AttributeTag.
    */

   /** @type {AttributeCheckTagProps} */
   let {
      attribute = void 0,
      skill = void 0,
      difficulty = void 0,
      complexity = void 0,
      tooltip = void 0,
      testId = void 0,
   } = $props();
</script>

<AttributeTag {attribute} {tooltip} {testId}>
   {createAttributeCheckLabel(attribute, skill, difficulty, complexity)}
</AttributeTag>
