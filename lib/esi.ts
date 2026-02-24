/**
 * EVE Online ESI (Swagger Interface) API Client
 * Documentation: https://esi.evetech.net/ui/
 *
 * NOTE: The /search/ endpoint requires SSO authentication.
 * We use /universe/ids/ (POST, no auth) for exact name→ID resolution,
 * and build local indexes from group type lists for fuzzy search.
 */

import { EveType, EveGroup, EveCategory, DogmaAttributeInfo, SearchResult, SlotType } from "@/types/eve";
import { ESI_BASE, DATASOURCE, CATEGORY_IDS, SHIP_GROUP_IDS, EVE_IMAGE_BASE } from "./constants";
import { getSlotTypeFromEffects, getSlotTypeFromGroupId } from "./utils";

// ─── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttl = CACHE_TTL): void {
  cache.set(key, { data, expires: Date.now() + ttl });
}

async function esiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${ESI_BASE}${path}${path.includes("?") ? "&" : "?"}datasource=${DATASOURCE}`;
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    next: { revalidate: 3600 },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`ESI API error: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json() as Promise<T>;
}

// ─── Type / Universe endpoints ──────────────────────────────────────────────

export async function getType(typeId: number): Promise<EveType> {
  const key = `type:${typeId}`;
  const cached = getCached<EveType>(key);
  if (cached) return cached;

  const data = await esiFetch<EveType>(`/universe/types/${typeId}/`);
  setCached(key, data);
  return data;
}

export async function getTypes(typeIds: number[]): Promise<EveType[]> {
  return Promise.all(typeIds.map((id) => getType(id)));
}

export async function getGroup(groupId: number): Promise<EveGroup> {
  const key = `group:${groupId}`;
  const cached = getCached<EveGroup>(key);
  if (cached) return cached;

  const data = await esiFetch<EveGroup>(`/universe/groups/${groupId}/`);
  setCached(key, data);
  return data;
}

export async function getCategory(categoryId: number): Promise<EveCategory> {
  const key = `category:${categoryId}`;
  const cached = getCached<EveCategory>(key);
  if (cached) return cached;

  const data = await esiFetch<EveCategory>(`/universe/categories/${categoryId}/`);
  setCached(key, data);
  return data;
}

// ─── Name → ID resolution (no auth required) ────────────────────────────────

interface UniverseIdsResult {
  inventory_types?: { id: number; name: string }[];
  characters?: { id: number; name: string }[];
  systems?: { id: number; name: string }[];
  [key: string]: unknown;
}

/**
 * Resolve exact item names to type IDs using POST /universe/ids/.
 * No SSO auth required.
 */
