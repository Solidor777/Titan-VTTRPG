import { expect } from '@playwright/test';
import { chooseContextMenuEntry } from './contextMenu.js';
import { closeTokenHud, hoverToken, openSidebarTab, restOnToken, targetedTokenIds } from './flows.js';
import { settle } from './settle.js';

// Page objects for targeting a token the way a user does besides the Target key: the target control of the Token HUD,
// and removing a token from the scene with the Delete key.

/**
 * Toggles the target state of a placed token with the target control of its Token HUD: a right click on the hovered
 * token opens the HUD, the control targets or untargets the token without releasing the other targets, and a left click
 * on the token closes the HUD.
 * @param {import('@playwright/test').Page} page - A logged-in page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @param {boolean} targeted - Whether the token is targeted after the click.
 * @returns {Promise<void>} Resolves once the user's targets and the control agree with the wanted state.
 */
export async function toggleTargetWithTokenHud(page, tokenId, targeted) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId);
   await page.mouse.click(centre.x, centre.y, { button: 'right' });

   /** @type {import('@playwright/test').Locator} The Token HUD's target control. */
   const control = page.locator('#token-hud [data-action="target"]');
   await expect(control, 'the Token HUD offers the target control').toBeVisible();
   await expect(control, 'the control shows the token\'s current state').toHaveClass(
      targeted ? /^(?!.*\bactive\b)/ : /\bactive\b/,
   );
   await control.click();
   await expect.poll(
      async () => (await targetedTokenIds(page)).includes(tokenId),
      { message: 'the control changed whether the token is targeted' },
   ).toBe(targeted);
   await expect(control, 'the control shows the new state').toHaveClass(targeted ? /\bactive\b/ : /^(?!.*\bactive\b)/);
   await closeTokenHud(page, tokenId, centre);
}

/**
 * Removes a placed token from the scene the way a GM does: a click takes control of it and the Delete key removes the
 * controlled token. Open windows stay open.
 * @param {import('@playwright/test').Page} page - A logged-in GM page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<void>} Resolves once the scene no longer holds the token.
 */
export async function deleteTokenWithKey(page, tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await hoverToken(page, tokenId, { keepWindows: true });
   await page.mouse.click(centre.x, centre.y);
   await expect.poll(
      () => page.evaluate(() => canvas.tokens.controlled.map((token) => token.id)),
      { message: 'the click took control of the token' },
   ).toEqual([tokenId]);
   await page.keyboard.press('Delete');
   await expect.poll(
      () => page.evaluate((id) => canvas.scene.tokens.has(id), tokenId),
      { message: 'the Delete key removed the token' },
   ).toBe(false);
}

/**
 * Targets a placed token with the Target key while windows stay open, replacing the other targets.
 * @param {import('@playwright/test').Page} page - A logged-in page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<void>} Resolves once the token is the only target.
 */
export async function retargetWithKey(page, tokenId) {
   await hoverToken(page, tokenId, { keepWindows: true });
   await page.keyboard.press('KeyT');
   await expect.poll(
      () => targetedTokenIds(page),
      { message: 'the Target key left the token as the only target' },
   ).toEqual([tokenId]);
}

/**
 * Targets a placed token with the Target key for a player whose own token stays controlled: the Escape key does not
 * release a Player's only token, so the pointer moves onto the target without releasing control.
 * @param {import('@playwright/test').Page} page - A logged-in page viewing the token's scene.
 * @param {string} tokenId - The token on the viewed scene.
 * @returns {Promise<void>} Resolves once the token is targeted.
 */
export async function targetWithKeyKeepingControl(page, tokenId) {
   /** @type {{x: number, y: number}} The token's centre in client (page) coordinates. */
   const centre = await page.evaluate(
      (id) => canvas.clientCoordinatesFromCanvas(canvas.scene.tokens.get(id).object.center),
      tokenId,
   );
   await restOnToken(page, tokenId, centre);
   await page.keyboard.press('KeyT');
   await expect.poll(
      () => targetedTokenIds(page),
      { message: 'the Target key targeted the token' },
   ).toContain(tokenId);
}

/**
 * Sets a scene's Token Vision box in its Scene Configuration window (Visibility tab), which the Edit entry of the
 * scene's directory context menu opens.
 * @param {import('@playwright/test').Page} page - A logged-in GM page.
 * @param {string} sceneId - The scene.
 * @param {boolean} enabled - Whether Token Vision is on after the save.
 * @returns {Promise<void>} Resolves once the scene stores the state and the window is closed.
 */
export async function setSceneTokenVision(page, sceneId, enabled) {
   /** @type {import('@playwright/test').Locator} The Scenes tab. */
   const panel = await openSidebarTab(page, 'scenes');
   await panel.locator(`.directory-item.entry[data-entry-id="${sceneId}"]`).click({ button: 'right' });
   await chooseContextMenuEntry(
      page,
      page.locator('#context-menu li.context-item', { hasText: /^\s*Edit\s*$/ }),
   );

   /** @type {import('@playwright/test').Locator} The Scene Configuration window. */
   const config = page.locator('.application.scene-config');
   await expect(config, 'the Edit entry opens the Scene Configuration window').toBeVisible();
   await config.locator('nav.tabs [data-tab="visibility"]').click();
   await config.locator('input[name="tokenVision"]').setChecked(enabled);
   await config.locator('button[type="submit"]').click();
   await expect.poll(
      () => page.evaluate((id) => game.scenes.get(id).tokenVision, sceneId),
      { message: 'the window stored Token Vision' },
   ).toBe(enabled);
   await expect(config).toHaveCount(0);
   await settle(page);
}
