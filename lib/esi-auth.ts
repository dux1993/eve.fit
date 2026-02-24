/**
 * Client-side authenticated ESI functions.
 * All requests go through the /api/esi/ proxy — tokens never reach the browser.
 */

import type { ESIFitting, ESIFittingItem, ESISkillsResponse } from "@/types/auth";

async function esiProxy<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/esi${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ESI proxy error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Fittings ────────────────────────────────────────────────────────────────

export async function getCharacterFittings(characterId: number): Promise<ESIFitting[]> {
  return esiProxy<ESIFitting[]>(`/characters/${characterId}/fittings`);
}

export async function saveCharacterFitting(
  characterId: number,
  fitting: { name: string; description: string; ship_type_id: number; items: ESIFittingItem[] }
): Promise<{ fitting_id: number }> {
  return esiProxy<{ fitting_id: number }>(`/characters/${characterId}/fittings`, {
    method: "POST",
    body: JSON.stringify(fitting),
  });
}

export async function deleteCharacterFitting(
  characterId: number,
  fittingId: number
): Promise<void> {
  await esiProxy<void>(`/characters/${characterId}/fittings/${fittingId}`, {
    method: "DELETE",
  });
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export async function getCharacterSkills(characterId: number): Promise<ESISkillsResponse> {
  return esiProxy<ESISkillsResponse>(`/characters/${characterId}/skills`);
}

// ─── Ship ────────────────────────────────────────────────────────────────────

export async function getCharacterShip(
  characterId: number
): Promise<{ ship_type_id: number; ship_item_id: number; ship_name: string }> {
  return esiProxy(`/characters/${characterId}/ship`);
}

// ─── Authenticated search ────────────────────────────────────────────────────

export async function authenticatedSearch(
  query: string,
  categories: string[] = ["inventory_type"]
): Promise<{ inventory_type?: number[] }> {
  const params = new URLSearchParams({
    search: query,
    categories: categories.join(","),
    strict: "false",
  });
  return esiProxy(`/search?${params.toString()}`);
}
