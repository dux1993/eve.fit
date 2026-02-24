"use client";

import { useFittingStore } from "@/store/fitting-store";
import { getTypeIconUrl } from "@/lib/esi";
import { getMetaColor } from "@/lib/utils";
import { Power, PowerOff, Zap } from "lucide-react";
import type { SlotType, FittedModule } from "@/types/eve";

interface SlotItemProps {
  slotType: SlotType;
  index: number;
  module: FittedModule | null;
  borderColor: string;
}

const STATE_ICONS = {
  active: Zap,
  passive: Power,
  offline: PowerOff,
};

const STATE_COLORS = {
  active: "text-success",
  passive: "text-foreground/50",
  offline: "text-danger/60",
};

export function SlotItem({ slotType, index, module, borderColor }: SlotItemProps) {
  const activeSlot = useFittingStore((s) => s.activeSlot);
  const openModuleSearch = useFittingStore((s) => s.openModuleSearch);
  const removeModule = useFittingStore((s) => s.removeModule);
  const toggleModuleState = useFittingStore((s) => s.toggleModuleState);

  const isActive =
    activeSlot?.slotType === slotType && activeSlot?.index === index;

  function handleClick() {
    if (module) {
      // If slot has a module, open search to replace
      openModuleSearch(slotType, index);
    } else {
      openModuleSearch(slotType, index);
    }
  }

  function handleRightClick(e: React.MouseEvent) {
    e.preventDefault();
    if (module) {
      removeModule(slotType, index);
    }
  }

  function handleStateToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (module && slotType !== "rig" && slotType !== "subsystem") {
      toggleModuleState(slotType, index);
    }
  }

  if (!module) {
    return (
      <button
        onClick={handleClick}
        className={`flex w-full items-center gap-2 rounded border-l-2 ${borderColor} bg-surface-alt/50 px-2 py-1.5 text-left transition-colors hover:bg-surface-alt ${
          isActive ? "slot-active ring-1 ring-accent/40" : ""
        }`}
      >
        <div className="h-6 w-6 rounded bg-border/30" />
        <span className="text-xs text-foreground/20">Empty</span>
      </button>
    );
  }

  const StateIcon = STATE_ICONS[module.state];
  const stateColor = STATE_COLORS[module.state];
  const metaColor = getMetaColor(
    module.attributes?.[633],
    module.attributes?.[422]
  );

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleRightClick}
      className={`group flex w-full cursor-pointer items-center gap-2 rounded border-l-2 ${borderColor} bg-surface-alt px-2 py-1.5 transition-colors hover:bg-border/30 ${
        isActive ? "slot-active ring-1 ring-accent/40" : ""
      }`}
    >
      {/* Module icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getTypeIconUrl(module.type_id, 32)}
        alt={module.name}
        width={24}
        height={24}
        className="rounded"
      />

      {/* Module name */}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-xs font-medium ${metaColor}`}>
          {module.name}
        </div>
        {module.charge && (
          <div className="truncate text-[10px] text-foreground/40">
            {module.charge.name}
          </div>
        )}
      </div>

      {/* State toggle */}
      {slotType !== "rig" && slotType !== "subsystem" && slotType !== "drone" && (
        <button
          onClick={handleStateToggle}
          title={module.state}
          className={`shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100 ${stateColor}`}
        >
          <StateIcon className="h-3 w-3" />
        </button>
      )}

      {/* Remove button (visible on hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); removeModule(slotType, index); }}
        className="shrink-0 rounded p-0.5 text-foreground/20 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}