export async function resolveNames(
  names: string[]
): Promise<Map<string, number>> {
  if (names.length === 0) return new Map();

  const key = `resolve:${names.sort().join(",")}`;
  const cached = getCached<Map<string, number>>(key);
  if (cached) return cached;

  const url = `${ESI_BASE}/universe/ids/?datasource=${DATASOURCE}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(names),
  });

  if (!response.ok) {
    throw new Error(`ESI resolve names failed: ${response.status}`);
  }

  const data = (await response.json()) as UniverseIdsResult;
  const result = new Map<string, number>();

  for (const item of data.inventory_types ?? []) {
    result.set(item.name.toLowerCase(), item.id);
  }

  setCached(key, result);
  return result;
}

/**
 * Resolve a single name to a type ID.
 */
export async function resolveNameToId(name: string): Promise<number | null> {
  const map = await resolveNames([name]);
  return map.get(name.toLowerCase()) ?? null;
}

// ─── Ship search (index-based, no auth) ─────────────────────────────────────

// We build a ship index by fetching all type IDs from known ship group IDs,
// then resolving their names. This is cached for 1 hour.
interface ShipIndexEntry {
  type_id: number;
  name: string;
  group_id: number;
  group_name: string;
}

let _shipIndex: ShipIndexEntry[] | null = null;
let _shipIndexPromise: Promise<ShipIndexEntry[]> | null = null;

async function getShipIndex(): Promise<ShipIndexEntry[]> {
  if (_shipIndex) return _shipIndex;
  if (_shipIndexPromise) return _shipIndexPromise;

  _shipIndexPromise = buildShipIndex();
  _shipIndex = await _shipIndexPromise;
  _shipIndexPromise = null;
  return _shipIndex;
}

async function buildShipIndex(): Promise<ShipIndexEntry[]> {
  const groupIds = Object.values(SHIP_GROUP_IDS);
  const entries: ShipIndexEntry[] = [];

  // Fetch groups in parallel to get their type ID lists
  const groups = await Promise.allSettled(groupIds.map((id) => getGroup(id)));

  for (const result of groups) {
    if (result.status !== "fulfilled") continue;
    const group = result.value;
    if (!group.types?.length) continue;

    // Fetch type details in batches
    const typeResults = await Promise.allSettled(
      group.types.slice(0, 100).map((id) => getType(id))
    );

    for (const typeResult of typeResults) {
      if (typeResult.status !== "fulfilled") continue;
      const type = typeResult.value;
      if (!type.published) continue;

      entries.push({
        type_id: type.type_id,
        name: type.name,
        group_id: group.group_id,
        group_name: group.name,
      });
    }
  }

  return entries;
}

export async function searchShips(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  const index = await getShipIndex();
  const lowerQuery = query.toLowerCase();

  // Fuzzy match: starts-with first, then includes
  const startsWithMatches: ShipIndexEntry[] = [];
  const containsMatches: ShipIndexEntry[] = [];

  for (const entry of index) {
    const lowerName = entry.name.toLowerCase();
    if (lowerName.startsWith(lowerQuery)) {
      startsWithMatches.push(entry);
    } else if (lowerName.includes(lowerQuery)) {
      containsMatches.push(entry);
    }
  }

  const matches = [...startsWithMatches, ...containsMatches].slice(0, 30);

  return matches.map((entry) => ({
    type_id: entry.type_id,
    name: entry.name,
    group_id: entry.group_id,
    group_name: entry.group_name,
    category_id: CATEGORY_IDS.SHIP,
    category_name: "Ship",
    icon_url: getTypeRenderUrl(entry.type_id, 64),
  }));
}

// ─── Module search (index-based, no auth) ────────────────────────────────────

// We build a module index by fetching all type IDs from Module/Drone/Subsystem
// categories, then resolving their names via POST /universe/names/.
interface ModuleIndexEntry {
  type_id: number;
  name: string;
  group_id: number;
  group_name: string;
  category_id: number;
}

let _moduleIndex: ModuleIndexEntry[] | null = null;
let _moduleIndexPromise: Promise<ModuleIndexEntry[]> | null = null;

async function getModuleIndex(): Promise<ModuleIndexEntry[]> {
  if (_moduleIndex) return _moduleIndex;
  if (_moduleIndexPromise) return _moduleIndexPromise;

  _moduleIndexPromise = buildModuleIndex();
  _moduleIndex = await _moduleIndexPromise;
  _moduleIndexPromise = null;
  return _moduleIndex;
}

async function buildModuleIndex(): Promise<ModuleIndexEntry[]> {
  const entries: ModuleIndexEntry[] = [];

  // Fetch Module (7), Drone (18), Subsystem (32) categories
  const categoryIds = [CATEGORY_IDS.MODULE, CATEGORY_IDS.DRONE, CATEGORY_IDS.SUBSYSTEM];
  const categoryResults = await Promise.allSettled(
    categoryIds.map((id) => getCategory(id))
  );

  const allGroupIds: number[] = [];
  for (const result of categoryResults) {
    if (result.status !== "fulfilled") continue;
    allGroupIds.push(...result.value.groups);
  }

  // Fetch all groups in parallel to get type ID lists
  const groupResults = await Promise.allSettled(
    allGroupIds.map((id) => getGroup(id))
  );

  // Collect type IDs with their group info
  const typeToGroup = new Map<number, { group_id: number; group_name: string; category_id: number }>();
  for (const result of groupResults) {
    if (result.status !== "fulfilled") continue;
    const group = result.value;
    if (group.published === false) continue;
    for (const typeId of group.types ?? []) {
      typeToGroup.set(typeId, {
        group_id: group.group_id,
        group_name: group.name,
        category_id: group.category_id,
      });
    }
  }

  // Bulk-resolve names via POST /universe/names/ (batches of 500)
  const allTypeIds = Array.from(typeToGroup.keys());
  const names = await bulkResolveNames(allTypeIds);

  for (const [typeId, name] of names) {
    const groupInfo = typeToGroup.get(typeId);
    if (!groupInfo) continue;
    entries.push({ type_id: typeId, name, ...groupInfo });
  }

  return entries;
}

/**
 * Resolve type IDs to names in bulk using POST /universe/names/.
 * Splits into batches and retries smaller chunks on error (invalid IDs
 * cause the entire batch to 404).
 */
async function bulkResolveNames(ids: number[]): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const BATCH_SIZE = 500;
  const MIN_BATCH = 50;

  async function resolveBatch(batch: number[]): Promise<void> {
    if (batch.length === 0) return;
    try {
      const url = `${ESI_BASE}/universe/names/?datasource=${DATASOURCE}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      if (response.ok) {
        const data = (await response.json()) as { id: number; name: string }[];
        for (const item of data) {
          result.set(item.id, item.name);
        }
      } else if (batch.length > MIN_BATCH) {
        // Some IDs may be invalid — split and retry
        const mid = Math.floor(batch.length / 2);
        await Promise.all([
          resolveBatch(batch.slice(0, mid)),
          resolveBatch(batch.slice(mid)),
        ]);
      }
    } catch {
      if (batch.length > MIN_BATCH) {
        const mid = Math.floor(batch.length / 2);
        await Promise.all([
          resolveBatch(batch.slice(0, mid)),
          resolveBatch(batch.slice(mid)),
        ]);
      }
    }
  }

  const promises: Promise<void>[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    promises.push(resolveBatch(ids.slice(i, i + BATCH_SIZE)));
  }
  await Promise.all(promises);

  return result;
}

