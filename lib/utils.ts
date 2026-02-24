import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SlotType, FittedModule, Fitting } from "@/types/eve";
import { SLOT_EFFECT_IDS, MODULE_SLOT_BY_GROUP } from "./constants";

// ─── Tailwind helper ──────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── UUID generator ───────────────────────────────────────────────────────────
export function generateId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Slot type detection ──────────────────────────────────────────────────────

export function getSlotTypeFromEffects(
  effectIds: number[]
): "high" | "mid" | "low" | "rig" | "subsystem" | null {
  if (effectIds.includes(SLOT_EFFECT_IDS.HIGH_SLOT)) return "high";
  if (effectIds.includes(SLOT_EFFECT_IDS.MED_SLOT)) return "mid";
  if (effectIds.includes(SLOT_EFFECT_IDS.LOW_SLOT)) return "low";
  if (effectIds.includes(SLOT_EFFECT_IDS.RIG_SLOT)) return "rig";
  if (effectIds.includes(SLOT_EFFECT_IDS.SUBSYSTEM)) return "subsystem";
  return null;
}

export function getSlotTypeFromGroupId(
  groupId: number
): "high" | "mid" | "low" | "rig" | "subsystem" | undefined {
  return MODULE_SLOT_BY_GROUP[groupId] as
    | "high"
    | "mid"
    | "low"
    | "rig"
    | "subsystem"
    | undefined;
}

// ─── Number formatting ────────────────────────────────────────────────────────

