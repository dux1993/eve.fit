"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { esiSkillsToMap } from "@/lib/skills";
import type { SkillMap } from "@/types/eve";
import type { ESISkillsResponse } from "@/types/auth";

async function fetchCharacterSkills(characterId: number): Promise<SkillMap> {
  const res = await fetch(`/api/esi/characters/${characterId}/skills`);
  if (!res.ok) throw new Error(`ESI skills fetch failed: ${res.status}`);
  const data: ESISkillsResponse = await res.json();
  return esiSkillsToMap(data.skills);
}

export function useCharacterSkills(enabled: boolean) {
  const { isLoggedIn, character } = useAuth();

  return useQuery<SkillMap>({
    queryKey: ["character-skills", character?.characterId],
    queryFn: () => fetchCharacterSkills(character!.characterId),
    enabled: enabled && isLoggedIn && !!character,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}
