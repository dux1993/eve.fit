import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import type { ClientSessionResponse } from "@/types/auth";

export async function GET() {
  const session = await readSession();

  if (!session) {
    const body: ClientSessionResponse = { isLoggedIn: false, character: null };
    return NextResponse.json(body);
  }

  const body: ClientSessionResponse = {
    isLoggedIn: true,
    character: session.character,
  };

  return NextResponse.json(body);
}
