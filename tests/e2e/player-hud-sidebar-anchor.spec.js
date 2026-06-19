import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';

// The HUD canvas rect anchors to the LEFT of the EXPANDED sidebar and stays there when the sidebar
// collapses (chat notifications still surface in the freed space). Verified from the live computed
// geometry, in both sidebar states.
test('HUD rect anchors to the expanded sidebar edge and does not move on collapse', async ({ page }) => {
   await login(page);

   const result = await page.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const sb = ui.sidebar;
      const hud = game.titan.playerHud;
      const toggle = () => (sb.toggleExpanded
         ? sb.toggleExpanded()
         : (sb.expanded ? sb.collapse?.() : sb.expand?.()));
      const rectRight = () => hud.layoutState.rect.left + hud.layoutState.rect.width;
      const sidebarLeft = () => Math.round(sb.element.getBoundingClientRect().left);

      // Expanded.
      if (!sb.expanded) {
         toggle();
         await wait(600);
      }
      window.dispatchEvent(new Event('resize'));
      await wait(50);
      const expandedRectRight = rectRight();
      const expandedSidebarLeft = sidebarLeft();

      // Collapsed — re-measure to exercise the collapsed branch of the width calc.
      toggle();
      await wait(600);
      window.dispatchEvent(new Event('resize'));
      await wait(50);
      const collapsedRectRight = rectRight();
      const collapsedSidebarLeft = sidebarLeft();

      // Restore.
      toggle();
      await wait(400);
      return { expandedRectRight, expandedSidebarLeft, collapsedRectRight, collapsedSidebarLeft };
   });

   // The rect's right edge sits exactly at the expanded sidebar's left edge.
   expect(result.expandedRectRight).toBe(result.expandedSidebarLeft);
   // Collapsing does not move the rect (the HUD stays put)...
   expect(result.collapsedRectRight).toBe(result.expandedRectRight);
   // ...even though the collapsed sidebar rail now sits well to the right of the HUD edge.
   expect(result.collapsedSidebarLeft).toBeGreaterThan(result.collapsedRectRight);
});
