export default function registerTooltipSettings() {
   class TitanTooltipManager extends TitanTooltipManager {
      static TOOLTIP_ACTIVATION_MS = 2000;
   }
   game.tooltip = new TitanTooltipManager();
}