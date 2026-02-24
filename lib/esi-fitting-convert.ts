/**
 * Convert ESI fitting format to local Fitting type.
 * ESI items use string flags like "HiSlot0", "LoSlot0", "MedSlot0", etc.
 */

import type { ESIFitting } from "@/types/auth";
import type { EveType, Fitting, FittedModule, SlotType } from "@/types/eve";
import { getType, getModuleSlotType } from "./esi";
import { generateId } from "./utils";
import { ESI_FLAG_TO_SLOT, ESI_SPECIAL_FLAGS } from "./constants";
import { ATTR } from "./constants";

export async function esiFittingToLocal(
  esiFit: ESIFitting,
  shipType: EveType
): Promise<Fitting> {
  const shipAttrs = shipType.dogma_attributes || [];
  const getAttr = (id: number, fallback: number) =>
    shipAttrs.find((a) => a.attribute_id === id)?.value ?? fallback;

  const highSlotCount = Math.min(getAttr(ATTR.HI_SLOTS, 8), 8);
  const midSlotCount = Math.min(getAttr(ATTR.MED_SLOTS, 5), 8);
  const lowSlotCount = Math.min(getAttr(ATTR.LOW_SLOTS, 5), 8);
  const rigSlotCount = 3;

  const fitting: Fitting = {
    id: generateId(),
    name: esiFit.name,
    ship_type_id: esiFit.ship_type_id,
    ship_name: shipType.name,
    ship_group_id: shipType.group_id,
    description: esiFit.description || "",
    tags: [],
    high_slots: Array(highSlotCount).fill(null),
    mid_slots: Array(midSlotCount).fill(null),
    low_slots: Array(lowSlotCount).fill(null),
    rig_slots: Array(rigSlotCount).fill(null),
    subsystem_slots: [],
    drones: [],
    cargo: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  for (const item of esiFit.items) {
    let itemType: EveType;
    try {
      itemType = await getType(item.type_id);
    } catch {
      continue; // Skip items we can't resolve
    }

    // Build flat attribute and effect maps for stats calculation
    const attrs: Record<number, number> = {};
    for (const a of itemType.dogma_attributes ?? []) {
      attrs[a.attribute_id] = a.value;
    }
    const effects = (itemType.dogma_effects ?? []).map((e) => e.effect_id);

    // Check slot-based flags (HiSlot0, MedSlot0, LoSlot0, RigSlot0, SubSystemSlot0)
    const slotInfo = ESI_FLAG_TO_SLOT[item.flag];
    if (slotInfo) {
      const { slotType, index } = slotInfo;
      const state = (slotType === "rig" || slotType === "subsystem") ? "passive" as const : "active" as const;
      const module: FittedModule = {
        id: generateId(),
        type_id: item.type_id,
        name: itemType.name,
        state,
        group_id: itemType.group_id,
        attributes: attrs,
        effects,
        slot_type: slotType,
        slot_index: index,
      };
      const slotArray = getSlotArray(fitting, slotType);
      if (index < slotArray.length) {
        slotArray[index] = module;
      } else {
        const nextIdx = slotArray.findIndex((s) => s === null);
        if (nextIdx !== -1) {
          slotArray[nextIdx] = { ...module, slot_index: nextIdx };
        }
      }
      continue;
    }

    // Check special flags (DroneBay, Cargo, FighterBay)
    const specialSlot = ESI_SPECIAL_FLAGS[item.flag];
    if (specialSlot === "drone") {
      for (let i = 0; i < item.quantity; i++) {
        fitting.drones.push({
          id: i === 0 ? generateId() : generateId(),
          type_id: item.type_id,
          name: itemType.name,
          state: "active",
          group_id: itemType.group_id,
          attributes: attrs,
          effects,
          slot_type: "drone",
          slot_index: fitting.drones.length,
        });
      }
      continue;
    }

    if (specialSlot === "cargo") {
      fitting.cargo.push({
        id: generateId(),
        type_id: item.type_id,
        name: itemType.name,
        state: "passive",
        group_id: itemType.group_id,
        attributes: attrs,
        effects,
        slot_type: "cargo",
        slot_index: fitting.cargo.length,
      });
      continue;
    }

    // Unknown flag — try to detect slot type from module effects
    const detectedSlot = await getModuleSlotType(item.type_id).catch(() => null);
    if (detectedSlot && detectedSlot !== "drone") {
      const st = detectedSlot as SlotType;
      const state = (st === "rig" || st === "subsystem") ? "passive" as const : "active" as const;
      const slotArray = getSlotArray(fitting, st);
      const nextIdx = slotArray.findIndex((s) => s === null);
      if (nextIdx !== -1) {
        slotArray[nextIdx] = {
          id: generateId(),
          type_id: item.type_id,
          name: itemType.name,
          state,
          group_id: itemType.group_id,
          attributes: attrs,
          effects,
          slot_type: st,
          slot_index: nextIdx,
        };
      }
    }
  }

  return fitting;
}

function getSlotArray(fitting: Fitting, slotType: SlotType): (FittedModule | null)[] {
  switch (slotType) {
    case "high": return fitting.high_slots;
    case "mid": return fitting.mid_slots;
    case "low": return fitting.low_slots;
    case "rig": return fitting.rig_slots;
    case "subsystem": return fitting.subsystem_slots;
    default: return [];
  }
}
