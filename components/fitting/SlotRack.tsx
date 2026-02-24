"use client";

import { useFittingStore } from "@/store/fitting-store";
import { SlotItem } from "./SlotItem";
import type { SlotType, FittedModule } from "@/types/eve";
import { SLOT_LABELS } from "@/lib/utils";

const SLOT_BORDER_COLORS: Record<string, string> = {
  high: "border-l-eve-high",
  mid: "border-l-eve-mid",
  low: "border-l-eve-low",
  rig: "border-l-eve-rig",
  subsystem: "border-l-eve-sub",
  drone: "border-l-green-400",
};

interface SlotRackProps {
  slotType: SlotType;
  label: string;
}

export function SlotRack({ slotType, label }: SlotRackProps) {
  const fitting = useFittingStore((s) => s.fitting);
  if (!fitting) return null;

  let slots: (FittedModule | null)[];
  switch (slotType) {
    case "high": slots = fitting.high_slots; break;
    case "mid": slots = fitting.mid_slots; break;
    case "low": slots = fitting.low_slots; break;
    case "rig": slots = fitting.rig_slots; break;
    case "subsystem": slots = fitting.subsystem_slots; break;
    case "drone": slots = fitting.drones; break;
    default: slots = [];
  }

  const borderColor = SLOT_BORDER_COLORS[slotType] ?? "border-l-foreground/20";

  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
          {label}
        </span>
        <span className="text-[10px] text-foreground/25">
          {slots.filter(Boolean).length}/{slots.length}
        </span>
      </div>
      <div className="space-y-px">
        {slots.map((mod, idx) => (
          <SlotItem
            key={`${slotType}-${idx}`}
            slotType={slotType}
            index={idx}
            module={mod}
            borderColor={borderColor}
          />
        ))}
        {/* Add drone button if drone rack */}
        {slotType === "drone" && (
          <AddDroneButton />
        )}
      </div>
    </div>
  );
}

function AddDroneButton() {
  const openModuleSearch = useFittingStore((s) => s.openModuleSearch);

  return (
    <button
      onClick={() => openModuleSearch("drone", 0)}
      className="flex w-full items-center justify-center rounded border border-dashed border-border py-1.5 text-xs text-foreground/30 transition-colors hover:border-accent/40 hover:text-accent/60"
    >
      + Add drone
    </button>
  );
}
