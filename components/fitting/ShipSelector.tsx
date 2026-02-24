"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Ship, Upload, BookOpen } from "lucide-react";
import { searchShips, getType } from "@/lib/esi";
import { useFittingStore } from "@/store/fitting-store";
import { debounce } from "@/lib/utils";
import { ATTR } from "@/lib/constants";
import { EFTImportModal } from "./EFTImportModal";
import { MyFittingsPanel } from "./MyFittingsPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoginButton } from "@/components/auth/LoginButton";
import { CharacterBadge } from "@/components/auth/CharacterBadge";
import type { SearchResult } from "@/types/eve";

export function ShipSelector() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showMyFittings, setShowMyFittings] = useState(false);
  const setShip = useFittingStore((s) => s.setShip);
  const openEFTImport = useFittingStore((s) => s.openEFTImport);
  const eftImportOpen = useFittingStore((s) => s.eftImportOpen);
  const { isLoggedIn } = useAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((...args: unknown[]) => setDebouncedQuery(args[0] as string), 300),
    []
  );

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["shipSearch", debouncedQuery],
    queryFn: () => searchShips(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  function handleInput(value: string) {
    setQuery(value);
    debouncedSetQuery(value);
  }

  async function handleSelect(result: SearchResult) {
    const shipType = await getType(result.type_id);
    const attrs = shipType.dogma_attributes || [];
    const getAttr = (id: number, fallback: number) =>
      attrs.find((a) => a.attribute_id === id)?.value ?? fallback;

    // Try to get slot counts from dogma. These attribute IDs are tricky;
    // fall back to reasonable defaults. The fitting arrays can always be
    // resized later when we add proper SDE data.
    setShip(shipType, {
      highSlots: Math.min(getAttr(ATTR.HI_SLOTS, 8), 8),
      midSlots: Math.min(getAttr(ATTR.MED_SLOTS, 5), 8),
      lowSlots: Math.min(getAttr(ATTR.LOW_SLOTS, 5), 8),
      rigSlots: 3,
    });
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-lg space-y-6 p-8">
        {/* Logo area */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-accent tracking-tight">eve.fit</h1>
          <p className="text-sm text-foreground/50">Ship fitting simulator</p>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search for a ship..."
            autoFocus
            className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-surface">
            {results.map((r) => (
              <button
                key={r.type_id}
                onClick={() => handleSelect(r)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-alt"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.icon_url}
                  alt={r.name}
                  width={32}
                  height={32}
                  className="rounded"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                  <div className="truncate text-xs text-foreground/50">{r.group_name}</div>
                </div>
                <Ship className="h-4 w-4 shrink-0 text-foreground/20" />
              </button>
            ))}
          </div>
        )}

        {debouncedQuery.length >= 2 && !isFetching && results.length === 0 && (
          <p className="text-center text-sm text-foreground/40">No ships found</p>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={openEFTImport}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-accent hover:text-accent"
          >
            <Upload className="h-4 w-4" />
            Import EFT
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setShowMyFittings(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-accent hover:text-accent"
            >
              <BookOpen className="h-4 w-4" />
              My Fittings
            </button>
          )}
        </div>

        {/* Auth */}
        <div className="flex justify-center">
          {isLoggedIn ? <CharacterBadge /> : <LoginButton />}
        </div>
      </div>

      {eftImportOpen && <EFTImportModal />}
      {showMyFittings && <MyFittingsPanel onClose={() => setShowMyFittings(false)} />}
    </div>
  );
}
