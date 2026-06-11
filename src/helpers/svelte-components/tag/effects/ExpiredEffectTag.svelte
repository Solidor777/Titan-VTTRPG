<script>
   import { EXPIRED_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {{ effect: ExpiredEffectData, testId?: string }} Data for this tag's Effect plus an optional test id. */
   let { effect = void 0, testId = void 0 } = $props();
</script>

<div class="tag" data-testid={testId}>
   <EffectTag {effect} icon={EXPIRED_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
         var(--titan-gradient-degree), var(--titan-expired-effect-primary), var(--titan-expired-effect-secondary) 100%
      );
      --titan-tag-font-color: var(--titan-expired-effect-font-color);
   }
</style>
