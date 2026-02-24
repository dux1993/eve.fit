"use client";

import { useFittingStore } from "@/store/fitting-store";
import { useAuth } from "@/components/providers/AuthProvider";
import type { SkillMode } from "@/types/eve";

const MODES: { value: SkillMode; label: string }[] = [
  { value: "none", label: "No Skills" },
  { value: "allV", label: "All V" },
  { value: "mySkills", label: "My Skills" },
];

export function SkillModeToggle() {
  const skillMode = useFittingStore((s) => s.skillMode);
  const setSkillMode = useFittingStore((s) => s.setSkillMode);
  const { isLoggedIn } = useAuth();

  return (
    <div className="flex gap-0.5 rounded-md border border-border bg-background p-0.5">
      {MODES.map(({ value, label }) => {
        const active = skillMode === value;
        const disabled = value === "mySkills" && !isLoggedIn;

        return (
          <button
            key={value}
            onClick={() => !disabled && setSkillMode(value)}
            disabled={disabled}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              active
                ? "bg-accent/20 text-accent"
                : disabled
                  ? "cursor-not-allowed text-foreground/20"
                  : "text-foreground/50 hover:text-foreground/70"
            }`}
            title={disabled ? "Log in with EVE SSO to use your skills" : label}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
