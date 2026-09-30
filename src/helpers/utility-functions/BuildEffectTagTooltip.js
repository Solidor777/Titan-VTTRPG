import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Builds the tooltip of a report effect tag: the duration lead text when the tag has one, then the entry's description
 * when it is not blank. A condition entry's description is localized on this client from its stored key; any other
 * entry shows the text it stores (an effect's own description, or a condition's in a report posted before conditions
 * stored keys). The text is already localized, so the returned TextData tells the tooltip action not to localize it
 * again (it localizes a plain string as a key).
 * @param {EffectTagEffectData} effect - The report entry.
 * @param {string} [leadKey] - The localization key of the duration text the tooltip leads with
 * (`effect.<type>.desc`, passed by each duration's tag); a condition entry has none.
 * @returns {TextData} The already-localized lead and description, marked not to be localized again.
 */
export default function buildEffectTagTooltip(effect, leadKey) {
   /** @type {string|undefined} The entry's description HTML. */
   const description = effect.descriptionKey ? localize(effect.descriptionKey) : effect.description;
   return {
      localize: false,
      text: localize(leadKey) + (isHTMLBlank(description) ? '' : description),
   };
}
