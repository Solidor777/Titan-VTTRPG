/** @type {number} Pixels of slack when deciding that a scrolled log sits at its bottom edge (sub-pixel layout). */
const BOTTOM_TOLERANCE = 2;

/**
 * Keeps a chat log at its bottom edge when a card in it grows after it was added. Core scrolls a log once, right after
 * it appends a message (`ChatLog#postOne`, Foundry 14.364 `client/applications/sidebar/tabs/chat.mjs`), but a card's
 * content can still be filling in then: a rules element message is enriched asynchronously (`RichText.svelte`), so the
 * card gains height after that single scroll and would push the bottom out of view.
 * The log counts as having been at its bottom when the distance from its bottom edge is no more than the card's
 * growth, which compares the log with its state before the growth without relying on core's scroll-event bookkeeping
 * (a scroll event lands a frame after the scroll, and the growth can land first). A log the user scrolled up is not
 * moved. Cards outside a scrolling log (the notification pane) are ignored.
 * @param {HTMLElement} element - The rendered chat card root element.
 * @returns {void}
 */
export default function keepLogAtBottom(element) {
   /** @type {number} The card's height at the last observation. */
   let previousHeight = 0;

   /** @type {boolean} Whether the card has been observed connected to the document. */
   let seen = false;

   /** @type {ResizeObserver} Observer of the card's box; it releases itself once the card has left the document. */
   const observer = new ResizeObserver((entries) => {
      if (!element.isConnected) {
         if (seen) {
            observer.disconnect();
         }
         return;
      }
      seen = true;

      /** @type {number} The card's height now. */
      const height = entries.at(-1).borderBoxSize[0].blockSize;

      /** @type {number} How much taller the card became since the last observation. */
      const growth = height - previousHeight;
      previousHeight = height;

      /** @type {HTMLElement | null} The scrolling element of the log that holds the card. */
      const log = element.closest('.chat-scroll');
      if (!log || growth <= 0) {
         return;
      }

      /** @type {number} The distance from the bottom of the visible part to the bottom of the content. */
      const distance = log.scrollHeight - log.clientHeight - log.scrollTop;
      if (distance - growth <= BOTTOM_TOLERANCE) {
         log.scrollTop = log.scrollHeight;
      }
   });
   observer.observe(element);
}
