/**
 * Skill plan builder.
 * Analyzes a fitting's ship + modules, resolves all skill prerequisites
 * recursively, and produces a 3-stage training plan.
 */

import type { EveType, Fitting, SkillRequirement, SkillPlan, SkillPlanStage } from "@/types/eve";
import { SKILL_REQ_ATTRS, SUPPORT_SKILL_IDS, CATEGORY_IDS } from "./constants";
import { getType } from "./esi";

// ─── Skill requirement extraction ────────────────────────────────────────────

interface RawSkillReq {
  skill_type_id: number;
  level: number;
}

/** Extract required skills from an EveType's dogma attributes */
export function extractSkillReqs(type: EveType): RawSkillReq[] {
  const attrs = type.dogma_attributes;
  if (!attrs) return [];

  const attrMap = new Map<number, number>();
  for (const a of attrs) {
    attrMap.set(a.attribute_id, a.value);
  }

  const reqs: RawSkillReq[] = [];
  for (const [typeAttr, levelAttr] of SKILL_REQ_ATTRS) {
    const skillTypeId = attrMap.get(typeAttr);
    const level = attrMap.get(levelAttr);
    if (skillTypeId && skillTypeId > 0 && level && level > 0) {
      reqs.push({ skill_type_id: skillTypeId, level });
    }
  }

  return reqs;
}

// ─── Prerequisite resolution ─────────────────────────────────────────────────

/**
 * Recursively resolve all prerequisites for a skill.
 * Returns a flat map of skill_type_id → minimum required level.
 */
async function resolvePrerequisites(
  skillTypeId: number,
  visited: Set<number>,
  result: Map<number, number>
): Promise<void> {
  if (visited.has(skillTypeId)) return;
  visited.add(skillTypeId);

  let skillType: EveType;
  try {
    skillType = await getType(skillTypeId);
  } catch {
    return; // skill type not found, skip
  }

  // Check if this is actually a skill (category 16)
  if (skillType.category_id !== undefined && skillType.category_id !== CATEGORY_IDS.SKILL) {
    // Not a skill — some items have non-skill type IDs in these attrs
    return;
  }

  const prereqs = extractSkillReqs(skillType);
  for (const prereq of prereqs) {
    // Keep highest required level
    const existing = result.get(prereq.skill_type_id);
    if (!existing || prereq.level > existing) {
      result.set(prereq.skill_type_id, prereq.level);
    }
    await resolvePrerequisites(prereq.skill_type_id, visited, result);
  }
}

// ─── Build skill plan ────────────────────────────────────────────────────────

/** Collect all unique modules from a fitting */
function getAllModuleTypeIds(fitting: Fitting): number[] {
  const ids = new Set<number>();
  const slotArrays = [
    fitting.high_slots,
    fitting.mid_slots,
    fitting.low_slots,
    fitting.rig_slots,
    fitting.subsystem_slots,
  ];
  for (const slots of slotArrays) {
    for (const mod of slots) {
      if (mod) ids.add(mod.type_id);
    }
  }
  for (const drone of fitting.drones) {
    ids.add(drone.type_id);
  }
  return Array.from(ids);
}

/**
 * Build a 3-stage skill plan for a fitting.
 *
 * Stage 1 (Minimum): All required skills at their exact minimum levels + prerequisites
 * Stage 2 (Recommended): All skills bumped to IV + support skills at IV
 * Stage 3 (Mastery): All skills at V
 */
export async function buildSkillPlan(
  shipType: EveType,
  fitting: Fitting
): Promise<SkillPlan> {
  // 1. Extract direct requirements from ship + all modules
  const directReqs = new Map<number, number>(); // skill_type_id → max required level

  const allTypes: EveType[] = [shipType];
  const moduleTypeIds = getAllModuleTypeIds(fitting);

  // Fetch all module types in parallel
  const moduleTypes = await Promise.allSettled(
    moduleTypeIds.map((id) => getType(id))
  );
  for (const result of moduleTypes) {
    if (result.status === "fulfilled") {
      allTypes.push(result.value);
    }
  }

  // Extract requirements from all types
  for (const type of allTypes) {
    const reqs = extractSkillReqs(type);
    for (const req of reqs) {
      const existing = directReqs.get(req.skill_type_id);
      if (!existing || req.level > existing) {
        directReqs.set(req.skill_type_id, req.level);
      }
    }
  }

  // 2. Resolve prerequisite trees for all direct requirements
  const allReqs = new Map<number, number>(directReqs);
  const visited = new Set<number>();

  await Promise.allSettled(
    Array.from(directReqs.keys()).map((skillId) =>
      resolvePrerequisites(skillId, visited, allReqs)
    )
  );

  // 3. Resolve skill names
  const skillNames = new Map<number, string>();
  const nameResults = await Promise.allSettled(
    Array.from(allReqs.keys()).map(async (id) => {
      const type = await getType(id);
      return { id, name: type.name };
    })
  );
  for (const result of nameResults) {
    if (result.status === "fulfilled") {
      skillNames.set(result.value.id, result.value.name);
    }
  }

  // 4. Build Stage 1: minimum required levels
  const stage1Skills: SkillRequirement[] = [];
  for (const [skillId, level] of allReqs) {
    const name = skillNames.get(skillId);
    if (!name) continue;
    stage1Skills.push({
      skill_type_id: skillId,
      skill_name: name,
      required_level: level,
    });
  }
  stage1Skills.sort((a, b) => a.skill_name.localeCompare(b.skill_name));

  // 5. Build Stage 2: all skills at IV + support skills at IV
  const stage2Map = new Map<number, number>();
  // Start with all Stage 1 skills bumped to at least IV
  for (const [skillId, level] of allReqs) {
    stage2Map.set(skillId, Math.max(level, 4));
  }
  // Add support skills at IV
  for (const supportId of Object.values(SUPPORT_SKILL_IDS)) {
    const existing = stage2Map.get(supportId);
    if (!existing || existing < 4) {
      stage2Map.set(supportId, 4);
    }
  }
  // Resolve names for any newly added support skills
  for (const supportId of Object.values(SUPPORT_SKILL_IDS)) {
    if (!skillNames.has(supportId)) {
      try {
        const type = await getType(supportId);
        skillNames.set(supportId, type.name);
      } catch {
        // skip if can't resolve
      }
    }
  }

  const stage2Skills: SkillRequirement[] = [];
  for (const [skillId, level] of stage2Map) {
    const name = skillNames.get(skillId);
    if (!name) continue;
    stage2Skills.push({
      skill_type_id: skillId,
      skill_name: name,
      required_level: level,
    });
  }
  stage2Skills.sort((a, b) => a.skill_name.localeCompare(b.skill_name));

  // 6. Build Stage 3: everything at V
  const stage3Skills: SkillRequirement[] = stage2Skills.map((s) => ({
    ...s,
    required_level: 5,
  }));

  const stage1: SkillPlanStage = { name: "Minimum", skills: stage1Skills, total: stage1Skills.length };
  const stage2: SkillPlanStage = { name: "Recommended", skills: stage2Skills, total: stage2Skills.length };
  const stage3: SkillPlanStage = { name: "Mastery", skills: stage3Skills, total: stage3Skills.length };

  return { stages: [stage1, stage2, stage3] };
}
