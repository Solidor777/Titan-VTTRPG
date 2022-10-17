export default function registerTooltipSettings() {
   // eslint-disable-next-line no-undef
   class TitanTooltipManager extends TooltipManager {
      static TOOLTIP_ACTIVATION_MS = 1500;
   }
   game.tooltip = new TitanTooltipManager();
}