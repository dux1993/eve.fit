/**
 * Ship stats calculator
 * Computes ShipStats from a Fitting + ship EveType data.
 * This is a base-stats calculator — no stacking penalties or skill bonuses yet.
 */

import {
  EveType,
  Fitting,
  FittedModule,
  ShipStats,
  LayerStats,
  ResistanceProfile,
  CapacitorStats,
  OffenseStats,
  NavigationStats,
  TargetingStats,
  EngineeringStats,
} from "@/types/eve";
import { ATTR } from "./constants";
import { simulateCap, calculateAlignTime, calculateEHP, avgResonance } from "./utils";

// ─── Attribute helpers ───────────────────────────────────────────────────────

function shipAttr(type: EveType, attrId: number, fallback = 0): number {
  const attr = type.dogma_attributes?.find((a) => a.attribute_id === attrId);
  return attr?.value ?? fallback;
}

function modAttr(mod: FittedModule, attrId: number, fallback = 0): number {
  return mod.attributes?.[attrId] ?? fallback;
}

function allFittedModules(fitting: Fitting): FittedModule[] {
  return [
    ...fitting.high_slots,
    ...fitting.mid_slots,
    ...fitting.low_slots,
    ...fitting.rig_slots,
    ...fitting.subsystem_slots,
  ].filter((m): m is FittedModule => m !== null);
}

function activeModules(fitting: Fitting): FittedModule[] {
  return allFittedModules(fitting).filter((m) => m.state === "active");
}

// ─── Engineering ─────────────────────────────────────────────────────────────

function calcEngineering(shipType: EveType, fitting: Fitting): EngineeringStats {
  const cpuTotal = shipAttr(shipType, ATTR.CPU);
  const pgTotal = shipAttr(shipType, ATTR.POWERGRID);
  const calibrationTotal = shipAttr(shipType, ATTR.CALIBRATION_TOTAL, 400);
  const droneBandwidthTotal = shipAttr(shipType, ATTR.DRONE_BANDWIDTH);
  const droneCapacity = shipAttr(shipType, ATTR.DRONE_CAPACITY);

  const modules = allFittedModules(fitting);

  let cpuUsed = 0;
  let pgUsed = 0;
  let calibrationUsed = 0;
  let droneBandwidthUsed = 0;
  let droneCapacityUsed = 0;

  for (const mod of modules) {
    if (mod.state === "offline") continue;

    if (mod.slot_type === "drone") {
      droneBandwidthUsed += modAttr(mod, ATTR.DRONE_BANDWIDTH, 0);
      droneCapacityUsed += modAttr(mod, ATTR.DRONE_CAPACITY, 0);
    } else if (mod.slot_type === "rig") {
      calibrationUsed += modAttr(mod, ATTR.CALIBRATION_COST, 0);
    }

    cpuUsed += modAttr(mod, ATTR.MODULE_CPU_USAGE, 0);
    pgUsed += modAttr(mod, ATTR.MODULE_PG_USAGE, 0);
  }

  return {
    cpu_total: cpuTotal,
    cpu_used: cpuUsed,
    cpu_remaining: cpuTotal - cpuUsed,
    pg_total: pgTotal,
    pg_used: pgUsed,
    pg_remaining: pgTotal - pgUsed,
    calibration_total: calibrationTotal,
    calibration_used: calibrationUsed,
    drone_bandwidth_total: droneBandwidthTotal,
    drone_bandwidth_used: droneBandwidthUsed,
    drone_capacity: droneCapacity,
    drone_capacity_used: droneCapacityUsed,
  };
}

// ─── Defense (shield / armor / hull layers) ──────────────────────────────────

function calcResistProfile(
  shipType: EveType,
  emAttr: number,
  thermalAttr: number,
  kineticAttr: number,
  explosiveAttr: number
): ResistanceProfile {
  return {
    em: shipAttr(shipType, emAttr, 1.0),
    thermal: shipAttr(shipType, thermalAttr, 1.0),
    kinetic: shipAttr(shipType, kineticAttr, 1.0),
    explosive: shipAttr(shipType, explosiveAttr, 1.0),
  };
}

function calcLayerStats(hp: number, resist: ResistanceProfile): LayerStats {
  const avg = avgResonance(resist.em, resist.thermal, resist.kinetic, resist.explosive);
  return {
    hp,
    resist,
    ehp: calculateEHP(hp, avg),
    avg_resist: avg,
  };
}

function calcShield(shipType: EveType): LayerStats {
  const hp = shipAttr(shipType, ATTR.SHIELD_CAPACITY);
  const resist = calcResistProfile(
    shipType,
    ATTR.SHIELD_EM_RESONANCE,
    ATTR.SHIELD_THERMAL_RESONANCE,
    ATTR.SHIELD_KINETIC_RESONANCE,
    ATTR.SHIELD_EXPLOSIVE_RESONANCE
  );
  return calcLayerStats(hp, resist);
}

