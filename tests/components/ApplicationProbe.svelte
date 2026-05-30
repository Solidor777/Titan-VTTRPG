<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';

   /** @type {object | undefined} - The application resolved from context. */
   const application = getApplication();
</script>

<span data-testid="app">{application?.name ?? 'none'}</span>
