// EVE Online dogma attribute IDs — verified against ESI /dogma/attributes/
export const ATTR = {
  // ── Ship resources ──
  POWERGRID: 11,             // powerOutput — ship PG total (MW)
  CPU: 48,                   // cpuOutput — ship CPU total (tf)

  // ── Module resource usage ──
  MODULE_PG_USAGE: 30,       // power — module PG need (MW)
  MODULE_CPU_USAGE: 50,      // cpu — module CPU need (tf)
  MODULE_ACTIVATION_COST: 15,// capacitorNeed — GJ per activation
  MODULE_CYCLE_TIME: 51,     // speed — cycle time (ms)

  // ── Capacitor ──
  CAP_CAPACITY: 482,         // capacitorCapacity (GJ)
  CAP_RECHARGE_TIME: 55,     // rechargeRate (ms)

  // ── Defense: HP ──
  STRUCTURE_HP: 9,           // hp
  ARMOR_HP: 265,             // armorHP
  SHIELD_CAPACITY: 263,      // shieldCapacity
  SHIELD_RECHARGE_RATE: 479, // shieldRechargeRate (ms)

  // ── Shield resists (resonance: 1.0 = 0% resist, 0.0 = 100% resist) ──
  SHIELD_EM_RESONANCE: 271,        // shieldEmDamageResonance
  SHIELD_EXPLOSIVE_RESONANCE: 272, // shieldExplosiveDamageResonance
  SHIELD_KINETIC_RESONANCE: 273,   // shieldKineticDamageResonance
  SHIELD_THERMAL_RESONANCE: 274,   // shieldThermalDamageResonance

  // ── Armor resists ──
  ARMOR_EM_RESONANCE: 267,        // armorEmDamageResonance
  ARMOR_EXPLOSIVE_RESONANCE: 268, // armorExplosiveDamageResonance
  ARMOR_KINETIC_RESONANCE: 269,   // armorKineticDamageResonance
  ARMOR_THERMAL_RESONANCE: 270,   // armorThermalDamageResonance

  // ── Hull resists ──
  HULL_EM_RESONANCE: 113,         // emDamageResonance
  HULL_KINETIC_RESONANCE: 109,    // kineticDamageResonance
  HULL_THERMAL_RESONANCE: 110,    // thermalDamageResonance
  HULL_EXPLOSIVE_RESONANCE: 111,  // explosiveDamageResonance

  // ── Navigation ──
  MAX_VELOCITY: 37,          // maxVelocity (m/s)
  INERTIA_MODIFIER: 70,      // agility (inertia modifier)
  WARP_SPEED_MULT: 600,      // warpSpeedMultiplier (AU/s multiplier)
  SIGNATURE_RADIUS: 552,     // signatureRadius (m)

  // ── Targeting ──
  MAX_TARGETS: 192,          // maxLockedTargets
  MAX_TARGET_RANGE: 76,      // maxTargetRange (m)
  SCAN_RESOLUTION: 564,      // scanResolution (mm)
  SENSOR_RADAR_STRENGTH: 208,          // scanRadarStrength
  SENSOR_LADAR_STRENGTH: 209,          // scanLadarStrength
  SENSOR_MAGNETOMETRIC_STRENGTH: 210,  // scanMagnetometricStrength
  SENSOR_GRAVIMETRIC_STRENGTH: 211,    // scanGravimetricStrength

  // ── Slots ──
  LOW_SLOTS: 12,             // lowSlots
  MED_SLOTS: 13,             // medSlots
  HI_SLOTS: 14,              // hiSlots
  RIG_SLOTS: 1137,           // rigSlots

  // ── Hardpoints ──
  LAUNCHER_SLOTS_LEFT: 101,  // launcherSlotsLeft
  TURRET_SLOTS_LEFT: 102,    // turretSlotsLeft

  // ── Drones ──
  DRONE_CAPACITY: 283,       // droneCapacity (m3)
  DRONE_BANDWIDTH: 1271,     // droneBandwidth (Mbit/s)

  // ── Calibration ──
  CALIBRATION_TOTAL: 1132,   // upgradeCapacity — ship calibration total
  CALIBRATION_COST: 1153,    // upgradeCost — module calibration cost

  // ── Turret attributes ──
  DAMAGE_MULTIPLIER: 64,     // damageMultiplier
  TRACKING_SPEED: 160,       // trackingSpeed
  OPTIMAL_RANGE: 54,         // maxRange (m)
  FALLOFF: 158,              // falloff (m)

  // ── Missile attributes ──
  MISSILE_FLIGHT_TIME: 51,   // maxFlightTime (ms) — shares attribute with cycle time
  MISSILE_VELOCITY: 37,      // maxVelocity for missiles
  EXPLOSION_RADIUS: 103,     // aoeCloudSize
  EXPLOSION_VELOCITY: 104,   // aoeVelocity
  MISSILE_DAMAGE_MULT: 212,  // missileDamageMultiplier

  // ── Damage types ──
  EM_DAMAGE: 114,
  EXPLOSIVE_DAMAGE: 116,
  KINETIC_DAMAGE: 117,
  THERMAL_DAMAGE: 118,

  // ── Repair ──
  SHIELD_BONUS: 68,          // shieldBonus (HP restored per cycle)
  ARMOR_DAMAGE_AMOUNT: 84,   // armorDamageAmount (HP restored per cycle)
  STRUCTURE_DAMAGE_AMOUNT: 83,// structureDamageAmount

  // ── Meta ──
  META_LEVEL: 633,           // metaLevel
  TECH_LEVEL: 422,           // techLevel
} as const;

