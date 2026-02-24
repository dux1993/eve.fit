/**
 * Skill bonus system.
 * Applies support skill bonuses to base ShipStats and returns deltas.
 */

import type { ShipStats, SkillMap, SkillDeltas } from "@/types/eve";
import { SUPPORT_SKILL_IDS } from "./constants";
import { simulateCap, calculateAlignTime, calculateEHP, avgResonance } from "./utils";

/** Get skill level from map, defaulting to 0 if not trained */
function lvl(skills: SkillMap, skillId: number): number {
  return skills[skillId] ?? 0;
}

/** Create a SkillMap with all support skills at level 5 */
export function allLevelVSkillMap(): SkillMap {
  const map: SkillMap = {};
  for (const id of Object.values(SUPPORT_SKILL_IDS)) {
    map[id] = 5;
  }
  return map;
}

/** Convert ESI skill response to our SkillMap (only support skills) */
export function esiSkillsToMap(
  esiSkills: { skill_id: number; active_skill_level: number }[]
): SkillMap {
  const map: SkillMap = {};
  const supportIds = new Set<number>(Object.values(SUPPORT_SKILL_IDS));
  for (const s of esiSkills) {
    if (supportIds.has(s.skill_id)) {
      map[s.skill_id] = s.active_skill_level;
    }
  }
  return map;
}

/**
 * Apply skill bonuses to a ShipStats object IN PLACE.
 * Returns a SkillDeltas object describing what changed.
 *
 * Bonus formulas (per EVE):
 *   +5%/lvl = base × (1 + 0.05 × level)
 *   -5%/lvl = base × (1 - 0.05 × level)   [stacking: compound]
 *   +1/lvl  = base + level
 */