export async function searchModules(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  const index = await getModuleIndex();
  const lowerQuery = query.toLowerCase();

  // Prioritize starts-with, then includes
  const startsWithMatches: ModuleIndexEntry[] = [];
  const containsMatches: ModuleIndexEntry[] = [];

  for (const entry of index) {
    const lowerName = entry.name.toLowerCase();
    if (lowerName.startsWith(lowerQuery)) {
      startsWithMatches.push(entry);
    } else if (lowerName.includes(lowerQuery)) {
      containsMatches.push(entry);
    }
  }

  const matches = [...startsWithMatches, ...containsMatches].slice(0, 40);

  return matches.map((entry) => ({
    type_id: entry.type_id,
    name: entry.name,
    group_id: entry.group_id,
    group_name: entry.group_name,
    category_id: entry.category_id,
    category_name:
      entry.category_id === CATEGORY_IDS.DRONE ? "Drone"
        : entry.category_id === CATEGORY_IDS.SUBSYSTEM ? "Subsystem"
          : "Module",
    icon_url: getTypeIconUrl(entry.type_id, 64),
  }));
}

function buildModuleResult(type: EveType, group: EveGroup): SearchResult {
  const categoryId = group.category_id;
  const isDrone = categoryId === CATEGORY_IDS.DRONE;
  const isSubsystem = categoryId === CATEGORY_IDS.SUBSYSTEM;
  const isCharge = categoryId === CATEGORY_IDS.CHARGE;

  let slotType: string | undefined = getSlotTypeFromGroupId(type.group_id);
  if (!slotType && type.dogma_effects) {
    const effectIds = type.dogma_effects.map((e) => e.effect_id);
    slotType = getSlotTypeFromEffects(effectIds) ?? undefined;
  }
  if (isDrone) slotType = "drone";
  if (isCharge) slotType = "cargo";

  const attrs = type.dogma_attributes || [];
  const metaAttr = attrs.find((a) => a.attribute_id === 633);
  const techAttr = attrs.find((a) => a.attribute_id === 422);

  return {
    type_id: type.type_id,
    name: type.name,
    group_id: type.group_id,
    group_name: group.name,
    category_id: categoryId,
    category_name: isDrone ? "Drone" : isSubsystem ? "Subsystem" : isCharge ? "Charge" : "Module",
    slot_type: slotType as SlotType | undefined,
    icon_url: getTypeIconUrl(type.type_id, 64),
    meta_level: metaAttr?.value,
    tech_level: techAttr?.value,
  };
}

