<script>  import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

export let label = void 0;
export let value = void 0;
export let tooltip = void 0;
</script>

<Tag {tooltip}>
   <div class="label">
      {label}
   </div>
   <div class="value">
      {value}
   </div>
</Tag>

<style lang="scss">
   .label {
      @include border-right;

      font-weight: bold;
      padding-right: var(--titan-padding-standard);
      margin-right: var(--titan-padding-standard);
   }
</style>
