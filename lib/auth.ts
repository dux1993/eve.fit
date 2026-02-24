/**
 * Server-side auth utilities for EVE SSO OAuth2 + PKCE.
 *
 * - AES-256-GCM encrypted httpOnly cookies for session storage
 * - PKCE code_verifier / code_challenge generation
 * - JWT verification via EVE's JWKS endpoint (jose)
 * - Token exchange and refresh
 */

import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthSession, EveCharacter, TokenResponse } from "@/types/auth";

// ─── ENV ─────────────────────────────────────────────────────────────────────

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

export const EVE_SSO = {
  get clientId() { return env("EVE_SSO_CLIENT_ID"); },
  get clientSecret() { return env("EVE_SSO_CLIENT_SECRET"); },
  get callbackUrl() { return env("EVE_SSO_CALLBACK_URL"); },
  authorizeUrl: "https://login.eveonline.com/v2/oauth/authorize/",
  tokenUrl: "https://login.eveonline.com/v2/oauth/token",
  jwksUrl: "https://login.eveonline.com/oauth/jwks",
  issuer: "https://login.eveonline.com",
  scopes: [
    "esi-fittings.read_fittings.v1",
    "esi-fittings.write_fittings.v1",
    "esi-skills.read_skills.v1",
    "esi-location.read_ship_type.v1",
    "esi-search.search_structures.v1",
  ],
} as const;

const JWKS = createRemoteJWKSet(new URL(EVE_SSO.jwksUrl));

// ─── PKCE ────────────────────────────────────────────────────────────────────

export function generatePKCE(): { verifier: string; challenge: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url(bytes);
  // S256: SHA-256 of the verifier, base64url encoded
  // We do this synchronously since we need it for the redirect
  return { verifier, challenge: "" }; // challenge filled async
}

export async function generatePKCEAsync(): Promise<{ verifier: string; challenge: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(digest));
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)));
}

// ─── AES-256-GCM cookie encryption ─────────────────────────────────────────

const COOKIE_NAME = "eve_session";
const PKCE_COOKIE = "eve_pkce";
const IV_BYTES = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const hex = env("AUTH_SESSION_SECRET");
  const keyBytes = hexToBytes(hex);
  return crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Concatenate iv + ciphertext and base64url encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return base64url(combined);
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = base64urlDecode(encrypted);
  const iv = combined.slice(0, IV_BYTES);
  const ciphertext = combined.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ─── Session cookie management ───────────────────────────────────────────────

export async function writeSessionCookie(session: AuthSession): Promise<void> {
  const encrypted = await encrypt(JSON.stringify(session));
  const jar = await cookies();
  jar.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days (refresh token keeps it alive)
  });
}

export async function readSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    const json = await decrypt(cookie.value);
    return JSON.parse(json) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ─── PKCE temp cookie (stores verifier + state during redirect) ──────────────

export async function writePKCECookie(verifier: string, state: string): Promise<void> {
  const encrypted = await encrypt(JSON.stringify({ verifier, state }));
  const jar = await cookies();
  jar.set(PKCE_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
}

export async function readPKCECookie(): Promise<{ verifier: string; state: string } | null> {
  const jar = await cookies();
  const cookie = jar.get(PKCE_COOKIE);
  if (!cookie?.value) return null;
  try {
    const json = await decrypt(cookie.value);
    return JSON.parse(json) as { verifier: string; state: string };
  } catch {
    return null;
  }
}

export async function clearPKCECookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(PKCE_COOKIE);
}

// ─── JWT verification ────────────────────────────────────────────────────────

interface EveJWTPayload extends JWTPayload {
  sub: string; // "CHARACTER:EVE:<id>"
  name: string;
  scp?: string | string[];
}

export async function verifyEveJWT(accessToken: string): Promise<EveCharacter> {
  const { payload } = await jwtVerify(accessToken, JWKS, {
    issuer: [EVE_SSO.issuer, "login.eveonline.com"],
  });

  const evPayload = payload as EveJWTPayload;
  const subParts = evPayload.sub.split(":");
  const characterId = parseInt(subParts[2], 10);
  if (!characterId || isNaN(characterId)) {
    throw new Error("Invalid JWT subject: " + evPayload.sub);
  }

  return {
    characterId,
    characterName: evPayload.name,
    portraitUrl: `https://images.evetech.net/characters/${characterId}/portrait?size=64`,
  };
}

// ─── Token exchange ──────────────────────────────────────────────────────────

export async function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: EVE_SSO.clientId,
    client_secret: EVE_SSO.clientSecret,
    code_verifier: codeVerifier,
  });

  const response = await fetch(EVE_SSO.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: EVE_SSO.clientId,
    client_secret: EVE_SSO.clientSecret,
  });

  const response = await fetch(EVE_SSO.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/**
 * Get a valid access token, refreshing if needed.
 * Returns the token string and optionally an updated session (if refreshed).
 */
export async function getValidAccessToken(
  session: AuthSession
): Promise<{ token: string; updatedSession?: AuthSession }> {
  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // refresh 60s before expiry

  if (session.expiresAt - now > buffer) {
    return { token: session.accessToken };
  }

  // Refresh
  const tokenResponse = await refreshAccessToken(session.refreshToken);
  const character = await verifyEveJWT(tokenResponse.access_token);
  const updatedSession: AuthSession = {
    character,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: now + tokenResponse.expires_in,
    scopes: session.scopes,
  };

  return { token: tokenResponse.access_token, updatedSession };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64url(bytes: Uint8Array): string {
  const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binStr = atob(padded);
  return Uint8Array.from(binStr, (c) => c.charCodeAt(0));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