// EVE category IDs
export const CATEGORY_IDS = {
  SHIP: 6,
  MODULE: 7,
  CHARGE: 8,
  SKILL: 16,
  DRONE: 18,
  IMPLANT: 20,
  SUBSYSTEM: 32,
} as const;

// EVE group IDs for ships (partial list)
export const SHIP_GROUP_IDS = {
  // Frigates
  FRIGATE: 25,
  ASSAULT_FRIGATE: 324,
  COVERT_OPS: 830,
  ELECTRONIC_ATTACK_SHIP: 833,
  INTERCEPTOR: 831,
  EXPEDITION_FRIGATE: 1283,
  LOGISTICS_FRIGATE: 1534,
  // Destroyers
  DESTROYER: 420,
  COMMAND_DESTROYER: 1305,
  INTERDICTOR: 541,
  // Cruisers
  CRUISER: 26,
  HEAVY_ASSAULT_CRUISER: 358,
  LOGISTICS: 832,
  RECON: 833,
  HEAVY_INTERDICTOR: 894,
  STRATEGIC_CRUISER: 963,
  // Battlecruisers
  BATTLECRUISER: 419,
  ATTACK_BATTLECRUISER: 1201,
  COMMAND_SHIP: 540,
  // Battleships
  BATTLESHIP: 27,
  BLACK_OPS: 898,
  MARAUDER: 900,
  // Capital
  CARRIER: 547,
  DREADNOUGHT: 485,
  FORCE_AUXILIARY: 1538,
  SUPERCARRIER: 659,
  TITAN: 30,
  // Industrial
  INDUSTRIAL: 28,
  MINING_BARGE: 463,
  EXHUMER: 543,
  FREIGHTER: 513,
  JUMP_FREIGHTER: 902,
  // Other
  SHUTTLE: 31,
  CAPSULE: 29,
} as const;

// Slot type effect IDs (used to determine what slot a module fits in)
export const SLOT_EFFECT_IDS = {
  HIGH_SLOT: 11,    // hiPower
  MED_SLOT: 13,     // medPower
  LOW_SLOT: 12,     // loPower
  RIG_SLOT: 2663,   // rigSlot
  SUBSYSTEM: 3772,  // subSystem
} as const;

// Module group -> slot type mapping (common groups)
export const MODULE_SLOT_BY_GROUP: Record<number, 'high' | 'mid' | 'low' | 'rig' | 'subsystem'> = {
  // High slot modules
  54: 'high',   // Projectile Weapon
  55: 'high',   // Energy Weapon
  56: 'high',   // Hybrid Weapon
  74: 'high',   // Mining Laser
  76: 'high',   // Tractor Beam
  77: 'high',   // Salvager
  85: 'high',   // Missile Launcher
  89: 'high',   // Bomb Launcher
  509: 'high',  // Siege Module
  524: 'high',  // Clone Bay
  535: 'high',  // Cynosural Field
  652: 'high',  // Energy Neutralizer
  53: 'high',   // Smart Bomb
  // Mid slot modules
  59: 'mid',    // Shield Hardener
  60: 'mid',    // Shield Booster
  61: 'mid',    // Shield Transporter
  63: 'mid',    // Cap Recharger
  64: 'mid',    // Afterburner
  65: 'mid',    // Propulsion Module (MWD)
  66: 'mid',    // Warp Disruptor
  67: 'mid',    // Webifier
  68: 'mid',    // Target Painter
  71: 'mid',    // ECM
  72: 'mid',    // Sensor Dampener
  73: 'mid',    // Tracking Disruptor
  // Low slot modules
  42: 'low',    // Armor Hardener
  43: 'low',    // Armor Repairer
  44: 'low',    // Armor Plating
  45: 'low',    // Damage Control
  46: 'low',    // Nanofiber
  47: 'low',    // Overdrive
  48: 'low',    // Power Diagnostic
  49: 'low',    // Reactor Control
  52: 'low',    // Gyrostabilizer
  // Rig slots
  773: 'rig',   // Armor Rig
  774: 'rig',   // Shield Rig
  775: 'rig',   // Missile Rig
  776: 'rig',   // Projectile Rig
  // Subsystems
  954: 'subsystem',
  955: 'subsystem',
  956: 'subsystem',
  957: 'subsystem',
  958: 'subsystem',
};

