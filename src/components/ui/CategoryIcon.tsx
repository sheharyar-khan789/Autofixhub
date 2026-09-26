import {
  BatteryCharging, Car, CircleDot, ClipboardCheck, Cog, Disc, Fuel, Hammer, PlugZap,
  ScanSearch, Settings2, Snowflake, Wind, Wrench, Zap, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  "clipboard-check": ClipboardCheck,
  "scan-search": ScanSearch,
  cog: Cog,
  disc: Disc,
  "settings-2": Settings2,
  car: Car,
  snowflake: Snowflake,
  zap: Zap,
  "battery-charging": BatteryCharging,
  "circle-dot": CircleDot,
  wind: Wind,
  fuel: Fuel,
  "plug-zap": PlugZap,
  hammer: Hammer,
};

export function CategoryIcon({ iconKey, className = "h-5 w-5" }: { iconKey?: string; className?: string }) {
  const Icon = (iconKey && ICONS[iconKey]) || Wrench;
  return <Icon className={className} aria-hidden="true" />;
}
