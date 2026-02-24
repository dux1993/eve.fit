/**
 * Convert ESI fitting format to local Fitting type.
 * ESI items use "flag" integers to indicate slot position.
 */

import type { ESIFitting } from "@/types/auth";
import type { EveType, Fitting, FittedModule, SlotType } from "@/types/eve";
import { getType, getGroup, getModuleSlotType } from "./esi";
import { generateId } from "./utils";
import { ESI_FLAG_TO_SLOT, slotToEsiFlag } from "./constants";
import { ATTR } from "./constants";

export async function esiFittingToLocal(
  esiFit: ESIFitting,
  shipType: EveType
): Promise<Fitting> {
  const attrs = shipType.dogma_attributes || [];
  const getAttr = (id: number, fallback: number) =>
    attrs.find((a) => a.attribute_id === id)?.value ?? fallback;

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

  // Track slot indices per type
  const slotIndices: Record<string, number> = {
    high: 0,
    mid: 0,
    low: 0,
    rig: 0,
    subsystem: 0,
  };

  for (const item of esiFit.items) {
    console.log('[ESI fitting] item flag:', JSON.stringify(item.flag), 'type_id:', item.type_id);
    const flagInfo = ESI_FLAG_TO_SLOT[item.flag];

    let itemType: EveType;
    try {
      itemType = await getType(item.type_id);
    } catch {
      continue; // Skip items we can't resolve
    }

    const module: Omit<FittedModule, "slot_type" | "slot_index"> = {
      id: generateId(),
      type_id: item.type_id,
      name: itemType.name,
      state: "active" as const,
      group_id: itemType.group_id,
    };

    if (flagInfo) {
      const { slotType, index } = flagInfo;

      if (slotType === "drone") {
        for (let i = 0; i < item.quantity; i++) {
          fitting.drones.push({
            ...module,
            slot_type: "drone",
            slot_index: fitting.drones.length,
          });
        }
        continue;
      }

      if (slotType === "cargo") {
        fitting.cargo.push({
          ...module,
          slot_type: "cargo",
          slot_index: fitting.cargo.length,
        });
        continue;
      }

      // Slot-based modules
      const slotArray = getSlotArray(fitting, slotType);
      if (index !== undefined && index < slotArray.length) {
        slotArray[index] = {
          ...module,
          slot_type: slotType,
          slot_index: index,
        };
      } else {
        // Find next empty slot
        const nextIdx = slotArray.findIndex((s) => s === null);
        if (nextIdx !== -1) {
          slotArray[nextIdx] = {
            ...module,
            slot_type: slotType,
            slot_index: nextIdx,
          };
        }
      }
    } else {
      // Unknown flag — try to detect slot type from module data
      const detectedSlot = await getModuleSlotType(item.type_id).catch(() => null);
      if (detectedSlot && detectedSlot !== "drone") {
        const slotArray = getSlotArray(fitting, detectedSlot as SlotType);
        const nextIdx = slotArray.findIndex((s) => s === null);
        if (nextIdx !== -1) {
          slotArray[nextIdx] = {
            ...module,
            slot_type: detectedSlot as SlotType,
            slot_index: nextIdx,
          };
        }
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