export function formatNumber(
  value: number,
  decimals = 0,
  suffix = ""
): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B${suffix}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M${suffix}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}k${suffix}`;
  }
  return `${value.toFixed(decimals)}${suffix}`;
}

export function formatHP(hp: number): string {
  return formatNumber(hp, 0);
}

export function formatDPS(dps: number): string {
  return dps.toFixed(1);
}

export function formatRange(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function formatSpeed(ms: number): string {
  return `${Math.round(ms)} m/s`;
}

export function formatMass(kg: number): string {
  if (kg >= 1_000_000) {
    return `${(kg / 1_000_000).toFixed(2)} Mt`;
  }
  return `${(kg / 1_000).toFixed(0)} kt`;
}

export function formatCap(gj: number): string {
  return `${gj.toFixed(0)} GJ`;
}

export function formatResist(resonance: number): string {
  const resist = (1 - resonance) * 100;
  return `${resist.toFixed(1)}%`;
}

export function resistToPercent(resonance: number): number {
  return (1 - resonance) * 100;
}

// ─── Fitting helpers ──────────────────────────────────────────────────────────

export function createEmptySlots(count: number): (FittedModule | null)[] {
  return Array(count).fill(null);
}

export function createEmptyFitting(
  shipTypeId: number,
  shipName: string,
  highSlots = 8,
  midSlots = 4,
  lowSlots = 4,
  rigSlots = 3
): Fitting {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "New Fitting",
    ship_type_id: shipTypeId,
    ship_name: shipName,
    description: "",
    tags: [],
    high_slots: createEmptySlots(highSlots),
    mid_slots: createEmptySlots(midSlots),
    low_slots: createEmptySlots(lowSlots),
    rig_slots: createEmptySlots(rigSlots),
    subsystem_slots: createEmptySlots(0),
    drones: [],
    cargo: [],
    created_at: now,
    updated_at: now,
  };
}

export function getSlotArray(
  fitting: Fitting,
  slotType: SlotType
): (FittedModule | null)[] {
  switch (slotType) {
    case "high":
      return fitting.high_slots;
    case "mid":
      return fitting.mid_slots;
    case "low":
      return fitting.low_slots;
    case "rig":
      return fitting.rig_slots;
    case "subsystem":
      return fitting.subsystem_slots;
    default:
      return [];
  }
}

export function countFittedModules(fitting: Fitting): number {
  return [
    ...fitting.high_slots,
    ...fitting.mid_slots,
    ...fitting.low_slots,
    ...fitting.rig_slots,
    ...fitting.subsystem_slots,
  ].filter(Boolean).length;
}

// ─── Slot type label/color ────────────────────────────────────────────────────

export const SLOT_LABELS: Record<SlotType, string> = {
  high: "High",
  mid: "Mid",
  low: "Low",
  rig: "Rig",
  subsystem: "Sub",
  drone: "Drone",
  cargo: "Cargo",
};

export const SLOT_COLORS: Record<SlotType, string> = {
  high: "eve-high",
  mid: "eve-mid",
  low: "eve-low",
  rig: "eve-rig",
  subsystem: "text-purple-400",
  drone: "text-green-400",
  cargo: "text-gray-400",
};

// ─── Meta level colors ────────────────────────────────────────────────────────

export function getMetaColor(metaLevel?: number, techLevel?: number): string {
  if (techLevel === 2) return "text-blue-400";   // T2 - blue
  if (techLevel === 3) return "text-yellow-300"; // T3 - gold
  if ((metaLevel ?? 0) >= 10) return "text-purple-400"; // Faction/Officer
  if ((metaLevel ?? 0) >= 5) return "text-blue-300";  // Deadspace
  if ((metaLevel ?? 0) >= 1) return "text-green-400";  // Named
  return "text-gray-300"; // T1
}

export function getMetaLabel(metaLevel?: number, techLevel?: number): string {
  if (techLevel === 2) return "T2";
  if (techLevel === 3) return "T3";
  if ((metaLevel ?? 0) >= 10) return "Officer";
  if ((metaLevel ?? 0) >= 7) return "Deadspace";
  if ((metaLevel ?? 0) >= 5) return "Faction";
  if ((metaLevel ?? 0) >= 1) return "Named";
  return "T1";
}

// ─── Damage type colors ────────────────────────────────────────────────────────

export const DAMAGE_COLORS = {
  em: { bg: "bg-blue-500", text: "text-blue-400", hex: "#3b82f6" },
  thermal: { bg: "bg-red-500", text: "text-red-400", hex: "#ef4444" },
  kinetic: { bg: "bg-gray-400", text: "text-gray-300", hex: "#9ca3af" },
  explosive: { bg: "bg-orange-500", text: "text-orange-400", hex: "#f97316" },
} as const;

// ─── Capacitor stability ──────────────────────────────────────────────────────

/**
 * Simulate capacitor over time to find stability
 * Uses EVE's capacitor recharge formula: dC/dt = (capacity/tau) * 10 * (sqrt(C/capacity) - C/capacity)
 */
export function simulateCap(
  capacity: number,
  rechargeMs: number,
  drainPerSecond: number,
  maxSimSeconds = 600
): { stable: boolean; stablePercent?: number; lastsSeconds?: number } {
  if (drainPerSecond <= 0) {
    return { stable: true, stablePercent: 100 };
  }

  const tau = rechargeMs / 1000; // convert ms to seconds
  const dt = 0.1; // simulation step in seconds
  let cap = capacity;
  const peakRecharge = (2.5 * capacity) / tau; // at 25% cap

  // Quick check: if drain > peak recharge, definitely unstable
  if (drainPerSecond > peakRecharge * 1.1) {
    // Simulate anyway to find how long it lasts
    for (let t = 0; t < maxSimSeconds; t += dt) {
      const fraction = Math.max(cap / capacity, 0);
      const recharge = (capacity / tau) * 10 * (Math.sqrt(fraction) - fraction);
      cap += (recharge - drainPerSecond) * dt;
      if (cap <= 0) {
        return { stable: false, lastsSeconds: t };
      }
    }
    return { stable: false, lastsSeconds: maxSimSeconds };
  }

  // Simulate to find stable percentage
  let prevCap = cap;
  for (let t = 0; t < maxSimSeconds; t += dt) {
    const fraction = Math.max(cap / capacity, 0);
    const recharge = (capacity / tau) * 10 * (Math.sqrt(fraction) - fraction);
    cap += (recharge - drainPerSecond) * dt;

    if (cap <= 0) {
      return { stable: false, lastsSeconds: t };
    }

    // Check if stabilized (delta < 0.01 GJ over step)
    if (t > 10 && Math.abs(cap - prevCap) < 0.01 * dt * 10) {
      return {
        stable: true,
        stablePercent: Math.round((cap / capacity) * 100),
      };
    }
    prevCap = cap;
  }

  // Reached max sim time - consider stable
  return {
    stable: true,
    stablePercent: Math.round((cap / capacity) * 100),
  };
}

// ─── Align time calculation ───────────────────────────────────────────────────

export function calculateAlignTime(mass: number, agility: number): number {
  // alignTime = -ln(0.25) × agility × mass / 1,000,000
  return (-Math.log(0.25) * agility * mass) / 1_000_000;
}

// ─── EHP calculation ──────────────────────────────────────────────────────────

export function calculateEHP(hp: number, avgResonance: number): number {
  if (avgResonance >= 1) return hp;
  return hp / avgResonance;
}

export function avgResonance(
  em: number,
  thermal: number,
  kinetic: number,
  explosive: number
): number {
  return (em + thermal + kinetic + explosive) / 4;
}

// ─── Local storage helpers ────────────────────────────────────────────────────

export function saveFittingToLocal(fitting: Fitting): void {
  if (typeof window === "undefined") return;
  const key = `eve-fitting-${fitting.id}`;
  localStorage.setItem(key, JSON.stringify(fitting));

  // Update index
  const index = getFittingIndex();
  if (!index.includes(fitting.id)) {
    index.push(fitting.id);
    localStorage.setItem("eve-fitting-index", JSON.stringify(index));
  }
}

export function loadFittingFromLocal(id: string): Fitting | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`eve-fitting-${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Fitting;
  } catch {
    return null;
  }
}

export function getFittingIndex(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("eve-fitting-index");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function loadAllFittings(): Fitting[] {
  const index = getFittingIndex();
  return index.map((id) => loadFittingFromLocal(id)).filter(Boolean) as Fitting[];
}

export function deleteFittingFromLocal(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`eve-fitting-${id}`);
  const index = getFittingIndex().filter((i) => i !== id);
  localStorage.setItem("eve-fitting-index", JSON.stringify(index));
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = String(item[key]);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}