// ─── Ship-specific ───────────────────────────────────────────────────────────

export async function getShipType(typeId: number): Promise<EveType> {
  return getType(typeId);
}

export async function getPopularShips(): Promise<SearchResult[]> {
  const popularIds = [
    587, 603, 605, 606,           // Rifter, Incursus, Merlin, Punisher
    24700, 24692, 24696, 24702,   // Rupture, Stabber, Hurricane, Brutix
    638, 645, 641, 24688,         // Tempest, Maelstrom, Abaddon, Megathron
    24483, 29340, 29990, 29984,   // Drake, Tengu, Legion, Sleipnir
    12034, 11999, 17738, 45647,   // Ishtar, Vagabond, Vexor NI, Leshak
  ];

  const types = await Promise.allSettled(popularIds.map((id) => getType(id)));
  const results: SearchResult[] = [];

  for (const result of types) {
    if (result.status !== "fulfilled") continue;
    const type = result.value;
    const group = await getGroup(type.group_id).catch(() => null);
    if (!group) continue;

    results.push({
      type_id: type.type_id,
      name: type.name,
      group_id: type.group_id,
      group_name: group.name,
      category_id: CATEGORY_IDS.SHIP,
      category_name: "Ship",
      icon_url: getTypeRenderUrl(type.type_id, 64),
    });
  }

  return results;
}

// ─── Dogma ────────────────────────────────────────────────────────────────────

export async function getDogmaAttribute(attributeId: number): Promise<DogmaAttributeInfo> {
  const key = `dogma_attr:${attributeId}`;
  const cached = getCached<DogmaAttributeInfo>(key);
  if (cached) return cached;

  const data = await esiFetch<DogmaAttributeInfo>(`/dogma/attributes/${attributeId}/`);
  setCached(key, data);
  return data;
}

// ─── Image URLs ──────────────────────────────────────────────────────────────

export function getTypeRenderUrl(typeId: number, size: 32 | 64 | 128 | 256 | 512 = 256): string {
  return `${EVE_IMAGE_BASE}/types/${typeId}/render?size=${size}`;
}

export function getTypeIconUrl(typeId: number, size: 32 | 64 = 64): string {
  return `${EVE_IMAGE_BASE}/types/${typeId}/icon?size=${size}`;
}

export function getCorporationLogoUrl(corpId: number, size: 32 | 64 | 128 | 256 = 64): string {
  return `${EVE_IMAGE_BASE}/corporations/${corpId}/logo?size=${size}`;
}

// ─── Module attribute fetching ────────────────────────────────────────────────

export async function getModuleAttributes(typeId: number): Promise<Record<number, number>> {
  const type = await getType(typeId);
  const attrs: Record<number, number> = {};
  for (const attr of type.dogma_attributes || []) {
    attrs[attr.attribute_id] = attr.value;
  }
  return attrs;
}

// ─── Batch type resolver ──────────────────────────────────────────────────────

export async function resolveTypesWithGroups(
  typeIds: number[]
): Promise<Array<{ type: EveType; group: EveGroup | null }>> {
  const types = await Promise.allSettled(typeIds.map((id) => getType(id)));
  const results: Array<{ type: EveType; group: EveGroup | null }> = [];

  for (const result of types) {
    if (result.status !== "fulfilled") continue;
    const type = result.value;
    const group = await getGroup(type.group_id).catch(() => null);
    results.push({ type, group });
  }

  return results;
}

// ─── Module slot detection ────────────────────────────────────────────────────

export async function getModuleSlotType(typeId: number): Promise<"high" | "mid" | "low" | "rig" | "subsystem" | "drone" | null> {
  const type = await getType(typeId);
  const group = await getGroup(type.group_id).catch(() => null);
  if (!group) return null;

  if (group.category_id === CATEGORY_IDS.DRONE) return "drone";
  if (group.category_id === CATEGORY_IDS.SUBSYSTEM) return "subsystem";

  const byGroup = getSlotTypeFromGroupId(type.group_id);
  if (byGroup) return byGroup;

  const effectIds = (type.dogma_effects || []).map((e) => e.effect_id);
  return getSlotTypeFromEffects(effectIds);
}
