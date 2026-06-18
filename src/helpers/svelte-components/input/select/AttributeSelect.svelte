<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ATTRIBUTES } from '~/system/Attributes.js';
   import AttributeInput from '~/helpers/svelte-components/input/AttributeInput.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { BODY_ICON, MIND_ICON, SOUL_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} AttributeSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowAll] - Whether to allow All as an option.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {AttributeSelectProps} */
   let {
      value = $bindable(void 0),
      allowAll = false,
      allowNone = false,
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {object} Maps each attribute to its FontAwesome icon class. */
   const ATTRIBUTE_ICONS = {
      body: BODY_ICON,
      mind: MIND_ICON,
      soul: SOUL_ICON,
   };

   /** @type {object[]} Options for the Select component, including All / None when allowed. */
   const options = $derived.by(() => {
      // Each real attribute carries its icon; synthetic all/none entries are icon-less primitives.
      const list = ATTRIBUTES.map((attribute) => ({ value: attribute, icon: ATTRIBUTE_ICONS[attribute] }));
      if (allowAll) {
         list.unshift('all');
      }
      if (allowNone) {
         list.push('none');
      }
      return list;
   });
</script>

<AttributeInput
   attribute={value}
   testId={testId}
>
   <Select
      bind:value
      {disabled}
      onchange={onchange}
      {options}
      {tooltip}
   >
      {#snippet option(opt)}
         <span class="attribute-option {opt.value}">
            {#if opt.icon}
               <i class={opt.icon}></i>
            {/if}
            <Text text={opt.label ?? opt.value}/>
         </span>
      {/snippet}
   </Select>
</AttributeInput>

<style lang="scss">
   // Tints each dropdown row with its attribute's color; the negative margin bleeds the fill across
   // the SelectList row padding so the color reaches the row edges.
   .attribute-option {
      @include attribute-colors;
      @include flex-row;
      @include flex-group-left;

      flex: 1;
      gap: var(--titan-spacing-standard);
      margin: calc(-1 * var(--titan-spacing-standard));
      padding: var(--titan-spacing-standard);
      border-radius: var(--titan-input-border-radius);

      &:hover {
         filter: brightness(1.1);
      }
   }
</style>
