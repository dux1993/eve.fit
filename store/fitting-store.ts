"use client";

import { create } from "zustand";
import {
  Fitting,
  FittedModule,
  SlotType,
  ShipStats,
  EveType,
  ModuleState,
  SkillMode,
  SkillMap,
  SkillDeltas,
} from "@/types/eve";
import {
  generateId,
  createEmptyFitting,
  saveFittingToLocal,
  loadFittingFromLocal,
  loadAllFittings,
  deleteFittingFromLocal,
} from "@/lib/utils";
import { calculateShipStats } from "@/lib/stats";
import { applySkillBonuses, allLevelVSkillMap } from "@/lib/skills";

// ─── Store types ─────────────────────────────────────────────────────────────

interface FittingStore {
  // State
  fitting: Fitting | null;
  shipType: EveType | null;
  stats: ShipStats | null;
  skillMode: SkillMode;
  skillMap: SkillMap | null;       // populated for mySkills mode
  skillDeltas: SkillDeltas | null;
  savedFittings: Fitting[];
  activeSlot: { slotType: SlotType; index: number } | null;
  moduleSearchOpen: boolean;
  eftImportOpen: boolean;
  dirty: boolean;

  // Ship actions
  setShip: (shipType: EveType, slotCounts?: SlotCounts) => void;
  clearShip: () => void;

  // Fitting metadata
  setFitName: (name: string) => void;
  setDescription: (desc: string) => void;

  // Module actions
  addModule: (slotType: SlotType, index: number, module: Omit<FittedModule, "id" | "slot_type" | "slot_index">) => void;
  fillSlots: (slotType: SlotType, module: Omit<FittedModule, "id" | "slot_type" | "slot_index">) => void;
  removeModule: (slotType: SlotType, index: number) => void;
  toggleModuleState: (slotType: SlotType, index: number) => void;
  setModuleCharge: (slotType: SlotType, index: number, charge: FittedModule["charge"]) => void;

  // Drone actions
  addDrone: (drone: Omit<FittedModule, "id" | "slot_type" | "slot_index">) => void;
  removeDrone: (index: number) => void;

  // Slot selection (for module search)
  selectSlot: (slotType: SlotType, index: number) => void;
  clearSlotSelection: () => void;

  // Module search
  openModuleSearch: (slotType?: SlotType, index?: number) => void;
  closeModuleSearch: () => void;

  // EFT import
  openEFTImport: () => void;
  closeEFTImport: () => void;

  // Persistence
  saveFitting: () => void;
  loadFitting: (id: string) => void;
  deleteFitting: (id: string) => void;
  loadSavedFittings: () => void;

  // Import a complete fitting object (e.g. from EFT parse)
  importFitting: (fitting: Fitting, shipType: EveType) => void;

  // Skill actions
  setSkillMode: (mode: SkillMode) => void;
  setMySkills: (skills: SkillMap) => void;

  // Stats recompute
  recomputeStats: () => void;
}

interface SlotCounts {
  highSlots?: number;
  midSlots?: number;
  lowSlots?: number;
  rigSlots?: number;
  subsystemSlots?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSlotArrayKey(slotType: SlotType): keyof Fitting | null {
  switch (slotType) {
    case "high": return "high_slots";
    case "mid": return "mid_slots";
    case "low": return "low_slots";
    case "rig": return "rig_slots";
    case "subsystem": return "subsystem_slots";
    default: return null;
  }
}

function cloneFitting(f: Fitting): Fitting {
  return JSON.parse(JSON.stringify(f));
}

function loadSkillMode(): SkillMode {
  if (typeof window === "undefined") return "allV";
  return (localStorage.getItem("eve-skill-mode") as SkillMode) ?? "allV";
}

function saveSkillMode(mode: SkillMode): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("eve-skill-mode", mode);
  }
}

