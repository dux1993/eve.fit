"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import { useFittingStore } from "@/store/fitting-store";
import { parseEFT, isEFTFormat, getUniqueItemNames } from "@/lib/eft-parser";
import { resolveNames, getType, getGroup } from "@/lib/esi";
import { generateId, createEmptySlots } from "@/lib/utils";
import { CATEGORY_IDS } from "@/lib/constants";
import type { Fitting, FittedModule, SlotType } from "@/types/eve";

export function EFTImportModal() {
  const [eftText, setEftText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const closeEFTImport = useFittingStore((s) => s.closeEFTImport);
  const importFitting = useFittingStore((s) => s.importFitting);

  async function handleImport() {
    if (!eftText.trim()) return;

    if (!isEFTFormat(eftText)) {
      setError("Text does not appear to be in EFT format. Expected: [Ship Name, Fit Name]");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsed = parseEFT(eftText);

      // Bulk resolve all unique names at once via POST /universe/ids/
      const allNames = getUniqueItemNames(parsed);
      const nameMap = await resolveNames(allNames);

      // Resolve ship
      const shipId = nameMap.get(parsed.shipName.toLowerCase());
      if (!shipId) {
        setError(`Could not find ship: "${parsed.shipName}"`);
        setLoading(false);
        return;
      }

      const shipType = await getType(shipId);
      const shipGroup = await getGroup(shipType.group_id).catch(() => null);
      if (!shipGroup || shipGroup.category_id !== CATEGORY_IDS.SHIP) {
        setError(`"${parsed.shipName}" does not appear to be a ship`);
        setLoading(false);
        return;
      }

      // Resolve modules using the pre-resolved name map
      async function resolveModules(
        lines: { name: string; charge?: string; quantity?: number }[],
        slotType: SlotType
      ): Promise<FittedModule[]> {
        const modules: FittedModule[] = [];
        for (const line of lines) {
          try {
            const typeId = nameMap.get(line.name.toLowerCase());
            if (!typeId) continue;

            const modType = await getType(typeId);

            const attrs: Record<number, number> = {};
            for (const a of modType.dogma_attributes ?? []) {
              attrs[a.attribute_id] = a.value;
            }
            const effects = (modType.dogma_effects ?? []).map((e) => e.effect_id);

            modules.push({
              id: generateId(),
              type_id: modType.type_id,
              name: modType.name,
              slot_type: slotType,
              slot_index: modules.length,
              state: slotType === "rig" || slotType === "subsystem" ? "passive" : "active",
              group_id: modType.group_id,
              attributes: attrs,
              effects,
            });
          } catch {
            // Skip modules we can't resolve
          }
        }
        return modules;
      }

      // Resolve all slot types in parallel
      const [highMods, midMods, lowMods, rigMods, drones] = await Promise.all([
        resolveModules(parsed.highSlots, "high"),
        resolveModules(parsed.midSlots, "mid"),
        resolveModules(parsed.lowSlots, "low"),
        resolveModules(parsed.rigSlots, "rig"),
        resolveModules(parsed.drones, "drone"),
      ]);

      // Build fitting
      const highCount = Math.max(highMods.length, 8);
      const midCount = Math.max(midMods.length, 5);
      const lowCount = Math.max(lowMods.length, 5);
      const rigCount = Math.max(rigMods.length, 3);

      const high_slots: (FittedModule | null)[] = createEmptySlots(highCount);
      const mid_slots: (FittedModule | null)[] = createEmptySlots(midCount);
      const low_slots: (FittedModule | null)[] = createEmptySlots(lowCount);
      const rig_slots: (FittedModule | null)[] = createEmptySlots(rigCount);

      highMods.forEach((m, i) => { m.slot_index = i; high_slots[i] = m; });
      midMods.forEach((m, i) => { m.slot_index = i; mid_slots[i] = m; });
      lowMods.forEach((m, i) => { m.slot_index = i; low_slots[i] = m; });
      rigMods.forEach((m, i) => { m.slot_index = i; rig_slots[i] = m; });

      const now = new Date().toISOString();
      const fitting: Fitting = {
        id: generateId(),
        name: parsed.fitName,
        ship_type_id: shipType.type_id,
        ship_name: shipType.name,
        ship_group_id: shipType.group_id,
        description: "",
        tags: [],
        high_slots,
        mid_slots,
        low_slots,
        rig_slots,
        subsystem_slots: [],
        drones,
        cargo: [],
        created_at: now,
        updated_at: now,
      };

      importFitting(fitting, shipType);
      closeEFTImport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import EFT");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4 shadow-xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Upload className="h-4 w-4 text-accent" />
            Import EFT
          </h2>
          <button
            onClick={closeEFTImport}
            className="rounded p-1 text-foreground/40 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={eftText}
          onChange={(e) => { setEftText(e.target.value); setError(null); }}
          placeholder={`[Hurricane, My Fit]\nGyrostabilizer II\nGyrostabilizer II\n...\n\n50MN Microwarpdrive II\n...`}
          rows={14}
          className="w-full rounded border border-border bg-background p-3 font-mono text-xs text-foreground placeholder:text-foreground/20 focus:border-accent focus:outline-none"
        />

        {/* Error */}
        {error && (
          <p className="mt-2 text-xs text-danger">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={closeEFTImport}
            className="rounded px-4 py-2 text-sm text-foreground/50 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !eftText.trim()}
            className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
