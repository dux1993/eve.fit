"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Trash2, Download, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getCharacterFittings, deleteCharacterFitting } from "@/lib/esi-auth";
import { getType } from "@/lib/esi";
import { useFittingStore } from "@/store/fitting-store";
import { esiFittingToLocal } from "@/lib/esi-fitting-convert";
import type { ESIFitting } from "@/types/auth";

function useShipNames(typeIds: number[]) {
  return useQuery({
    queryKey: ["shipNames", typeIds.join(",")],
    queryFn: async () => {
      const names: Record<number, string> = {};
      await Promise.all(
        typeIds.map(async (id) => {
          try {
            const type = await getType(id);
            names[id] = type.name;
          } catch {
            names[id] = `Unknown (${id})`;
          }
        })
      );
      return names;
    },
    enabled: typeIds.length > 0,
    staleTime: Infinity,
  });
}

export function MyFittingsPanel({ onClose }: { onClose: () => void }) {
  const { character } = useAuth();
  const queryClient = useQueryClient();
  const importFitting = useFittingStore((s) => s.importFitting);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const { data: fittings = [], isLoading, error } = useQuery({
    queryKey: ["eveFittings", character?.characterId],
    queryFn: () => getCharacterFittings(character!.characterId),
    enabled: !!character,
  });

  const uniqueTypeIds = useMemo(
    () => [...new Set(fittings.map((f) => f.ship_type_id))],
    [fittings]
  );

  const { data: shipNames = {} } = useShipNames(uniqueTypeIds);

  const deleteMutation = useMutation({
    mutationFn: (fittingId: number) =>
      deleteCharacterFitting(character!.characterId, fittingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eveFittings"] });
    },
  });

  async function handleLoad(esiFitting: ESIFitting) {
    setLoadingId(esiFitting.fitting_id);
    try {
      const shipType = await getType(esiFitting.ship_type_id);
      const fitting = await esiFittingToLocal(esiFitting, shipType);
      importFitting(fitting, shipType);
      onClose();
    } catch (err) {
      console.error("Failed to load fitting:", err);
    } finally {
      setLoadingId(null);
    }
  }

  function toggleGroup(typeId: number) {
    setCollapsed((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  }

  // Filter by search query (fitting name or ship name)
  const query = searchQuery.toLowerCase().trim();
  const filtered = useMemo(() => {
    if (!query) return fittings;
    return fittings.filter((f) => {
      const shipName = (shipNames[f.ship_type_id] || "").toLowerCase();
      const fitName = f.name.toLowerCase();
      return fitName.includes(query) || shipName.includes(query);
    });
  }, [fittings, shipNames, query]);

  // Group by ship type, sorted alphabetically by ship name
  const groups = useMemo(() => {
    const grouped = filtered.reduce<Record<number, ESIFitting[]>>((acc, f) => {
      if (!acc[f.ship_type_id]) acc[f.ship_type_id] = [];
      acc[f.ship_type_id].push(f);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([typeId, fits]) => ({
        typeId: Number(typeId),
        name: shipNames[Number(typeId)] || `Type ${typeId}`,
        fittings: fits.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, shipNames]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">My EVE Fittings</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        {!isLoading && fittings.length > 0 && (
          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fittings or ships..."
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[calc(80vh-100px)] overflow-y-auto p-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="px-4 py-8 text-center text-sm text-danger">
              Failed to load fittings. Please try again.
            </div>
          )}

          {!isLoading && fittings.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-foreground/40">
              No fittings found on this character.
            </div>
          )}

          {!isLoading && fittings.length > 0 && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-foreground/40">
              No fittings match &ldquo;{searchQuery}&rdquo;
            </div>
          )}

          {groups.map((group) => (
            <div key={group.typeId} className="mb-1">
              {/* Ship group header */}
              <button
                onClick={() => toggleGroup(group.typeId)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-alt"
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 text-foreground/40 transition-transform ${
                    !collapsed[group.typeId] ? "rotate-90" : ""
                  }`}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://images.evetech.net/types/${group.typeId}/render?size=32`}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded"
                />
                <span className="flex-1 truncate text-xs font-semibold text-foreground/70">
                  {group.name}
                </span>
                <span className="text-xs text-foreground/30">{group.fittings.length}</span>
              </button>

              {/* Fitting items */}
              {!collapsed[group.typeId] && (
                <div className="ml-5 border-l border-border/50 pl-2">
                  {group.fittings.map((fit) => (
                    <div
                      key={fit.fitting_id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-alt"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{fit.name}</div>
                        <div className="truncate text-xs text-foreground/40">
                          {fit.items.length} items
                          {fit.description && ` — ${fit.description}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoad(fit)}
                        disabled={loadingId === fit.fitting_id}
                        title="Load fitting"
                        className="rounded p-1.5 text-foreground/40 transition-colors hover:bg-background hover:text-accent disabled:opacity-50"
                      >
                        {loadingId === fit.fitting_id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${fit.name}"?`)) {
                            deleteMutation.mutate(fit.fitting_id);
                          }
                        }}
                        title="Delete from EVE"
                        className="rounded p-1.5 text-foreground/40 transition-colors hover:bg-background hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
