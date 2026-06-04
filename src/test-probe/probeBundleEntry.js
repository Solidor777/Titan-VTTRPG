import registerProbe from '~/test-probe/registerProbe.js';

// This bundle is injected by Playwright after the world is ready, so `game.titan` already exists and the
// probe can register immediately. The `ready`-hook fallback covers any earlier injection.
if (globalThis.game?.titan) {
   registerProbe();
}
else {
   Hooks.once('ready', registerProbe);
}