// Well-known ship type IDs for quick testing
export const POPULAR_SHIPS = [
  { type_id: 587, name: 'Rifter' },
  { type_id: 24700, name: 'Rupture' },
  { type_id: 24692, name: 'Stabber' },
  { type_id: 24696, name: 'Hurricane' },
  { type_id: 638, name: 'Tempest' },
  { type_id: 645, name: 'Maelstrom' },
  { type_id: 29984, name: 'Sleipnir' },
  { type_id: 11999, name: 'Vagabond' },
  { type_id: 17738, name: 'Vexor Navy Issue' },
  { type_id: 12034, name: 'Ishtar' },
  { type_id: 621, name: 'Apocalypse' },
  { type_id: 641, name: 'Abaddon' },
  { type_id: 16227, name: 'Megathron Navy Issue' },
  { type_id: 24483, name: 'Drake' },
  { type_id: 29340, name: 'Tengu' },
  { type_id: 29990, name: 'Legion' },
  { type_id: 45647, name: 'Leshak' },
  { type_id: 47466, name: 'Ikitursa' },
];

// ─── Support skill type IDs (from EVE SDE) ──────────────────────────────────
export const SUPPORT_SKILL_IDS = {
  CPU_MANAGEMENT: 3426,            // +5%/lvl CPU output
  POWER_GRID_MANAGEMENT: 3413,     // +5%/lvl PG output
  CAPACITOR_MANAGEMENT: 3418,      // +5%/lvl cap capacity
  CAPACITOR_SYSTEMS_OPERATION: 3417, // -5%/lvl cap recharge time
  SHIELD_MANAGEMENT: 3419,         // +5%/lvl shield HP
  HULL_UPGRADES: 3394,             // +5%/lvl armor HP
  MECHANICS: 3392,                 // +5%/lvl hull HP
  NAVIGATION: 3449,                // +5%/lvl max velocity
  EVASIVE_MANEUVERING: 3453,       // -5%/lvl inertia modifier
  TARGET_MANAGEMENT: 3428,         // +1/lvl max locked targets
  LONG_RANGE_TARGETING: 3431,      // +5%/lvl max target range
  SIGNATURE_ANALYSIS: 3432,        // +5%/lvl scan resolution
} as const;

export const ESI_BASE = 'https://esi.evetech.net/latest';
export const EVE_IMAGE_BASE = 'https://images.evetech.net';

export const DATASOURCE = 'tranquility';

// ─── ESI fitting flag → slot type mapping ───────────────────────────────────
// Flags from ESI fittings indicate where an item is fitted on the ship.
// See: https://docs.esi.evetech.net/docs/asset_location_id

import type { SlotType } from '@/types/eve';

// ESI fittings return flag as a string enum (e.g. "HiSlot0", "LoSlot0", "MedSlot0")
export const ESI_FLAG_TO_SLOT: Record<string, { slotType: SlotType; index: number }> = {};

// Build the mapping programmatically
const FLAG_PREFIXES: [string, SlotType][] = [
  ['HiSlot', 'high'],
  ['MedSlot', 'mid'],
  ['LoSlot', 'low'],
  ['RigSlot', 'rig'],
  ['SubSystemSlot', 'subsystem'],
];
for (const [prefix, slotType] of FLAG_PREFIXES) {
  for (let i = 0; i < 8; i++) {
    ESI_FLAG_TO_SLOT[`${prefix}${i}`] = { slotType, index: i };
  }
}

// Special flags (no index)
export const ESI_SPECIAL_FLAGS: Record<string, SlotType> = {
  DroneBay: 'drone',
  FighterBay: 'drone',
  Cargo: 'cargo',
};

const SLOT_TO_FLAG_PREFIX: Record<string, string> = {
  high: 'HiSlot',
  mid: 'MedSlot',
  low: 'LoSlot',
  rig: 'RigSlot',
  subsystem: 'SubSystemSlot',
};

export function slotToEsiFlag(slotType: SlotType, index: number): string {
  if (slotType === 'drone') return 'DroneBay';
  if (slotType === 'cargo') return 'Cargo';
  const prefix = SLOT_TO_FLAG_PREFIX[slotType];
  if (!prefix) return 'Invalid';
  return `${prefix}${index}`;
}
