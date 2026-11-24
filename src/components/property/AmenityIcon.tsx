"use client";

import React from "react";
import {
  Baby,
  Bath,
  Bike,
  BookOpen,
  Building2,
  Bus,
  Car,
  Check,
  ChefHat,
  Coffee,
  Compass,
  ConciergeBell,
  Dumbbell,
  Film,
  Flame,
  HeartPulse,
  Home,
  KeyRound,
  Lock,
  Luggage,
  Mountain,
  PawPrint,
  Plane,
  ShieldCheck,
  Ship,
  Shirt,
  Sparkles,
  Sun,
  Tent,
  Trees,
  Trophy,
  Tv,
  Umbrella,
  UtensilsCrossed,
  Waves,
  Wifi,
  Wine,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Baby,
  Bath,
  Bike,
  BookOpen,
  Building2,
  Bus,
  Car,
  Check,
  ChefHat,
  Coffee,
  Compass,
  ConciergeBell,
  Dumbbell,
  Film,
  Flame,
  HeartPulse,
  Home,
  KeyRound,
  Lock,
  Luggage,
  Mountain,
  PawPrint,
  Plane,
  ShieldCheck,
  Ship,
  Shirt,
  Sparkles,
  Sun,
  Tent,
  Trees,
  Trophy,
  Tv,
  Umbrella,
  UtensilsCrossed,
  Waves,
  Wifi,
  Wine,
};

export interface AmenityIconProps {
  name: string;
  className?: string;
}

export function AmenityIcon({ name, className = "w-4 h-4" }: AmenityIconProps) {
  const Icon = ICON_MAP[name] ?? Check;
  return <Icon className={className} aria-hidden="true" />;
}
