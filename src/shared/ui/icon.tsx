"use client";

import type { ComponentType, CSSProperties } from "react";
import { Flame } from "lucide-react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as P from "@getpapillon/papicons";

const registry = Icons as unknown as Record<string, LucideIcon>;

type PapiIcon = ComponentType<{ className?: string; style?: CSSProperties }>;

/**
 * Noms d'icônes (format Lucide, tels que stockés en base) → équivalent Papicons.
 * Papicons ne compte qu'une centaine d'icônes : tout nom absent d'ici
 * retombe sur Lucide.
 */
export const PAPICONS: Record<string, PapiIcon> = {
  // actions
  check: P.Check,
  "check-circle": P.Check,
  "clipboard-check": P.Tasks,
  "list-checks": P.Tasks,
  "clipboard-list": P.Tasks,
  plus: P.Plus,
  minus: P.Minus,
  x: P.Cross,
  trash: P.Trash,
  "trash-2": P.Trash,
  pencil: P.Pen,
  "pen-line": P.PenAlt,
  "notebook-pen": P.PenAlt,
  search: P.Search,
  filter: P.Filter,
  menu: P.Menu,
  "more-horizontal": P.Dots,
  "external-link": P.ExternalLink,
  link: P.Link,
  play: P.Play,
  pause: P.Pause,
  download: P.ArrowDownBox,
  upload: P.ArrowUpBox,
  lock: P.Lock,
  unlock: P.Unlock,
  "log-in": P.Login,
  "log-out": P.Logout,
  // flèches
  "chevron-left": P.ChevronLeft,
  "chevron-right": P.ChevronRight,
  "chevron-up": P.ChevronUp,
  "chevron-down": P.ChevronDown,
  "arrow-up": P.ArrowUp,
  "arrow-down": P.ArrowDown,
  "arrow-left": P.ArrowLeft,
  "arrow-right": P.ArrowRight,
  "trending-up": P.ArrowRightUp,
  "trending-down": P.ArrowRightDown,
  // alertes & infos
  "alert-triangle": P.AlertTriangle,
  "alert-circle": P.AlertCircle,
  siren: P.Alert,
  info: P.Info,
  bell: P.Bell,
  // temps
  clock: P.Clock,
  timer: P.Clock,
  "alarm-clock": P.Clock,
  calendar: P.Calendar,
  "calendar-days": P.Calendar,
  "calendar-range": P.Calendar,
  sun: P.Sun,
  sunrise: P.Sunrise,
  moon: P.Moon,
  "moon-star": P.Moon,
  // navigation & structure
  home: P.Home,
  "layout-dashboard": P.Grid,
  "columns-3": P.Grid,
  list: P.List,
  archive: P.Archive,
  folder: P.Folder,
  settings: P.Gears,
  "settings-2": P.Gears,
  map: P.Globe,
  "map-pin": P.MapPin,
  globe: P.Globe,
  "pie-chart": P.Pie,
  // contenus
  "file-text": P.Paper,
  scroll: P.Paper,
  "scroll-text": P.Paper,
  newspaper: P.Newspaper,
  quote: P.TextBubble,
  "message-circle": P.TextBubble,
  "message-square": P.TextBubble,
  mail: P.Mail,
  phone: P.Phone,
  smartphone: P.Phone,
  camera: P.Camera,
  image: P.Gallery,
  code: P.Code,
  palette: P.Palette,
  brush: P.Palette,
  "graduation-cap": P.GraduationHat,
  landmark: P.Pillar,
  // vie quotidienne
  user: P.User,
  users: P.User,
  heart: P.Heart,
  "heart-pulse": P.Heart,
  star: P.Star,
  sparkles: P.Sparkles,
  crown: P.Crown,
  smile: P.Emoji,
  ghost: P.Ghost,
  utensils: P.Cutlery,
  "chef-hat": P.Cutlery,
  apple: P.Apple,
  car: P.Car,
  bus: P.Bus,
  footprints: P.Walk,
  coins: P.PiggyBank,
  wallet: P.PiggyBank,
  "piggy-bank": P.PiggyBank,
  armchair: P.Chair,
};

function toPascal(name: string): string {
  return name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function DynIcon({
  name,
  className,
  strokeWidth = 1.8,
  style,
}: {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  const Papi = name ? PAPICONS[name] : undefined;
  if (Papi) return <Papi className={className} style={style} />;
  const C = name ? registry[toPascal(name)] : undefined;
  if (!C) return <Flame className={className} strokeWidth={strokeWidth} style={style} />;
  return <C className={className} strokeWidth={strokeWidth} style={style} />;
}
