"use client";

import { useEffect } from "react";
import { useFittingStore } from "@/store/fitting-store";
import { useCharacterSkills } from "@/lib/hooks/useCharacterSkills";

/**
 * Invisible component that bridges the useCharacterSkills hook
 * to the Zustand store. Fetches skills when "mySkills" mode is active
 * and pushes them into the store.
 */
export function SkillModeWatcher() {
  const skillMode = useFittingStore((s) => s.skillMode);
  const setMySkills = useFittingStore((s) => s.setMySkills);

  const { data: skills } = useCharacterSkills(skillMode === "mySkills");

  useEffect(() => {
    if (skillMode === "mySkills" && skills) {
      setMySkills(skills);
    }
  }, [skillMode, skills, setMySkills]);

  return null;
}
