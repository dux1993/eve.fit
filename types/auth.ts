// Auth types for EVE SSO integration

export interface EveCharacter {
  characterId: number;
  characterName: string;
  portraitUrl: string;
}

export interface AuthSession {
  character: EveCharacter;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp (seconds)
  scopes: string[];
}

/** Safe subset of session exposed to the client (no tokens) */
export interface ClientSession {
  isLoggedIn: true;
  character: EveCharacter;
}

export interface ClientSessionLoggedOut {
  isLoggedIn: false;
  character: null;
}

export type ClientSessionResponse = ClientSession | ClientSessionLoggedOut;

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/** ESI fitting as returned by GET /characters/{id}/fittings/ */
export interface ESIFitting {
  fitting_id: number;
  name: string;
  description: string;
  ship_type_id: number;
  items: ESIFittingItem[];
}

export interface ESIFittingItem {
  type_id: number;
  flag: string;
  quantity: number;
}

/** ESI skill as returned by GET /characters/{id}/skills/ */
export interface ESISkillsResponse {
  skills: ESISkill[];
  total_sp: number;
  unallocated_sp?: number;
}

export interface ESISkill {
  skill_id: number;
  trained_skill_level: number;
  active_skill_level: number;
  skillpoints_in_skill: number;
}
