import { NextResponse } from "next/server";
import { EVE_SSO, generatePKCEAsync, generateState, writePKCECookie } from "@/lib/auth";

export async function GET() {
  const { verifier, challenge } = await generatePKCEAsync();
  const state = generateState();

  // Store verifier + state in encrypted temp cookie
  await writePKCECookie(verifier, state);

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: EVE_SSO.callbackUrl,
    client_id: EVE_SSO.clientId,
    scope: EVE_SSO.scopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`${EVE_SSO.authorizeUrl}?${params.toString()}`);
}
