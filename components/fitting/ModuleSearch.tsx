"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { searchModules, getType } from "@/lib/esi";
import { useFittingStore } from "@/store/fitting-store";
import { debounce, getMetaColor, getMetaLabel, SLOT_LABELS } from "@/lib/utils";
import type { SearchResult, FittedModule } from "@/types/eve";

export function ModuleSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const activeSlot = useFittingStore((s) => s.activeSlot);
  const closeModuleSearch = useFittingStore((s) => s.closeModuleSearch);
  const addModule = useFittingStore((s) => s.addModule);
  const fillSlots = useFittingStore((s) => s.fillSlots);
  const addDrone = useFittingStore((s) => s.addDrone);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((...args: unknown[]) => setDebouncedQuery(args[0] as string), 300),
    []
  );

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["moduleSearch", debouncedQuery],
    queryFn: () => searchModules(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  function handleInput(value: string) {
    setQuery(value);
    debouncedSetQuery(value);
  }

  async function buildModuleData(result: SearchResult): Promise<Omit<FittedModule, "id" | "slot_type" | "slot_index"> | null> {
    if (!activeSlot) return null;

    const type = await getType(result.type_id);
    const attrs: Record<number, number> = {};
    for (const a of type.dogma_attributes ?? []) {
      attrs[a.attribute_id] = a.value;
    }
    const effects = (type.dogma_effects ?? []).map((e) => e.effect_id);

    return {
      type_id: result.type_id,
      name: result.name,
      state: activeSlot.slotType === "rig" || activeSlot.slotType === "subsystem" ? "passive" : "active",
      group_id: result.group_id,
      category_id: result.category_id,
      attributes: attrs,
      effects,
    };
  }

  async function handleSelect(result: SearchResult) {
    const moduleData = await buildModuleData(result);
    if (!moduleData || !activeSlot) return;

    if (activeSlot.slotType === "drone") {
      addDrone(moduleData);
    } else {
      addModule(activeSlot.slotType, activeSlot.index, moduleData);
    }

    closeModuleSearch();
  }

  async function handleDoubleClick(result: SearchResult) {
    const moduleData = await buildModuleData(result);
    if (!moduleData || !activeSlot) return;

    if (activeSlot.slotType === "drone") {
      addDrone(moduleData);
    } else {
      fillSlots(activeSlot.slotType, moduleData);
    }

    closeModuleSearch();
  }

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(result: SearchResult) {
    if (clickTimer.current) {
      // Double-click detected — cancel the pending single-click
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      handleDoubleClick(result);
    } else {
      // Delay single-click to allow double-click detection
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        handleSelect(result);
      }, 250);
    }
  }

  // Filter results to match active slot type if possible
  const filtered = activeSlot
    ? results.filter((r) => {
        if (!r.slot_type) return true;
        if (activeSlot.slotType === "drone") return r.slot_type === "drone";
        return r.slot_type === activeSlot.slotType || r.slot_type === undefined;
      })
    : results;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
          {activeSlot ? `Add to ${SLOT_LABELS[activeSlot.slotType]} slot` : "Search modules"}
        </div>
        <button
          onClick={closeModuleSearch}
          className="rounded p-1 text-foreground/40 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search input */}
      <div className="relative border-b border-border px-3 py-2">
        <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search modules..."
          autoFocus
          className="w-full rounded border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none"
        />
        {isFetching && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((r) => (
          <button
            key={r.type_id}
            onClick={() => handleClick(r)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-alt"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.icon_url}
              alt={r.name}
              width={24}
              height={24}
              className="rounded"
            />
            <div className="min-w-0 flex-1">
              <div className={`truncate text-xs font-medium ${getMetaColor(r.meta_level, r.tech_level)}`}>
                {r.name}
              </div>
              <div className="truncate text-[10px] text-foreground/40">
                {r.group_name}
              </div>
            </div>
            <span className="shrink-0 text-[10px] text-foreground/30">
              {getMetaLabel(r.meta_level, r.tech_level)}
            </span>
          </button>
        ))}

        {debouncedQuery.length >= 2 && !isFetching && filtered.length === 0 && (
          <p className="p-4 text-center text-xs text-foreground/30">No modules found</p>
        )}

        {debouncedQuery.length < 2 && (
          <p className="p-4 text-center text-xs text-foreground/30">
            Type at least 2 characters to search
          </p>
        )}
      </div>
    </div>
  );
}
