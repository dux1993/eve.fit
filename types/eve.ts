// Core EVE Online type definitions

export interface EveType {
  type_id: number;
  name: string;
  description: string;
  group_id: number;
  category_id?: number;
  mass?: number;
  volume?: number;
  capacity?: number;
  graphic_id?: number;
  icon_id?: number;
  radius?: number;
  published?: boolean;
  dogma_attributes?: DogmaAttribute[];
  dogma_effects?: DogmaEffect[];
}

export interface DogmaAttribute {
  attribute_id: number;
  value: number;
}

export interface DogmaEffect {
  effect_id: number;
  is_default: boolean;
}

export interface EveGroup {
  group_id: number;
  name: string;
  category_id: number;
  types?: number[];
  published?: boolean;
}

export interface EveCategory {
  category_id: number;
  name: string;
  groups: number[];
  published?: boolean;
}

export type SlotType = 'high' | 'mid' | 'low' | 'rig' | 'subsystem' | 'drone' | 'cargo';

export type ModuleState = 'active' | 'passive' | 'offline';

export interface Charge {
  type_id: number;
  name: string;
  quantity: number;
  attributes?: Record<number, number>;
}

export interface FittedModule {
  id: string; // unique instance id (uuid)
  type_id: number;
  name: string;
  slot_type: SlotType;
  slot_index: number;
  state: ModuleState;
  charge?: Charge;
  group_id?: number;
  category_id?: number;
  attributes?: Record<number, number>;
  effects?: number[];
}

export interface Fitting {
  id: string;
  name: string;
  ship_type_id: number;
  ship_name: string;
  ship_group_id?: number;
  description?: string;
  tags?: string[];
  high_slots: (FittedModule | null)[];
  mid_slots: (FittedModule | null)[];
  low_slots: (FittedModule | null)[];
  rig_slots: (FittedModule | null)[];
  subsystem_slots: (FittedModule | null)[];
  drones: FittedModule[];
  cargo: FittedModule[];
  created_at: string;
  updated_at: string;
}

export interface ResistanceProfile {
  em: number;       // 0.0–1.0 (resonance, lower = more resist)
  thermal: number;
  kinetic: number;
  explosive: number;
}

export interface LayerStats {
  hp: number;
  resist: ResistanceProfile;
  ehp: number;
  avg_resist: number;
}

export interface CapacitorStats {
  capacity: number;         // GJ
  recharge_rate: number;    // seconds (tau)
  peak_recharge: number;    // GJ/s at 25% cap
  drain_per_second: number; // GJ/s from active modules
  stable: boolean;
  stable_percent?: number;  // % if stable
  lasts_seconds?: number;   // seconds if unstable
}

export interface OffenseStats {
  turret_dps: number;
  missile_dps: number;
  drone_dps: number;
  total_dps: number;
  alpha: number;
  volley: number;
  turret_optimal: number;     // km
  turret_falloff: number;     // km
  missile_range: number;      // km
  drone_control_range: number; // km
}

export interface NavigationStats {
  max_velocity: number;    // m/s
  agility: number;         // multiplier
  warp_speed: number;      // AU/s
  align_time: number;      // seconds
  signature_radius: number; // m
  mass: number;             // kg
  inertia_modifier: number;
}

export interface TargetingStats {
  max_targets: number;
  max_target_range: number;  // km
  scan_resolution: number;   // mm
  sensor_strength: number;   // points
  sensor_type: 'Gravimetric' | 'Magnetometric' | 'Ladar' | 'Radar';
}

export interface EngineeringStats {
  cpu_total: number;    // tf
  cpu_used: number;
  cpu_remaining: number;
  pg_total: number;     // MW
  pg_used: number;
  pg_remaining: number;
  calibration_total: number;
  calibration_used: number;
  drone_bandwidth_total: number;
  drone_bandwidth_used: number;
  drone_capacity: number;    // m3
  drone_capacity_used: number;
}

export interface ShipStats {
  engineering: EngineeringStats;
  capacitor: CapacitorStats;
  offense: OffenseStats;
  navigation: NavigationStats;
  targeting: TargetingStats;
  shield: LayerStats;
  armor: LayerStats;
  hull: LayerStats;
  total_ehp: number;
  // Slot counts
  high_slots: number;
  mid_slots: number;
  low_slots: number;
  rig_slots: number;
  turret_hardpoints: number;
  launcher_hardpoints: number;
}

export interface SearchResult {
  type_id: number;
  name: string;
  group_id: number;
  group_name: string;
  category_id: number;
  category_name: string;
  slot_type?: SlotType;
  icon_url: string;
  meta_level?: number;
  tech_level?: number;
}

export interface SavedFitting {
  fitting: Fitting;
  stats?: ShipStats;
  notes?: string;
}

export interface DogmaAttributeInfo {
  attribute_id: number;
  name: string;
  display_name?: string;
  description?: string;
  unit_id?: number;
  icon_id?: number;
  default_value?: number;
  high_is_good?: boolean;
  stackable?: boolean;
  published?: boolean;
}

// ─── Skill system ────────────────────────────────────────────────────────────

export type SkillMode = 'none' | 'allV' | 'mySkills';

/** Map of skill type_id → trained level (1-5) */
export type SkillMap = Record<number, number>;

// ─── Skill plan ─────────────────────────────────────────────────────────────

export interface SkillRequirement {
  skill_type_id: number;
  skill_name: string;
  required_level: number;
}

export interface SkillPlanStage {
  name: string;
  skills: SkillRequirement[];
  total: number;
}

export interface SkillPlan {
  stages: [SkillPlanStage, SkillPlanStage, SkillPlanStage];
}

/** Delta values for stats affected by skills (skilled - base) */
export interface SkillDeltas {
  cpu_total: number;
  pg_total: number;
  cap_capacity: number;
  cap_recharge: number;    // negative = faster (better)
  shield_hp: number;
  armor_hp: number;
  hull_hp: number;
  max_velocity: number;
  inertia_modifier: number; // negative = less inertia (better)
  align_time: number;       // negative = faster (better)
  max_targets: number;
  max_target_range: number;
  scan_resolution: number;
}
