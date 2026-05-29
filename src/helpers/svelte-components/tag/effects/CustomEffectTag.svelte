<script>
   import { CUSTOM_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {{ effect: CustomEffectData }} Data for this tag's Effect. */
   let { effect = void 0 } = $props();
</script>

<div class="tag">
   <EffectTag {effect} icon={CUSTOM_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
         var(--titan-gradient-degree), var(--titan-custom-effect-primary), var(--titan-custom-effect-secondary) 100%
      );
   }
</style>