/** Compute stats with optional skill bonuses applied */
function computeStatsWithSkills(
  shipType: EveType,
  fitting: Fitting,
  skillMode: SkillMode,
  skillMap: SkillMap | null
): { stats: ShipStats; skillDeltas: SkillDeltas | null } {
  const stats = calculateShipStats(shipType, fitting);

  if (skillMode === "none") {
    return { stats, skillDeltas: null };
  }

  const skills =
    skillMode === "allV"
      ? allLevelVSkillMap()
      : skillMap;

  if (!skills) {
    return { stats, skillDeltas: null };
  }

  const skillDeltas = applySkillBonuses(stats, skills);
  return { stats, skillDeltas };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useFittingStore = create<FittingStore>((set, get) => ({
  // Initial state
  fitting: null,
  shipType: null,
  stats: null,
  skillMode: loadSkillMode(),
  skillMap: null,
  skillDeltas: null,
  savedFittings: [],
  activeSlot: null,
  moduleSearchOpen: false,
  eftImportOpen: false,
  dirty: false,

  // ─── Ship actions ────────────────────────────────────────────────────────

  setShip: (shipType, slotCounts) => {
    const fitting = createEmptyFitting(
      shipType.type_id,
      shipType.name,
      slotCounts?.highSlots ?? 8,
      slotCounts?.midSlots ?? 5,
      slotCounts?.lowSlots ?? 5,
      slotCounts?.rigSlots ?? 3
    );
    if (slotCounts?.subsystemSlots) {
      fitting.subsystem_slots = Array(slotCounts.subsystemSlots).fill(null);
    }
    const { skillMode, skillMap } = get();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, fitting, skillMode, skillMap);
    set({ fitting, shipType, stats, skillDeltas, dirty: false });
  },

  clearShip: () => {
    set({ fitting: null, shipType: null, stats: null, skillDeltas: null, activeSlot: null, dirty: false });
  },

  // ─── Metadata ────────────────────────────────────────────────────────────

  setFitName: (name) => {
    const { fitting } = get();
    if (!fitting) return;
    const updated = cloneFitting(fitting);
    updated.name = name;
    updated.updated_at = new Date().toISOString();
    set({ fitting: updated, dirty: true });
  },

  setDescription: (desc) => {
    const { fitting } = get();
    if (!fitting) return;
    const updated = cloneFitting(fitting);
    updated.description = desc;
    updated.updated_at = new Date().toISOString();
    set({ fitting: updated, dirty: true });
  },

  // ─── Module actions ──────────────────────────────────────────────────────

  addModule: (slotType, index, moduleData) => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;

    const key = getSlotArrayKey(slotType);
    if (!key) return;

    const updated = cloneFitting(fitting);
    const slots = updated[key] as (FittedModule | null)[];
    if (index < 0 || index >= slots.length) return;

    slots[index] = {
      ...moduleData,
      id: generateId(),
      slot_type: slotType,
      slot_index: index,
    } as FittedModule;

    updated.updated_at = new Date().toISOString();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats, skillDeltas, dirty: true });
  },

  fillSlots: (slotType, moduleData) => {
    const { fitting, shipType, stats, skillMode, skillMap } = get();
    if (!fitting || !shipType || !stats) return;

    const key = getSlotArrayKey(slotType);
    if (!key) return;

    const updated = cloneFitting(fitting);
    const slots = updated[key] as (FittedModule | null)[];

    // Determine hardpoint limit for turrets/launchers
    const effects = moduleData.effects ?? [];
    const isTurret = effects.includes(42); // turretFitted
    const isLauncher = effects.includes(40); // launcherFitted

    let hardpointLimit = slots.length;
    if (isTurret) {
      hardpointLimit = stats.turret_hardpoints;
    } else if (isLauncher) {
      hardpointLimit = stats.launcher_hardpoints;
    }

    // Count how many of this hardpoint type are already fitted
    let hardpointsUsed = 0;
    if (isTurret || isLauncher) {
      for (const mod of slots) {
        if (!mod) continue;
        const modEffects = mod.effects ?? [];
        if (isTurret && modEffects.includes(42)) hardpointsUsed++;
        if (isLauncher && modEffects.includes(40)) hardpointsUsed++;
      }
    }

    let filled = 0;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] !== null) continue;
      if ((isTurret || isLauncher) && hardpointsUsed + filled >= hardpointLimit) break;

      slots[i] = {
        ...moduleData,
        id: generateId(),
        slot_type: slotType,
        slot_index: i,
      } as FittedModule;
      filled++;
    }

    if (filled === 0) return;

    updated.updated_at = new Date().toISOString();
    const result = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats: result.stats, skillDeltas: result.skillDeltas, dirty: true });
  },

  removeModule: (slotType, index) => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;

    const key = getSlotArrayKey(slotType);
    if (!key) return;

    const updated = cloneFitting(fitting);
    const slots = updated[key] as (FittedModule | null)[];
    if (index < 0 || index >= slots.length) return;

    slots[index] = null;
    updated.updated_at = new Date().toISOString();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats, skillDeltas, dirty: true });
  },

  toggleModuleState: (slotType, index) => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;

    const key = getSlotArrayKey(slotType);
    if (!key) return;

    const updated = cloneFitting(fitting);
    const slots = updated[key] as (FittedModule | null)[];
    const mod = slots[index];
    if (!mod) return;

    const cycle: ModuleState[] = ["active", "passive", "offline"];
    const currentIdx = cycle.indexOf(mod.state);
    mod.state = cycle[(currentIdx + 1) % cycle.length];

    updated.updated_at = new Date().toISOString();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats, skillDeltas, dirty: true });
  },

  setModuleCharge: (slotType, index, charge) => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;

    const key = getSlotArrayKey(slotType);
    if (!key) return;

    const updated = cloneFitting(fitting);
    const slots = updated[key] as (FittedModule | null)[];
    const mod = slots[index];
    if (!mod) return;

    mod.charge = charge;
    updated.updated_at = new Date().toISOString();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats, skillDeltas, dirty: true });
  },

  // ─── Drones ──────────────────────────────────────────────────────────────

  addDrone: (droneData) => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;

    const updated = cloneFitting(fitting);
    updated.drones.push({
      ...droneData,
      id: generateId(),
      slot_type: "drone",
      slot_index: updated.drones.length,
    } as FittedModule);

    updated.updated_at = new Date().toISOString();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats, skillDeltas, dirty: true });
  },

  removeDrone: (index) => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;

    const updated = cloneFitting(fitting);
    updated.drones.splice(index, 1);
    // Re-index
    updated.drones.forEach((d, i) => { d.slot_index = i; });

    updated.updated_at = new Date().toISOString();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, updated, skillMode, skillMap);
    set({ fitting: updated, stats, skillDeltas, dirty: true });
  },

  // ─── Slot selection ──────────────────────────────────────────────────────

  selectSlot: (slotType, index) => {
    set({ activeSlot: { slotType, index } });
  },

  clearSlotSelection: () => {
    set({ activeSlot: null });
  },

  // ─── Module search ─────────────────────────────────────────────────────

  openModuleSearch: (slotType, index) => {
    if (slotType !== undefined && index !== undefined) {
      set({ moduleSearchOpen: true, activeSlot: { slotType, index } });
    } else {
      set({ moduleSearchOpen: true });
    }
  },

  closeModuleSearch: () => {
    set({ moduleSearchOpen: false, activeSlot: null });
  },

  // ─── EFT import ─────────────────────────────────────────────────────────

  openEFTImport: () => set({ eftImportOpen: true }),
  closeEFTImport: () => set({ eftImportOpen: false }),

  // ─── Persistence ─────────────────────────────────────────────────────────

  saveFitting: () => {
    const { fitting } = get();
    if (!fitting) return;
    saveFittingToLocal(fitting);
    set({ dirty: false });
    get().loadSavedFittings();
  },

  loadFitting: (id) => {
    const fitting = loadFittingFromLocal(id);
    if (!fitting) return;
    // Note: shipType would need to be refetched from ESI
    set({ fitting, dirty: false });
  },

  deleteFitting: (id) => {
    deleteFittingFromLocal(id);
    get().loadSavedFittings();
  },

  loadSavedFittings: () => {
    const fittings = loadAllFittings();
    set({ savedFittings: fittings });
  },

  // ─── Import complete fitting ─────────────────────────────────────────────

  importFitting: (fitting, shipType) => {
    const { skillMode, skillMap } = get();
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, fitting, skillMode, skillMap);
    set({ fitting, shipType, stats, skillDeltas, dirty: false });
  },

  // ─── Skill actions ─────────────────────────────────────────────────────

  setSkillMode: (mode) => {
    saveSkillMode(mode);
    const { fitting, shipType, skillMap } = get();
    if (!fitting || !shipType) {
      set({ skillMode: mode, skillDeltas: null });
      return;
    }
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, fitting, mode, skillMap);
    set({ skillMode: mode, stats, skillDeltas });
  },

  setMySkills: (skills) => {
    const { fitting, shipType, skillMode } = get();
    if (!fitting || !shipType) {
      set({ skillMap: skills });
      return;
    }
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, fitting, skillMode, skills);
    set({ skillMap: skills, stats, skillDeltas });
  },

  // ─── Stats recompute ─────────────────────────────────────────────────────

  recomputeStats: () => {
    const { fitting, shipType, skillMode, skillMap } = get();
    if (!fitting || !shipType) return;
    const { stats, skillDeltas } = computeStatsWithSkills(shipType, fitting, skillMode, skillMap);
    set({ stats, skillDeltas });
  },
}));
