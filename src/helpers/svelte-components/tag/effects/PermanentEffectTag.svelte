<script>
   import { PERMANENT_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {{ effect: PermanentEffectData, testId?: string }} Data for this tag's Effect plus an optional test id. */
   let { effect = void 0, testId = void 0 } = $props();
</script>

<div class="tag" data-testid={testId}>
   <EffectTag {effect} icon={PERMANENT_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
         var(--titan-gradient-degree), var(--titan-permanent-effect-primary), var(--titan-permanent-effect-secondary) 100%
      );
      --titan-tag-font-color: var(--titan-permanent-effect-font-color);
   }
</style>
