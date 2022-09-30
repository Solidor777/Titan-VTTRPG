export default function registerTooltipSettings() {
   class TitanTooltipManager extends TooltipManager {
      static TOOLTIP_ACTIVATION_MS = 1500;
   }
   game.tooltip = new TitanTooltipManager();
}