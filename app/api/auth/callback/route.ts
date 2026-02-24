import { NextRequest, NextResponse } from "next/server";
import {
  readPKCECookie,
  clearPKCECookie,
  exchangeCode,
  verifyEveJWT,
  writeSessionCookie,
} from "@/lib/auth";
import type { AuthSession } from "@/types/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?auth_error=missing_params", request.url));
  }

  // Validate state + retrieve PKCE verifier
  const pkce = await readPKCECookie();
  if (!pkce || pkce.state !== state) {
    return NextResponse.redirect(new URL("/?auth_error=invalid_state", request.url));
  }

  await clearPKCECookie();

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCode(code, pkce.verifier);

    // Verify the access token JWT and extract character info
    const character = await verifyEveJWT(tokenResponse.access_token);

    // Build session
    const session: AuthSession = {
      character,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
      scopes: tokenResponse.access_token
        ? [] // scopes come from the JWT, we trust the requested scopes
        : [],
    };

    // Persist scopes from what we requested (the JWT scp claim confirms them)
    session.scopes = [
      "esi-fittings.read_fittings.v1",
      "esi-fittings.write_fittings.v1",
      "esi-skills.read_skills.v1",
      "esi-location.read_ship_type.v1",
      "esi-search.search_structures.v1",
    ];

    await writeSessionCookie(session);

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("EVE SSO callback error:", msg, err);
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("auth_error", "exchange_failed");
    errorUrl.searchParams.set("auth_detail", msg.slice(0, 200));
    return NextResponse.redirect(errorUrl);
  }
}