function calcArmor(shipType: EveType): LayerStats {
  const hp = shipAttr(shipType, ATTR.ARMOR_HP);
  const resist = calcResistProfile(
    shipType,
    ATTR.ARMOR_EM_RESONANCE,
    ATTR.ARMOR_THERMAL_RESONANCE,
    ATTR.ARMOR_KINETIC_RESONANCE,
    ATTR.ARMOR_EXPLOSIVE_RESONANCE
  );
  return calcLayerStats(hp, resist);
}

function calcHull(shipType: EveType): LayerStats {
  const hp = shipAttr(shipType, ATTR.STRUCTURE_HP);
  const resist = calcResistProfile(
    shipType,
    ATTR.HULL_EM_RESONANCE,
    ATTR.HULL_THERMAL_RESONANCE,
    ATTR.HULL_KINETIC_RESONANCE,
    ATTR.HULL_EXPLOSIVE_RESONANCE
  );
  return calcLayerStats(hp, resist);
}

// ─── Capacitor ───────────────────────────────────────────────────────────────

function calcCapacitor(shipType: EveType, fitting: Fitting): CapacitorStats {
  const capacity = shipAttr(shipType, ATTR.CAP_CAPACITY);
  const rechargeMs = shipAttr(shipType, ATTR.CAP_RECHARGE_TIME);
  const tau = rechargeMs / 1000;
  const peakRecharge = tau > 0 ? (2.5 * capacity) / tau : 0;

  // Sum drain from active modules
  let drainPerSecond = 0;
  for (const mod of activeModules(fitting)) {
    const activationCost = modAttr(mod, ATTR.MODULE_ACTIVATION_COST, 0);
    const cycleTimeMs = modAttr(mod, ATTR.MODULE_CYCLE_TIME, 0);
    if (activationCost > 0 && cycleTimeMs > 0) {
      drainPerSecond += activationCost / (cycleTimeMs / 1000);
    }
  }

  const sim = simulateCap(capacity, rechargeMs, drainPerSecond);

  return {
    capacity,
    recharge_rate: tau,
    peak_recharge: peakRecharge,
    drain_per_second: drainPerSecond,
    stable: sim.stable,
    stable_percent: sim.stablePercent,
    lasts_seconds: sim.lastsSeconds,
  };
}

// ─── Offense ─────────────────────────────────────────────────────────────────

