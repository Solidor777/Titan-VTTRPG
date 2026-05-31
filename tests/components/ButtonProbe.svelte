<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type {{ testId?: string }} */
   const { testId = undefined } = $props();
</script>

<Button {testId}>Label</Button>
