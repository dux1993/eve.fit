"use client";

import { useFittingStore } from "@/store/fitting-store";
import { ShipSelector } from "./ShipSelector";
import { FittingHeader } from "./FittingHeader";
import { SlotRack } from "./SlotRack";
import { StatsPanel } from "./StatsPanel";
import { ModuleSearch } from "./ModuleSearch";
import { EFTImportModal } from "./EFTImportModal";

export function FittingPage() {
  const fitting = useFittingStore((s) => s.fitting);
  const moduleSearchOpen = useFittingStore((s) => s.moduleSearchOpen);
  const eftImportOpen = useFittingStore((s) => s.eftImportOpen);

  if (!fitting) {
    return <ShipSelector />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <FittingHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Slot racks */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-border bg-surface p-3 space-y-1">
          <SlotRack slotType="high" label="High Slots" />
          <SlotRack slotType="mid" label="Mid Slots" />
          <SlotRack slotType="low" label="Low Slots" />
          <SlotRack slotType="rig" label="Rig Slots" />
          {fitting.subsystem_slots.length > 0 && (
            <SlotRack slotType="subsystem" label="Subsystems" />
          )}
          <SlotRack slotType="drone" label="Drones" />
        </div>

        {/* Center/Right: Stats */}
        <div className="flex-1 overflow-y-auto p-4">
          <StatsPanel />
        </div>

        {/* Module search slide-out */}
        {moduleSearchOpen && (
          <div className="w-96 shrink-0 overflow-y-auto border-l border-border bg-surface">
            <ModuleSearch />
          </div>
        )}
      </div>

      {/* EFT Import modal */}
      {eftImportOpen && <EFTImportModal />}
    </div>
  );
}
