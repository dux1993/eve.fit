"use client";

import { useState } from "react";
import { Save, Upload, Download, X, Edit2, Check, CloudUpload } from "lucide-react";
import { useFittingStore } from "@/store/fitting-store";
import { serializeEFT } from "@/lib/eft-parser";
import { getTypeRenderUrl } from "@/lib/esi";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { CharacterBadge } from "@/components/auth/CharacterBadge";
import { LoginButton } from "@/components/auth/LoginButton";
import { saveCharacterFitting } from "@/lib/esi-auth";
import { slotToEsiFlag } from "@/lib/constants";
import type { ESIFittingItem } from "@/types/auth";

export function FittingHeader() {
  const fitting = useFittingStore((s) => s.fitting);
  const stats = useFittingStore((s) => s.stats);
  const dirty = useFittingStore((s) => s.dirty);
  const setFitName = useFittingStore((s) => s.setFitName);
  const saveFitting = useFittingStore((s) => s.saveFitting);
  const clearShip = useFittingStore((s) => s.clearShip);
  const openEFTImport = useFittingStore((s) => s.openEFTImport);

  const { isLoggedIn, character } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingToEve, setSavingToEve] = useState(false);

  if (!fitting) return null;

  function startEdit() {
    setNameInput(fitting!.name);
    setEditing(true);
  }

  function finishEdit() {
    if (nameInput.trim()) {
      setFitName(nameInput.trim());
    }
    setEditing(false);
  }

  function handleExportEFT() {
    if (!fitting) return;
    const eft = serializeEFT({
      shipName: fitting.ship_name,
      fitName: fitting.name,
      highSlots: fitting.high_slots
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => ({ name: m.name, charge: m.charge?.name })),
      midSlots: fitting.mid_slots
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => ({ name: m.name, charge: m.charge?.name })),
      lowSlots: fitting.low_slots
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => ({ name: m.name, charge: m.charge?.name })),
      rigSlots: fitting.rig_slots
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => ({ name: m.name })),
      drones: fitting.drones.map((d) => ({ name: d.name, quantity: 1 })),
      highSlotCount: fitting.high_slots.length,
      midSlotCount: fitting.mid_slots.length,
      lowSlotCount: fitting.low_slots.length,
      rigSlotCount: fitting.rig_slots.length,
    });
    navigator.clipboard.writeText(eft);
  }

  async function handleSaveToEve() {
    if (!fitting || !character) return;
    setSavingToEve(true);
    try {
      const items: ESIFittingItem[] = [];
      const slotArrays: { slots: typeof fitting.high_slots; type: "high" | "mid" | "low" | "rig" | "subsystem" }[] = [
        { slots: fitting.high_slots, type: "high" },
        { slots: fitting.mid_slots, type: "mid" },
        { slots: fitting.low_slots, type: "low" },
        { slots: fitting.rig_slots, type: "rig" },
        { slots: fitting.subsystem_slots, type: "subsystem" },
      ];
      for (const { slots, type } of slotArrays) {
        slots.forEach((mod, idx) => {
          if (mod) {
            items.push({ type_id: mod.type_id, flag: slotToEsiFlag(type, idx), quantity: 1 });
          }
        });
      }
      for (const drone of fitting.drones) {
        items.push({ type_id: drone.type_id, flag: slotToEsiFlag("drone", 0), quantity: 1 });
      }
      await saveCharacterFitting(character.characterId, {
        name: fitting.name,
        description: fitting.description || "",
        ship_type_id: fitting.ship_type_id,
        items,
      });
    } catch (err) {
      console.error("Failed to save to EVE:", err);
    } finally {
      setSavingToEve(false);
    }
  }

  const eng = stats?.engineering;

  return (
    <header className="flex items-center gap-4 border-b border-border bg-surface px-4 py-2">
      {/* Ship image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getTypeRenderUrl(fitting.ship_type_id, 64)}
        alt={fitting.ship_name}
        width={48}
        height={48}
        className="rounded"
      />

      {/* Ship/fit name */}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-foreground/50">{fitting.ship_name}</div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && finishEdit()}
              autoFocus
              className="rounded border border-border bg-background px-2 py-0.5 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <button onClick={finishEdit} className="text-success hover:text-success/80">
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={startEdit} className="group flex items-center gap-1 text-sm font-medium text-foreground">
            {fitting.name}
            <Edit2 className="h-3 w-3 text-foreground/30 group-hover:text-accent" />
          </button>
        )}
      </div>

      {/* Engineering bars */}
      {eng && (
        <div className="hidden items-center gap-4 text-xs md:flex">
          <ResourceBar label="CPU" used={eng.cpu_used} total={eng.cpu_total} unit="tf" />
          <ResourceBar label="PG" used={eng.pg_used} total={eng.pg_total} unit="MW" />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={openEFTImport}
          title="Import EFT"
          className="rounded p-2 text-foreground/50 transition-colors hover:bg-surface-alt hover:text-accent"
        >
          <Upload className="h-4 w-4" />
        </button>
        <button
          onClick={handleExportEFT}
          title="Copy EFT to clipboard"
          className="rounded p-2 text-foreground/50 transition-colors hover:bg-surface-alt hover:text-accent"
        >
          <Download className="h-4 w-4" />
        </button>
        {isLoggedIn && (
          <button
            onClick={handleSaveToEve}
            disabled={savingToEve}
            title="Save to EVE"
            className="rounded p-2 text-foreground/50 transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
          >
            {savingToEve ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          onClick={saveFitting}
          title="Save fitting"
          className="rounded p-2 text-foreground/50 transition-colors hover:bg-surface-alt hover:text-success"
        >
          <Save className="h-4 w-4" />
          {dirty && <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-warning" />}
        </button>
        <button
          onClick={clearShip}
          title="Close fitting"
          className="rounded p-2 text-foreground/50 transition-colors hover:bg-surface-alt hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Auth */}
      <div className="ml-2 flex items-center">
        {isLoggedIn ? <CharacterBadge /> : <LoginButton compact />}
      </div>
    </header>
  );
}

function ResourceBar({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const over = used > total;

  return (
    <div className="w-32">
      <div className="flex justify-between text-foreground/60">
        <span>{label}</span>
        <span className={over ? "text-danger font-medium" : ""}>
          {formatNumber(used, 0)}/{formatNumber(total, 0)} {unit}
        </span>
      </div>
      <div className="mt-0.5 h-1 w-full rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