function calcOffense(fitting: Fitting): OffenseStats {
  let turretDps = 0;
  let missileDps = 0;
  let droneDps = 0;
  let turretAlpha = 0;
  let missileAlpha = 0;
  let turretOptimal = 0;
  let turretFalloff = 0;
  let missileRange = 0;
  let droneRange = 0;

  for (const mod of activeModules(fitting)) {
    const cycleMs = modAttr(mod, ATTR.MODULE_CYCLE_TIME, 0);
    const dmgMult = modAttr(mod, ATTR.DAMAGE_MULTIPLIER, 1);
    const emDmg = modAttr(mod, ATTR.EM_DAMAGE, 0);
    const thermalDmg = modAttr(mod, ATTR.THERMAL_DAMAGE, 0);
    const kineticDmg = modAttr(mod, ATTR.KINETIC_DAMAGE, 0);
    const explosiveDmg = modAttr(mod, ATTR.EXPLOSIVE_DAMAGE, 0);
    const baseDmg = emDmg + thermalDmg + kineticDmg + explosiveDmg;

    // Turrets: have damage multiplier and tracking
    if (modAttr(mod, ATTR.TRACKING_SPEED, 0) > 0 && cycleMs > 0) {
      const volley = baseDmg * dmgMult;
      turretAlpha += volley;
      turretDps += volley / (cycleMs / 1000);
      turretOptimal = Math.max(turretOptimal, modAttr(mod, ATTR.OPTIMAL_RANGE, 0));
      turretFalloff = Math.max(turretFalloff, modAttr(mod, ATTR.FALLOFF, 0));
    }

    // Missiles: have explosion radius/velocity
    if (modAttr(mod, ATTR.EXPLOSION_RADIUS, 0) > 0 && cycleMs > 0) {
      const missileMult = modAttr(mod, ATTR.MISSILE_DAMAGE_MULT, 1);
      const volley = baseDmg * missileMult;
      missileAlpha += volley;
      missileDps += volley / (cycleMs / 1000);

      const flightTimeMs = modAttr(mod, ATTR.MISSILE_FLIGHT_TIME, 0);
      const velocity = modAttr(mod, ATTR.MISSILE_VELOCITY, 0);
      if (flightTimeMs > 0 && velocity > 0) {
        missileRange = Math.max(missileRange, (flightTimeMs / 1000) * velocity);
      }
    }
  }

  // Drones
  for (const drone of fitting.drones) {
    const cycleMs = modAttr(drone, ATTR.MODULE_CYCLE_TIME, 0);
    const dmgMult = modAttr(drone, ATTR.DAMAGE_MULTIPLIER, 1);
    const emDmg = modAttr(drone, ATTR.EM_DAMAGE, 0);
    const thermalDmg = modAttr(drone, ATTR.THERMAL_DAMAGE, 0);
    const kineticDmg = modAttr(drone, ATTR.KINETIC_DAMAGE, 0);
    const explosiveDmg = modAttr(drone, ATTR.EXPLOSIVE_DAMAGE, 0);
    const baseDmg = emDmg + thermalDmg + kineticDmg + explosiveDmg;

    if (cycleMs > 0 && baseDmg > 0) {
      droneDps += (baseDmg * dmgMult) / (cycleMs / 1000);
    }
  }

  const totalDps = turretDps + missileDps + droneDps;
  const alpha = turretAlpha + missileAlpha;

  return {
    turret_dps: turretDps,
    missile_dps: missileDps,
    drone_dps: droneDps,
    total_dps: totalDps,
    alpha,
    volley: alpha,
    turret_optimal: turretOptimal,
    turret_falloff: turretFalloff,
    missile_range: missileRange,
    drone_control_range: droneRange,
  };
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function calcNavigation(shipType: EveType): NavigationStats {
  const maxVelocity = shipAttr(shipType, ATTR.MAX_VELOCITY, 0);
  const inertia = shipAttr(shipType, ATTR.INERTIA_MODIFIER, 1);
  const mass = shipType.mass ?? 1_000_000;
  const warpSpeed = shipAttr(shipType, ATTR.WARP_SPEED_MULT, 1);
  const sigRadius = shipAttr(shipType, ATTR.SIGNATURE_RADIUS, 100);

  return {
    max_velocity: maxVelocity,
    agility: inertia,
    warp_speed: warpSpeed,
    align_time: calculateAlignTime(mass, inertia),
    signature_radius: sigRadius,
    mass,
    inertia_modifier: inertia,
  };
}

// ─── Targeting ───────────────────────────────────────────────────────────────

function calcTargeting(shipType: EveType): TargetingStats {
  const maxTargets = shipAttr(shipType, ATTR.MAX_TARGETS, 7);
  const maxRange = shipAttr(shipType, ATTR.MAX_TARGET_RANGE, 50000);
  const scanRes = shipAttr(shipType, ATTR.SCAN_RESOLUTION, 300);

  // Determine sensor type from highest strength
  const radar = shipAttr(shipType, ATTR.SENSOR_RADAR_STRENGTH, 0);
  const ladar = shipAttr(shipType, ATTR.SENSOR_LADAR_STRENGTH, 0);
  const magneto = shipAttr(shipType, ATTR.SENSOR_MAGNETOMETRIC_STRENGTH, 0);
  const gravi = shipAttr(shipType, ATTR.SENSOR_GRAVIMETRIC_STRENGTH, 0);

  const sensors = [
    { type: "Radar" as const, value: radar },
    { type: "Ladar" as const, value: ladar },
    { type: "Magnetometric" as const, value: magneto },
    { type: "Gravimetric" as const, value: gravi },
  ];
  const strongest = sensors.reduce((a, b) => (b.value > a.value ? b : a));

  return {
    max_targets: maxTargets,
    max_target_range: maxRange,
    scan_resolution: scanRes,
    sensor_strength: strongest.value,
    sensor_type: strongest.type,
  };
}

// ─── Main calculator ─────────────────────────────────────────────────────────

export function calculateShipStats(
  shipType: EveType,
  fitting: Fitting
): ShipStats {
  const engineering = calcEngineering(shipType, fitting);
  const capacitor = calcCapacitor(shipType, fitting);
  const offense = calcOffense(fitting);
  const navigation = calcNavigation(shipType);
  const targeting = calcTargeting(shipType);
  const shield = calcShield(shipType);
  const armor = calcArmor(shipType);
  const hull = calcHull(shipType);

  const totalEhp = shield.ehp + armor.ehp + hull.ehp;

  // Use fitting arrays for actual slot counts (more reliable than dogma heuristics)
  const highSlots = fitting.high_slots.length;
  const midSlots = fitting.mid_slots.length;
  const lowSlots = fitting.low_slots.length;
  const rigSlots = fitting.rig_slots.length;

  return {
    engineering,
    capacitor,
    offense,
    navigation,
    targeting,
    shield,
    armor,
    hull,
    total_ehp: totalEhp,
    high_slots: highSlots,
    mid_slots: midSlots,
    low_slots: lowSlots,
    rig_slots: rigSlots,
    turret_hardpoints: shipAttr(shipType, ATTR.TURRET_SLOTS_LEFT, 0),
    launcher_hardpoints: shipAttr(shipType, ATTR.LAUNCHER_SLOTS_LEFT, 0),
  };
}
