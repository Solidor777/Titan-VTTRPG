import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';

// The HUD canvas rect anchors to the LEFT of the EXPANDED sidebar and stays there when the sidebar
// collapses (chat notifications still surface in the freed space). Verified from the live computed
// geometry, in both sidebar states.
test('HUD rect anchors to the expanded sidebar edge and does not move on collapse', async ({ page }) => {
   await login(page);

   const result = await page.evaluate(async () => {
      const sb = ui.sidebar;

      /** Yields until the next animation frame, so a pending style change is applied and laid out. */
      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

      /**
       * Waits out the sidebar's expand/collapse transition. Event-driven: two frames let the toggle's
       * style change register its transitions, then each transition's `finished` promise resolves on
       * its own end event. A cancelled transition (a toggle interrupting another) counts as settled.
       */
      const settle = async () => {
         await nextFrame();
         await nextFrame();
         await Promise.all(sb.element.getAnimations({ subtree: true })
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => undefined)));
      };

      const hud = game.titan.playerHud;
      const toggle = () => (sb.toggleExpanded
         ? sb.toggleExpanded()
         : (sb.expanded ? sb.collapse?.() : sb.expand?.()));
      const rectRight = () => hud.layoutState.rect.left + hud.layoutState.rect.width;
      const sidebarLeft = () => Math.round(sb.element.getBoundingClientRect().left);

      // Expanded.
      if (!sb.expanded) {
         toggle();
         await settle();
      }
      window.dispatchEvent(new Event('resize'));
      await nextFrame();
      const expandedRectRight = rectRight();
      const expandedSidebarLeft = sidebarLeft();

      // Collapsed — re-measure to exercise the collapsed branch of the width calc.
      toggle();
      await settle();
      window.dispatchEvent(new Event('resize'));
      await nextFrame();
      const collapsedRectRight = rectRight();
      const collapsedSidebarLeft = sidebarLeft();

      // Restore.
      toggle();
      await settle();
      return {
         expandedRectRight,
         expandedSidebarLeft,
         collapsedRectRight,
         collapsedSidebarLeft,
      };
   });

   // The rect's right edge sits exactly at the expanded sidebar's left edge.
   expect(result.expandedRectRight).toBe(result.expandedSidebarLeft);
   // Collapsing does not move the rect (the HUD stays put)...
   expect(result.collapsedRectRight).toBe(result.expandedRectRight);
   // ...even though the collapsed sidebar rail now sits well to the right of the HUD edge.
   expect(result.collapsedSidebarLeft).toBeGreaterThan(result.collapsedRectRight);
});
