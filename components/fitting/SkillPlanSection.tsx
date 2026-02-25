"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFittingStore } from "@/store/fitting-store";
import { buildSkillPlan } from "@/lib/skill-plan";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import type { SkillPlanStage, SkillMap } from "@/types/eve";

const ROMAN = ["", "I", "II", "III", "IV", "V"];

export function SkillPlanSection() {
  const fitting = useFittingStore((s) => s.fitting);
  const shipType = useFittingStore((s) => s.shipType);
  const skillMap = useFittingStore((s) => s.skillMap);
  const skillMode = useFittingStore((s) => s.skillMode);

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["skill-plan", shipType?.type_id, fitting?.updated_at],
    queryFn: () => buildSkillPlan(shipType!, fitting!),
    enabled: !!shipType && !!fitting,
    staleTime: 1000 * 60 * 5,
  });

  if (!fitting || !shipType) return null;

  const hasCharSkills = skillMode === "mySkills" && skillMap !== null;
  const stage = plan?.stages[activeTab];

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-surface-alt/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-accent" />
        ) : (
          <ChevronRight className="h-4 w-4 text-accent" />
        )}
        <BookOpen className="h-4 w-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Skill Plan
        </h3>
        {plan && !expanded && (
          <span className="ml-auto text-[10px] font-mono text-foreground/40">
            {plan.stages[0].total} skills required
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-3 pb-3">
          {isLoading ? (
            <div className="py-4 text-center text-xs text-foreground/40">
              Analyzing skill requirements...
            </div>
          ) : plan ? (
            <>
              {/* Tabs */}
              <div className="flex gap-1 border-b border-border pt-2 pb-1">
                {plan.stages.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setActiveTab(i)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-t transition-colors ${
                      activeTab === i
                        ? "bg-surface-alt text-accent border-b-2 border-accent"
                        : "text-foreground/40 hover:text-foreground/60"
                    }`}
                  >
                    {s.name}
                    <span className="ml-1.5 text-[10px] opacity-60">
                      ({s.total})
                    </span>
                  </button>
                ))}
              </div>

              {/* Progress summary (when character skills available) */}
              {hasCharSkills && stage && (
                <ProgressBar stage={stage} skillMap={skillMap} />
              )}

              {/* Skill list */}
              {stage && (
                <div className="mt-2 max-h-64 overflow-y-auto space-y-0.5">
                  {stage.skills.map((skill) => {
                    const trained = hasCharSkills
                      ? skillMap[skill.skill_type_id] ?? 0
                      : null;
                    return (
                      <div
                        key={skill.skill_type_id}
                        className="flex items-center justify-between py-0.5 text-xs"
                      >
                        <span
                          className={
                            trained !== null
                              ? trained >= skill.required_level
                                ? "text-green-400"
                                : trained > 0
                                  ? "text-yellow-400"
                                  : "text-foreground/30"
                              : "text-foreground/70"
                          }
                        >
                          {skill.skill_name}
                        </span>
                        <span className="font-mono text-foreground/50 flex items-center gap-1.5">
                          {trained !== null && (
                            <SkillDot trained={trained} required={skill.required_level} />
                          )}
                          {ROMAN[skill.required_level]}
                          {trained !== null && trained > 0 && trained < skill.required_level && (
                            <span className="text-[9px] text-yellow-400/60">
                              ({ROMAN[trained]})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SkillDot({ trained, required }: { trained: number; required: number }) {
  const color =
    trained >= required
      ? "bg-green-400"
      : trained > 0
        ? "bg-yellow-400"
        : "bg-foreground/20";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function ProgressBar({ stage, skillMap }: { stage: SkillPlanStage; skillMap: SkillMap }) {
  const complete = stage.skills.filter(
    (s) => (skillMap[s.skill_type_id] ?? 0) >= s.required_level
  ).length;
  const pct = stage.total > 0 ? (complete / stage.total) * 100 : 0;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-foreground/40 mb-1">
        <span>
          {complete} of {stage.total} skills complete
        </span>
        <span className="font-mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border">
        <div
          className="h-full rounded-full bg-green-500/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
