<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
</script>
<div use:tooltip={{ content: localize('attack.penetrating.desc')}}>
   <Tag label={localize('penetrating')}/>
</div>
