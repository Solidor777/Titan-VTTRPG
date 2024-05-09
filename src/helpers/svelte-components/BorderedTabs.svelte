<script>
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';

   // List of tabs
   export let tabs = [];

   // The active tab
   export let activeTab = void 0;
</script>

<Tabs {tabs} {activeTab} bordered={true}/>
