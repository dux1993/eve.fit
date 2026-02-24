import { NextRequest, NextResponse } from "next/server";
import { readSession, getValidAccessToken, writeSessionCookie } from "@/lib/auth";
import { ESI_BASE, DATASOURCE } from "@/lib/constants";

/**
 * Authenticated ESI proxy.
 * Allowlists specific paths, validates character ID, auto-refreshes tokens.
 * Tokens never reach the browser.
 */

// Allowed path patterns (character ID is validated dynamically)
const ALLOWED_PATTERNS = [
  /^\/characters\/(\d+)\/fittings\/?$/,
  /^\/characters\/(\d+)\/fittings\/(\d+)\/?$/,
  /^\/characters\/(\d+)\/skills\/?$/,
  /^\/characters\/(\d+)\/ship\/?$/,
  /^\/search\/?$/,
];

function isPathAllowed(path: string): boolean {
  return ALLOWED_PATTERNS.some((re) => re.test(path));
}

function extractCharacterId(path: string): number | null {
  const match = path.match(/^\/characters\/(\d+)\//);
  return match ? parseInt(match[1], 10) : null;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handleProxy(
  request: NextRequest,
  context: RouteContext,
  method: string
) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = await context.params;
  const esiPath = "/" + params.path.join("/");

  if (!isPathAllowed(esiPath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  // Validate character ID in path matches session
  const pathCharId = extractCharacterId(esiPath);
  if (pathCharId !== null && pathCharId !== session.character.characterId) {
    return NextResponse.json({ error: "Character mismatch" }, { status: 403 });
  }

  // Get valid access token (auto-refresh if needed)
  let token: string;
  try {
    const result = await getValidAccessToken(session);
    token = result.token;
    if (result.updatedSession) {
      await writeSessionCookie(result.updatedSession);
    }
  } catch {
    return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
  }

  // Forward the request to ESI
  const esiUrl = new URL(`${ESI_BASE}${esiPath}`);
  esiUrl.searchParams.set("datasource", DATASOURCE);

  // Copy query params from original request (except datasource)
  const originalParams = request.nextUrl.searchParams;
  for (const [key, value] of originalParams.entries()) {
    if (key !== "datasource") {
      esiUrl.searchParams.set(key, value);
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  // Forward body for POST/PUT/DELETE
  if (method !== "GET" && method !== "HEAD") {
    try {
      const body = await request.text();
      if (body) fetchOptions.body = body;
    } catch {
      // No body
    }
  }

  try {
    const esiResponse = await fetch(esiUrl.toString(), fetchOptions);
    const data = await esiResponse.text();

    return new NextResponse(data, {
      status: esiResponse.status,
      headers: {
        "Content-Type": esiResponse.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    console.error("ESI proxy error:", err);
    return NextResponse.json({ error: "ESI request failed" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleProxy(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleProxy(request, context, "POST");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleProxy(request, context, "DELETE");
}