export function applySkillBonuses(
  stats: ShipStats,
  skills: SkillMap
): SkillDeltas {
  const S = SUPPORT_SKILL_IDS;

  // Snapshot base values
  const baseCpuTotal = stats.engineering.cpu_total;
  const basePgTotal = stats.engineering.pg_total;
  const baseCapCapacity = stats.capacitor.capacity;
  const baseCapRecharge = stats.capacitor.recharge_rate; // seconds (tau)
  const baseShieldHp = stats.shield.hp;
  const baseArmorHp = stats.armor.hp;
  const baseHullHp = stats.hull.hp;
  const baseVelocity = stats.navigation.max_velocity;
  const baseInertia = stats.navigation.inertia_modifier;
  const baseMaxTargets = stats.targeting.max_targets;
  const baseTargetRange = stats.targeting.max_target_range;
  const baseScanRes = stats.targeting.scan_resolution;

  // ── Engineering ──
  const cpuMult = 1 + 0.05 * lvl(skills, S.CPU_MANAGEMENT);
  stats.engineering.cpu_total = baseCpuTotal * cpuMult;
  stats.engineering.cpu_remaining = stats.engineering.cpu_total - stats.engineering.cpu_used;

  const pgMult = 1 + 0.05 * lvl(skills, S.POWER_GRID_MANAGEMENT);
  stats.engineering.pg_total = basePgTotal * pgMult;
  stats.engineering.pg_remaining = stats.engineering.pg_total - stats.engineering.pg_used;

  // ── Capacitor ──
  const capMult = 1 + 0.05 * lvl(skills, S.CAPACITOR_MANAGEMENT);
  const capRechargeMult = 1 - 0.05 * lvl(skills, S.CAPACITOR_SYSTEMS_OPERATION);
  stats.capacitor.capacity = baseCapCapacity * capMult;
  stats.capacitor.recharge_rate = baseCapRecharge * capRechargeMult;
  stats.capacitor.peak_recharge =
    stats.capacitor.recharge_rate > 0
      ? (2.5 * stats.capacitor.capacity) / stats.capacitor.recharge_rate
      : 0;

  // Re-simulate cap stability with skilled values
  const sim = simulateCap(
    stats.capacitor.capacity,
    stats.capacitor.recharge_rate * 1000, // convert back to ms
    stats.capacitor.drain_per_second
  );
  stats.capacitor.stable = sim.stable;
  stats.capacitor.stable_percent = sim.stablePercent;
  stats.capacitor.lasts_seconds = sim.lastsSeconds;

  // ── Defense ──
  const shieldMult = 1 + 0.05 * lvl(skills, S.SHIELD_MANAGEMENT);
  stats.shield.hp = baseShieldHp * shieldMult;
  stats.shield.ehp = calculateEHP(
    stats.shield.hp,
    avgResonance(
      stats.shield.resist.em,
      stats.shield.resist.thermal,
      stats.shield.resist.kinetic,
      stats.shield.resist.explosive
    )
  );

  const armorMult = 1 + 0.05 * lvl(skills, S.HULL_UPGRADES);
  stats.armor.hp = baseArmorHp * armorMult;
  stats.armor.ehp = calculateEHP(
    stats.armor.hp,
    avgResonance(
      stats.armor.resist.em,
      stats.armor.resist.thermal,
      stats.armor.resist.kinetic,
      stats.armor.resist.explosive
    )
  );

  const hullMult = 1 + 0.05 * lvl(skills, S.MECHANICS);
  stats.hull.hp = baseHullHp * hullMult;
  stats.hull.ehp = calculateEHP(
    stats.hull.hp,
    avgResonance(
      stats.hull.resist.em,
      stats.hull.resist.thermal,
      stats.hull.resist.kinetic,
      stats.hull.resist.explosive
    )
  );

  stats.total_ehp = stats.shield.ehp + stats.armor.ehp + stats.hull.ehp;

  // ── Navigation ──
  const velMult = 1 + 0.05 * lvl(skills, S.NAVIGATION);
  stats.navigation.max_velocity = baseVelocity * velMult;

  const inertiaMult = 1 - 0.05 * lvl(skills, S.EVASIVE_MANEUVERING);
  stats.navigation.inertia_modifier = baseInertia * inertiaMult;
  stats.navigation.agility = stats.navigation.inertia_modifier;
  stats.navigation.align_time = calculateAlignTime(
    stats.navigation.mass,
    stats.navigation.inertia_modifier
  );

  // ── Targeting ──
  const targetMgmtLvl = lvl(skills, S.TARGET_MANAGEMENT);
  stats.targeting.max_targets = baseMaxTargets + targetMgmtLvl;

  const rangeMult = 1 + 0.05 * lvl(skills, S.LONG_RANGE_TARGETING);
  stats.targeting.max_target_range = baseTargetRange * rangeMult;

  const scanResMult = 1 + 0.05 * lvl(skills, S.SIGNATURE_ANALYSIS);
  stats.targeting.scan_resolution = baseScanRes * scanResMult;

  // ── Build deltas ──
  return {
    cpu_total: stats.engineering.cpu_total - baseCpuTotal,
    pg_total: stats.engineering.pg_total - basePgTotal,
    cap_capacity: stats.capacitor.capacity - baseCapCapacity,
    cap_recharge: stats.capacitor.recharge_rate - baseCapRecharge,
    shield_hp: stats.shield.hp - baseShieldHp,
    armor_hp: stats.armor.hp - baseArmorHp,
    hull_hp: stats.hull.hp - baseHullHp,
    max_velocity: stats.navigation.max_velocity - baseVelocity,
    inertia_modifier: stats.navigation.inertia_modifier - baseInertia,
    align_time: stats.navigation.align_time - calculateAlignTime(stats.navigation.mass, baseInertia),
    max_targets: stats.targeting.max_targets - baseMaxTargets,
    max_target_range: stats.targeting.max_target_range - baseTargetRange,
    scan_resolution: stats.targeting.scan_resolution - baseScanRes,
  };
}
